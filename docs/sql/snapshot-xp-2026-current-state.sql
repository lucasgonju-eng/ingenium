-- Snapshot de auditoria (estado atual após migration de XP institucional 2026)
-- Objetivo: registrar lógica vigente de classificação, ranking e gatilhos.

-- =====================================================
-- Views de ranking
-- =====================================================

create or replace view public.v_ranking_geral as
select
  p.user_id,
  pr.full_name,
  pr.grade,
  pr.class_name,
  p.total_points,
  p.lobo_class,
  dense_rank() over (order by p.total_points desc) as rank
from public.points p
join public.profiles pr on pr.id = p.user_id
order by p.total_points desc;

create or replace view public.v_ranking_olympiad as
with scored as (
  select
    r.olympiad_id,
    r.user_id,
    sum(
      case r.medal
        when 'gold' then 100
        when 'silver' then 60
        when 'bronze' then 35
        when 'none' then 10
        else 0
      end
    )::integer as points_in_olympiad,
    sum((r.medal = 'gold')::integer) as gold_count,
    sum((r.medal = 'silver')::integer) as silver_count,
    sum((r.medal = 'bronze')::integer) as bronze_count,
    sum((r.medal = 'none')::integer) as none_count
  from public.results r
  group by r.olympiad_id, r.user_id
)
select
  olympiad_id,
  user_id,
  points_in_olympiad,
  dense_rank() over (partition by olympiad_id order by points_in_olympiad desc, user_id) as position_in_olympiad,
  gold_count,
  silver_count,
  bronze_count,
  none_count
from scored;

create or replace view public.v_ranking_olympiad_public as
select
  v.olympiad_id,
  v.position_in_olympiad,
  v.user_id,
  p.full_name,
  p.avatar_url,
  v.points_in_olympiad,
  v.gold_count,
  v.silver_count,
  v.bronze_count,
  v.none_count,
  pt.lobo_class
from public.v_ranking_olympiad v
join public.profiles p on p.id = v.user_id
left join public.points pt on pt.user_id = v.user_id;

create or replace view public.v_ranking_geral_media as
with per_olympiad as (
  select
    v_ranking_olympiad.olympiad_id,
    v_ranking_olympiad.user_id,
    v_ranking_olympiad.points_in_olympiad
  from public.v_ranking_olympiad
),
per_user as (
  select
    per_olympiad.user_id,
    avg(per_olympiad.points_in_olympiad)::numeric(10,2) as avg_points,
    count(*)::integer as olympiads_count,
    sum(per_olympiad.points_in_olympiad)::integer as total_points_sum
  from per_olympiad
  group by per_olympiad.user_id
),
eligible as (
  select
    per_user.user_id,
    per_user.avg_points,
    per_user.olympiads_count,
    per_user.total_points_sum
  from per_user
  where per_user.olympiads_count >= 2
)
select
  user_id,
  avg_points,
  olympiads_count,
  total_points_sum,
  dense_rank() over (order by avg_points desc, olympiads_count desc, total_points_sum desc, user_id) as position_geral_media
from eligible;

create or replace view public.v_ranking_geral_media_public as
select
  v.position_geral_media,
  v.user_id,
  p.full_name,
  p.avatar_url,
  v.avg_points,
  v.olympiads_count,
  v.total_points_sum,
  pt.lobo_class,
  pt.total_points
from public.v_ranking_geral_media v
join public.profiles p on p.id = v.user_id
left join public.points pt on pt.user_id = v.user_id;

-- =====================================================
-- Funções de XP e recálculo
-- =====================================================

create or replace function public.xp_amount_for_event(p_event_type text)
returns integer
language plpgsql
immutable
as $$
begin
  case p_event_type
    when 'top10_school_simulado' then return 500;
    when 'weekly_study_group_75_presence' then return 800;
    when 'volunteer_mentorship_bronze' then return 2000;
    when 'perfect_quarter_attendance' then return 1200;
    else raise exception 'event_type inválido: %', p_event_type;
  end case;
end;
$$;

create or replace function public.recalc_points_for_user(p_user_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_result_points int;
  v_event_points int;
  v_total int;
  v_class text;
begin
  select coalesce(sum(
    case
      when medal = 'gold' then 100
      when medal = 'silver' then 60
      when medal = 'bronze' then 35
      else 10
    end
  ), 0)
  into v_result_points
  from public.results
  where user_id = p_user_id;

  select coalesce(sum(xp_amount), 0)
  into v_event_points
  from public.xp_events
  where user_id = p_user_id;

  v_total := coalesce(v_result_points, 0) + coalesce(v_event_points, 0);

  if v_total >= 20000 then
    v_class := 'gold';
  elsif v_total >= 8000 then
    v_class := 'silver';
  else
    v_class := 'bronze';
  end if;

  insert into public.points (user_id, total_points, lobo_class, updated_at)
  values (p_user_id, v_total, v_class, now())
  on conflict (user_id)
  do update set
    total_points = excluded.total_points,
    lobo_class = excluded.lobo_class,
    updated_at = now();
end;
$$;

create or replace function public.on_results_changed()
returns trigger
language plpgsql
security definer
as $$
begin
  perform public.recalc_points_for_user(new.user_id);
  return new;
end;
$$;

create or replace function public.on_xp_events_changed()
returns trigger
language plpgsql
security definer
as $$
begin
  if tg_op = 'DELETE' then
    perform public.recalc_points_for_user(old.user_id);
    return old;
  end if;

  perform public.recalc_points_for_user(new.user_id);
  return new;
end;
$$;

-- =====================================================
-- Triggers vigentes
-- =====================================================
drop trigger if exists trg_results_changed on public.results;
create trigger trg_results_changed
after insert or update on public.results
for each row
execute function public.on_results_changed();

drop trigger if exists trg_xp_events_changed on public.xp_events;
create trigger trg_xp_events_changed
after insert or update or delete on public.xp_events
for each row
execute function public.on_xp_events_changed();
