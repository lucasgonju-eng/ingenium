begin;

create or replace function public.get_lab_games_ranking_student(
  p_scope text default 'total',
  p_limit int default 500
)
returns table (
  rank int,
  user_id uuid,
  full_name text,
  avatar_url text,
  grade text,
  segment text,
  lab_points int,
  lobo_class text,
  is_current_user boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_scope text := coalesce(lower(trim(p_scope)), 'total');
  v_limit int := greatest(1, least(coalesce(p_limit, 500), 2000));
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  if v_scope not in ('total', 'weekly', 'fundamental', 'medio') then
    raise exception 'invalid_scope';
  end if;

  return query
  with week_window as (
    select date_trunc('week', now())::timestamptz as week_start
  ),
  students as (
    select
      p.id as user_id,
      p.full_name,
      p.avatar_url,
      p.grade,
      case
        when coalesce(p.grade, '') ilike '%ano%' then 'fundamental'
        when coalesce(p.grade, '') ilike '%serie%' then 'medio'
        else 'fundamental'
      end as segment
    from public.profiles p
    left join auth.users u on u.id = p.id
    where coalesce(lower(p.role), 'student') = 'student'
      and coalesce(p.is_active, true) = true
      and coalesce(lower(u.raw_user_meta_data->>'teacher_pending'), 'false') <> 'true'
  ),
  total_points as (
    select
      a.user_id,
      coalesce(sum(a.xp_awarded), 0)::int as total_xp
    from public.game_attempts a
    where a.game_id = 'game_teste_dos_lobos'
      and a.status = 'completed'
    group by a.user_id
  ),
  weekly_points as (
    select
      a.user_id,
      coalesce(sum(a.xp_awarded), 0)::int as weekly_xp
    from public.game_attempts a
    cross join week_window w
    where a.game_id = 'game_teste_dos_lobos'
      and a.status = 'completed'
      and a.completed_at >= w.week_start
      and a.completed_at < (w.week_start + interval '7 days')
    group by a.user_id
  ),
  scored as (
    select
      s.user_id,
      s.full_name,
      s.avatar_url,
      s.grade,
      s.segment,
      case
        when v_scope = 'weekly' then coalesce(wp.weekly_xp, 0)
        else coalesce(tp.total_xp, 0)
      end::int as lab_points
    from students s
    left join total_points tp on tp.user_id = s.user_id
    left join weekly_points wp on wp.user_id = s.user_id
    where
      (v_scope = 'fundamental' and s.segment = 'fundamental')
      or (v_scope = 'medio' and s.segment = 'medio')
      or (v_scope in ('total', 'weekly'))
  ),
  ranked as (
    select
      row_number() over (
        order by sc.lab_points desc, coalesce(sc.full_name, '') asc
      )::int as rank,
      sc.user_id,
      sc.full_name,
      sc.avatar_url,
      sc.grade,
      sc.segment,
      sc.lab_points,
      case
        when sc.lab_points >= 20000 then 'gold'
        when sc.lab_points >= 8000 then 'silver'
        else 'bronze'
      end::text as lobo_class,
      (sc.user_id = v_uid) as is_current_user
    from scored sc
  )
  select
    r.rank,
    r.user_id,
    r.full_name,
    r.avatar_url,
    r.grade,
    r.segment,
    r.lab_points,
    r.lobo_class,
    r.is_current_user
  from ranked r
  order by r.rank asc
  limit v_limit;
end;
$$;

revoke all on function public.get_lab_games_ranking_student(text, int) from public;
grant execute on function public.get_lab_games_ranking_student(text, int) to authenticated, service_role;

commit;
