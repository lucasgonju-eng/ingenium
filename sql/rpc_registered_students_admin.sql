-- RPCs para leitura de alunos/ranking sem bloqueio por RLS de profiles
-- Execute este SQL no Supabase SQL Editor.

begin;

create or replace function public.get_registered_students_admin()
returns table (
  id uuid,
  full_name text,
  grade text,
  avatar_url text,
  role text
)
language sql
security definer
set search_path = public
as $$
  select
    p.id,
    p.full_name,
    p.grade,
    p.avatar_url,
    p.role
  from public.profiles p
  where coalesce(lower(p.role), 'student') = 'student'
    and coalesce(p.is_active, true) = true
  order by p.full_name asc nulls last;
$$;

revoke all on function public.get_registered_students_admin() from public;
grant execute on function public.get_registered_students_admin() to authenticated;
grant execute on function public.get_registered_students_admin() to service_role;

create or replace function public.get_registered_students_ranking_admin(p_limit integer default 500)
returns table (
  id uuid,
  full_name text,
  avatar_url text,
  grade text,
  role text,
  total_points bigint,
  lobo_class text
)
language sql
security definer
set search_path = public
as $$
  select
    p.id,
    p.full_name,
    p.avatar_url,
    p.grade,
    p.role,
    coalesce(pt.total_points, 0)::bigint as total_points,
    coalesce(pt.lobo_class, 'bronze')::text as lobo_class
  from public.profiles p
  left join public.points pt on pt.user_id = p.id
  where coalesce(lower(p.role), 'student') = 'student'
    and coalesce(p.is_active, true) = true
  order by p.full_name asc nulls last
  limit greatest(1, least(coalesce(p_limit, 500), 2000));
$$;

revoke all on function public.get_registered_students_ranking_admin(integer) from public;
grant execute on function public.get_registered_students_ranking_admin(integer) to authenticated;
grant execute on function public.get_registered_students_ranking_admin(integer) to service_role;

commit;
