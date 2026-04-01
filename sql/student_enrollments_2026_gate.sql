begin;

alter table public.profiles
  add column if not exists enrollment_number text;

create table if not exists public.student_enrollments_2026 (
  id uuid primary key default gen_random_uuid(),
  enrollment_number text not null,
  full_name text not null,
  full_name_normalized text not null,
  school_year integer not null default 2026,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_student_enrollments_2026_number unique (enrollment_number),
  constraint ck_student_enrollments_2026_name check (char_length(trim(full_name)) >= 3),
  constraint ck_student_enrollments_2026_year check (school_year = 2026)
);

alter table public.student_enrollments_2026 enable row level security;

drop policy if exists student_enrollments_2026_deny_all on public.student_enrollments_2026;
create policy student_enrollments_2026_deny_all
  on public.student_enrollments_2026
  for all
  using (false)
  with check (false);

create or replace function public.normalize_student_name(p_name text)
returns text
language sql
immutable
as $$
  select regexp_replace(
    lower(
      trim(
        translate(
          coalesce(p_name, ''),
          'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇçÑñ',
          'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNn'
        )
      )
    ),
    '\s+',
    ' ',
    'g'
  );
$$;

create or replace function public.normalize_enrollment_number(p_value text)
returns text
language sql
immutable
as $$
  select case
    when regexp_replace(coalesce(p_value, ''), '\D', '', 'g') = '' then ''
    else regexp_replace(
      ltrim(regexp_replace(coalesce(p_value, ''), '\D', '', 'g'), '0'),
      '^$',
      '0'
    )
  end;
$$;

create or replace function public.list_student_enrollments_2026_admin()
returns table (
  id uuid,
  enrollment_number text,
  full_name text,
  school_year integer,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    se.id,
    se.enrollment_number,
    se.full_name,
    se.school_year,
    se.created_at,
    se.updated_at
  from public.student_enrollments_2026 se
  where exists (
      select 1
      from public.profiles actor
      where actor.id = auth.uid()
        and coalesce(lower(actor.role), 'student') = 'admin'
    )
  order by se.full_name asc;
$$;

revoke all on function public.list_student_enrollments_2026_admin() from public;
grant execute on function public.list_student_enrollments_2026_admin() to authenticated;
grant execute on function public.list_student_enrollments_2026_admin() to service_role;

create or replace function public.import_student_enrollments_2026_admin(
  p_rows jsonb
)
returns table (
  imported_count integer,
  updated_count integer,
  total_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_role text;
  v_item jsonb;
  v_number text;
  v_name text;
  v_norm text;
  v_existing_id uuid;
  v_ins integer := 0;
  v_upd integer := 0;
  v_total integer := 0;
begin
  select coalesce(lower(role), 'student')
    into v_actor_role
  from public.profiles
  where id = auth.uid();

  if v_actor_role <> 'admin' then
    raise exception 'Sem permissão para importar matrículas 2026.';
  end if;

  if jsonb_typeof(p_rows) <> 'array' then
    raise exception 'Formato inválido para importação. Envie um array JSON.';
  end if;

  for v_item in
    select value from jsonb_array_elements(p_rows)
  loop
    v_number := public.normalize_enrollment_number(v_item->>'enrollment_number');
    v_name := trim(coalesce(v_item->>'full_name', ''));
    v_norm := public.normalize_student_name(v_name);

    if v_number = '' or v_name = '' then
      continue;
    end if;

    select se.id
      into v_existing_id
    from public.student_enrollments_2026 se
    where public.normalize_enrollment_number(se.enrollment_number) = v_number
      and se.school_year = 2026
    limit 1;

    if v_existing_id is null then
      insert into public.student_enrollments_2026 (
        enrollment_number,
        full_name,
        full_name_normalized,
        school_year,
        updated_at
      )
      values (
        v_number,
        v_name,
        v_norm,
        2026,
        now()
      );
      v_ins := v_ins + 1;
    else
      update public.student_enrollments_2026 se
      set enrollment_number = v_number,
          full_name = v_name,
          full_name_normalized = v_norm,
          school_year = 2026,
          updated_at = now()
      where se.id = v_existing_id;
      v_upd := v_upd + 1;
    end if;
    v_total := v_total + 1;
  end loop;

  return query select v_ins, v_upd, v_total;
end;
$$;

revoke all on function public.import_student_enrollments_2026_admin(jsonb) from public;
grant execute on function public.import_student_enrollments_2026_admin(jsonb) to authenticated;
grant execute on function public.import_student_enrollments_2026_admin(jsonb) to service_role;

create or replace function public.validate_student_enrollment_2026(
  p_full_name text,
  p_enrollment_number text
)
returns table (
  is_match boolean,
  reason text,
  matched_name text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_number text;
  v_name text;
  v_norm text;
  v_row public.student_enrollments_2026%rowtype;
begin
  v_number := public.normalize_enrollment_number(p_enrollment_number);
  v_name := trim(coalesce(p_full_name, ''));
  v_norm := public.normalize_student_name(v_name);

  if v_number = '' then
    return query select false, 'Número de matrícula obrigatório.', null::text;
    return;
  end if;

  if v_norm = '' then
    return query select false, 'Nome completo obrigatório.', null::text;
    return;
  end if;

  select *
    into v_row
  from public.student_enrollments_2026 se
  where public.normalize_enrollment_number(se.enrollment_number) = v_number
    and se.school_year = 2026
  limit 1;

  if not found then
    return query select false, 'Matrícula não encontrada na base 2026.', null::text;
    return;
  end if;

  if v_row.full_name_normalized <> v_norm then
    return query select false, 'O número de matrícula não corresponde ao nome informado.', v_row.full_name;
    return;
  end if;

  return query select true, 'OK', v_row.full_name;
end;
$$;

revoke all on function public.validate_student_enrollment_2026(text, text) from public;
grant execute on function public.validate_student_enrollment_2026(text, text) to authenticated;
grant execute on function public.validate_student_enrollment_2026(text, text) to anon;
grant execute on function public.validate_student_enrollment_2026(text, text) to service_role;

commit;
