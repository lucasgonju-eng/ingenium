-- Gestão: cadastro de professores e vínculo com olimpíadas.
-- Também expõe RPC de leitura completa de alunos para painéis internos.

begin;

create table if not exists public.teachers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null unique,
  avatar_url text,
  area text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.teacher_olympiad_assignments (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  olympiad_id uuid not null references public.olympiads(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (teacher_id, olympiad_id)
);

create index if not exists idx_teacher_assignments_teacher on public.teacher_olympiad_assignments(teacher_id);
create index if not exists idx_teacher_assignments_olympiad on public.teacher_olympiad_assignments(olympiad_id);

alter table public.teachers enable row level security;
alter table public.teacher_olympiad_assignments enable row level security;

drop policy if exists teachers_select_privileged on public.teachers;
create policy teachers_select_privileged
  on public.teachers
  for select
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and coalesce(lower(p.role), 'student') in ('admin', 'coord', 'gestao')
    )
  );

drop policy if exists teachers_write_privileged on public.teachers;
create policy teachers_write_privileged
  on public.teachers
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
  where coalesce(lower(p.role), 'student') not in ('admin', 'coord', 'gestao')
  order by p.full_name asc nulls last;
$$;

revoke all on function public.get_registered_students_full_admin() from public;
grant execute on function public.get_registered_students_full_admin() to authenticated;
grant execute on function public.get_registered_students_full_admin() to service_role;

create or replace function public.get_teachers_with_olympiads_admin()
returns table (
  id uuid,
  full_name text,
  email text,
  avatar_url text,
  area text,
  assignments jsonb
)
language sql
security definer
set search_path = public
as $$
  select
    t.id,
    t.full_name,
    t.email,
    t.avatar_url,
    t.area,
    coalesce(
      jsonb_agg(
        distinct jsonb_build_object(
          'olympiad_id', o.id,
          'olympiad_title', o.title
        )
      ) filter (where o.id is not null),
      '[]'::jsonb
    ) as assignments
  from public.teachers t
  left join public.teacher_olympiad_assignments ta on ta.teacher_id = t.id
  left join public.olympiads o on o.id = ta.olympiad_id
  group by t.id, t.full_name, t.email, t.avatar_url, t.area
  order by t.full_name asc nulls last;
$$;

revoke all on function public.get_teachers_with_olympiads_admin() from public;
grant execute on function public.get_teachers_with_olympiads_admin() to authenticated;
grant execute on function public.get_teachers_with_olympiads_admin() to service_role;

create or replace function public.create_teacher_admin(
  p_full_name text,
  p_email text,
  p_area text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if coalesce(trim(p_full_name), '') = '' then
    raise exception 'Nome do professor é obrigatório.';
  end if;

  if coalesce(trim(p_email), '') = '' then
    raise exception 'E-mail do professor é obrigatório.';
  end if;

  insert into public.teachers (full_name, email, area, updated_at)
  values (trim(p_full_name), lower(trim(p_email)), nullif(trim(coalesce(p_area, '')), ''), now())
  on conflict (email) do update
  set full_name = excluded.full_name,
      area = excluded.area,
      updated_at = now()
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.create_teacher_admin(text, text, text) from public;
grant execute on function public.create_teacher_admin(text, text, text) to authenticated;
grant execute on function public.create_teacher_admin(text, text, text) to service_role;

create or replace function public.assign_teacher_to_olympiad_admin(
  p_teacher_id uuid,
  p_olympiad_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.teacher_olympiad_assignments (teacher_id, olympiad_id)
  values (p_teacher_id, p_olympiad_id)
  on conflict (teacher_id, olympiad_id) do update
    set olympiad_id = excluded.olympiad_id
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.assign_teacher_to_olympiad_admin(uuid, uuid) from public;
grant execute on function public.assign_teacher_to_olympiad_admin(uuid, uuid) to authenticated;
grant execute on function public.assign_teacher_to_olympiad_admin(uuid, uuid) to service_role;

create or replace function public.remove_teacher_assignment_admin(
  p_teacher_id uuid,
  p_olympiad_id uuid
)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.teacher_olympiad_assignments
  where teacher_id = p_teacher_id
    and olympiad_id = p_olympiad_id;
$$;

revoke all on function public.remove_teacher_assignment_admin(uuid, uuid) from public;
grant execute on function public.remove_teacher_assignment_admin(uuid, uuid) to authenticated;
grant execute on function public.remove_teacher_assignment_admin(uuid, uuid) to service_role;

create or replace function public.delete_teacher_admin(p_teacher_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.teachers where id = p_teacher_id;
$$;

revoke all on function public.delete_teacher_admin(uuid) from public;
grant execute on function public.delete_teacher_admin(uuid) to authenticated;
grant execute on function public.delete_teacher_admin(uuid) to service_role;

commit;
