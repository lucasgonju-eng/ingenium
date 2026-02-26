-- Admin-only hard delete for student/teacher accounts.
-- Use with caution. Intended for explicit management actions in Admin dashboard.

begin;

create or replace function public.delete_user_account_admin(
  p_user_id uuid
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
    raise exception 'Sem permissão para excluir usuários.';
  end if;

  select coalesce(lower(role), 'student')
    into v_target_role
  from public.profiles
  where id = p_user_id;

  if v_target_role is null then
    raise exception 'Usuário não encontrado.';
  end if;

  if v_target_role not in ('student', 'teacher') then
    raise exception 'Somente alunos e professores podem ser excluídos nesta ação.';
  end if;

  delete from public.feed_posts where author_id = p_user_id or feed_owner_id = p_user_id;
  delete from public.wall_posts where author_id = p_user_id;
  delete from public.enrollments where user_id = p_user_id;
  delete from public.points where user_id = p_user_id;
  delete from public.teacher_olympiad_assignments where teacher_profile_id = p_user_id;
  delete from public.profiles where id = p_user_id;

  -- Remove conta de autenticação por último.
  delete from auth.users where id = p_user_id;
end;
$$;

revoke all on function public.delete_user_account_admin(uuid) from public;
grant execute on function public.delete_user_account_admin(uuid) to authenticated;
grant execute on function public.delete_user_account_admin(uuid) to service_role;

commit;
