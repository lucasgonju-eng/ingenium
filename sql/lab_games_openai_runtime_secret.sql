begin;

-- Armazenamento privado de segredo de runtime para IA dos jogos.
-- Observação: preferir secret manager da plataforma quando disponível no fluxo de deploy.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to service_role;

create table if not exists private.app_secrets (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

revoke all on private.app_secrets from public;
revoke all on private.app_secrets from authenticated;
revoke all on private.app_secrets from anon;
grant select, insert, update on private.app_secrets to service_role;

comment on table private.app_secrets is 'Segredos de runtime para backend seguro (não expor ao cliente).';

commit;

