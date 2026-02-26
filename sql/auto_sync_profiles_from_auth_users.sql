-- Sincroniza public.profiles automaticamente a partir de auth.users
-- 1) Trigger em INSERT/UPDATE de auth.users
-- 2) Backfill para usuários já existentes

begin;

create or replace function public.sync_profile_from_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_full_name text;
  v_display_name text;
  v_subject_area text;
  v_grade text;
  v_role text;
begin
  v_full_name := nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', '')), '');
  if v_full_name is null then
    v_full_name := split_part(coalesce(new.email, 'aluno'), '@', 1);
  end if;

  v_display_name := nullif(trim(coalesce(new.raw_user_meta_data->>'display_name', '')), '');
  v_subject_area := nullif(trim(coalesce(new.raw_user_meta_data->>'subject_area', '')), '');
  v_grade := nullif(trim(coalesce(new.raw_user_meta_data->>'grade', '')), '');
  v_role := lower(nullif(trim(coalesce(new.raw_user_meta_data->>'role', '')), ''));
  if v_role not in ('admin', 'coord', 'gestao', 'teacher', 'student') then
    v_role := 'student';
  end if;

  insert into public.profiles (id, full_name, display_name, subject_area, grade, role, updated_at)
  values (new.id, v_full_name, v_display_name, v_subject_area, v_grade, v_role, now())
  on conflict (id) do update
  set full_name = excluded.full_name,
      display_name = excluded.display_name,
      subject_area = excluded.subject_area,
      grade = excluded.grade,
      role = excluded.role,
      updated_at = now();

  return new;
end;
$$;

drop trigger if exists trg_sync_profile_from_auth_user on auth.users;
create trigger trg_sync_profile_from_auth_user
after insert or update on auth.users
for each row
execute function public.sync_profile_from_auth_user();

-- Backfill dos usuários atuais
insert into public.profiles (id, full_name, display_name, subject_area, grade, role, updated_at)
select
  u.id,
  coalesce(
    nullif(trim(u.raw_user_meta_data->>'full_name'), ''),
    split_part(coalesce(u.email, 'aluno'), '@', 1)
  ) as full_name,
  nullif(trim(u.raw_user_meta_data->>'display_name'), '') as display_name,
  nullif(trim(u.raw_user_meta_data->>'subject_area'), '') as subject_area,
  nullif(trim(u.raw_user_meta_data->>'grade'), '') as grade,
  case
    when lower(coalesce(u.raw_user_meta_data->>'role', '')) in ('admin', 'coord', 'gestao', 'teacher', 'student')
      then lower(u.raw_user_meta_data->>'role')
    else 'student'
  end as role,
  now()
from auth.users u
on conflict (id) do update
set full_name = excluded.full_name,
    display_name = excluded.display_name,
    subject_area = excluded.subject_area,
    grade = excluded.grade,
    role = excluded.role,
    updated_at = now();

commit;
