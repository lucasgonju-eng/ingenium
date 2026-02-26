-- Garante que apenas estudantes apareçam nas superfícies de alunos
-- (ranking, listagens e teaser público).

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

create or replace function public.get_public_ranking_teaser(p_limit integer default 10)
returns table (
  rank integer,
  full_name text,
  avatar_url text,
  total_points integer,
  lobo_class text
)
language sql
security definer
set search_path = public
as $$
  with ranked as (
    select
      row_number() over (
        order by coalesce(pt.total_points, 0) desc, coalesce(pr.full_name, '') asc
      )::integer as rank,
      pr.full_name::text as full_name,
      pr.avatar_url::text as avatar_url,
      coalesce(pt.total_points, 0)::integer as total_points,
      coalesce(pt.lobo_class, 'bronze')::text as lobo_class
    from public.profiles pr
    left join public.points pt on pt.user_id = pr.id
    where coalesce(lower(pr.role), 'student') = 'student'
      and coalesce(pr.is_active, true) = true
      and nullif(trim(coalesce(pr.full_name, '')), '') is not null
  )
  select r.rank, r.full_name, r.avatar_url, r.total_points, r.lobo_class
  from ranked r
  order by r.rank asc
  limit greatest(1, least(coalesce(p_limit, 10), 25));
$$;

revoke all on function public.get_public_ranking_teaser(integer) from public;
grant execute on function public.get_public_ranking_teaser(integer) to anon;
grant execute on function public.get_public_ranking_teaser(integer) to authenticated;
grant execute on function public.get_public_ranking_teaser(integer) to service_role;

commit;
