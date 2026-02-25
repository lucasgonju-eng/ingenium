-- Atualização institucional do sistema de XP (InGenium 2026)
-- Regras oficiais:
-- - Inserir foto de perfil: +50 XP
-- - Top 10 no Simulado da Escola: +500 XP
-- - Grupo de estudo semanal (>=75% no mês): +800 XP
-- - Monitoria voluntária para Lobo de Bronze: +2000 XP
-- - Frequência perfeita trimestral: +1200 XP
-- Faixas:
-- - Bronze: 0-7999
-- - Prata: 8000-19999
-- - Ouro: 20000+

begin;

create table if not exists public.xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null check (
    event_type in (
      'top10_school_simulado',
      'weekly_study_group_75_presence',
      'volunteer_mentorship_bronze',
      'perfect_quarter_attendance',
      'profile_photo_upload'
    )
  ),
  xp_amount integer not null check (xp_amount > 0),
  occurred_on date not null default current_date,
  source_ref text,
  note text,
  created_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists idx_xp_events_user_id on public.xp_events(user_id);
create index if not exists idx_xp_events_event_type on public.xp_events(event_type);

alter table public.xp_events enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'xp_events'
      and policyname = 'xp_events_select_own'
  ) then
    create policy xp_events_select_own
      on public.xp_events
      for select
      using (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'xp_events'
      and policyname = 'xp_events_write_service_role'
  ) then
    create policy xp_events_write_service_role
      on public.xp_events
      for all
      using (auth.role() = 'service_role')
      with check (auth.role() = 'service_role');
  end if;
end $$;

create or replace function public.xp_amount_for_event(p_event_type text)
returns integer
language plpgsql
immutable
as $$
begin
  case p_event_type
    when 'profile_photo_upload' then
      return 50;
    when 'top10_school_simulado' then
      return 500;
    when 'weekly_study_group_75_presence' then
      return 800;
    when 'volunteer_mentorship_bronze' then
      return 2000;
    when 'perfect_quarter_attendance' then
      return 1200;
    else
      raise exception 'event_type inválido: %', p_event_type;
  end case;
end;
$$;

create or replace function public.award_xp_event(
  p_user_id uuid,
  p_event_type text,
  p_occurred_on date default current_date,
  p_note text default null,
  p_source_ref text default null
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_event_id uuid;
  v_xp integer;
begin
  v_xp := public.xp_amount_for_event(p_event_type);

  insert into public.xp_events (
    user_id,
    event_type,
    xp_amount,
    occurred_on,
    note,
    source_ref,
    created_by
  ) values (
    p_user_id,
    p_event_type,
    v_xp,
    coalesce(p_occurred_on, current_date),
    p_note,
    p_source_ref,
    auth.uid()
  )
  returning id into v_event_id;

  perform public.recalc_points_for_user(p_user_id);

  return v_event_id;
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

drop trigger if exists trg_xp_events_changed on public.xp_events;
create trigger trg_xp_events_changed
after insert or update or delete on public.xp_events
for each row
execute function public.on_xp_events_changed();

with users_to_recalc as (
  select id as user_id from public.profiles
  union
  select distinct user_id from public.results
  union
  select distinct user_id from public.xp_events
)
select public.recalc_points_for_user(user_id)
from users_to_recalc
where user_id is not null;

commit;
