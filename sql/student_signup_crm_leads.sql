begin;

create table if not exists public.student_signup_crm_leads (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  cpf text null,
  whatsapp text null,
  grade text null,
  enrollment_number text null,
  source text not null default 'signup',
  lifecycle_status text not null default 'created_unverified'
    check (lifecycle_status in ('created_unverified', 'enrollment_pending', 'approved', 'rejected', 'active')),
  auth_user_id uuid null references auth.users(id) on delete set null,
  notes text null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_student_signup_crm_leads_email
  on public.student_signup_crm_leads (lower(email));

create index if not exists idx_student_signup_crm_leads_status
  on public.student_signup_crm_leads (lifecycle_status, last_seen_at desc);

create unique index if not exists uq_student_signup_crm_leads_email_enrollment
  on public.student_signup_crm_leads (lower(email), coalesce(enrollment_number, ''));

alter table public.student_signup_crm_leads enable row level security;

drop policy if exists student_signup_crm_leads_deny_all on public.student_signup_crm_leads;
create policy student_signup_crm_leads_deny_all
  on public.student_signup_crm_leads
  for all
  using (false)
  with check (false);

create or replace function public.upsert_student_signup_crm_lead(
  p_full_name text,
  p_email text,
  p_cpf text default null,
  p_whatsapp text default null,
  p_grade text default null,
  p_enrollment_number text default null,
  p_lifecycle_status text default 'created_unverified',
  p_auth_user_id uuid default null,
  p_notes text default null
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
  v_status text;
  v_notes text;
  v_auth_user uuid;
  v_id uuid;
begin
  v_full_name := nullif(trim(coalesce(p_full_name, '')), '');
  v_email := lower(nullif(trim(coalesce(p_email, '')), ''));
  v_cpf := nullif(regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g'), '');
  v_whatsapp := nullif(regexp_replace(coalesce(p_whatsapp, ''), '\D', '', 'g'), '');
  v_grade := nullif(trim(coalesce(p_grade, '')), '');
  v_enrollment := nullif(regexp_replace(coalesce(p_enrollment_number, ''), '\D', '', 'g'), '');
  v_status := lower(nullif(trim(coalesce(p_lifecycle_status, '')), ''));
  v_notes := nullif(trim(coalesce(p_notes, '')), '');
  v_auth_user := p_auth_user_id;

  if v_full_name is null then
    raise exception 'Nome completo é obrigatório.';
  end if;
  if v_email is null then
    raise exception 'E-mail é obrigatório.';
  end if;
  if v_status not in ('created_unverified', 'enrollment_pending', 'approved', 'rejected', 'active') then
    v_status := 'created_unverified';
  end if;

  if v_auth_user is not null then
    if not exists (select 1 from auth.users u where u.id = v_auth_user) then
      v_auth_user := null;
    end if;
  end if;

  insert into public.student_signup_crm_leads (
    full_name,
    email,
    cpf,
    whatsapp,
    grade,
    enrollment_number,
    lifecycle_status,
    auth_user_id,
    notes,
    first_seen_at,
    last_seen_at,
    updated_at
  )
  values (
    v_full_name,
    v_email,
    v_cpf,
    v_whatsapp,
    v_grade,
    v_enrollment,
    v_status,
    v_auth_user,
    v_notes,
    now(),
    now(),
    now()
  )
  on conflict ((lower(email)), (coalesce(enrollment_number, ''))) do update
  set full_name = excluded.full_name,
      cpf = coalesce(excluded.cpf, public.student_signup_crm_leads.cpf),
      whatsapp = coalesce(excluded.whatsapp, public.student_signup_crm_leads.whatsapp),
      grade = coalesce(excluded.grade, public.student_signup_crm_leads.grade),
      lifecycle_status = case
        when public.student_signup_crm_leads.lifecycle_status = 'active' then 'active'
        else excluded.lifecycle_status
      end,
      auth_user_id = coalesce(excluded.auth_user_id, public.student_signup_crm_leads.auth_user_id),
      notes = coalesce(excluded.notes, public.student_signup_crm_leads.notes),
      last_seen_at = now(),
      updated_at = now()
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.upsert_student_signup_crm_lead(text, text, text, text, text, text, text, uuid, text) from public;
grant execute on function public.upsert_student_signup_crm_lead(text, text, text, text, text, text, text, uuid, text) to anon;
grant execute on function public.upsert_student_signup_crm_lead(text, text, text, text, text, text, text, uuid, text) to authenticated;
grant execute on function public.upsert_student_signup_crm_lead(text, text, text, text, text, text, text, uuid, text) to service_role;

commit;
