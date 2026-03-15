begin;

with plan_pro_from_xp as (
  select distinct e.user_id
  from public.xp_events e
  where (
    e.xp_amount = 8000
    and e.event_type = 'volunteer_mentorship_bronze'
    and (
      e.source_ref like 'asaas_%'
      or e.source_ref like 'manual_backfill_%_8000_2026'
    )
  )
     or e.source_ref like 'asaas_planopro_bonus_2026_%'
     or e.source_ref like 'asaas_pro_payment_%'
     or lower(coalesce(e.note, '')) like '%plano pro%'
)
update public.profiles p
set
  plan_tier = 'pro',
  plan_pro_active = true,
  plan_pro_since = coalesce(p.plan_pro_since, now()),
  plan_pro_source = coalesce(p.plan_pro_source, 'xp_events_backfill_20260315'),
  updated_at = now()
from plan_pro_from_xp x
where p.id = x.user_id
  and (coalesce(p.plan_pro_active, false) = false or coalesce(lower(p.plan_tier), 'free') <> 'pro');

commit;
