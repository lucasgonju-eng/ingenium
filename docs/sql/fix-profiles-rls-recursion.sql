-- Corrige recursão infinita de RLS na tabela public.profiles.
-- Sintoma: GET /rest/v1/profiles retorna 500 com "infinite recursion detected in policy".

drop policy if exists profiles_select_admin_all on public.profiles;
drop policy if exists profiles_update_admin_all on public.profiles;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_insert_own'
  ) then
    create policy profiles_insert_own
      on public.profiles
      for insert
      to public
      with check (auth.uid() = id);
  end if;
end
$$;

-- Políticas válidas para uso no app (próprio usuário):
-- - profiles_select_own
-- - profiles_insert_own
-- - profiles_update_own
