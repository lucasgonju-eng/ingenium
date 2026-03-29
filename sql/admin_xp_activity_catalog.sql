begin;

alter table public.xp_events
  drop constraint if exists xp_events_event_type_check;

do $$
declare
  v_constraint_name text;
begin
  select c.conname
  into v_constraint_name
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'public'
    and t.relname = 'xp_events'
    and c.contype = 'c'
    and pg_get_constraintdef(c.oid) ilike '%event_type in%';

  if v_constraint_name is not null then
    execute format('alter table public.xp_events drop constraint %I', v_constraint_name);
  end if;
end $$;

alter table public.xp_events
  add constraint xp_events_event_type_check
  check (
    event_type in (
      'top10_school_simulado',
      'weekly_study_group_75_presence',
      'volunteer_mentorship_bronze',
      'perfect_quarter_attendance',
      'profile_photo_upload',
      'complete_profile_data',
      'wolf_game_attempt',
      'admin_manual_activity'
    )
  );

create table if not exists public.xp_activity_catalog (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  target_group text not null check (target_group in ('fundamental', 'medio')),
  target_grade text not null,
  xp_amount integer not null check (xp_amount > 0),
  default_scope text not null default 'individual' check (default_scope in ('individual', 'collective')),
  recurrence_note text,
  seed_key text,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_xp_activity_catalog_seed_key_unique
  on public.xp_activity_catalog(seed_key);

create index if not exists idx_xp_activity_catalog_group_grade
  on public.xp_activity_catalog(target_group, target_grade, is_active);

create table if not exists public.xp_activity_awards (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.xp_activity_catalog(id) on delete restrict,
  student_id uuid not null references public.profiles(id) on delete cascade,
  award_batch_id uuid not null,
  award_scope text not null check (award_scope in ('individual', 'collective')),
  student_grade text,
  student_class_name text,
  xp_amount integer not null check (xp_amount > 0),
  occurred_on date not null default current_date,
  note text,
  source_ref text not null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  xp_event_id uuid not null references public.xp_events(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists idx_xp_activity_awards_student_id
  on public.xp_activity_awards(student_id, created_at desc);

create index if not exists idx_xp_activity_awards_activity_id
  on public.xp_activity_awards(activity_id, created_at desc);

create index if not exists idx_xp_activity_awards_batch_id
  on public.xp_activity_awards(award_batch_id);

create unique index if not exists idx_xp_activity_awards_source_ref_unique
  on public.xp_activity_awards(source_ref);

alter table public.xp_activity_catalog enable row level security;
alter table public.xp_activity_awards enable row level security;

drop policy if exists "xp_activity_catalog_admin_select" on public.xp_activity_catalog;
create policy "xp_activity_catalog_admin_select"
  on public.xp_activity_catalog
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles actor
      where actor.id = auth.uid()
        and coalesce(lower(actor.role), 'student') = 'admin'
    )
  );

drop policy if exists "xp_activity_catalog_admin_insert" on public.xp_activity_catalog;
create policy "xp_activity_catalog_admin_insert"
  on public.xp_activity_catalog
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.profiles actor
      where actor.id = auth.uid()
        and coalesce(lower(actor.role), 'student') = 'admin'
    )
  );

drop policy if exists "xp_activity_catalog_admin_update" on public.xp_activity_catalog;
create policy "xp_activity_catalog_admin_update"
  on public.xp_activity_catalog
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.profiles actor
      where actor.id = auth.uid()
        and coalesce(lower(actor.role), 'student') = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.profiles actor
      where actor.id = auth.uid()
        and coalesce(lower(actor.role), 'student') = 'admin'
    )
  );

drop policy if exists "xp_activity_awards_admin_select" on public.xp_activity_awards;
create policy "xp_activity_awards_admin_select"
  on public.xp_activity_awards
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles actor
      where actor.id = auth.uid()
        and coalesce(lower(actor.role), 'student') = 'admin'
    )
  );

create or replace function public.set_xp_activity_catalog_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_xp_activity_catalog_updated_at on public.xp_activity_catalog;
create trigger trg_xp_activity_catalog_updated_at
before update on public.xp_activity_catalog
for each row
execute function public.set_xp_activity_catalog_updated_at();

