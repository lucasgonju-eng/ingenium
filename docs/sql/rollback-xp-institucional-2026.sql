-- Rollback da atualização institucional de XP 2026
-- Atenção: este rollback remove infraestrutura de xp_events e restaura lógica antiga
-- de classe por resultados (bronze <200, prata >=200, ouro >=500).

begin;

drop trigger if exists trg_xp_events_changed on public.xp_events;
drop function if exists public.on_xp_events_changed();
drop function if exists public.award_xp_event(uuid, text, date, text, text);
drop function if exists public.xp_amount_for_event(text);

create or replace function public.recalc_points_for_user(p_user_id uuid)
returns void
language plpgsql
security definer
as $$
declare
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
  into v_total
  from public.results
  where user_id = p_user_id;

  if v_total >= 500 then
    v_class := 'gold';
  elsif v_total >= 200 then
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

drop table if exists public.xp_events;

with users_to_recalc as (
  select id as user_id from public.profiles
  union
  select distinct user_id from public.results
)
select public.recalc_points_for_user(user_id)
from users_to_recalc
where user_id is not null;

commit;
