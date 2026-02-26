-- Inclui avatar_url no teaser público do ranking.
-- Mantém listagem de alunos com 0 XP usando LEFT JOIN em points.

begin;

drop function if exists public.get_public_ranking_teaser(integer);

create function public.get_public_ranking_teaser(p_limit integer default 10)
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
