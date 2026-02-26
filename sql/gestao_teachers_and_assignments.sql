-- Gestão: professores vinculados ao auth.users + profiles (role teacher)
-- Inclui vínculos por olimpíada cadastrada e pendências de olimpíada ainda não cadastrada.

begin;

alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists subject_area text;

drop table if exists public.teacher_olympiad_assignments cascade;
drop table if exists public.teachers cascade;

create table if not exists public.teacher_olympiad_assignments (
  id uuid primary key default gen_random_uuid(),
  teacher_profile_id uuid not null references public.profiles(id) on delete cascade,
  olympiad_id uuid null references public.olympiads(id) on delete cascade,
  pending_olympiad_name text null,
  display_name text null,
  subject_area text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint teacher_assignment_target_check check (
    (olympiad_id is not null and pending_olympiad_name is null) or
    (olympiad_id is null and nullif(trim(coalesce(pending_olympiad_name, '')), '') is not null)
  )
);

create unique index if not exists uq_teacher_assignment_registered
  on public.teacher_olympiad_assignments (teacher_profile_id, olympiad_id)
  where olympiad_id is not null;

create unique index if not exists uq_teacher_assignment_pending
  on public.teacher_olympiad_assignments (teacher_profile_id, lower(pending_olympiad_name))
  where olympiad_id is null and pending_olympiad_name is not null;

create index if not exists idx_teacher_assignments_teacher_profile on public.teacher_olympiad_assignments(teacher_profile_id);
create index if not exists idx_teacher_assignments_olympiad on public.teacher_olympiad_assignments(olympiad_id);

alter table public.teacher_olympiad_assignments enable row level security;

drop policy if exists teacher_assignments_select_privileged on public.teacher_olympiad_assignments;
create policy teacher_assignments_select_privileged
  on public.teacher_olympiad_assignments
  for select
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and coalesce(lower(p.role), 'student') in ('admin', 'coord', 'gestao')
    )
  );

drop policy if exists teacher_assignments_write_privileged on public.teacher_olympiad_assignments;
create policy teacher_assignments_write_privileged
  on public.teacher_olympiad_assignments
  for all
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and coalesce(lower(p.role), 'student') in ('admin', 'coord', 'gestao')
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and coalesce(lower(p.role), 'student') in ('admin', 'coord', 'gestao')
    )
  );

