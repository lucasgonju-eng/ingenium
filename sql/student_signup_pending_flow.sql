begin;

create table if not exists public.student_signup_pending_requests (
  id uuid primary key default gen_random_uuid(),
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
  p_mismatch_reason text default null
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
begin
  v_full_name := nullif(trim(coalesce(p_full_name, '')), '');
  v_email := lower(nullif(trim(coalesce(p_email, '')), ''));
  v_cpf := nullif(regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g'), '');
  v_whatsapp := nullif(regexp_replace(coalesce(p_whatsapp, ''), '\D', '', 'g'), '');
  v_grade := nullif(trim(coalesce(p_grade, '')), '');
  v_enrollment := nullif(regexp_replace(coalesce(p_enrollment_number, ''), '\D', '', 'g'), '');
  v_reason := nullif(trim(coalesce(p_mismatch_reason, '')), '');

  if v_full_name is null then
    raise exception 'Nome completo é obrigatório.';
  end if;
  if v_email is null then
    raise exception 'E-mail é obrigatório.';
  end if;
  if v_reason is null then
    v_reason := 'Não elegível para matrícula Einstein 2026.';
  end if;

  select r.id
    into v_existing_id
  from public.student_signup_pending_requests r
  where lower(r.email) = v_email
    and coalesce(r.enrollment_number, '') = coalesce(v_enrollment, '')
    and r.status = 'pending'
  order by r.attempted_at desc
  limit 1;

  if v_existing_id is not null then
    update public.student_signup_pending_requests
    set full_name = v_full_name,
        cpf = v_cpf,
        whatsapp = v_whatsapp,
        grade = v_grade,
        mismatch_reason = v_reason,
        attempted_at = now(),
        updated_at = now()
    where id = v_existing_id;
    return v_existing_id;
  end if;

  insert into public.student_signup_pending_requests (
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

  return v_existing_id;
end;
$$;

revoke all on function public.submit_student_signup_pending_request(text, text, text, text, text, text, text) from public;
grant execute on function public.submit_student_signup_pending_request(text, text, text, text, text, text, text) to anon;
grant execute on function public.submit_student_signup_pending_request(text, text, text, text, text, text, text) to authenticated;
grant execute on function public.submit_student_signup_pending_request(text, text, text, text, text, text, text) to service_role;

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
        and coalesce(lower(actor.role), 'student') = 'admin'
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
begin
  select coalesce(lower(role), 'student')
    into v_actor_role
  from public.profiles
  where id = auth.uid();

  if v_actor_role <> 'admin' then
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

  if p_approve and coalesce(v_req.enrollment_number, '') <> '' then
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
  end if;

  return query
  select v_req.id, v_req.full_name, v_req.email, v_req.enrollment_number, p_approve;
end;
$$;

revoke all on function public.review_student_signup_pending_request_admin(uuid, boolean, text) from public;
grant execute on function public.review_student_signup_pending_request_admin(uuid, boolean, text) to authenticated;
grant execute on function public.review_student_signup_pending_request_admin(uuid, boolean, text) to service_role;

commit;
