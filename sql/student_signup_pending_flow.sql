begin;

create table if not exists public.student_signup_pending_requests (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid null references auth.users(id) on delete set null,
  full_name text not null,
  email text not null,
  cpf text null,
  whatsapp text null,
  grade text null,
  enrollment_number text null,
  mismatch_reason text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  review_notes text null,
  reviewed_by uuid null references auth.users(id),
  reviewed_at timestamptz null,
  attempted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_student_signup_pending_status
  on public.student_signup_pending_requests (status, attempted_at desc);

create index if not exists idx_student_signup_pending_email
  on public.student_signup_pending_requests (lower(email));

create index if not exists idx_student_signup_pending_enrollment
  on public.student_signup_pending_requests (enrollment_number);

alter table public.student_signup_pending_requests
  add column if not exists requested_by uuid null references auth.users(id) on delete set null;

create index if not exists idx_student_signup_pending_requested_by
  on public.student_signup_pending_requests (requested_by);

alter table public.student_signup_pending_requests enable row level security;

drop policy if exists student_signup_pending_requests_deny_all on public.student_signup_pending_requests;
create policy student_signup_pending_requests_deny_all
  on public.student_signup_pending_requests
  for all
  using (false)
  with check (false);

create or replace function public.submit_student_signup_pending_request(
  p_full_name text,
  p_email text,
  p_cpf text default null,
  p_whatsapp text default null,
  p_grade text default null,
  p_enrollment_number text default null,
  p_mismatch_reason text default null,
  p_requested_by uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_full_name text;
  v_email text;
  v_cpf text;
  v_whatsapp text;
  v_grade text;
  v_enrollment text;
  v_reason text;
  v_existing_id uuid;
  v_requested_by uuid;
  v_norm_name text;
begin
  v_full_name := nullif(trim(coalesce(p_full_name, '')), '');
  v_email := lower(nullif(trim(coalesce(p_email, '')), ''));
  v_cpf := nullif(regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g'), '');
  v_whatsapp := nullif(regexp_replace(coalesce(p_whatsapp, ''), '\D', '', 'g'), '');
  v_grade := nullif(trim(coalesce(p_grade, '')), '');
  v_enrollment := nullif(regexp_replace(coalesce(p_enrollment_number, ''), '\D', '', 'g'), '');
  v_reason := nullif(trim(coalesce(p_mismatch_reason, '')), '');
  v_requested_by := null;

  if p_requested_by is not null then
    select u.id
      into v_requested_by
    from auth.users u
    where u.id = p_requested_by
    limit 1;
  end if;

  if v_full_name is null then
    raise exception 'Nome completo é obrigatório.';
  end if;
  if v_email is null then
    raise exception 'E-mail é obrigatório.';
  end if;
  if v_reason is null then
    v_reason := 'Não elegível para matrícula Einstein 2026.';
  end if;
  v_norm_name := public.normalize_student_name(v_full_name);

  select r.id
    into v_existing_id
  from public.student_signup_pending_requests r
  where r.status = 'pending'
    and (
      (
        lower(r.email) = v_email
        and coalesce(r.enrollment_number, '') = coalesce(v_enrollment, '')
      )
      or public.normalize_student_name(r.full_name) = v_norm_name
    )
  order by r.attempted_at desc
  limit 1;

  if v_existing_id is not null then
    update public.student_signup_pending_requests
    set full_name = v_full_name,
        cpf = v_cpf,
        whatsapp = v_whatsapp,
        grade = v_grade,
        requested_by = coalesce(v_requested_by, requested_by),
        mismatch_reason = v_reason,
        attempted_at = now(),
        updated_at = now()
    where id = v_existing_id;

    with ranked as (
      select
        id,
        row_number() over (
          partition by public.normalize_student_name(full_name)
          order by attempted_at desc, created_at desc, id desc
        ) as rn
      from public.student_signup_pending_requests
      where status = 'pending'
    )
    delete from public.student_signup_pending_requests t
    using ranked r
    where t.id = r.id
      and r.rn > 1;

    return v_existing_id;
  end if;

  insert into public.student_signup_pending_requests (
    requested_by,
    full_name,
    email,
    cpf,
    whatsapp,
    grade,
    enrollment_number,
    mismatch_reason,
    status,
    attempted_at,
    updated_at
  )
  values (
    v_requested_by,
    v_full_name,
    v_email,
    v_cpf,
    v_whatsapp,
    v_grade,
    v_enrollment,
    v_reason,
    'pending',
    now(),
    now()
  )
  returning id into v_existing_id;

  -- Deduplica pendências por nome (mantém a tentativa mais recente).
  with ranked as (
    select
      id,
      row_number() over (
        partition by public.normalize_student_name(full_name)
        order by attempted_at desc, created_at desc, id desc
      ) as rn
    from public.student_signup_pending_requests
    where status = 'pending'
  )
  delete from public.student_signup_pending_requests t
  using ranked r
  where t.id = r.id
    and r.rn > 1;

  return v_existing_id;
end;
$$;

revoke all on function public.submit_student_signup_pending_request(text, text, text, text, text, text, text, uuid) from public;
grant execute on function public.submit_student_signup_pending_request(text, text, text, text, text, text, text, uuid) to anon;
grant execute on function public.submit_student_signup_pending_request(text, text, text, text, text, text, text, uuid) to authenticated;
grant execute on function public.submit_student_signup_pending_request(text, text, text, text, text, text, text, uuid) to service_role;

create or replace function public.list_student_signup_pending_requests_admin()
returns table (
  id uuid,
  full_name text,
  email text,
  cpf text,
  whatsapp text,
  grade text,
  enrollment_number text,
  mismatch_reason text,
  status text,
  attempted_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    r.id,
    r.full_name,
    r.email,
    r.cpf,
    r.whatsapp,
    r.grade,
    r.enrollment_number,
    r.mismatch_reason,
    r.status,
    r.attempted_at
  from public.student_signup_pending_requests r
  where exists (
      select 1
      from public.profiles actor
      where actor.id = auth.uid()
        and coalesce(lower(actor.role), 'student') in ('admin', 'coord', 'gestao')
    )
    and r.status = 'pending'
  order by r.attempted_at desc;
$$;

revoke all on function public.list_student_signup_pending_requests_admin() from public;
grant execute on function public.list_student_signup_pending_requests_admin() to authenticated;
grant execute on function public.list_student_signup_pending_requests_admin() to service_role;

create or replace function public.review_student_signup_pending_request_admin(
  p_request_id uuid,
  p_approve boolean,
  p_review_notes text default null
)
returns table (
  request_id uuid,
  full_name text,
  email text,
  enrollment_number text,
  approved boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_role text;
  v_req public.student_signup_pending_requests%rowtype;
  v_norm_name text;
  v_target_user_id uuid;
begin
  select coalesce(lower(role), 'student')
    into v_actor_role
  from public.profiles
  where id = auth.uid();

  if v_actor_role not in ('admin', 'coord', 'gestao') then
    raise exception 'Sem permissão para revisar pendências de alunos.';
  end if;

  select *
    into v_req
  from public.student_signup_pending_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Pendência não encontrada.';
  end if;

  if v_req.status <> 'pending' then
    raise exception 'Esta pendência já foi revisada.';
  end if;

  update public.student_signup_pending_requests
  set status = case when p_approve then 'approved' else 'rejected' end,
      review_notes = nullif(trim(coalesce(p_review_notes, '')), ''),
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      updated_at = now()
  where id = p_request_id;

  delete from public.student_signup_pending_requests d
  where d.id <> v_req.id
    and d.status = 'pending'
    and public.normalize_student_name(d.full_name) = public.normalize_student_name(v_req.full_name);

  if p_approve and coalesce(v_req.enrollment_number, '') <> '' then
    begin
      v_norm_name := public.normalize_student_name(v_req.full_name);
      insert into public.student_enrollments_2026 (
        enrollment_number,
        full_name,
        full_name_normalized,
        school_year,
        updated_at
      )
      values (
        v_req.enrollment_number,
        v_req.full_name,
        v_norm_name,
        2026,
        now()
      )
      on conflict (enrollment_number) do update
      set full_name = excluded.full_name,
          full_name_normalized = excluded.full_name_normalized,
          school_year = 2026,
          updated_at = now();
    exception when others then
      -- Não bloqueia aprovação por falha lateral na base 2026.
      null;
    end;
  end if;

  if p_approve then
    v_target_user_id := v_req.requested_by;
    if v_target_user_id is null then
      select u.id
        into v_target_user_id
      from auth.users u
      where lower(u.email) = lower(v_req.email)
      order by u.created_at desc
      limit 1;
    end if;

    if v_target_user_id is not null then
      begin
        update auth.users
        set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
              'role', 'student',
              'student_pending', false,
              'full_name', v_req.full_name,
              'grade', v_req.grade,
              'cpf', v_req.cpf,
              'enrollment_number', v_req.enrollment_number,
              'whatsapp', v_req.whatsapp
            ),
            updated_at = now()
        where id = v_target_user_id;
      exception when others then
        -- Aprovação não pode falhar por atualização de metadata.
        null;
      end;

      begin
        insert into public.profiles (id, full_name, updated_at)
        values (v_target_user_id, v_req.full_name, now())
        on conflict (id) do update
        set full_name = excluded.full_name,
            updated_at = now();
      exception when others then
        -- Continua fluxo mesmo se profile tiver schema legado diferente.
        null;
      end;

      if exists (
        select 1
        from information_schema.columns c
        where c.table_schema = 'public'
          and c.table_name = 'profiles'
          and c.column_name = 'role'
      ) then
        begin
          execute 'update public.profiles set role = ''student'', updated_at = now() where id = $1'
          using v_target_user_id;
        exception when others then
          null;
        end;
      end if;

      if exists (
        select 1
        from information_schema.columns c
        where c.table_schema = 'public'
          and c.table_name = 'profiles'
          and c.column_name = 'grade'
      ) then
        begin
          execute 'update public.profiles set grade = $1, updated_at = now() where id = $2'
          using v_req.grade, v_target_user_id;
        exception when others then
          null;
        end;
      end if;

      if exists (
        select 1
        from information_schema.columns c
        where c.table_schema = 'public'
          and c.table_name = 'profiles'
          and c.column_name = 'is_active'
      ) then
        begin
          execute 'update public.profiles set is_active = true, updated_at = now() where id = $1'
          using v_target_user_id;
        exception when others then
          null;
        end;
      end if;
    end if;
  end if;

  return query
  select v_req.id, v_req.full_name, v_req.email, v_req.enrollment_number, p_approve;
end;
$$;

revoke all on function public.review_student_signup_pending_request_admin(uuid, boolean, text) from public;
grant execute on function public.review_student_signup_pending_request_admin(uuid, boolean, text) to authenticated;
grant execute on function public.review_student_signup_pending_request_admin(uuid, boolean, text) to service_role;

do $$
begin
  if to_regclass('public.student_signup_mismatch_crm') is not null then
    insert into public.student_signup_pending_requests (
      requested_by,
      full_name,
      email,
      cpf,
      whatsapp,
      grade,
      enrollment_number,
      mismatch_reason,
      status,
      attempted_at,
      created_at,
      updated_at
    )
    select
      null::uuid,
      m.full_name,
      m.email,
      m.cpf,
      m.whatsapp,
      m.grade,
      m.enrollment_number,
      coalesce(nullif(trim(m.mismatch_reason), ''), 'Divergência na validação da matrícula 2026.') as mismatch_reason,
      'pending'::text,
      coalesce(m.attempted_at, m.created_at, now()) as attempted_at,
      coalesce(m.created_at, now()) as created_at,
      now() as updated_at
    from public.student_signup_mismatch_crm m
    where not exists (
      select 1
      from public.student_signup_pending_requests p
      where lower(p.email) = lower(m.email)
        and coalesce(p.enrollment_number, '') = coalesce(m.enrollment_number, '')
        and p.status = 'pending'
    );
  end if;
end;
$$;

with ranked_pending_names as (
  select
    id,
    row_number() over (
      partition by public.normalize_student_name(full_name)
      order by attempted_at desc, created_at desc, id desc
    ) as rn
  from public.student_signup_pending_requests
  where status = 'pending'
)
delete from public.student_signup_pending_requests p
using ranked_pending_names r
where p.id = r.id
  and r.rn > 1;

commit;
