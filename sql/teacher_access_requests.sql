begin;

create table if not exists public.access_requests (
  id uuid primary key default gen_random_uuid(),
  request_type text not null check (request_type in ('teacher', 'collaborator')),
  requested_by uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  display_name text not null,
  email text not null,
  cpf text null,
  subject_area text null,
  intended_olympiad text null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  review_notes text null,
  reviewed_by uuid null references auth.users(id) on delete set null,
  reviewed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_access_requests_status_created_at
  on public.access_requests(status, created_at desc);

create index if not exists idx_access_requests_requested_by
  on public.access_requests(requested_by);

alter table public.access_requests enable row level security;

drop policy if exists access_requests_owner_select on public.access_requests;
create policy access_requests_owner_select
  on public.access_requests
  for select
  using (
    requested_by = auth.uid()
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and coalesce(lower(p.role), 'student') in ('admin', 'coord', 'gestao')
    )
  );

drop policy if exists access_requests_owner_insert on public.access_requests;
create policy access_requests_owner_insert
  on public.access_requests
  for insert
  with check (requested_by = auth.uid());

drop policy if exists access_requests_admin_update on public.access_requests;
create policy access_requests_admin_update
  on public.access_requests
  for update
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and coalesce(lower(p.role), 'student') in ('admin', 'coord')
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and coalesce(lower(p.role), 'student') in ('admin', 'coord')
    )
  );

