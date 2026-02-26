-- Admin-only reversible activation/deactivation for student/teacher accounts.
-- This replaces destructive delete flows with soft delete semantics.

begin;

alter table public.profiles
  add column if not exists is_active boolean not null default true;

alter table public.profiles
  add column if not exists deactivated_at timestamptz;

alter table public.profiles
  add column if not exists deactivated_by uuid references auth.users(id);

create or replace function public.admin_set_user_active(
  p_user_id uuid,
  p_is_active boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_role text;
  v_target_role text;
begin
  select coalesce(lower(role), 'student')
    into v_actor_role
  from public.profiles
  where id = auth.uid();

  if v_actor_role <> 'admin' then
    raise exception 'Sem permissão para alterar status de usuários.';
  end if;

  select coalesce(lower(role), 'student')
    into v_target_role
  from public.profiles
  where id = p_user_id;

  if v_target_role is null then
    raise exception 'Usuário não encontrado.';
  end if;

  if v_target_role not in ('student', 'teacher') then
    raise exception 'Somente alunos e professores podem ser alterados nesta ação.';
  end if;

  update public.profiles
  set is_active = p_is_active,
      deactivated_at = case when p_is_active then null else now() end,
      deactivated_by = case when p_is_active then null else auth.uid() end,
      updated_at = now()
  where id = p_user_id;
end;
$$;

revoke all on function public.admin_set_user_active(uuid, boolean) from public;
grant execute on function public.admin_set_user_active(uuid, boolean) to authenticated;
grant execute on function public.admin_set_user_active(uuid, boolean) to service_role;

-- Backward-compatible wrapper to avoid destructive delete if old code path is called.
create or replace function public.delete_user_account_admin(
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.admin_set_user_active(p_user_id, false);
end;
$$;

revoke all on function public.delete_user_account_admin(uuid) from public;
grant execute on function public.delete_user_account_admin(uuid) to authenticated;
grant execute on function public.delete_user_account_admin(uuid) to service_role;

commit;
