-- SaaS analytics foundation for Admin/Gestao dashboards.
-- Run this in Supabase SQL Editor.

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  user_id uuid null references auth.users(id) on delete set null,
  session_id text null,
  event_name text not null,
  event_source text not null check (event_source in ('app', 'gtm', 'system')),
  page_path text null,
  page_url text null,
  referrer text null,
  device_type text null,
  os_name text null,
  browser_name text null,
  platform text null,
  locale text null,
  timezone text null,
  country text null,
  region text null,
  city text null,
  ip_address inet null,
  payload jsonb not null default '{}'::jsonb
);

create index if not exists analytics_events_occurred_at_idx on public.analytics_events (occurred_at desc);
create index if not exists analytics_events_user_id_idx on public.analytics_events (user_id);
create index if not exists analytics_events_session_id_idx on public.analytics_events (session_id);
create index if not exists analytics_events_event_name_idx on public.analytics_events (event_name);
create index if not exists analytics_events_page_path_idx on public.analytics_events (page_path);
create index if not exists analytics_events_country_idx on public.analytics_events (country);
create index if not exists analytics_events_device_type_idx on public.analytics_events (device_type);

alter table public.analytics_events enable row level security;

drop policy if exists analytics_events_admin_read on public.analytics_events;
create policy analytics_events_admin_read
  on public.analytics_events
  for select
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'gestao')
    )
  );

drop policy if exists analytics_events_no_direct_insert on public.analytics_events;
create policy analytics_events_no_direct_insert
  on public.analytics_events
  for insert
  with check (false);

drop policy if exists analytics_events_no_direct_update on public.analytics_events;
create policy analytics_events_no_direct_update
  on public.analytics_events
  for update
  using (false)
  with check (false);

drop policy if exists analytics_events_no_direct_delete on public.analytics_events;
create policy analytics_events_no_direct_delete
  on public.analytics_events
  for delete
  using (false);

create or replace function public.log_analytics_event(
  p_event_name text,
  p_event_source text default 'app',
  p_session_id text default null,
  p_page_path text default null,
  p_page_url text default null,
  p_referrer text default null,
  p_device_type text default null,
  p_os_name text default null,
  p_browser_name text default null,
  p_platform text default null,
  p_locale text default null,
  p_timezone text default null,
  p_country text default null,
  p_region text default null,
  p_city text default null,
  p_payload jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if coalesce(trim(p_event_name), '') = '' then
    raise exception 'event_name is required';
  end if;

  insert into public.analytics_events (
    user_id,
    event_name,
    event_source,
    session_id,
    page_path,
    page_url,
    referrer,
    device_type,
    os_name,
    browser_name,
    platform,
    locale,
    timezone,
    country,
    region,
    city,
    ip_address,
    payload
  )
  values (
    auth.uid(),
    left(trim(p_event_name), 120),
    case when p_event_source in ('app', 'gtm', 'system') then p_event_source else 'app' end,
    nullif(trim(p_session_id), ''),
    nullif(trim(p_page_path), ''),
    nullif(trim(p_page_url), ''),
    nullif(trim(p_referrer), ''),
    nullif(trim(p_device_type), ''),
    nullif(trim(p_os_name), ''),
    nullif(trim(p_browser_name), ''),
    nullif(trim(p_platform), ''),
    nullif(trim(p_locale), ''),
    nullif(trim(p_timezone), ''),
    nullif(trim(p_country), ''),
    nullif(trim(p_region), ''),
    nullif(trim(p_city), ''),
    inet_client_addr(),
    coalesce(p_payload, '{}'::jsonb)
  )
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.log_analytics_event(
  text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, jsonb
) to anon, authenticated, service_role;

create or replace function public.get_saas_analytics_overview_admin(p_days int default 30)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_days int := greatest(1, least(coalesce(p_days, 30), 180));
  v_since timestamptz := now() - make_interval(days => v_days);
  v_role text;
  v_result jsonb;
begin
  select p.role into v_role
  from public.profiles p
  where p.id = auth.uid()
  limit 1;

  if v_role not in ('admin', 'gestao') then
    raise exception 'forbidden';
  end if;

  with events_window as (
    select *
    from public.analytics_events e
    where e.occurred_at >= v_since
  ),
  top_pages as (
    select coalesce(nullif(page_path, ''), '(sem pagina)') as page_path, count(*) as visits
    from events_window
    group by 1
    order by visits desc
    limit 10
  ),
  peak_hours as (
    select to_char(date_trunc('hour', occurred_at), 'YYYY-MM-DD HH24:00') as hour_slot, count(*) as events
    from events_window
    group by 1
    order by events desc
    limit 8
  ),
  devices as (
    select coalesce(nullif(device_type, ''), 'desconhecido') as device, count(*) as events
    from events_window
    group by 1
    order by events desc
  ),
  countries as (
    select coalesce(nullif(country, ''), 'desconhecido') as country_name, count(*) as events
    from events_window
    group by 1
    order by events desc
    limit 10
  ),
  login_activity as (
    select
      p.id as user_id,
      coalesce(p.full_name, p.id::text) as full_name,
      count(e.id) as accesses
    from public.profiles p
    left join events_window e
      on e.user_id = p.id
      and e.event_name in ('login_success', 'admin_login_success', 'gestao_login_success')
    where p.role in ('student', 'teacher', 'coord', 'gestao', 'admin')
    group by p.id, p.full_name
  ),
  most_accessed as (
    select user_id, full_name, accesses
    from login_activity
    order by accesses desc, full_name asc
    limit 10
  ),
  least_accessed as (
    select user_id, full_name, accesses
    from login_activity
    order by accesses asc, full_name asc
    limit 10
  )
  select jsonb_build_object(
    'period_days', v_days,
    'since_utc', v_since,
    'total_events', (select count(*) from events_window),
    'total_sessions', (select count(distinct session_id) from events_window where session_id is not null),
    'active_users', (select count(distinct user_id) from events_window where user_id is not null),
    'top_pages', coalesce((select jsonb_agg(to_jsonb(tp)) from top_pages tp), '[]'::jsonb),
    'peak_hours', coalesce((select jsonb_agg(to_jsonb(ph)) from peak_hours ph), '[]'::jsonb),
    'devices', coalesce((select jsonb_agg(to_jsonb(dv)) from devices dv), '[]'::jsonb),
    'countries', coalesce((select jsonb_agg(to_jsonb(ct)) from countries ct), '[]'::jsonb),
    'most_accessed_logins', coalesce((select jsonb_agg(to_jsonb(ma)) from most_accessed ma), '[]'::jsonb),
    'least_accessed_logins', coalesce((select jsonb_agg(to_jsonb(la)) from least_accessed la), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

grant execute on function public.get_saas_analytics_overview_admin(int) to authenticated, service_role;
