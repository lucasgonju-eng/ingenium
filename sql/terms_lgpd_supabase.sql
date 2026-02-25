-- TERMOS DE USO E POLITICA DE PRIVACIDADE - INGENIUM EINSTEIN
-- Versao: 1.0
-- Data de vigencia: 24/02/2026
-- SQL completo para trilha de aceite juridicamente auditavel

begin;

create extension if not exists pgcrypto;

create table if not exists public.terms_versions (
  id uuid primary key default gen_random_uuid(),
  version_text text not null,
  effective_at timestamptz not null,
  content text not null,
  content_sha256 text not null unique,
  created_at timestamptz not null default now(),
  created_by uuid null references auth.users(id)
);

create table if not exists public.user_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  terms_version_id uuid not null references public.terms_versions(id) on delete restrict,
  accepted_at timestamptz not null default now(),
  accepted_at_utc timestamptz not null default (now() at time zone 'utc'),
  ip_address inet null,
  user_agent text null,
  device_fingerprint text null,
  app_platform text null,
  app_version text null,
  locale text null,
  consent_checkbox boolean not null default true,
  scrolled_to_end boolean not null default true,
  evidence_json jsonb not null default '{}'::jsonb,
  revoked_at timestamptz null,
  revoked_reason text null,
  constraint user_consents_unique_user_version unique (user_id, terms_version_id),
  constraint user_consents_checkbox_true check (consent_checkbox = true),
  constraint user_consents_scrolled_true check (scrolled_to_end = true)
);

create table if not exists public.consent_audit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references auth.users(id) on delete set null,
  event_type text not null,
  event_at timestamptz not null default now(),
  ip_address inet null,
  user_agent text null,
  meta jsonb not null default '{}'::jsonb
);

create index if not exists idx_user_consents_user_accepted_desc
  on public.user_consents (user_id, accepted_at desc);
create index if not exists idx_user_consents_terms_version
  on public.user_consents (terms_version_id);
create index if not exists idx_user_consents_ip
  on public.user_consents (ip_address);
create index if not exists idx_terms_versions_sha256
  on public.terms_versions (content_sha256);
create index if not exists idx_consent_audit_user_event_desc
  on public.consent_audit_events (user_id, event_at desc);
create index if not exists idx_consent_audit_ip
  on public.consent_audit_events (ip_address);

alter table public.terms_versions enable row level security;
alter table public.user_consents enable row level security;
alter table public.consent_audit_events enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='terms_versions' and policyname='terms_versions_read_authenticated'
  ) then
    create policy terms_versions_read_authenticated
      on public.terms_versions
      for select
      to authenticated
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='terms_versions' and policyname='terms_versions_admin_write'
  ) then
    create policy terms_versions_admin_write
      on public.terms_versions
      for all
      to authenticated
      using (exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role in ('admin','coord')
      ))
      with check (exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role in ('admin','coord')
      ));
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='user_consents' and policyname='user_consents_read_own'
  ) then
    create policy user_consents_read_own
      on public.user_consents
      for select
      to authenticated
      using (user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='user_consents' and policyname='user_consents_insert_own'
  ) then
    create policy user_consents_insert_own
      on public.user_consents
      for insert
      to authenticated
      with check (user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='consent_audit_events' and policyname='consent_audit_read_own'
  ) then
    create policy consent_audit_read_own
      on public.consent_audit_events
      for select
      to authenticated
      using (user_id = auth.uid());
  end if;
end $$;

