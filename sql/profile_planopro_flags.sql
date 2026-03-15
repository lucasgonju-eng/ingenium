begin;

-- Fonte explícita de assinatura para regras de produto/jogos.
alter table public.profiles
  add column if not exists plan_tier text not null default 'free' check (plan_tier in ('free', 'pro'));

alter table public.profiles
  add column if not exists plan_pro_active boolean not null default false;

alter table public.profiles
  add column if not exists plan_pro_since timestamptz null;

alter table public.profiles
  add column if not exists plan_pro_source text null;

commit;
