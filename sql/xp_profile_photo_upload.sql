-- Adiciona evento de XP para foto de perfil (+50) e função de concessão única.

begin;

alter table public.xp_events
  drop constraint if exists xp_events_event_type_check;

do $$
declare
  v_constraint_name text;
begin
  select c.conname
  into v_constraint_name
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'public'
    and t.relname = 'xp_events'
    and c.contype = 'c'
    and pg_get_constraintdef(c.oid) ilike '%event_type in%';

  if v_constraint_name is not null then
    execute format('alter table public.xp_events drop constraint %I', v_constraint_name);
  end if;
end $$;

alter table public.xp_events
  add constraint xp_events_event_type_check
  check (
    event_type in (
      'top10_school_simulado',
      'weekly_study_group_75_presence',
      'volunteer_mentorship_bronze',
      'perfect_quarter_attendance',
      'profile_photo_upload',
      'wolf_game_attempt'
    )
  );

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

create or replace function public.award_profile_photo_xp_once()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_existing uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Usuário não autenticado';
  end if;

  select e.id
  into v_existing
  from public.xp_events e
  where e.user_id = v_user_id
    and e.event_type = 'profile_photo_upload'
  limit 1;

  if v_existing is not null then
    return v_existing;
  end if;

  return public.award_xp_event(
    v_user_id,
    'profile_photo_upload',
    current_date,
    'Inseriu foto de perfil',
    'profile_avatar_upload'
  );
end;
$$;

revoke all on function public.award_profile_photo_xp_once() from public;
grant execute on function public.award_profile_photo_xp_once() to authenticated;
grant execute on function public.award_profile_photo_xp_once() to service_role;

commit;