create or replace function public.fn_consent_audit_append(
  p_user_id uuid,
  p_event_type text,
  p_ip_address inet,
  p_user_agent text,
  p_meta jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.consent_audit_events (
    user_id, event_type, ip_address, user_agent, meta
  )
  values (
    p_user_id, p_event_type, p_ip_address, p_user_agent, coalesce(p_meta, '{}'::jsonb)
  );
end;
$$;

revoke all on function public.fn_consent_audit_append(uuid,text,inet,text,jsonb) from public;
grant execute on function public.fn_consent_audit_append(uuid,text,inet,text,jsonb) to authenticated;

create or replace function public.trg_user_consents_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.fn_consent_audit_append(
      new.user_id,
      'TERMS_ACCEPTED',
      new.ip_address,
      new.user_agent,
      jsonb_build_object(
        'terms_version_id', new.terms_version_id,
        'accepted_at', new.accepted_at,
        'accepted_at_utc', new.accepted_at_utc,
        'app_platform', new.app_platform,
        'app_version', new.app_version,
        'locale', new.locale,
        'device_fingerprint', new.device_fingerprint
      )
    );
    return new;
  end if;

  if tg_op = 'UPDATE' and new.revoked_at is not null and old.revoked_at is null then
    perform public.fn_consent_audit_append(
      new.user_id,
      'TERMS_REVOKED',
      new.ip_address,
      new.user_agent,
      jsonb_build_object(
        'terms_version_id', new.terms_version_id,
        'revoked_at', new.revoked_at,
        'revoked_reason', new.revoked_reason
      )
    );
    return new;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_user_consents_audit on public.user_consents;
create trigger trg_user_consents_audit
after insert or update on public.user_consents
for each row execute procedure public.trg_user_consents_audit();

create or replace function public.accept_latest_terms(
  p_terms_version_id uuid,
  p_ip_address inet default null,
  p_user_agent text default null,
  p_device_fingerprint text default null,
  p_app_platform text default null,
  p_app_version text default null,
  p_locale text default null,
  p_evidence_json jsonb default '{}'::jsonb
) returns public.user_consents
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_latest_version_id uuid;
  v_existing public.user_consents;
  v_inserted public.user_consents;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Usuario nao autenticado.';
  end if;

  select tv.id
    into v_latest_version_id
  from public.terms_versions tv
  where tv.effective_at <= now()
  order by tv.effective_at desc
  limit 1;

  if v_latest_version_id is null then
    raise exception 'Nenhuma versao vigente de termos encontrada.';
  end if;

  if p_terms_version_id is distinct from v_latest_version_id then
    raise exception 'Versao de termo informada nao corresponde a versao vigente.';
  end if;

  select *
    into v_existing
  from public.user_consents uc
  where uc.user_id = v_user_id
    and uc.terms_version_id = p_terms_version_id
  limit 1;

  if v_existing.id is not null then
    return v_existing;
  end if;

  insert into public.user_consents (
    user_id,
    terms_version_id,
    accepted_at,
    accepted_at_utc,
    ip_address,
    user_agent,
    device_fingerprint,
    app_platform,
    app_version,
    locale,
    consent_checkbox,
    scrolled_to_end,
    evidence_json
  )
  values (
    v_user_id,
    p_terms_version_id,
    now(),
    now() at time zone 'utc',
    p_ip_address,
    p_user_agent,
    p_device_fingerprint,
    p_app_platform,
    p_app_version,
    p_locale,
    true,
    true,
    coalesce(p_evidence_json, '{}'::jsonb)
  )
  returning * into v_inserted;

  return v_inserted;
end;
$$;

revoke all on function public.accept_latest_terms(uuid,inet,text,text,text,text,text,jsonb) from public;
grant execute on function public.accept_latest_terms(uuid,inet,text,text,text,text,text,jsonb) to authenticated;

create or replace function public.has_accepted_latest_terms()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_latest_version_id uuid;
  v_exists boolean;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return false;
  end if;

  select tv.id into v_latest_version_id
  from public.terms_versions tv
  where tv.effective_at <= now()
  order by tv.effective_at desc
  limit 1;

  if v_latest_version_id is null then
    return false;
  end if;

  select exists (
    select 1
    from public.user_consents uc
    where uc.user_id = v_user_id
      and uc.terms_version_id = v_latest_version_id
      and uc.revoked_at is null
  ) into v_exists;

  return coalesce(v_exists, false);
end;
$$;

revoke all on function public.has_accepted_latest_terms() from public;
grant execute on function public.has_accepted_latest_terms() to authenticated;

create or replace view public.v_user_latest_terms_status as
select
  u.id as user_id,
  exists (
    select 1
    from public.user_consents uc
    join public.terms_versions tv on tv.id = uc.terms_version_id
    where uc.user_id = u.id
      and tv.effective_at <= now()
      and uc.revoked_at is null
      and tv.id = (
        select tv2.id
        from public.terms_versions tv2
        where tv2.effective_at <= now()
        order by tv2.effective_at desc
        limit 1
      )
  ) as has_accepted_latest_terms
from auth.users u;

commit;