create or replace function public.list_xp_activity_catalog_admin()
returns table (
  id uuid,
  title text,
  description text,
  target_group text,
  target_grade text,
  xp_amount integer,
  default_scope text,
  recurrence_note text,
  seed_key text,
  is_active boolean,
  created_by uuid,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    c.id,
    c.title,
    c.description,
    c.target_group,
    c.target_grade,
    c.xp_amount,
    c.default_scope,
    c.recurrence_note,
    c.seed_key,
    c.is_active,
    c.created_by,
    c.created_at,
    c.updated_at
  from public.xp_activity_catalog c
  where exists (
      select 1
      from public.profiles actor
      where actor.id = auth.uid()
        and coalesce(lower(actor.role), 'student') = 'admin'
    )
  order by
    case c.target_group
      when 'fundamental' then 0
      else 1
    end,
    case c.target_grade
      when '6º Ano' then 0
      when '7º Ano' then 1
      when '8º Ano' then 2
      when '9º Ano' then 3
      when '1ª Série' then 4
      when '2ª Série' then 5
      when '3ª Série' then 6
      else 99
    end,
    c.title asc;
$$;

revoke all on function public.list_xp_activity_catalog_admin() from public;
grant execute on function public.list_xp_activity_catalog_admin() to authenticated, service_role;

create or replace function public.create_xp_activity_catalog_admin(
  p_title text,
  p_description text default null,
  p_target_group text default null,
  p_target_grade text default null,
  p_xp_amount integer default null,
  p_default_scope text default 'individual',
  p_recurrence_note text default null
)
returns table (
  id uuid,
  title text,
  description text,
  target_group text,
  target_grade text,
  xp_amount integer,
  default_scope text,
  recurrence_note text,
  seed_key text,
  is_active boolean,
  created_by uuid,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_role text;
  v_title text := nullif(trim(p_title), '');
  v_description text := nullif(trim(coalesce(p_description, '')), '');
  v_target_group text := lower(nullif(trim(coalesce(p_target_group, '')), ''));
  v_target_grade text := nullif(trim(coalesce(p_target_grade, '')), '');
  v_default_scope text := lower(nullif(trim(coalesce(p_default_scope, '')), ''));
begin
  select coalesce(lower(role), 'student')
  into v_actor_role
  from public.profiles
  where id = auth.uid();

  if v_actor_role <> 'admin' then
    raise exception 'Apenas admin pode criar atividades de XP.';
  end if;

  if v_title is null then
    raise exception 'Informe o titulo da atividade.';
  end if;

  if v_target_group not in ('fundamental', 'medio') then
    raise exception 'Grupo invalido. Use fundamental ou medio.';
  end if;

  if v_target_grade is null then
    raise exception 'Informe a serie da atividade.';
  end if;

  if p_xp_amount is null or p_xp_amount <= 0 then
    raise exception 'Informe um valor de XP valido.';
  end if;

  if v_default_scope not in ('individual', 'collective') then
    raise exception 'Escopo padrao invalido.';
  end if;

  return query
  insert into public.xp_activity_catalog (
    title,
    description,
    target_group,
    target_grade,
    xp_amount,
    default_scope,
    recurrence_note,
    created_by
  )
  values (
    v_title,
    v_description,
    v_target_group,
    v_target_grade,
    p_xp_amount,
    v_default_scope,
    nullif(trim(coalesce(p_recurrence_note, '')), ''),
    auth.uid()
  )
  returning
    xp_activity_catalog.id,
    xp_activity_catalog.title,
    xp_activity_catalog.description,
    xp_activity_catalog.target_group,
    xp_activity_catalog.target_grade,
    xp_activity_catalog.xp_amount,
    xp_activity_catalog.default_scope,
    xp_activity_catalog.recurrence_note,
    xp_activity_catalog.seed_key,
    xp_activity_catalog.is_active,
    xp_activity_catalog.created_by,
    xp_activity_catalog.created_at,
    xp_activity_catalog.updated_at;
end;
$$;

revoke all on function public.create_xp_activity_catalog_admin(text, text, text, text, integer, text, text) from public;
grant execute on function public.create_xp_activity_catalog_admin(text, text, text, text, integer, text, text) to authenticated, service_role;

create or replace function public.list_xp_activity_awards_admin(p_limit integer default 50)
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
  order by a.created_at desc
  limit greatest(coalesce(p_limit, 50), 1);
$$;

revoke all on function public.list_xp_activity_awards_admin(integer) from public;
grant execute on function public.list_xp_activity_awards_admin(integer) to authenticated, service_role;

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
  v_activity public.xp_activity_catalog%rowtype;
  v_student_id uuid;
  v_student record;
  v_batch_id uuid := gen_random_uuid();
  v_scope text := lower(nullif(trim(coalesce(p_award_scope, '')), ''));
  v_source_ref text;
  v_xp_event_id uuid;
  v_award_id uuid;
  v_note text;
begin
  select coalesce(lower(role), 'student')
  into v_actor_role
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

insert into public.xp_activity_catalog (
  title,
  description,
  target_group,
  target_grade,
  xp_amount,
  default_scope,
  recurrence_note,
  seed_key
)
values
  ('Completar dados do perfil', 'Conceder XP pelo preenchimento completo do perfil.', 'fundamental', '6º Ano', 100, 'individual', null, 'seed:fundamental:6:perfil-completo'),
  ('Inserir foto do perfil', 'Conceder XP ao aluno que adicionar foto no perfil.', 'fundamental', '6º Ano', 50, 'individual', null, 'seed:fundamental:6:foto-perfil'),
  ('Top 10 simulado da escola (por série)', 'Premiação para alunos do Top 10 do simulado da escola.', 'fundamental', '6º Ano', 10000, 'individual', null, 'seed:fundamental:6:simulado-top10'),
  ('TOP 10 Produção de texto do Bloco de Redação', 'Premiação pela produção de texto do bloco de redação.', 'fundamental', '6º Ano', 1000, 'individual', null, 'seed:fundamental:6:redacao-top10'),
  ('Einstein Science (Laboratório)', 'Atividade de laboratório com lançamento recorrente.', 'fundamental', '6º Ano', 500, 'individual', 'Planilha: 100 XP por atividade.', 'seed:fundamental:6:einstein-science'),
  ('Frequência perfeita trimestral', 'Premiação por presença integral no trimestre.', 'fundamental', '6º Ano', 1200, 'individual', null, 'seed:fundamental:6:frequencia-trimestral'),
  ('Organização da sala de aula!', 'Atividade coletiva de organização da sala.', 'fundamental', '6º Ano', 50, 'collective', 'Planilha corrigida: 50 XP por dia.', 'seed:fundamental:6:organizacao-sala'),
  ('Nenhuma notificação de tarefa', 'Atividade coletiva ligada a rotina e entrega de tarefas.', 'fundamental', '6º Ano', 800, 'collective', 'Planilha: 160 XP por dia.', 'seed:fundamental:6:sem-notificacao'),

  ('Completar dados do perfil', 'Conceder XP pelo preenchimento completo do perfil.', 'fundamental', '7º Ano', 100, 'individual', null, 'seed:fundamental:7:perfil-completo'),
  ('Inserir foto do perfil', 'Conceder XP ao aluno que adicionar foto no perfil.', 'fundamental', '7º Ano', 50, 'individual', null, 'seed:fundamental:7:foto-perfil'),
  ('Top 10 simulado da escola (por série)', 'Premiação para alunos do Top 10 do simulado da escola.', 'fundamental', '7º Ano', 10000, 'individual', null, 'seed:fundamental:7:simulado-top10'),
  ('TOP 10 Produção de texto do Bloco de Redação', 'Premiação pela produção de texto do bloco de redação.', 'fundamental', '7º Ano', 1000, 'individual', null, 'seed:fundamental:7:redacao-top10'),
  ('Einstein Science (Laboratório)', 'Atividade de laboratório com lançamento recorrente.', 'fundamental', '7º Ano', 500, 'individual', 'Planilha: 100 XP por atividade.', 'seed:fundamental:7:einstein-science'),
  ('Frequência perfeita trimestral', 'Premiação por presença integral no trimestre.', 'fundamental', '7º Ano', 1200, 'individual', null, 'seed:fundamental:7:frequencia-trimestral'),
  ('Organização da sala de aula!', 'Atividade coletiva de organização da sala.', 'fundamental', '7º Ano', 50, 'collective', 'Planilha corrigida: 50 XP por dia.', 'seed:fundamental:7:organizacao-sala'),
  ('Nenhuma notificação de tarefa', 'Atividade coletiva ligada a rotina e entrega de tarefas.', 'fundamental', '7º Ano', 800, 'collective', 'Planilha: 160 XP por dia.', 'seed:fundamental:7:sem-notificacao'),

  ('Completar dados do perfil', 'Conceder XP pelo preenchimento completo do perfil.', 'fundamental', '8º Ano', 100, 'individual', null, 'seed:fundamental:8:perfil-completo'),
  ('Inserir foto do perfil', 'Conceder XP ao aluno que adicionar foto no perfil.', 'fundamental', '8º Ano', 50, 'individual', null, 'seed:fundamental:8:foto-perfil'),
  ('Top 10 simulado da escola (por série)', 'Premiação para alunos do Top 10 do simulado da escola.', 'fundamental', '8º Ano', 10000, 'individual', null, 'seed:fundamental:8:simulado-top10'),
  ('TOP 10 Produção de texto do Bloco de Redação', 'Premiação pela produção de texto do bloco de redação.', 'fundamental', '8º Ano', 1000, 'individual', null, 'seed:fundamental:8:redacao-top10'),
  ('Einstein Science (Laboratório)', 'Atividade de laboratório com lançamento recorrente.', 'fundamental', '8º Ano', 500, 'individual', 'Planilha: 100 XP por atividade.', 'seed:fundamental:8:einstein-science'),
  ('Frequência perfeita trimestral', 'Premiação por presença integral no trimestre.', 'fundamental', '8º Ano', 1200, 'individual', null, 'seed:fundamental:8:frequencia-trimestral'),
  ('Organização da sala de aula!', 'Atividade coletiva de organização da sala.', 'fundamental', '8º Ano', 50, 'collective', 'Planilha corrigida: 50 XP por dia.', 'seed:fundamental:8:organizacao-sala'),
  ('Nenhuma notificação de tarefa', 'Atividade coletiva ligada a rotina e entrega de tarefas.', 'fundamental', '8º Ano', 800, 'collective', 'Planilha: 160 XP por dia.', 'seed:fundamental:8:sem-notificacao'),

  ('Completar dados do perfil', 'Conceder XP pelo preenchimento completo do perfil.', 'medio', '9º Ano', 100, 'individual', null, 'seed:medio:9:perfil-completo'),
  ('Inserir foto do perfil', 'Conceder XP ao aluno que adicionar foto no perfil.', 'medio', '9º Ano', 50, 'individual', null, 'seed:medio:9:foto-perfil'),
  ('Top 10 simulado da escola (por série)', 'Premiação para alunos do Top 10 do simulado da escola.', 'medio', '9º Ano', 10000, 'individual', null, 'seed:medio:9:simulado-top10'),
  ('TOP 10 Produção de texto - Semanal', 'Premiação semanal da produção de texto.', 'medio', '9º Ano', 1000, 'individual', null, 'seed:medio:9:redacao-top10'),
  ('Participação Grupo de Estudo + Monitoria', 'Participação em grupo de estudo e monitoria.', 'medio', '9º Ano', 100, 'individual', 'Planilha corrigida: 100 XP por dia.', 'seed:medio:9:grupo-estudo-monitoria'),
  ('Frequência perfeita trimestral', 'Premiação por presença integral no trimestre.', 'medio', '9º Ano', 1200, 'individual', null, 'seed:medio:9:frequencia-trimestral'),
  ('Organização da sala de aula!', 'Atividade coletiva de organização da sala.', 'medio', '9º Ano', 50, 'collective', 'Planilha corrigida: 50 XP por dia.', 'seed:medio:9:organizacao-sala'),
  ('Nenhuma notificação de tarefa', 'Atividade coletiva ligada a rotina e entrega de tarefas.', 'medio', '9º Ano', 800, 'collective', 'Planilha: 160 XP por dia.', 'seed:medio:9:sem-notificacao'),

  ('Completar dados do perfil', 'Conceder XP pelo preenchimento completo do perfil.', 'medio', '1ª Série', 100, 'individual', null, 'seed:medio:1:perfil-completo'),
  ('Inserir foto do perfil', 'Conceder XP ao aluno que adicionar foto no perfil.', 'medio', '1ª Série', 50, 'individual', null, 'seed:medio:1:foto-perfil'),
  ('Top 10 simulado da escola (por série)', 'Premiação para alunos do Top 10 do simulado da escola.', 'medio', '1ª Série', 10000, 'individual', null, 'seed:medio:1:simulado-top10'),
  ('TOP 10 Produção de texto - Semanal', 'Premiação semanal da produção de texto.', 'medio', '1ª Série', 1000, 'individual', null, 'seed:medio:1:redacao-top10'),
  ('Participação Grupo de Estudo + Monitoria', 'Participação em grupo de estudo e monitoria.', 'medio', '1ª Série', 100, 'individual', 'Planilha corrigida: 100 XP por dia.', 'seed:medio:1:grupo-estudo-monitoria'),
  ('Frequência perfeita trimestral', 'Premiação por presença integral no trimestre.', 'medio', '1ª Série', 1200, 'individual', null, 'seed:medio:1:frequencia-trimestral'),
  ('Organização da sala de aula!', 'Atividade coletiva de organização da sala.', 'medio', '1ª Série', 50, 'collective', 'Planilha corrigida: 50 XP por dia.', 'seed:medio:1:organizacao-sala'),
  ('Nenhuma notificação de tarefa', 'Atividade coletiva ligada a rotina e entrega de tarefas.', 'medio', '1ª Série', 800, 'collective', 'Planilha: 160 XP por dia.', 'seed:medio:1:sem-notificacao'),

  ('Completar dados do perfil', 'Conceder XP pelo preenchimento completo do perfil.', 'medio', '2ª Série', 100, 'individual', null, 'seed:medio:2:perfil-completo'),
  ('Inserir foto do perfil', 'Conceder XP ao aluno que adicionar foto no perfil.', 'medio', '2ª Série', 50, 'individual', null, 'seed:medio:2:foto-perfil'),
  ('Top 10 simulado da escola (por série)', 'Premiação para alunos do Top 10 do simulado da escola.', 'medio', '2ª Série', 10000, 'individual', null, 'seed:medio:2:simulado-top10'),
  ('TOP 10 Produção de texto - Semanal', 'Premiação semanal da produção de texto.', 'medio', '2ª Série', 1000, 'individual', null, 'seed:medio:2:redacao-top10'),
  ('Participação Grupo de Estudo + Monitoria', 'Participação em grupo de estudo e monitoria.', 'medio', '2ª Série', 100, 'individual', 'Planilha corrigida: 100 XP por dia.', 'seed:medio:2:grupo-estudo-monitoria'),
  ('Frequência perfeita trimestral', 'Premiação por presença integral no trimestre.', 'medio', '2ª Série', 1200, 'individual', null, 'seed:medio:2:frequencia-trimestral'),
  ('Organização da sala de aula!', 'Atividade coletiva de organização da sala.', 'medio', '2ª Série', 50, 'collective', 'Planilha corrigida: 50 XP por dia.', 'seed:medio:2:organizacao-sala'),
  ('Nenhuma notificação de tarefa', 'Atividade coletiva ligada a rotina e entrega de tarefas.', 'medio', '2ª Série', 800, 'collective', 'Planilha: 160 XP por dia.', 'seed:medio:2:sem-notificacao'),

  ('Completar dados do perfil', 'Conceder XP pelo preenchimento completo do perfil.', 'medio', '3ª Série', 100, 'individual', null, 'seed:medio:3:perfil-completo'),
  ('Inserir foto do perfil', 'Conceder XP ao aluno que adicionar foto no perfil.', 'medio', '3ª Série', 50, 'individual', null, 'seed:medio:3:foto-perfil'),
  ('Top 10 simulado da escola (por série)', 'Premiação para alunos do Top 10 do simulado da escola.', 'medio', '3ª Série', 10000, 'individual', null, 'seed:medio:3:simulado-top10'),
  ('TOP 10 Produção de texto - Semanal', 'Premiação semanal da produção de texto.', 'medio', '3ª Série', 1000, 'individual', null, 'seed:medio:3:redacao-top10'),
  ('Participação Grupo de Estudo + Monitoria', 'Participação em grupo de estudo e monitoria.', 'medio', '3ª Série', 100, 'individual', 'Planilha corrigida: 100 XP por dia.', 'seed:medio:3:grupo-estudo-monitoria'),
  ('Frequência perfeita trimestral', 'Premiação por presença integral no trimestre.', 'medio', '3ª Série', 1200, 'individual', null, 'seed:medio:3:frequencia-trimestral'),
  ('Organização da sala de aula!', 'Atividade coletiva de organização da sala.', 'medio', '3ª Série', 50, 'collective', 'Planilha corrigida: 50 XP por dia.', 'seed:medio:3:organizacao-sala'),
  ('Nenhuma notificação de tarefa', 'Atividade coletiva ligada a rotina e entrega de tarefas.', 'medio', '3ª Série', 800, 'collective', 'Planilha: 160 XP por dia.', 'seed:medio:3:sem-notificacao')
on conflict (seed_key) do update
set
  title = excluded.title,
  description = excluded.description,
  target_group = excluded.target_group,
  target_grade = excluded.target_grade,
  xp_amount = excluded.xp_amount,
  default_scope = excluded.default_scope,
  recurrence_note = excluded.recurrence_note,
  is_active = true,
  updated_at = now();

commit;
