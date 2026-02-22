-- Mitigação emergencial: bloqueio da legacy anon key vazada no Data API (PostgREST)
-- Observação: isso protege chamadas ao /rest/v1.
-- Para revogação completa da key no projeto, desabilitar a legacy anon key no painel/API de gestão.

begin;

create or replace function public.check_request_block_legacy_anon_key()
returns void
language plpgsql
security definer
as $$
declare
  headers json := coalesce(current_setting('request.headers', true), '{}')::json;
  request_apikey text := coalesce(headers->>'apikey', '');
  request_authorization text := coalesce(headers->>'authorization', '');
  leaked_key constant text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpidW5vY3JpZnVkdGZ5ZWN2amp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3MTIyMDgsImV4cCI6MjA4NzI4ODIwOH0.RxGaQx8dToY9FuvcNCWNLrlufRAQ1BiRMO1rkFUlN8Q';
begin
  if request_apikey = leaked_key
     or request_authorization = ('Bearer ' || leaked_key)
  then
    raise sqlstate 'PGRST' using
      message = json_build_object(
        'code', 'LEGACY_ANON_REVOKED',
        'message', 'Legacy anon key revogada para Data API.',
        'details', 'Use uma publishable key ativa.',
        'hint', 'Atualize EXPO_PUBLIC_SUPABASE_ANON_KEY para sb_publishable_...'
      )::text,
      detail = json_build_object(
        'status', 403,
        'headers', json_build_object(),
        'status_text', 'Forbidden'
      )::text;
  end if;
end;
$$;

alter role authenticator
set pgrst.db_pre_request = 'public.check_request_block_legacy_anon_key';

notify pgrst, 'reload config';

commit;