create or replace function public.get_registered_students_full_admin()
returns table (
  id uuid,
  full_name text,
  grade text,
  class_name text,
  avatar_url text,
  role text,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    p.id,
    p.full_name,
    p.grade,
    p.class_name,
    p.avatar_url,
    p.role,
    p.created_at,
    p.updated_at
  from public.profiles p
  where exists (
      select 1
      from public.profiles actor
      where actor.id = auth.uid()
        and coalesce(lower(actor.role), 'student') in ('admin', 'coord', 'gestao')
    )
    and coalesce(lower(p.role), 'student') not in ('admin', 'coord', 'gestao', 'teacher')
  order by p.full_name asc nulls last;
$$;

revoke all on function public.get_registered_students_full_admin() from public;
grant execute on function public.get_registered_students_full_admin() to authenticated;
grant execute on function public.get_registered_students_full_admin() to service_role;

create or replace function public.get_teachers_with_olympiads_admin()
returns table (
  teacher_id uuid,
  full_name text,
  display_name text,
  email text,
  avatar_url text,
  subject_area text,
  assignments jsonb
)
language sql
security definer
set search_path = public
as $$
  select
    p.id as teacher_id,
    p.full_name,
    p.display_name,
    u.email,
    p.avatar_url,
    p.subject_area,
    coalesce(
      jsonb_agg(
        distinct jsonb_build_object(
          'assignment_id', ta.id,
          'olympiad_id', o.id,
          'olympiad_title', o.title,
          'pending_olympiad_name', ta.pending_olympiad_name,
          'display_name', coalesce(ta.display_name, p.display_name),
          'subject_area', coalesce(ta.subject_area, p.subject_area)
        )
      ) filter (where ta.id is not null),
      '[]'::jsonb
    ) as assignments
  from public.profiles p
  join auth.users u on u.id = p.id
  left join public.teacher_olympiad_assignments ta on ta.teacher_profile_id = p.id
  left join public.olympiads o on o.id = ta.olympiad_id
  where exists (
      select 1
      from public.profiles actor
      where actor.id = auth.uid()
        and coalesce(lower(actor.role), 'student') in ('admin', 'coord', 'gestao')
    )
    and coalesce(lower(p.role), 'student') = 'teacher'
  group by p.id, p.full_name, p.display_name, u.email, p.avatar_url, p.subject_area
  order by p.full_name asc nulls last;
$$;

revoke all on function public.get_teachers_with_olympiads_admin() from public;
grant execute on function public.get_teachers_with_olympiads_admin() to authenticated;
grant execute on function public.get_teachers_with_olympiads_admin() to service_role;

create or replace function public.upsert_teacher_profile_admin(
  p_full_name text,
  p_display_name text,
  p_email text,
  p_subject_area text default null,
  p_olympiad_id uuid default null,
  p_pending_olympiad_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_actor_role text;
  v_user_id uuid;
  v_pending text;
begin
  v_actor_id := auth.uid();
  select coalesce(lower(role), 'student') into v_actor_role from public.profiles where id = v_actor_id;
  if v_actor_role not in ('admin', 'coord', 'gestao') then
    raise exception 'Sem permissão para cadastrar professor.';
  end if;

  if coalesce(trim(p_full_name), '') = '' then
    raise exception 'Nome completo do professor é obrigatório.';
  end if;
  if coalesce(trim(p_display_name), '') = '' then
    raise exception 'Nome de exibição do professor é obrigatório.';
  end if;
  if coalesce(trim(p_email), '') = '' then
    raise exception 'E-mail do professor é obrigatório.';
  end if;

  select u.id
  into v_user_id
  from auth.users u
  where lower(u.email) = lower(trim(p_email))
  limit 1;

  if v_user_id is null then
    raise exception 'Conta de autenticação não encontrada para o e-mail informado. Envie magic link primeiro.';
  end if;

  update auth.users
  set raw_user_meta_data = jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(coalesce(raw_user_meta_data, '{}'::jsonb), '{role}', '"teacher"'::jsonb),
          '{full_name}', to_jsonb(trim(p_full_name))
        ),
        '{display_name}', to_jsonb(trim(p_display_name))
      ),
      '{subject_area}', to_jsonb(nullif(trim(coalesce(p_subject_area, '')), ''))
    ),
    updated_at = now()
  where id = v_user_id;

  insert into public.profiles (id, full_name, display_name, subject_area, role, updated_at)
  values (
    v_user_id,
    trim(p_full_name),
    trim(p_display_name),
    nullif(trim(coalesce(p_subject_area, '')), ''),
    'teacher',
    now()
  )
  on conflict (id) do update
  set full_name = excluded.full_name,
      display_name = excluded.display_name,
      subject_area = excluded.subject_area,
      role = 'teacher',
      updated_at = now();

  v_pending := nullif(trim(coalesce(p_pending_olympiad_name, '')), '');
  if p_olympiad_id is not null then
    insert into public.teacher_olympiad_assignments (
      teacher_profile_id,
      olympiad_id,
      pending_olympiad_name,
      display_name,
      subject_area,
      updated_at
    )
    values (
      v_user_id,
      p_olympiad_id,
      null,
      trim(p_display_name),
      nullif(trim(coalesce(p_subject_area, '')), ''),
      now()
    )
    on conflict (teacher_profile_id, olympiad_id) do update
    set display_name = excluded.display_name,
        subject_area = excluded.subject_area,
        updated_at = now();
  elsif v_pending is not null then
    insert into public.teacher_olympiad_assignments (
      teacher_profile_id,
      olympiad_id,
      pending_olympiad_name,
      display_name,
      subject_area,
      updated_at
    )
    values (
      v_user_id,
      null,
      v_pending,
      trim(p_display_name),
      nullif(trim(coalesce(p_subject_area, '')), ''),
      now()
    )
    on conflict do nothing;
  end if;

  return v_user_id;
end;
$$;

revoke all on function public.upsert_teacher_profile_admin(text, text, text, text, uuid, text) from public;
grant execute on function public.upsert_teacher_profile_admin(text, text, text, text, uuid, text) to authenticated;
grant execute on function public.upsert_teacher_profile_admin(text, text, text, text, uuid, text) to service_role;

