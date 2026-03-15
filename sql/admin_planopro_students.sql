begin;

drop function if exists public.list_plan_pro_students_admin();
create or replace function public.list_plan_pro_students_admin()
returns table (
  id uuid,
  full_name text,
  grade text,
  class_name text,
  role text,
  plan_tier text,
  plan_pro_active boolean,
  pro_source text
)
language sql
security definer
set search_path = public
as $$
  with plan_pro_events as (
    select distinct e.user_id
    from public.xp_events e
    where e.source_ref like 'asaas_planopro_bonus_2026_%'
       or e.source_ref like 'asaas_pro_payment_%'
       or lower(coalesce(e.note, '')) like '%plano pro%'
  )
  select
    p.id,
    p.full_name,
    p.grade,
    p.class_name,
    coalesce(p.role, 'student') as role,
    coalesce(lower(p.plan_tier), 'free') as plan_tier,
    coalesce(p.plan_pro_active, false) as plan_pro_active,
    case
      when coalesce(p.plan_pro_active, false) or coalesce(lower(p.plan_tier), 'free') = 'pro' then 'profile'
      when pe.user_id is not null then 'xp_event'
      else 'unknown'
    end as pro_source
  from public.profiles p
  left join plan_pro_events pe on pe.user_id = p.id
  where exists (
      select 1
      from public.profiles actor
      where actor.id = auth.uid()
        and coalesce(lower(actor.role), 'student') in ('admin', 'coord', 'gestao')
    )
    and coalesce(lower(p.role), 'student') not in ('coord', 'gestao', 'teacher')
    and (
      coalesce(p.plan_pro_active, false)
      or coalesce(lower(p.plan_tier), 'free') = 'pro'
      or pe.user_id is not null
    )
  order by p.full_name asc nulls last;
$$;

revoke all on function public.list_plan_pro_students_admin() from public;
grant execute on function public.list_plan_pro_students_admin() to authenticated;
grant execute on function public.list_plan_pro_students_admin() to service_role;

commit;
