-- Ações para envio de mensagens por perfis privilegiados.
-- Requer tabela public.student_messages já criada.

create or replace function public.list_message_recipients_for_sender()
returns table (
  id uuid,
  full_name text,
  grade text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_role text;
begin
  select coalesce(lower(role), 'student')
  into v_actor_role
  from public.profiles
  where profiles.id = auth.uid();

  if v_actor_role not in ('teacher', 'coord', 'gestao', 'admin') then
    raise exception 'Apenas professor, coordenação, gestão e admin podem listar destinatários.';
  end if;

  return query
  select
    p.id,
    p.full_name,
    p.grade
  from public.profiles p
  where coalesce(lower(p.role), 'student') = 'student'
  order by coalesce(p.full_name, 'Aluno'), p.id;
end;
$$;

revoke all on function public.list_message_recipients_for_sender() from public;
grant execute on function public.list_message_recipients_for_sender() to authenticated;
grant execute on function public.list_message_recipients_for_sender() to service_role;

create or replace function public.send_student_message(
  p_student_id uuid,
  p_title text,
  p_body text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_actor_role text;
  v_actor_name text;
  v_message_id uuid;
begin
  if v_actor_id is null then
    raise exception 'Usuário autenticado é obrigatório.';
  end if;

  select
    coalesce(lower(p.role), 'student'),
    coalesce(nullif(trim(p.full_name), ''), 'Equipe InGenium')
  into v_actor_role, v_actor_name
  from public.profiles p
  where p.id = v_actor_id;

  if v_actor_role not in ('teacher', 'coord', 'gestao', 'admin') then
    raise exception 'Apenas professor, coordenação, gestão e admin podem enviar mensagens.';
  end if;

  if not exists (
    select 1
    from public.profiles target
    where target.id = p_student_id
      and coalesce(lower(target.role), 'student') = 'student'
  ) then
    raise exception 'Aluno destinatário não encontrado.';
  end if;

  insert into public.student_messages (
    student_id,
    sender_id,
    sender_role,
    sender_name,
    title,
    body
  ) values (
    p_student_id,
    v_actor_id,
    v_actor_role,
    v_actor_name,
    trim(p_title),
    trim(p_body)
  )
  returning id into v_message_id;

  return v_message_id;
end;
$$;

revoke all on function public.send_student_message(uuid, text, text) from public;
grant execute on function public.send_student_message(uuid, text, text) to authenticated;
grant execute on function public.send_student_message(uuid, text, text) to service_role;
