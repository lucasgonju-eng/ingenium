begin;

create or replace function public.admin_hard_delete_user(
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
    raise exception 'Sem permissão para exclusão permanente.';
  end if;

  select coalesce(lower(role), 'student')
  into v_target_role
  from public.profiles
  where id = p_user_id;

  if v_target_role is null then
    raise exception 'Usuário alvo não encontrado.';
  end if;

  if v_target_role <> 'teacher' then
    raise exception 'Exclusão permanente permitida apenas para professores.';
  end if;

  if to_regclass('public.access_requests') is not null then
    delete from public.access_requests where requested_by = p_user_id;
  end if;
  if to_regclass('public.teacher_olympiad_assignments') is not null then
    delete from public.teacher_olympiad_assignments where teacher_profile_id = p_user_id;
  end if;
  if to_regclass('public.feed_posts') is not null then
    delete from public.feed_posts where author_id = p_user_id or feed_owner_id = p_user_id;
  end if;
  if to_regclass('public.wall_posts') is not null then
    delete from public.wall_posts where author_id = p_user_id;
  end if;
  if to_regclass('public.points') is not null then
    delete from public.points where user_id = p_user_id;
  end if;
  if to_regclass('public.enrollments') is not null then
    delete from public.enrollments where user_id = p_user_id;
  end if;
  if to_regclass('public.user_consents') is not null then
    delete from public.user_consents where user_id = p_user_id;
  end if;
  if to_regclass('public.audit_events') is not null then
    delete from public.audit_events where user_id = p_user_id;
  end if;

  delete from public.profiles where id = p_user_id;
  delete from auth.users where id = p_user_id;
end;
$$;

revoke all on function public.admin_hard_delete_user(uuid) from public;
grant execute on function public.admin_hard_delete_user(uuid) to authenticated;
grant execute on function public.admin_hard_delete_user(uuid) to service_role;

commit;
