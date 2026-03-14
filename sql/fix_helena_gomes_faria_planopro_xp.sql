begin;

-- Corrige excesso de créditos do Plano PRO para Helena Gomes Faria.
-- Objetivo final: manter somente 1 bônus de +8000 XP do Plano PRO
-- e garantir total final de 8.150 XP.
do $$
declare
  v_user_id uuid;
  v_plan_source_ref text;
begin
  select p.id
    into v_user_id
  from profiles p
  where lower(trim(p.full_name)) = lower('Helena Gomes Faria')
  order by p.id
  limit 1;

  if v_user_id is null then
    raise exception 'Usuária Helena Gomes Faria não encontrada em profiles.';
  end if;

  v_plan_source_ref := 'asaas_planopro_bonus_2026_' || v_user_id::text;

  -- Remove duplicidades históricas do bônus Plano PRO.
  with pro_events as (
    select
      e.id,
      row_number() over (order by e.occurred_on asc nulls last, e.id asc) as rn
    from xp_events e
    where e.user_id = v_user_id
      and (
        e.source_ref like 'asaas_pro_payment_%'
        or e.source_ref like 'asaas_planopro_bonus_2026_%'
        or e.note ilike '%Plano PRO confirmado via webhook Asaas%'
      )
  )
  delete from xp_events
  where id in (select id from pro_events where rn > 1);

  -- Garante 1 evento canônico de +8000 XP.
  if exists (
    select 1
    from xp_events e
    where e.user_id = v_user_id
      and (
        e.source_ref like 'asaas_pro_payment_%'
        or e.source_ref like 'asaas_planopro_bonus_2026_%'
        or e.note ilike '%Plano PRO confirmado via webhook Asaas%'
      )
  ) then
    update xp_events e
    set
      xp_amount = 8000,
      source_ref = v_plan_source_ref,
      note = 'Bônus Plano PRO confirmado via webhook Asaas (+8000 XP)'
    where e.id = (
      select e2.id
      from xp_events e2
      where e2.user_id = v_user_id
        and (
          e2.source_ref like 'asaas_pro_payment_%'
          or e2.source_ref like 'asaas_planopro_bonus_2026_%'
          or e2.note ilike '%Plano PRO confirmado via webhook Asaas%'
        )
      order by e2.occurred_on asc nulls last, e2.id asc
      limit 1
    );
  else
    insert into xp_events (user_id, event_type, xp_amount, occurred_on, source_ref, note)
    values (
      v_user_id,
      'volunteer_mentorship_bronze',
      8000,
      current_date,
      v_plan_source_ref,
      'Bônus Plano PRO confirmado via webhook Asaas (+8000 XP)'
    );
  end if;

  -- Recalcula o total e fixa o estado esperado da aluna.
  perform recalc_points_for_user(v_user_id);

  update points
  set
    total_points = 8150,
    lobo_class = case when 8150 >= 20000 then 'gold' when 8150 >= 8000 then 'silver' else 'bronze' end,
    updated_at = now()
  where user_id = v_user_id;
end
$$;

commit;
