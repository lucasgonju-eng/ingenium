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
  pro_source text,
  email text,
  cpf text,
  whatsapp text,
  birth_date text,
  enrollment_number text,
  responsible_name text,
  responsible_phone text,
  responsible_email text,
  responsible_cpf text,
  responsible_relationship text,
  secondary_responsible_name text,
  secondary_responsible_phone text,
  secondary_responsible_email text,
  secondary_responsible_cpf text,
  secondary_responsible_relationship text
)
language sql
security definer
set search_path = public
as $$
  -- Regra de negócio: toda compra de PlanoPro gera +8000 XP.
  -- Mantemos também compatibilidade com formatos legados de source_ref.
  with plan_pro_events as (
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
    end as pro_source,
    lower(nullif(trim(u.email), '')) as email,
    nullif(trim(coalesce(u.raw_user_meta_data->>'cpf', '')), '') as cpf,
    nullif(trim(coalesce(u.raw_user_meta_data->>'whatsapp', '')), '') as whatsapp,
    nullif(trim(coalesce(u.raw_user_meta_data->>'birth_date', '')), '') as birth_date,
    nullif(trim(coalesce(u.raw_user_meta_data->>'enrollment_number', '')), '') as enrollment_number,
    coalesce(
      nullif(trim(u.raw_user_meta_data->>'responsible_name'), ''),
      nullif(trim(u.raw_user_meta_data->>'responsavel_nome'), ''),
      nullif(trim(u.raw_user_meta_data->>'guardian_name'), ''),
      nullif(trim(u.raw_user_meta_data->>'parent_name'), ''),
      nullif(trim(u.raw_user_meta_data->>'nome_responsavel'), '')
    ) as responsible_name,
    coalesce(
      nullif(trim(u.raw_user_meta_data->>'responsible_phone'), ''),
      nullif(trim(u.raw_user_meta_data->>'responsavel_telefone'), ''),
      nullif(trim(u.raw_user_meta_data->>'guardian_phone'), ''),
      nullif(trim(u.raw_user_meta_data->>'parent_phone'), ''),
      nullif(trim(u.raw_user_meta_data->>'telefone_responsavel'), '')
    ) as responsible_phone,
    lower(coalesce(
      nullif(trim(u.raw_user_meta_data->>'responsible_email'), ''),
      nullif(trim(u.raw_user_meta_data->>'responsavel_email'), ''),
      nullif(trim(u.raw_user_meta_data->>'guardian_email'), ''),
      nullif(trim(u.raw_user_meta_data->>'parent_email'), ''),
      nullif(trim(u.raw_user_meta_data->>'email_responsavel'), '')
    )) as responsible_email,
    coalesce(
      nullif(trim(u.raw_user_meta_data->>'responsible_cpf'), ''),
      nullif(trim(u.raw_user_meta_data->>'responsavel_cpf'), ''),
      nullif(trim(u.raw_user_meta_data->>'guardian_cpf'), ''),
      nullif(trim(u.raw_user_meta_data->>'parent_cpf'), ''),
      nullif(trim(u.raw_user_meta_data->>'cpf_responsavel'), '')
    ) as responsible_cpf,
    coalesce(
      nullif(trim(u.raw_user_meta_data->>'responsible_relationship'), ''),
      nullif(trim(u.raw_user_meta_data->>'responsavel_parentesco'), ''),
      nullif(trim(u.raw_user_meta_data->>'guardian_relationship'), ''),
      nullif(trim(u.raw_user_meta_data->>'parent_relationship'), ''),
      nullif(trim(u.raw_user_meta_data->>'parentesco_responsavel'), '')
    ) as responsible_relationship,
    coalesce(
      nullif(trim(u.raw_user_meta_data->>'secondary_responsible_name'), ''),
      nullif(trim(u.raw_user_meta_data->>'responsavel_2_nome'), ''),
      nullif(trim(u.raw_user_meta_data->>'second_guardian_name'), ''),
      nullif(trim(u.raw_user_meta_data->>'second_parent_name'), ''),
      nullif(trim(u.raw_user_meta_data->>'nome_segundo_responsavel'), '')
    ) as secondary_responsible_name,
    coalesce(
      nullif(trim(u.raw_user_meta_data->>'secondary_responsible_phone'), ''),
      nullif(trim(u.raw_user_meta_data->>'responsavel_2_telefone'), ''),
      nullif(trim(u.raw_user_meta_data->>'second_guardian_phone'), ''),
      nullif(trim(u.raw_user_meta_data->>'second_parent_phone'), ''),
      nullif(trim(u.raw_user_meta_data->>'telefone_segundo_responsavel'), '')
    ) as secondary_responsible_phone,
    lower(coalesce(
      nullif(trim(u.raw_user_meta_data->>'secondary_responsible_email'), ''),
      nullif(trim(u.raw_user_meta_data->>'responsavel_2_email'), ''),
      nullif(trim(u.raw_user_meta_data->>'second_guardian_email'), ''),
      nullif(trim(u.raw_user_meta_data->>'second_parent_email'), ''),
      nullif(trim(u.raw_user_meta_data->>'email_segundo_responsavel'), '')
    )) as secondary_responsible_email,
    coalesce(
      nullif(trim(u.raw_user_meta_data->>'secondary_responsible_cpf'), ''),
      nullif(trim(u.raw_user_meta_data->>'responsavel_2_cpf'), ''),
      nullif(trim(u.raw_user_meta_data->>'second_guardian_cpf'), ''),
      nullif(trim(u.raw_user_meta_data->>'second_parent_cpf'), ''),
      nullif(trim(u.raw_user_meta_data->>'cpf_segundo_responsavel'), '')
    ) as secondary_responsible_cpf,
    coalesce(
      nullif(trim(u.raw_user_meta_data->>'secondary_responsible_relationship'), ''),
      nullif(trim(u.raw_user_meta_data->>'responsavel_2_parentesco'), ''),
      nullif(trim(u.raw_user_meta_data->>'second_guardian_relationship'), ''),
      nullif(trim(u.raw_user_meta_data->>'second_parent_relationship'), ''),
      nullif(trim(u.raw_user_meta_data->>'parentesco_segundo_responsavel'), '')
    ) as secondary_responsible_relationship
  from public.profiles p
  left join auth.users u on u.id = p.id
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
