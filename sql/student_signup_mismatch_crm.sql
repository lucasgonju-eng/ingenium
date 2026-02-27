begin;

create table if not exists public.student_signup_mismatch_crm (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  cpf text null,
  whatsapp text null,
  grade text null,
  enrollment_number text null,
  mismatch_reason text not null,
  attempted_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_student_signup_mismatch_crm_attempted_at
  on public.student_signup_mismatch_crm (attempted_at desc);

create index if not exists idx_student_signup_mismatch_crm_email
  on public.student_signup_mismatch_crm (lower(email));

alter table public.student_signup_mismatch_crm enable row level security;

drop policy if exists student_signup_mismatch_crm_deny_all on public.student_signup_mismatch_crm;
create policy student_signup_mismatch_crm_deny_all
  on public.student_signup_mismatch_crm
  for all
  using (false)
  with check (false);

create or replace function public.log_student_signup_mismatch_crm(
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
  v_id uuid;
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

  insert into public.student_signup_mismatch_crm (
    full_name,
    email,
    cpf,
    whatsapp,
    grade,
    enrollment_number,
    mismatch_reason,
    attempted_at
  )
  values (
    v_full_name,
    v_email,
    v_cpf,
    v_whatsapp,
    v_grade,
    v_enrollment,
    v_reason,
    now()
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.log_student_signup_mismatch_crm(text, text, text, text, text, text, text) from public;
grant execute on function public.log_student_signup_mismatch_crm(text, text, text, text, text, text, text) to anon;
grant execute on function public.log_student_signup_mismatch_crm(text, text, text, text, text, text, text) to authenticated;
grant execute on function public.log_student_signup_mismatch_crm(text, text, text, text, text, text, text) to service_role;

create or replace function public.list_student_signup_mismatch_crm_admin()
returns table (
  id uuid,
  full_name text,
  email text,
  cpf text,
  whatsapp text,
  grade text,
  enrollment_number text,
  mismatch_reason text,
  attempted_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    c.id,
    c.full_name,
    c.email,
    c.cpf,
    c.whatsapp,
    c.grade,
    c.enrollment_number,
    c.mismatch_reason,
    c.attempted_at
  from public.student_signup_mismatch_crm c
  where exists (
      select 1
      from public.profiles actor
      where actor.id = auth.uid()
        and coalesce(lower(actor.role), 'student') = 'admin'
    )
  order by c.attempted_at desc;
$$;

revoke all on function public.list_student_signup_mismatch_crm_admin() from public;
grant execute on function public.list_student_signup_mismatch_crm_admin() to authenticated;
grant execute on function public.list_student_signup_mismatch_crm_admin() to service_role;

commit;
