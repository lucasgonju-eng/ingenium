begin;

alter table public.game_questions
  add column if not exists vestibular_name text;

alter table public.game_questions
  add column if not exists vestibular_year int;

alter table public.game_questions
  add column if not exists vestibular_url text;

create index if not exists idx_game_questions_vestibular_ref
  on public.game_questions (grade, vestibular_name, vestibular_year);

create or replace function public.pick_wolf_questions_from_bank(
  p_grade text,
  p_session_key text default null
)
returns table (
  question_id uuid,
  phase_category text,
  grade text,
  band text,
  discipline text,
  difficulty text,
  prompt text,
  vestibular_name text,
  vestibular_year int,
  vestibular_url text,
  options jsonb,
  correct_option_index int,
  explanation text,
  tags text[],
  estimated_read_time int
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_grade text := trim(coalesce(p_grade, ''));
  v_band text;
  v_category text;
  v_q public.game_questions%rowtype;
begin
  if v_user_id is null then
    raise exception 'unauthorized';
  end if;

  if v_grade = '' then
    raise exception 'invalid_grade';
  end if;

  v_band := case
    when v_grade in ('6º Ano', '7º Ano') then 'exploradores'
    when v_grade in ('8º Ano', '9º Ano') then 'cacadores'
    when v_grade in ('1ª Série', '2ª Série', '3ª Série') then 'estrategistas'
    else null
  end;

  if v_band is null then
    raise exception 'invalid_grade';
  end if;

  foreach v_category in array ARRAY['reflexo', 'logica', 'conhecimento', 'lideranca']
  loop
    select q.*
      into v_q
    from public.game_questions q
    where q.game_id = 'game_teste_dos_lobos'
      and q.phase_category = v_category
      and q.band = v_band
      and q.is_safe = true
      and coalesce(q.ai_audit_status, 'pending') = 'approved'
      and not exists (
        select 1
        from public.game_question_usage u
        where u.game_id = q.game_id
          and u.user_id = v_user_id
          and u.question_id = q.id
      )
    order by
      case when q.grade = v_grade then 0 else 1 end,
      random()
    limit 1;

    if not found then
      raise exception 'question_pool_exhausted:%', v_category;
    end if;

    insert into public.game_question_usage (
      game_id,
      user_id,
      question_id,
      grade,
      phase_category,
      session_key
    )
    values (
      'game_teste_dos_lobos',
      v_user_id,
      v_q.id,
      v_grade,
      v_category,
      p_session_key
    )
    on conflict on constraint game_question_usage_game_id_user_id_question_id_key do nothing;

    return query
    select
      v_q.id,
      v_q.phase_category,
      v_q.grade,
      v_q.band,
      v_q.discipline,
      v_q.difficulty,
      v_q.prompt,
      v_q.vestibular_name,
      v_q.vestibular_year,
      v_q.vestibular_url,
      v_q.options,
      v_q.correct_option_index,
      v_q.explanation,
      v_q.tags,
      v_q.estimated_read_time;
  end loop;
end;
$$;

revoke all on function public.pick_wolf_questions_from_bank(text, text) from public;
grant execute on function public.pick_wolf_questions_from_bank(text, text) to authenticated, service_role;

create or replace function public.preview_wolf_question_from_bank_admin(
  p_grade text,
  p_category text default 'logica'
)
returns table (
  question_id uuid,
  phase_category text,
  grade text,
  band text,
  discipline text,
  difficulty text,
  prompt text,
  vestibular_name text,
  vestibular_year int,
  vestibular_url text,
  options jsonb,
  correct_option_index int,
  explanation text,
  tags text[],
  estimated_read_time int
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_grade text := trim(coalesce(p_grade, ''));
  v_band text;
  v_category text := lower(trim(coalesce(p_category, 'logica')));
begin
  if not public.is_admin_actor() then
    raise exception 'forbidden';
  end if;

  v_band := case
    when v_grade in ('6º Ano', '7º Ano') then 'exploradores'
    when v_grade in ('8º Ano', '9º Ano') then 'cacadores'
    when v_grade in ('1ª Série', '2ª Série', '3ª Série') then 'estrategistas'
    else null
  end;

  if v_band is null then
    raise exception 'invalid_grade';
  end if;

  if v_category not in ('reflexo', 'logica', 'conhecimento', 'lideranca') then
    raise exception 'invalid_category';
  end if;

  return query
  select
    q.id,
    q.phase_category,
    q.grade,
    q.band,
    q.discipline,
    q.difficulty,
    q.prompt,
    q.vestibular_name,
    q.vestibular_year,
    q.vestibular_url,
    q.options,
    q.correct_option_index,
    q.explanation,
    q.tags,
    q.estimated_read_time
  from public.game_questions q
  where q.game_id = 'game_teste_dos_lobos'
    and q.phase_category = v_category
    and q.band = v_band
    and q.is_safe = true
    and coalesce(q.ai_audit_status, 'pending') = 'approved'
  order by
    case when q.grade = v_grade then 0 else 1 end,
    random()
  limit 1;
end;
$$;

revoke all on function public.preview_wolf_question_from_bank_admin(text, text) from public;
grant execute on function public.preview_wolf_question_from_bank_admin(text, text) to authenticated, service_role;

commit;

