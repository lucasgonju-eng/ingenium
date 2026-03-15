-- Ações em lote para avisos gerais aos alunos no painel admin.
-- Requer:
-- 1) tabela public.student_messages
-- 2) função public.send_student_message(uuid, text, text)

create or replace function public.list_student_email_recipients_for_sender()
returns table (
  id uuid,
  email text
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor_role text;
begin
  select coalesce(lower(role), 'student')
    into v_actor_role
  from public.profiles
  where profiles.id = auth.uid();

  if v_actor_role not in ('teacher', 'coord', 'gestao', 'admin') then
    raise exception 'Apenas professor, coordenação, gestão e admin podem listar e-mails de destinatários.';
  end if;

  return query
  select
    p.id,
    nullif(trim(u.email), '') as email
  from public.profiles p
  left join auth.users u on u.id = p.id
  where coalesce(lower(p.role), 'student') = 'student'
  order by coalesce(p.full_name, 'Aluno'), p.id;
end;
$$;

revoke all on function public.list_student_email_recipients_for_sender() from public;
grant execute on function public.list_student_email_recipients_for_sender() to authenticated;
grant execute on function public.list_student_email_recipients_for_sender() to service_role;

create or replace function public.send_student_message_bulk(
  p_student_ids uuid[],
  p_title text,
  p_body text
)
returns table (
  student_id uuid,
  message_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target_id uuid;
  v_message_id uuid;
begin
  if p_student_ids is null or coalesce(array_length(p_student_ids, 1), 0) = 0 then
    return;
  end if;

  foreach v_target_id in array p_student_ids loop
    begin
      select public.send_student_message(v_target_id, p_title, p_body)
        into v_message_id;

      student_id := v_target_id;
      message_id := v_message_id;
      return next;
    exception when others then
      -- Ignora falhas pontuais para não interromper o envio total.
      continue;
    end;
  end loop;
end;
$$;

revoke all on function public.send_student_message_bulk(uuid[], text, text) from public;
grant execute on function public.send_student_message_bulk(uuid[], text, text) to authenticated;
grant execute on function public.send_student_message_bulk(uuid[], text, text) to service_role;
