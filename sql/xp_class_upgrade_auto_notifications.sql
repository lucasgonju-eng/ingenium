begin;

create extension if not exists pg_net;

create table if not exists public.xp_class_upgrade_notifications_log (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  previous_class text not null,
  new_class text not null,
  total_points integer not null,
  source_ref text not null unique,
  trigger_source text not null default 'recalc_points_for_user',
  message_id uuid references public.student_messages(id) on delete set null,
  email text,
  email_request_id bigint,
  created_at timestamptz not null default now()
);

create index if not exists idx_xp_class_upgrade_notifications_student
  on public.xp_class_upgrade_notifications_log(student_id, created_at desc);

create index if not exists idx_xp_class_upgrade_notifications_new_class
  on public.xp_class_upgrade_notifications_log(new_class, created_at desc);

create or replace function public.notify_xp_class_upgrade(
  p_student_id uuid,
  p_previous_class text,
  p_new_class text,
  p_total_points integer,
  p_source_ref text,
  p_trigger_source text default 'recalc_points_for_user'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_name text;
  v_student_email text;
  v_sender_id uuid;
  v_sender_name text;
  v_message_id uuid;
  v_email_request_id bigint;
  v_title text;
  v_body text;
  v_new_class_label text;
  v_previous_class_label text;
begin
  if p_student_id is null then
    return null;
  end if;

  if p_new_class not in ('silver', 'gold') then
    return null;
  end if;

  if exists (
    select 1
    from public.xp_class_upgrade_notifications_log l
    where l.source_ref = p_source_ref
  ) then
    return null;
  end if;

  select
    coalesce(nullif(trim(p.full_name), ''), 'Aluno(a)')
  into v_student_name
  from public.profiles p
  where p.id = p_student_id;

  if v_student_name is null then
    return null;
  end if;

  select lower(nullif(trim(u.email), ''))
  into v_student_email
  from auth.users u
  where u.id = p_student_id;

  select
    p.id,
    coalesce(nullif(trim(p.full_name), ''), 'Equipe InGenium')
  into v_sender_id, v_sender_name
  from public.profiles p
  where coalesce(lower(p.role), 'student') = 'admin'
  order by p.created_at asc nulls last
  limit 1;

  if v_sender_id is null then
    return null;
  end if;

  v_new_class_label := case p_new_class
    when 'silver' then 'Lobo de Prata'
    when 'gold' then 'Lobo de Ouro'
    else p_new_class
  end;

  v_previous_class_label := case p_previous_class
    when 'bronze' then 'Lobo de Bronze'
    when 'silver' then 'Lobo de Prata'
    when 'gold' then 'Lobo de Ouro'
    else coalesce(p_previous_class, 'categoria anterior')
  end;

  v_title := format('Parabéns! Você evoluiu para %s', v_new_class_label);
  v_body := format(
    'Seu desempenho no InGenium te levou para uma nova categoria!%sCategoria anterior: %s%sNova categoria: %s%sPontuação total atual: %s XP%sContinue avançando!',
    E'\n',
    v_previous_class_label,
    E'\n',
    v_new_class_label,
    E'\n',
    p_total_points::text,
    E'\n'
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
    p_student_id,
    v_sender_id,
    'admin',
    v_sender_name,
    v_title,
    v_body
  )
  returning id into v_message_id;

  if v_student_email is not null then
    begin
      select net.http_post(
        url := 'https://ingenium.einsteinhub.co/student-xp-kickoff-notify.php',
        headers := '{"Content-Type":"application/json"}'::jsonb,
        body := jsonb_build_object(
          'recipients', jsonb_build_array(
            jsonb_build_object(
              'email', v_student_email,
              'fullName', v_student_name
            )
          ),
          'subject', format('InGenium | Parabéns pela evolução para %s', v_new_class_label),
          'headline', format('Parabéns, %s!', v_student_name),
          'opening', 'Você acabou de evoluir sua categoria no InGenium.',
          'bodyA', format('Sua categoria mudou de %s para %s.', v_previous_class_label, v_new_class_label),
          'bodyB', format('Sua pontuação total agora é %s XP.', p_total_points::text),
          'bodyC', 'Continue participando das atividades para manter sua evolução.',
          'cta', 'Acesse sua conta no InGenium',
          'ctaUrl', 'https://ingenium.einsteinhub.co'
        )
      )
      into v_email_request_id;
    exception when others then
      v_email_request_id := null;
    end;
  end if;

  insert into public.xp_class_upgrade_notifications_log (
    student_id,
    previous_class,
    new_class,
    total_points,
    source_ref,
    trigger_source,
    message_id,
    email,
    email_request_id
  )
  values (
    p_student_id,
    coalesce(p_previous_class, 'bronze'),
    p_new_class,
    p_total_points,
    p_source_ref,
    coalesce(nullif(trim(p_trigger_source), ''), 'recalc_points_for_user'),
    v_message_id,
    v_student_email,
    v_email_request_id
  );

  return v_message_id;
end;
$$;

revoke all on function public.notify_xp_class_upgrade(uuid, text, text, integer, text, text) from public;
grant execute on function public.notify_xp_class_upgrade(uuid, text, text, integer, text, text) to authenticated, service_role;

create or replace function public.recalc_points_for_user(p_user_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_result_points int;
  v_event_points int;
  v_total int;
  v_class text;
  v_old_total int;
  v_old_class text;
begin
  select total_points, lobo_class
  into v_old_total, v_old_class
  from public.points
  where user_id = p_user_id;

  select coalesce(sum(
    case
      when medal = 'gold' then 100
      when medal = 'silver' then 60
      when medal = 'bronze' then 35
      else 10
    end
  ), 0)
  into v_result_points
  from public.results
  where user_id = p_user_id;

  select coalesce(sum(xp_amount), 0)
  into v_event_points
  from public.xp_events
  where user_id = p_user_id;

  v_total := coalesce(v_result_points, 0) + coalesce(v_event_points, 0);

  if v_total >= 20000 then
    v_class := 'gold';
  elsif v_total >= 8000 then
    v_class := 'silver';
  else
    v_class := 'bronze';
  end if;

  insert into public.points (user_id, total_points, lobo_class, updated_at)
  values (p_user_id, v_total, v_class, now())
  on conflict (user_id)
  do update set
    total_points = excluded.total_points,
    lobo_class = excluded.lobo_class,
    updated_at = now();

  if coalesce(v_old_total, 0) < 20000 and v_total >= 20000 then
    perform public.notify_xp_class_upgrade(
      p_user_id,
      case when coalesce(v_old_total, 0) >= 8000 then 'silver' else 'bronze' end,
      'gold',
      v_total,
      format('class_upgrade:gold:%s', p_user_id::text),
      'recalc_points_for_user'
    );
  elsif coalesce(v_old_total, 0) < 8000 and v_total >= 8000 then
    perform public.notify_xp_class_upgrade(
      p_user_id,
      'bronze',
      'silver',
      v_total,
      format('class_upgrade:silver:%s', p_user_id::text),
      'recalc_points_for_user'
    );
  end if;
end;
$$;

-- Backfill imediato para alunos que receberam +10.000 XP
-- na atividade "Top 10 simulado da escola (por série)"
-- e já estão em categoria prata/ouro, sem notificação de upgrade registrada.
do $$
declare
  r record;
begin
  for r in
    select
      a.id as award_id,
      a.student_id,
      coalesce(pt.total_points, 0)::int as total_points,
      coalesce(pt.lobo_class, 'bronze') as current_class
    from public.xp_activity_awards a
    join public.xp_activity_catalog c on c.id = a.activity_id
    join public.points pt on pt.user_id = a.student_id
    where c.title = 'Top 10 simulado da escola (por série)'
      and a.xp_amount >= 10000
      and coalesce(pt.lobo_class, 'bronze') in ('silver', 'gold')
      and not exists (
        select 1
        from public.xp_class_upgrade_notifications_log l
        where l.source_ref = format('top10_award_upgrade:%s', a.id::text)
      )
  loop
    perform public.notify_xp_class_upgrade(
      r.student_id,
      'bronze',
      case when r.current_class = 'gold' then 'gold' else 'silver' end,
      r.total_points,
      format('top10_award_upgrade:%s', r.award_id::text),
      'top10_simulado_backfill'
    );
  end loop;
end $$;

commit;