create or replace function public.assign_teacher_to_olympiad_admin(
  p_teacher_profile_id uuid,
  p_olympiad_id uuid,
  p_display_name text default null,
  p_subject_area text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_role text;
  v_id uuid;
begin
  select coalesce(lower(role), 'student') into v_actor_role from public.profiles where id = auth.uid();
  if v_actor_role not in ('admin', 'coord', 'gestao') then
    raise exception 'Sem permissão para atribuir professor.';
  end if;

  insert into public.teacher_olympiad_assignments (
    teacher_profile_id,
    olympiad_id,
    pending_olympiad_name,
    display_name,
    subject_area,
    updated_at
  )
  values (
    p_teacher_profile_id,
    p_olympiad_id,
    null,
    nullif(trim(coalesce(p_display_name, '')), ''),
    nullif(trim(coalesce(p_subject_area, '')), ''),
    now()
  )
  on conflict (teacher_profile_id, olympiad_id) do update
  set display_name = coalesce(excluded.display_name, public.teacher_olympiad_assignments.display_name),
      subject_area = coalesce(excluded.subject_area, public.teacher_olympiad_assignments.subject_area),
      updated_at = now()
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.assign_teacher_to_olympiad_admin(uuid, uuid, text, text) from public;
grant execute on function public.assign_teacher_to_olympiad_admin(uuid, uuid, text, text) to authenticated;
grant execute on function public.assign_teacher_to_olympiad_admin(uuid, uuid, text, text) to service_role;

create or replace function public.assign_teacher_pending_olympiad_admin(
  p_teacher_profile_id uuid,
  p_pending_olympiad_name text,
  p_display_name text default null,
  p_subject_area text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_role text;
  v_pending text;
  v_id uuid;
begin
  select coalesce(lower(role), 'student') into v_actor_role from public.profiles where id = auth.uid();
  if v_actor_role not in ('admin', 'coord', 'gestao') then
    raise exception 'Sem permissão para registrar olimpíada pendente.';
  end if;

  v_pending := nullif(trim(coalesce(p_pending_olympiad_name, '')), '');
  if v_pending is null then
    raise exception 'Informe o nome da olimpíada pendente.';
  end if;

  insert into public.teacher_olympiad_assignments (
    teacher_profile_id,
    olympiad_id,
    pending_olympiad_name,
    display_name,
    subject_area,
    updated_at
  )
  values (
    p_teacher_profile_id,
    null,
    v_pending,
    nullif(trim(coalesce(p_display_name, '')), ''),
    nullif(trim(coalesce(p_subject_area, '')), ''),
    now()
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.assign_teacher_pending_olympiad_admin(uuid, text, text, text) from public;
grant execute on function public.assign_teacher_pending_olympiad_admin(uuid, text, text, text) to authenticated;
grant execute on function public.assign_teacher_pending_olympiad_admin(uuid, text, text, text) to service_role;

create or replace function public.update_teacher_profile_admin(
  p_teacher_profile_id uuid,
  p_full_name text default null,
  p_display_name text default null,
  p_subject_area text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_role text;
begin
  select coalesce(lower(role), 'student') into v_actor_role from public.profiles where id = auth.uid();
  if v_actor_role not in ('admin', 'coord', 'gestao') then
    raise exception 'Sem permissão para editar professor.';
  end if;

  update public.profiles
  set full_name = coalesce(nullif(trim(coalesce(p_full_name, '')), ''), full_name),
      display_name = coalesce(nullif(trim(coalesce(p_display_name, '')), ''), display_name),
      subject_area = coalesce(nullif(trim(coalesce(p_subject_area, '')), ''), subject_area),
      updated_at = now()
  where id = p_teacher_profile_id
    and coalesce(lower(role), 'student') = 'teacher';

  update auth.users
  set raw_user_meta_data = jsonb_set(
      jsonb_set(
        jsonb_set(
          coalesce(raw_user_meta_data, '{}'::jsonb),
          '{full_name}',
          to_jsonb((select full_name from public.profiles where id = p_teacher_profile_id))
        ),
        '{display_name}',
        to_jsonb((select display_name from public.profiles where id = p_teacher_profile_id))
      ),
      '{subject_area}',
      to_jsonb((select subject_area from public.profiles where id = p_teacher_profile_id))
    ),
    updated_at = now()
  where id = p_teacher_profile_id;

  return p_teacher_profile_id;
end;
$$;

revoke all on function public.update_teacher_profile_admin(uuid, text, text, text) from public;
grant execute on function public.update_teacher_profile_admin(uuid, text, text, text) to authenticated;
grant execute on function public.update_teacher_profile_admin(uuid, text, text, text) to service_role;

create or replace function public.remove_teacher_assignment_admin(
  p_assignment_id uuid
)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.teacher_olympiad_assignments
  where id = p_assignment_id;
$$;

revoke all on function public.remove_teacher_assignment_admin(uuid) from public;
grant execute on function public.remove_teacher_assignment_admin(uuid) to authenticated;
grant execute on function public.remove_teacher_assignment_admin(uuid) to service_role;

create or replace function public.delete_teacher_admin(p_teacher_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_role text;
begin
  select coalesce(lower(role), 'student') into v_actor_role from public.profiles where id = auth.uid();
  if v_actor_role not in ('admin', 'coord', 'gestao') then
    raise exception 'Sem permissão para remover professor.';
  end if;

  delete from public.teacher_olympiad_assignments
  where teacher_profile_id = p_teacher_profile_id;

  update public.profiles
  set role = 'student',
      subject_area = null,
      display_name = null,
      updated_at = now()
  where id = p_teacher_profile_id;

  update auth.users
  set raw_user_meta_data = jsonb_set(
      jsonb_set(
        jsonb_set(coalesce(raw_user_meta_data, '{}'::jsonb), '{role}', '"student"'::jsonb),
        '{subject_area}',
        'null'::jsonb
      ),
      '{display_name}',
      'null'::jsonb
    ),
    updated_at = now()
  where id = p_teacher_profile_id;
end;
$$;

revoke all on function public.delete_teacher_admin(uuid) from public;
grant execute on function public.delete_teacher_admin(uuid) to authenticated;
grant execute on function public.delete_teacher_admin(uuid) to service_role;

commit;
