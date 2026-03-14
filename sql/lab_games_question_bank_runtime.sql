begin;

-- Banco de perguntas runtime para Teste dos Lobos (sem IA em execução).
-- Regra de não repetição por usuário via tabela de uso.

create table if not exists public.game_question_usage (
  id uuid primary key default gen_random_uuid(),
  game_id text not null references public.games(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references public.game_questions(id) on delete cascade,
  grade text not null,
  phase_category text not null check (phase_category in ('reflexo', 'logica', 'conhecimento', 'lideranca')),
  session_key text null,
  served_at timestamptz not null default now(),
  unique (game_id, user_id, question_id)
);

create index if not exists idx_game_question_usage_user_served
  on public.game_question_usage (user_id, served_at desc);

create index if not exists idx_game_question_usage_game_user_category
  on public.game_question_usage (game_id, user_id, phase_category);

alter table public.game_question_usage enable row level security;
drop policy if exists game_question_usage_deny_all on public.game_question_usage;
create policy game_question_usage_deny_all on public.game_question_usage
  for all using (false) with check (false);

create unique index if not exists uq_game_questions_unique_prompt
  on public.game_questions (game_id, phase_category, band, prompt);

create or replace function public.pick_wolf_questions_from_bank(
  p_grade text,
  p_session_key text default null
)
returns table (
  question_id uuid,
  phase_category text,
  grade text,
  band text,
  difficulty text,
  prompt text,
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
      v_q.difficulty,
      v_q.prompt,
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
  difficulty text,
  prompt text,
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
    q.difficulty,
    q.prompt,
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
  order by
    case when q.grade = v_grade then 0 else 1 end,
    random()
  limit 1;
end;
$$;

revoke all on function public.preview_wolf_question_from_bank_admin(text, text) from public;
grant execute on function public.preview_wolf_question_from_bank_admin(text, text) to authenticated, service_role;

insert into public.game_questions (
  game_id, source, phase_category, grade, band, difficulty, prompt, options, correct_option_index, explanation, tags, estimated_read_time, is_safe
)
values
  -- Exploradores • Reflexo
  ('game_teste_dos_lobos', 'manual', 'reflexo', '6º Ano', 'exploradores', 'easy', 'Qual número completa a sequência: 14, 18, 22, ?', '["24","26","28","30"]'::jsonb, 1, 'A sequência cresce de 4 em 4, então o próximo termo é 26.', ARRAY['bncc','reflexo','exploradores','sequencia'], 8, true),
  ('game_teste_dos_lobos', 'manual', 'reflexo', '7º Ano', 'exploradores', 'easy', 'Em uma turma, 3/5 de 20 alunos levaram livro. Quantos levaram?', '["8","10","12","15"]'::jsonb, 2, '3/5 de 20 = 12.', ARRAY['bncc','reflexo','exploradores','fracao'], 9, true),
  ('game_teste_dos_lobos', 'manual', 'reflexo', '6º Ano', 'exploradores', 'medium', 'Sequência de letras: C, E, G, ?. Qual completa?', '["H","I","J","K"]'::jsonb, 1, 'As letras avançam de 2 em 2: C,E,G,I.', ARRAY['bncc','reflexo','exploradores','padrao'], 8, true),

  -- Exploradores • Lógica
  ('game_teste_dos_lobos', 'manual', 'logica', '6º Ano', 'exploradores', 'easy', 'Todo quadrado é retângulo. O que é sempre verdadeiro?', '["Todo retângulo é quadrado","Todo quadrado é retângulo","Quadrados não têm lados","Retângulo sempre é triângulo"]'::jsonb, 1, 'A única afirmação sempre válida é que todo quadrado é um tipo de retângulo.', ARRAY['bncc','logica','exploradores','classificacao'], 11, true),
  ('game_teste_dos_lobos', 'manual', 'logica', '7º Ano', 'exploradores', 'easy', 'Se hoje é terça-feira, daqui a 10 dias será:', '["Quarta-feira","Quinta-feira","Sexta-feira","Sábado"]'::jsonb, 2, '10 dias equivalem a 7 + 3; terça + 3 = sexta.', ARRAY['bncc','logica','exploradores','calendario'], 10, true),
  ('game_teste_dos_lobos', 'manual', 'logica', '7º Ano', 'exploradores', 'medium', 'Todos os lobos uivam. Nala é lobo. Logo:', '["Nala não uiva","Nala uiva","Nenhum lobo uiva","Nala é gato"]'::jsonb, 1, 'Aplicando a regra geral ao caso particular: Nala uiva.', ARRAY['bncc','logica','exploradores','deducao'], 10, true),

  -- Exploradores • Conhecimento
  ('game_teste_dos_lobos', 'manual', 'conhecimento', '6º Ano', 'exploradores', 'easy', 'Em mapas convencionais, o Norte geralmente fica:', '["À esquerda","À direita","Na parte superior","Na parte inferior"]'::jsonb, 2, 'Convencionalmente, o norte é representado na parte superior.', ARRAY['bncc','conhecimento','exploradores','geografia'], 8, true),
  ('game_teste_dos_lobos', 'manual', 'conhecimento', '7º Ano', 'exploradores', 'medium', 'Qual mudança ocorre quando a água líquida vira vapor?', '["Condensação","Fusão","Evaporação","Solidificação"]'::jsonb, 2, 'Passagem do estado líquido para o gasoso é evaporação.', ARRAY['bncc','conhecimento','exploradores','ciencias'], 9, true),
  ('game_teste_dos_lobos', 'manual', 'conhecimento', '6º Ano', 'exploradores', 'medium', 'A Caatinga é um bioma típico de qual região do Brasil?', '["Norte","Nordeste","Sul","Centro-Oeste"]'::jsonb, 1, 'A Caatinga é predominante no Nordeste brasileiro.', ARRAY['bncc','conhecimento','exploradores','biomas'], 10, true),

  -- Exploradores • Liderança
  ('game_teste_dos_lobos', 'manual', 'lideranca', '7º Ano', 'exploradores', 'medium', 'Um colega ficou isolado no trabalho em grupo. A melhor atitude é:', '["Ignorar para ganhar tempo","Incluir o colega com uma tarefa clara","Trocar de grupo imediatamente","Deixar o professor resolver sozinho"]'::jsonb, 1, 'Liderança colaborativa inclui distribuir tarefas para participação de todos.', ARRAY['bncc','lideranca','exploradores','colaboracao'], 12, true),
  ('game_teste_dos_lobos', 'manual', 'lideranca', '6º Ano', 'exploradores', 'medium', 'O grupo errou a estratégia. Qual ação é mais madura?', '["Culpar um integrante","Revisar o plano em conjunto","Parar a atividade","Fingir que está tudo certo"]'::jsonb, 1, 'Revisão conjunta favorece aprendizado e responsabilidade coletiva.', ARRAY['bncc','lideranca','exploradores','responsabilidade'], 12, true),
  ('game_teste_dos_lobos', 'manual', 'lideranca', '7º Ano', 'exploradores', 'medium', 'Há duas ideias diferentes no grupo. Primeiro passo do líder:', '["Escolher sem ouvir ninguém","Ouvir as duas propostas e definir critérios","Cancelar o debate","Pedir votação sem discussão"]'::jsonb, 1, 'Escuta ativa e critérios claros melhoram a decisão do grupo.', ARRAY['bncc','lideranca','exploradores','escuta'], 12, true),

  -- Caçadores • Reflexo
  ('game_teste_dos_lobos', 'manual', 'reflexo', '8º Ano', 'cacadores', 'medium', 'Quanto é 15% de 200?', '["20","25","30","35"]'::jsonb, 2, '15% de 200 = 0,15 × 200 = 30.', ARRAY['bncc','reflexo','cacadores','porcentagem'], 9, true),
  ('game_teste_dos_lobos', 'manual', 'reflexo', '9º Ano', 'cacadores', 'medium', 'Se 4 cadernos custam R$28, quanto custa 1 caderno?', '["R$5","R$6","R$7","R$8"]'::jsonb, 2, 'Preço unitário: 28 ÷ 4 = 7.', ARRAY['bncc','reflexo','cacadores','proporcionalidade'], 10, true),
  ('game_teste_dos_lobos', 'manual', 'reflexo', '8º Ano', 'cacadores', 'medium', 'Resolva rapidamente: 2^4 + 3×2 =', '["20","22","24","26"]'::jsonb, 1, '2^4 = 16 e 3×2 = 6; total 22.', ARRAY['bncc','reflexo','cacadores','operacoes'], 10, true),

  -- Caçadores • Lógica
  ('game_teste_dos_lobos', 'manual', 'logica', '8º Ano', 'cacadores', 'medium', 'Se P implica Q e Q é falso, então P é:', '["Verdadeiro","Falso","Indeterminado","Sempre verdadeiro"]'::jsonb, 1, 'P -> Q e não Q implica não P (modus tollens).', ARRAY['bncc','logica','cacadores','proposicoes'], 12, true),
  ('game_teste_dos_lobos', 'manual', 'logica', '9º Ano', 'cacadores', 'medium', 'Qual o próximo número: 1, 4, 9, 16, ?', '["20","24","25","27"]'::jsonb, 2, 'É sequência de quadrados perfeitos: 1^2,2^2,3^2,4^2,5^2.', ARRAY['bncc','logica','cacadores','sequencia'], 9, true),
  ('game_teste_dos_lobos', 'manual', 'logica', '9º Ano', 'cacadores', 'hard', 'Uma urna tem 3 bolas azuis e 2 vermelhas. A probabilidade de tirar azul em um sorteio é:', '["2/5","3/5","1/2","3/2"]'::jsonb, 1, 'Há 3 casos favoráveis em 5 possíveis: 3/5.', ARRAY['bncc','logica','cacadores','probabilidade'], 11, true),

  -- Caçadores • Conhecimento
  ('game_teste_dos_lobos', 'manual', 'conhecimento', '8º Ano', 'cacadores', 'medium', 'Qual organela celular é mais associada à produção de energia (ATP)?', '["Lisossomo","Mitocôndria","Ribossomo","Cloroplasto"]'::jsonb, 1, 'A mitocôndria realiza respiração celular e produção de ATP.', ARRAY['bncc','conhecimento','cacadores','biologia'], 11, true),
  ('game_teste_dos_lobos', 'manual', 'conhecimento', '9º Ano', 'cacadores', 'medium', 'A Primeira Revolução Industrial começou principalmente em qual país?', '["França","Estados Unidos","Inglaterra","Alemanha"]'::jsonb, 2, 'Historicamente, o processo começou na Inglaterra.', ARRAY['bncc','conhecimento','cacadores','historia'], 11, true),
  ('game_teste_dos_lobos', 'manual', 'conhecimento', '8º Ano', 'cacadores', 'medium', 'Na fotossíntese, qual gás é liberado para a atmosfera?', '["Nitrogênio","Oxigênio","Gás carbônico","Metano"]'::jsonb, 1, 'A fotossíntese libera oxigênio (O2).', ARRAY['bncc','conhecimento','cacadores','ciencias'], 10, true),

  -- Caçadores • Liderança
  ('game_teste_dos_lobos', 'manual', 'lideranca', '8º Ano', 'cacadores', 'medium', 'Ao dar feedback para um colega, a postura mais eficaz é:', '["Expor o erro em público","Ser específico, respeitoso e propor melhoria","Ignorar para evitar conflito","Criticar sem exemplos"]'::jsonb, 1, 'Feedback eficaz combina respeito, clareza e orientação prática.', ARRAY['bncc','lideranca','cacadores','feedback'], 13, true),
  ('game_teste_dos_lobos', 'manual', 'lideranca', '9º Ano', 'cacadores', 'medium', 'O prazo está curto e o grupo está perdido. O líder deve primeiro:', '["Distribuir tarefas sem explicar","Definir prioridade e responsáveis","Esperar orientação externa","Refazer tudo sozinho"]'::jsonb, 1, 'Priorizar e delegar com clareza organiza a execução.', ARRAY['bncc','lideranca','cacadores','gestao'], 12, true),
  ('game_teste_dos_lobos', 'manual', 'lideranca', '9º Ano', 'cacadores', 'hard', 'Em um conflito entre colegas, a mediação madura começa com:', '["Tomar partido imediato","Escuta ativa dos dois lados","Punir sem conversa","Encerrar o debate à força"]'::jsonb, 1, 'Escutar ambos os lados reduz ruído e melhora acordos.', ARRAY['bncc','lideranca','cacadores','mediacao'], 12, true),

  -- Estrategistas • Reflexo
  ('game_teste_dos_lobos', 'manual', 'reflexo', '1ª Série', 'estrategistas', 'hard', 'Se f(x)=2x+3, então f(7)=', '["14","17","21","24"]'::jsonb, 1, 'f(7)=2*7+3=17.', ARRAY['bncc','reflexo','estrategistas','funcao'], 10, true),
  ('game_teste_dos_lobos', 'manual', 'reflexo', '2ª Série', 'estrategistas', 'hard', 'A média ponderada de 6 (peso 2) e 8 (peso 3) é:', '["7,0","7,2","7,4","7,6"]'::jsonb, 1, '((6*2)+(8*3))/5 = 36/5 = 7,2.', ARRAY['bncc','reflexo','estrategistas','media'], 11, true),
  ('game_teste_dos_lobos', 'manual', 'reflexo', '3ª Série', 'estrategistas', 'hard', 'Quanto vale 3^3 × 3^2?', '["81","162","243","729"]'::jsonb, 2, 'Mesma base: somam-se expoentes, 3^(3+2)=3^5=243.', ARRAY['bncc','reflexo','estrategistas','potenciacao'], 10, true),

  -- Estrategistas • Lógica
  ('game_teste_dos_lobos', 'manual', 'logica', '1ª Série', 'estrategistas', 'hard', 'Nenhum A é B. Todo C é A. Logo:', '["Todo C é B","Nenhum C é B","Algum C é B","Todo B é C"]'::jsonb, 1, 'Se C está contido em A e A não intersecta B, então C não intersecta B.', ARRAY['bncc','logica','estrategistas','proposicoes'], 13, true),
  ('game_teste_dos_lobos', 'manual', 'logica', '2ª Série', 'estrategistas', 'hard', 'Se uma afirmação é \"Se chover, treino cancela\" e o treino não cancelou, conclui-se que:', '["Choveu","Não choveu","Talvez tenha chovido","Nada pode ser concluído"]'::jsonb, 1, 'P->Q e não Q implica não P (modus tollens).', ARRAY['bncc','logica','estrategistas','inferencia'], 12, true),
  ('game_teste_dos_lobos', 'manual', 'logica', '3ª Série', 'estrategistas', 'hard', 'Quantas senhas de 2 letras distintas podem ser formadas com A, B, C, D?', '["8","10","12","16"]'::jsonb, 2, 'Arranjos de 4 elementos tomados 2 a 2: 4*3=12.', ARRAY['bncc','logica','estrategistas','combinatoria'], 12, true),

  -- Estrategistas • Conhecimento
  ('game_teste_dos_lobos', 'manual', 'conhecimento', '1ª Série', 'estrategistas', 'hard', 'Em qual fase do ciclo celular ocorre a duplicação do DNA?', '["G1","S","G2","Mitose"]'::jsonb, 1, 'A replicação do DNA ocorre na fase S da intérfase.', ARRAY['bncc','conhecimento','estrategistas','biologia'], 12, true),
  ('game_teste_dos_lobos', 'manual', 'conhecimento', '2ª Série', 'estrategistas', 'hard', 'Qual gás de efeito estufa está mais ligado à queima de combustíveis fósseis?', '["Oxigênio","Hidrogênio","Dióxido de carbono (CO2)","Hélio"]'::jsonb, 2, 'A combustão fóssil emite principalmente CO2.', ARRAY['bncc','conhecimento','estrategistas','clima'], 12, true),
  ('game_teste_dos_lobos', 'manual', 'conhecimento', '3ª Série', 'estrategistas', 'hard', 'A Constituição Federal atualmente vigente no Brasil foi promulgada em:', '["1967","1979","1988","1994"]'::jsonb, 2, 'A Constituição Cidadã foi promulgada em 1988.', ARRAY['bncc','conhecimento','estrategistas','cidadania'], 11, true),

  -- Estrategistas • Liderança
  ('game_teste_dos_lobos', 'manual', 'lideranca', '1ª Série', 'estrategistas', 'hard', 'Em um projeto complexo, a delegação mais eficiente deve priorizar:', '["Afinidade pessoal","Competência e disponibilidade","Quem fala mais alto","Ordem alfabética"]'::jsonb, 1, 'Delegar por competência e capacidade aumenta chance de entrega com qualidade.', ARRAY['bncc','lideranca','estrategistas','delegacao'], 13, true),
  ('game_teste_dos_lobos', 'manual', 'lideranca', '2ª Série', 'estrategistas', 'hard', 'Se um membro do grupo quer compartilhar dados sensíveis sem consentimento, a liderança ética exige:', '["Permitir para ganhar tempo","Bloquear e orientar procedimento correto","Ignorar para evitar conflito","Publicar e pedir desculpas depois"]'::jsonb, 1, 'Proteção de dados e consentimento são princípios éticos inegociáveis.', ARRAY['bncc','lideranca','estrategistas','etica'], 14, true),
  ('game_teste_dos_lobos', 'manual', 'lideranca', '3ª Série', 'estrategistas', 'hard', 'Quando stakeholders defendem prioridades opostas, o primeiro movimento estratégico do líder é:', '["Escolher a preferência pessoal","Mapear interesses, critérios e impacto","Cancelar a decisão","Adiar indefinidamente"]'::jsonb, 1, 'Mapear interesses e critérios permite decisão transparente e sustentável.', ARRAY['bncc','lideranca','estrategistas','estrategia'], 14, true)
on conflict (game_id, phase_category, band, prompt) do nothing;

commit;

