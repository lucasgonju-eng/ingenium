begin;

-- =========================
-- Lab Games: RLS + RPC
-- =========================

alter table public.games enable row level security;
alter table public.game_configs enable row level security;
alter table public.game_publications enable row level security;
alter table public.game_attempts enable row level security;
alter table public.game_daily_results enable row level security;
alter table public.game_questions enable row level security;
alter table public.game_events enable row level security;
alter table public.game_progress enable row level security;
alter table public.game_percentiles enable row level security;
alter table public.game_ai_generations enable row level security;

drop policy if exists games_deny_all on public.games;
create policy games_deny_all on public.games for all using (false) with check (false);

drop policy if exists game_configs_deny_all on public.game_configs;
create policy game_configs_deny_all on public.game_configs for all using (false) with check (false);

drop policy if exists game_publications_deny_all on public.game_publications;
create policy game_publications_deny_all on public.game_publications for all using (false) with check (false);

drop policy if exists game_attempts_deny_all on public.game_attempts;
create policy game_attempts_deny_all on public.game_attempts for all using (false) with check (false);

drop policy if exists game_daily_results_deny_all on public.game_daily_results;
create policy game_daily_results_deny_all on public.game_daily_results for all using (false) with check (false);

drop policy if exists game_questions_deny_all on public.game_questions;
create policy game_questions_deny_all on public.game_questions for all using (false) with check (false);

drop policy if exists game_events_deny_all on public.game_events;
create policy game_events_deny_all on public.game_events for all using (false) with check (false);

drop policy if exists game_progress_deny_all on public.game_progress;
create policy game_progress_deny_all on public.game_progress for all using (false) with check (false);

drop policy if exists game_percentiles_deny_all on public.game_percentiles;
create policy game_percentiles_deny_all on public.game_percentiles for all using (false) with check (false);

drop policy if exists game_ai_generations_deny_all on public.game_ai_generations;
create policy game_ai_generations_deny_all on public.game_ai_generations for all using (false) with check (false);

create or replace function public.is_admin_actor()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and coalesce(lower(p.role), 'student') = 'admin'
  );
$$;

revoke all on function public.is_admin_actor() from public;
grant execute on function public.is_admin_actor() to authenticated, service_role;

