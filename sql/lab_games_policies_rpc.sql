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
  v_attempt_id uuid;
begin
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
    auth.uid(),
    now()::date,
    greatest(1, least(p_attempt_number, 3)),
    now(),
    now(),
    'completed',
    greatest(0, least(p_hits, 4)),
    4,
    greatest(0, p_xp_base),
    greatest(0, p_xp_streak_bonus),
    greatest(0, p_xp_awarded),
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_attempt_id;

  return v_attempt_id;
end;
$$;

revoke all on function public.upsert_wolf_attempt_result(int, int, int, int, int, jsonb) from public;
grant execute on function public.upsert_wolf_attempt_result(int, int, int, int, int, jsonb) to authenticated, service_role;

commit;

