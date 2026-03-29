begin;

create or replace function public.list_xp_activity_awards_admin(
  p_limit integer default 500,
  p_grade text default null,
  p_search text default null
)
returns table (
  award_id uuid,
  award_batch_id uuid,
  activity_id uuid,
  activity_title text,
  target_group text,
  target_grade text,
  student_id uuid,
  student_full_name text,
  student_grade text,
  student_class_name text,
  award_scope text,
  xp_amount integer,
  note text,
  occurred_on date,
  source_ref text,
  xp_event_id uuid,
  created_by uuid,
  created_by_name text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    a.id as award_id,
    a.award_batch_id,
    a.activity_id,
    c.title as activity_title,
    c.target_group,
    c.target_grade,
    a.student_id,
    s.full_name as student_full_name,
    a.student_grade,
    a.student_class_name,
    a.award_scope,
    a.xp_amount,
    a.note,
    a.occurred_on,
    a.source_ref,
    a.xp_event_id,
    a.created_by,
    actor.full_name as created_by_name,
    a.created_at
  from public.xp_activity_awards a
  join public.xp_activity_catalog c on c.id = a.activity_id
  left join public.profiles s on s.id = a.student_id
  left join public.profiles actor on actor.id = a.created_by
  where exists (
      select 1
      from public.profiles admin_actor
      where admin_actor.id = auth.uid()
        and coalesce(lower(admin_actor.role), 'student') = 'admin'
    )
    and (
      nullif(trim(coalesce(p_grade, '')), '') is null
      or a.student_grade = nullif(trim(coalesce(p_grade, '')), '')
    )
    and (
      nullif(trim(coalesce(p_search, '')), '') is null
      or coalesce(s.full_name, '') ilike '%' || nullif(trim(coalesce(p_search, '')), '') || '%'
      or coalesce(c.title, '') ilike '%' || nullif(trim(coalesce(p_search, '')), '') || '%'
    )
  order by a.created_at desc
  limit greatest(coalesce(p_limit, 500), 1);
$$;

revoke all on function public.list_xp_activity_awards_admin(integer, text, text) from public;
grant execute on function public.list_xp_activity_awards_admin(integer, text, text) to authenticated, service_role;

create or replace function public.update_xp_activity_award_admin(
  p_award_id uuid,
  p_xp_amount integer default null,
  p_occurred_on date default null,
  p_note text default null
)
returns table (
  award_id uuid,
  student_id uuid,
  xp_event_id uuid,
  xp_amount integer,
  occurred_on date,
  note text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_role text;
  v_award public.xp_activity_awards%rowtype;
  v_new_xp integer;
  v_new_occurred_on date;
  v_new_note text;
begin
  select coalesce(lower(role), 'student')
  into v_actor_role
  from public.profiles
  where id = auth.uid();

  if v_actor_role <> 'admin' then
    raise exception 'Apenas admin pode editar lançamentos de XP.';
  end if;

  select *
  into v_award
  from public.xp_activity_awards
  where id = p_award_id;

  if not found then
    raise exception 'Lançamento de XP não encontrado.';
  end if;

  v_new_xp := coalesce(p_xp_amount, v_award.xp_amount);
  v_new_occurred_on := coalesce(p_occurred_on, v_award.occurred_on);
  v_new_note := case
    when p_note is null then v_award.note
    else nullif(trim(p_note), '')
  end;

  if v_new_xp <= 0 then
    raise exception 'XP deve ser maior que zero.';
  end if;

  update public.xp_events
  set
    xp_amount = v_new_xp,
    occurred_on = v_new_occurred_on,
    note = v_new_note
  where id = v_award.xp_event_id;

  update public.xp_activity_awards
  set
    xp_amount = v_new_xp,
    occurred_on = v_new_occurred_on,
    note = v_new_note
  where id = v_award.id;

  return query
  select
    a.id as award_id,
    a.student_id,
    a.xp_event_id,
    a.xp_amount,
    a.occurred_on,
    a.note
  from public.xp_activity_awards a
  where a.id = v_award.id;
end;
$$;

revoke all on function public.update_xp_activity_award_admin(uuid, integer, date, text) from public;
grant execute on function public.update_xp_activity_award_admin(uuid, integer, date, text) to authenticated, service_role;

create or replace function public.delete_xp_activity_award_admin(p_award_id uuid)
returns table (
  award_id uuid,
  student_id uuid,
  xp_event_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_role text;
  v_award public.xp_activity_awards%rowtype;
begin
  select coalesce(lower(role), 'student')
  into v_actor_role
  from public.profiles
  where id = auth.uid();

  if v_actor_role <> 'admin' then
    raise exception 'Apenas admin pode excluir lançamentos de XP.';
  end if;

  select *
  into v_award
  from public.xp_activity_awards
  where id = p_award_id;

  if not found then
    raise exception 'Lançamento de XP não encontrado.';
  end if;

  delete from public.xp_events
  where id = v_award.xp_event_id;

  award_id := v_award.id;
  student_id := v_award.student_id;
  xp_event_id := v_award.xp_event_id;
  return next;
end;
$$;

revoke all on function public.delete_xp_activity_award_admin(uuid) from public;
grant execute on function public.delete_xp_activity_award_admin(uuid) to authenticated, service_role;

create or replace function public.award_xp_activity_admin(
  p_activity_id uuid,
  p_student_ids uuid[],
  p_note text default null,
  p_occurred_on date default current_date,
  p_award_scope text default null
)
returns table (
  award_id uuid,
  student_id uuid,
  xp_event_id uuid,
  award_batch_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_role text;
  v_actor_name text;
  v_activity public.xp_activity_catalog%rowtype;
  v_student_id uuid;
  v_student record;
  v_batch_id uuid := gen_random_uuid();
  v_scope text := lower(nullif(trim(coalesce(p_award_scope, '')), ''));
  v_source_ref text;
  v_xp_event_id uuid;
  v_award_id uuid;
  v_note text;
  v_message_title text;
  v_message_body text;
begin
  select
    coalesce(lower(role), 'student'),
    coalesce(nullif(trim(full_name), ''), 'Equipe InGenium')
  into v_actor_role, v_actor_name
  from public.profiles
  where id = auth.uid();

  if v_actor_role <> 'admin' then
    raise exception 'Apenas admin pode lancar XP por atividade.';
  end if;

  if p_activity_id is null then
    raise exception 'Selecione uma atividade.';
  end if;

  if p_student_ids is null or coalesce(array_length(p_student_ids, 1), 0) = 0 then
    raise exception 'Selecione ao menos um aluno.';
  end if;

  select *
  into v_activity
  from public.xp_activity_catalog
  where id = p_activity_id
    and is_active = true;

  if not found then
    raise exception 'Atividade nao encontrada ou inativa.';
  end if;

  if v_scope is null then
    v_scope := v_activity.default_scope;
  end if;

  if v_scope not in ('individual', 'collective') then
    raise exception 'Escopo de lancamento invalido.';
  end if;

  foreach v_student_id in array p_student_ids loop
    select
      p.id,
      p.full_name,
      p.grade,
      p.class_name,
      coalesce(lower(p.role), 'student') as role
    into v_student
    from public.profiles p
    where p.id = v_student_id;

    if not found then
      raise exception 'Aluno nao encontrado para lancamento de XP.';
    end if;

    if v_student.role <> 'student' then
      raise exception 'Apenas perfis de aluno podem receber esse lancamento.';
    end if;

    if coalesce(v_student.grade, '') <> coalesce(v_activity.target_grade, '') then
      raise exception 'O aluno % nao pertence a serie % da atividade.', coalesce(v_student.full_name, v_student.id::text), v_activity.target_grade;
    end if;

    v_note := coalesce(
      nullif(trim(coalesce(p_note, '')), ''),
      format('Lançamento de XP: %s', v_activity.title)
    );
    v_source_ref := format('xp_activity_award:%s:%s:%s', v_batch_id::text, p_activity_id::text, v_student_id::text);

    insert into public.xp_events (
      user_id,
      event_type,
      xp_amount,
      occurred_on,
      source_ref,
      note,
      created_by
    )
    values (
      v_student_id,
      'admin_manual_activity',
      v_activity.xp_amount,
      coalesce(p_occurred_on, current_date),
      v_source_ref,
      v_note,
      auth.uid()
    )
    returning id into v_xp_event_id;

    insert into public.xp_activity_awards (
      activity_id,
      student_id,
      award_batch_id,
      award_scope,
      student_grade,
      student_class_name,
      xp_amount,
      occurred_on,
      note,
      source_ref,
      created_by,
      xp_event_id
    )
    values (
      p_activity_id,
      v_student_id,
      v_batch_id,
      v_scope,
      v_student.grade,
      v_student.class_name,
      v_activity.xp_amount,
      coalesce(p_occurred_on, current_date),
      v_note,
      v_source_ref,
      auth.uid(),
      v_xp_event_id
    )
    returning id into v_award_id;

    v_message_title := 'Novo XP recebido!';
    v_message_body := format(
      'Você recebeu XP lançado pelo ADMIN.%sAtividade: %s%sData: %s%sXP recebido: %s%sObservação: %s%sResponsável: %s',
      E'\n',
      v_activity.title,
      E'\n',
      coalesce(p_occurred_on, current_date)::text,
      E'\n',
      v_activity.xp_amount::text,
      E'\n',
      coalesce(v_note, 'Sem observação.'),
      E'\n',
      v_actor_name
    );

    insert into public.student_messages (
      student_id,
      sender_id,
      sender_role,
      sender_name,
      title,
      body
    )
    values (
      v_student_id,
      auth.uid(),
      'admin',
      v_actor_name,
      v_message_title,
      v_message_body
    );

    award_id := v_award_id;
    student_id := v_student_id;
    xp_event_id := v_xp_event_id;
    award_batch_id := v_batch_id;
    return next;
  end loop;
end;
$$;

revoke all on function public.award_xp_activity_admin(uuid, uuid[], text, date, text) from public;
grant execute on function public.award_xp_activity_admin(uuid, uuid[], text, date, text) to authenticated, service_role;

commit;