create or replace function public.list_lab_games_admin()
returns table (
  game_id text,
  slug text,
  title text,
  subtitle text,
  description text,
  status text,
  published boolean,
  visibility_rule text,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    g.id as game_id,
    g.slug,
    g.title,
    g.subtitle,
    g.description,
    g.status,
    gp.published,
    gp.visibility_rule,
    g.updated_at
  from public.games g
  left join public.game_publications gp
    on gp.game_id = g.id
  where public.is_admin_actor()
  order by g.updated_at desc;
$$;

revoke all on function public.list_lab_games_admin() from public;
grant execute on function public.list_lab_games_admin() to authenticated, service_role;

create or replace function public.set_lab_game_status_admin(
  p_game_id text,
  p_status text,
  p_publish boolean default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
begin
  if not public.is_admin_actor() then
    raise exception 'forbidden';
  end if;

  v_status := coalesce(lower(trim(p_status)), '');
  if v_status not in ('development', 'internal_test', 'published', 'paused') then
    raise exception 'invalid_status';
  end if;

  update public.games
  set status = v_status,
      updated_at = now()
  where id = p_game_id;

  insert into public.game_publications (game_id, published, visibility_rule, updated_at)
  values (
    p_game_id,
    coalesce(p_publish, v_status = 'published'),
    case when coalesce(p_publish, v_status = 'published') then 'eligible_students' else 'admin_only' end,
    now()
  )
  on conflict (game_id) do update
    set
      published = excluded.published,
      visibility_rule = excluded.visibility_rule,
      published_at = case when excluded.published then now() else public.game_publications.published_at end,
      published_by = case when excluded.published then auth.uid() else public.game_publications.published_by end,
      paused_at = case when not excluded.published then now() else null end,
      paused_by = case when not excluded.published then auth.uid() else null end,
      updated_at = now();

  return p_game_id;
end;
$$;

revoke all on function public.set_lab_game_status_admin(text, text, boolean) from public;
grant execute on function public.set_lab_game_status_admin(text, text, boolean) to authenticated, service_role;

create or replace function public.get_wolf_game_config_admin()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select to_jsonb(cfg)
  from (
    select
      c.attempts_per_day,
      c.cooldown_minutes,
      c.daily_xp_cap,
      c.xp_base_by_hits,
      c.streak_bonus,
      c.timers_by_band,
      c.progression_rules
    from public.game_configs c
    where c.game_id = 'game_teste_dos_lobos'
    order by c.created_at desc
    limit 1
  ) cfg
  where public.is_admin_actor();
$$;

revoke all on function public.get_wolf_game_config_admin() from public;
grant execute on function public.get_wolf_game_config_admin() to authenticated, service_role;

create or replace function public.list_published_games_for_students()
returns table (
  game_id text,
  slug text,
  title text,
  subtitle text,
  status text
)
language sql
security definer
set search_path = public
as $$
  select
    g.id as game_id,
    g.slug,
    g.title,
    g.subtitle,
    g.status
  from public.games g
  join public.game_publications gp on gp.game_id = g.id
  where gp.published = true
    and gp.visibility_rule = 'eligible_students'
    and g.status = 'published'
  order by g.updated_at desc;
$$;

revoke all on function public.list_published_games_for_students() from public;
grant execute on function public.list_published_games_for_students() to authenticated, service_role;

create or replace function public.upsert_wolf_attempt_result(
  p_attempt_number int,
  p_hits int,
  p_xp_base int,
  p_xp_streak_bonus int,
  p_xp_awarded int,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_attempt_number int := greatest(1, least(p_attempt_number, 8));
  v_hits int := greatest(0, least(p_hits, 4));
  v_xp_awarded int := greatest(0, p_xp_awarded);
  v_attempt_id uuid;
  v_xp_source_ref text;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  perform pg_advisory_xact_lock(hashtext(format('wolf_attempt:%s:%s:%s', v_uid::text, now()::date::text, v_attempt_number::text)));

  select a.id
    into v_attempt_id
  from public.game_attempts a
  where a.game_id = 'game_teste_dos_lobos'
    and a.user_id = v_uid
    and a.attempt_date = now()::date
    and a.attempt_number = v_attempt_number
    and a.status = 'completed'
  order by a.completed_at desc
  limit 1;

  if v_attempt_id is null then
  insert into public.game_attempts (
    game_id,
    user_id,
    attempt_date,
    attempt_number,
    started_at,
    completed_at,
    status,
    hits,
    total_questions,
    xp_base,
    xp_streak_bonus,
    xp_awarded,
    metadata
  )
  values (
    'game_teste_dos_lobos',
    v_uid,
    now()::date,
    v_attempt_number,
    now(),
    now(),
    'completed',
    v_hits,
    4,
    greatest(0, p_xp_base),
    greatest(0, p_xp_streak_bonus),
    v_xp_awarded,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_attempt_id;
  end if;

  v_xp_source_ref := format('wolf_attempt_%s', v_attempt_id::text);

  if v_xp_awarded > 0 then
    insert into public.xp_events (
      user_id,
      event_type,
      xp_amount,
      occurred_on,
      source_ref,
      note,
      created_by
    )
    select
      v_uid,
      'wolf_game_attempt',
      v_xp_awarded,
      now()::date,
      v_xp_source_ref,
      format('Teste dos Lobos rodada %s: %s/4 acertos', v_attempt_number, v_hits),
      v_uid
    where not exists (
      select 1
      from public.xp_events e
      where e.user_id = v_uid
        and e.source_ref = v_xp_source_ref
    );
  end if;

  return v_attempt_id;
end;
$$;

revoke all on function public.upsert_wolf_attempt_result(int, int, int, int, int, jsonb) from public;
grant execute on function public.upsert_wolf_attempt_result(int, int, int, int, int, jsonb) to authenticated, service_role;

create or replace function public.get_wolf_attempt_gate()
returns table (
  is_plan_pro boolean,
  plan_tier text,
  attempts_per_day_base int,
  attempts_per_day_effective int,
  attempts_used_today int,
  attempts_remaining int,
  cooldown_minutes int,
  latest_attempt_finished_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cfg record;
  v_profile jsonb;
  v_is_plan_pro boolean := false;
  v_plan_tier text := 'free';
  v_attempts_used int := 0;
  v_latest_finished_at timestamptz := null;
  v_base int := 4;
  v_effective int := 4;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select c.attempts_per_day, c.cooldown_minutes
    into v_cfg
  from public.game_configs c
  where c.game_id = 'game_teste_dos_lobos'
  order by c.created_at desc
  limit 1;

  if found then
    v_base := greatest(1, coalesce(v_cfg.attempts_per_day, 4));
  end if;

  select to_jsonb(p)
    into v_profile
  from public.profiles p
  where p.id = auth.uid();

  v_plan_tier := lower(coalesce(v_profile ->> 'plan_tier', 'free'));
  v_is_plan_pro := coalesce((v_profile ->> 'plan_pro_active')::boolean, false) or v_plan_tier = 'pro';
  v_effective := case when v_is_plan_pro then v_base * 2 else v_base end;

  select
    count(*)::int,
    max(a.completed_at)
  into
    v_attempts_used,
    v_latest_finished_at
  from public.game_attempts a
  where a.game_id = 'game_teste_dos_lobos'
    and a.user_id = auth.uid()
    and a.attempt_date = now()::date
    and a.status = 'completed';

  return query
  select
    v_is_plan_pro,
    case when v_is_plan_pro then 'pro' else 'free' end as plan_tier,
    v_base as attempts_per_day_base,
    v_effective as attempts_per_day_effective,
    v_attempts_used as attempts_used_today,
    greatest(0, v_effective - v_attempts_used) as attempts_remaining,
    coalesce(v_cfg.cooldown_minutes, 10)::int as cooldown_minutes,
    v_latest_finished_at as latest_attempt_finished_at;
end;
$$;

revoke all on function public.get_wolf_attempt_gate() from public;
grant execute on function public.get_wolf_attempt_gate() to authenticated, service_role;

create or replace function public.get_wolf_weekly_ranking_student(p_limit int default 5)
returns table (
  rank int,
  user_id uuid,
  full_name text,
  weekly_xp int,
  is_current_user boolean,
  is_public boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_limit int := greatest(1, least(coalesce(p_limit, 5), 10));
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  return query
  with week_window as (
    select date_trunc('week', now())::timestamptz as week_start
  ),
  students as (
    select
      p.id as user_id,
      p.full_name
    from public.profiles p
    where coalesce(lower(p.role), 'student') = 'student'
      and coalesce(p.is_active, true) = true
  ),
  weekly_points as (
    select
      s.user_id,
      s.full_name,
      coalesce(sum(a.xp_awarded), 0)::int as weekly_xp
    from students s
    cross join week_window w
    left join public.game_attempts a
      on a.user_id = s.user_id
     and a.game_id = 'game_teste_dos_lobos'
     and a.status = 'completed'
     and a.completed_at >= w.week_start
     and a.completed_at < (w.week_start + interval '7 days')
    group by s.user_id, s.full_name
  ),
  ranked as (
    select
      row_number() over (
        order by wp.weekly_xp desc, coalesce(wp.full_name, '') asc
      )::int as rank,
      wp.user_id,
      wp.full_name,
      wp.weekly_xp
    from weekly_points wp
  ),
  top_rows as (
    select
      r.rank,
      r.user_id,
      r.full_name,
      r.weekly_xp,
      (r.user_id = v_uid) as is_current_user,
      true as is_public
    from ranked r
    where r.rank <= v_limit
  ),
  my_row as (
    select
      r.rank,
      r.user_id,
      r.full_name,
      r.weekly_xp,
      true as is_current_user,
      false as is_public
    from ranked r
    where r.user_id = v_uid
      and r.rank > v_limit
  )
  select * from top_rows
  union all
  select * from my_row
  order by rank asc;
end;
$$;

revoke all on function public.get_wolf_weekly_ranking_student(int) from public;
grant execute on function public.get_wolf_weekly_ranking_student(int) to authenticated, service_role;

alter table public.xp_events
  drop constraint if exists xp_events_event_type_check;

alter table public.xp_events
  add constraint xp_events_event_type_check
  check (
    event_type in (
      'top10_school_simulado',
      'weekly_study_group_75_presence',
      'volunteer_mentorship_bronze',
      'perfect_quarter_attendance',
      'profile_photo_upload',
      'complete_profile_data',
      'wolf_game_attempt'
    )
  );

commit;