create or replace function public.submit_teacher_access_request(
  p_full_name text,
  p_display_name text,
  p_email text,
  p_cpf text,
  p_subject_area text default null,
  p_intended_olympiad text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_id uuid;
  v_cpf text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Usuário não autenticado.';
  end if;

  if coalesce(trim(p_full_name), '') = '' then
    raise exception 'Nome completo é obrigatório.';
  end if;
  if coalesce(trim(p_display_name), '') = '' then
    raise exception 'Nome de exibição é obrigatório.';
  end if;
  if coalesce(trim(p_email), '') = '' then
    raise exception 'E-mail é obrigatório.';
  end if;

  v_cpf := regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g');
  if char_length(v_cpf) <> 11 then
    raise exception 'CPF inválido.';
  end if;

  insert into public.access_requests (
    request_type,
    requested_by,
    full_name,
    display_name,
    email,
    cpf,
    subject_area,
    intended_olympiad,
    status,
    updated_at
  )
  values (
    'teacher',
    v_user_id,
    trim(p_full_name),
    trim(p_display_name),
    lower(trim(p_email)),
    v_cpf,
    nullif(trim(coalesce(p_subject_area, '')), ''),
    nullif(trim(coalesce(p_intended_olympiad, '')), ''),
    'pending',
    now()
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.submit_teacher_access_request(text, text, text, text, text, text) from public;
grant execute on function public.submit_teacher_access_request(text, text, text, text, text, text) to authenticated;
grant execute on function public.submit_teacher_access_request(text, text, text, text, text, text) to service_role;

create or replace function public.ensure_teacher_access_request_from_current_user()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_role text;
  v_metadata jsonb;
  v_full_name text;
  v_display_name text;
  v_email text;
  v_cpf text;
  v_subject_area text;
  v_intended_olympiad text;
  v_existing_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Usuário não autenticado.';
  end if;

  select coalesce(lower(role), 'student') into v_role from public.profiles where id = v_user_id;
  if v_role = 'teacher' then
    return null;
  end if;

  select raw_user_meta_data, email
  into v_metadata, v_email
  from auth.users
  where id = v_user_id;

  v_full_name := nullif(trim(coalesce(v_metadata->>'full_name', '')), '');
  if v_full_name is null then
    select nullif(trim(coalesce(full_name, '')), '') into v_full_name from public.profiles where id = v_user_id;
  end if;
  if v_full_name is null then
    v_full_name := split_part(coalesce(v_email, 'professor'), '@', 1);
  end if;

  v_display_name := nullif(trim(coalesce(v_metadata->>'display_name', '')), '');
  if v_display_name is null then
    v_display_name := v_full_name;
  end if;

  v_subject_area := nullif(trim(coalesce(v_metadata->>'subject_area', '')), '');
  v_intended_olympiad := nullif(trim(coalesce(v_metadata->>'intended_olympiad', '')), '');
  v_cpf := regexp_replace(coalesce(v_metadata->>'cpf', ''), '\D', '', 'g');
  if char_length(v_cpf) <> 11 then
    v_cpf := null;
  end if;

  select ar.id
  into v_existing_id
  from public.access_requests ar
  where ar.requested_by = v_user_id
    and ar.request_type = 'teacher'
    and ar.status = 'pending'
  order by ar.created_at desc
  limit 1;

  if v_existing_id is not null then
    return v_existing_id;
  end if;

  insert into public.access_requests (
    request_type,
    requested_by,
    full_name,
    display_name,
    email,
    cpf,
    subject_area,
    intended_olympiad,
    status,
    updated_at
  )
  values (
    'teacher',
    v_user_id,
    v_full_name,
    v_display_name,
    lower(coalesce(v_email, '')),
    v_cpf,
    v_subject_area,
    v_intended_olympiad,
    'pending',
    now()
  )
  returning id into v_existing_id;

  return v_existing_id;
end;
$$;

revoke all on function public.ensure_teacher_access_request_from_current_user() from public;
grant execute on function public.ensure_teacher_access_request_from_current_user() to authenticated;
grant execute on function public.ensure_teacher_access_request_from_current_user() to service_role;

create or replace function public.get_my_latest_access_request()
returns setof public.access_requests
language sql
security definer
set search_path = public
as $$
  select ar.*
  from public.access_requests ar
  where ar.requested_by = auth.uid()
  order by ar.created_at desc
  limit 1;
$$;

revoke all on function public.get_my_latest_access_request() from public;
grant execute on function public.get_my_latest_access_request() to authenticated;
grant execute on function public.get_my_latest_access_request() to service_role;

create or replace function public.list_pending_access_requests_admin()
returns setof public.access_requests
language sql
security definer
set search_path = public
as $$
  select ar.*
  from public.access_requests ar
  where exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and coalesce(lower(p.role), 'student') in ('admin', 'coord')
    )
    and ar.status = 'pending'
  order by ar.created_at asc;
$$;

revoke all on function public.list_pending_access_requests_admin() from public;
grant execute on function public.list_pending_access_requests_admin() to authenticated;
grant execute on function public.list_pending_access_requests_admin() to service_role;

create or replace function public.review_access_request_admin(
  p_request_id uuid,
  p_approve boolean,
  p_review_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_role text;
  v_request public.access_requests%rowtype;
begin
  select coalesce(lower(role), 'student')
  into v_actor_role
  from public.profiles
  where id = auth.uid();

  if v_actor_role not in ('admin', 'coord') then
    raise exception 'Sem permissão para revisar solicitações.';
  end if;

  select *
  into v_request
  from public.access_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Solicitação não encontrada.';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'Solicitação já revisada.';
  end if;

  update public.access_requests
  set status = case when p_approve then 'approved' else 'rejected' end,
      review_notes = nullif(trim(coalesce(p_review_notes, '')), ''),
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      updated_at = now()
  where id = p_request_id;

  if p_approve then
    update auth.users
    set raw_user_meta_data = jsonb_set(coalesce(raw_user_meta_data, '{}'::jsonb), '{role}', '"teacher"'::jsonb),
        updated_at = now()
    where id = v_request.requested_by;

    insert into public.profiles (id, full_name, display_name, subject_area, role, updated_at)
    values (
      v_request.requested_by,
      v_request.full_name,
      v_request.display_name,
      v_request.subject_area,
      'teacher',
      now()
    )
    on conflict (id) do update
    set full_name = excluded.full_name,
        display_name = excluded.display_name,
        subject_area = excluded.subject_area,
        role = 'teacher',
        updated_at = now();
  else
    update auth.users
    set raw_user_meta_data = jsonb_set(coalesce(raw_user_meta_data, '{}'::jsonb), '{role}', '"student"'::jsonb),
        updated_at = now()
    where id = v_request.requested_by;
  end if;
end;
$$;

revoke all on function public.review_access_request_admin(uuid, boolean, text) from public;
grant execute on function public.review_access_request_admin(uuid, boolean, text) to authenticated;
grant execute on function public.review_access_request_admin(uuid, boolean, text) to service_role;

commit;
