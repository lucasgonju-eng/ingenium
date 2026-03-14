begin;

-- Acesso controlado ao segredo de runtime para edge functions.
-- Não expor para clientes autenticados/anon.

create or replace function public.get_app_secret_service(p_key text)
returns text
language sql
security definer
set search_path = public, private
as $$
  select s.value
  from private.app_secrets s
  where s.key = p_key
  limit 1;
$$;

revoke all on function public.get_app_secret_service(text) from public;
revoke all on function public.get_app_secret_service(text) from authenticated;
revoke all on function public.get_app_secret_service(text) from anon;
grant execute on function public.get_app_secret_service(text) to service_role;

comment on function public.get_app_secret_service(text) is
  'Retorna segredo privado para uso interno de backend (service_role).';

commit;

