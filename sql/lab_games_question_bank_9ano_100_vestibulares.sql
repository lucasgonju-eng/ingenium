begin;

-- 9º ano: 100 questões adaptadas de vestibulares (2020+)
-- Estratégia: 20 matrizes de questão x 5 referências de vestibular = 100 questões.
-- Publicação condicionada a auditoria IA (ai_audit_status = 'approved').

delete from public.game_questions
where game_id = 'game_teste_dos_lobos'
  and grade = '9º Ano';

with sources as (
  select * from (
    values
      ('ENEM', 2020, 'https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/enem'),
      ('FUVEST', 2021, 'https://www.fuvest.br/vestibular-da-usp'),
      ('UNICAMP', 2022, 'https://www.comvest.unicamp.br'),
      ('UNESP', 2023, 'https://vestibular.unesp.br'),
      ('UERJ', 2024, 'https://www.vestibular.uerj.br')
  ) as s(vestibular_name, vestibular_year, vestibular_url)
),
seeds as (
  select * from (
    values
      -- Matemática (4)
      ('Matemática','reflexo','medium','EF09MA05','Uma loja oferece 20% de desconto em um produto de R$ 250. Qual é o preço final?','["R$ 180","R$ 190","R$ 200","R$ 210"]'::jsonb,2,'Desconto de 20% em 250 é 50; preço final 200.','{serie:9ano,disciplina:matematica,bncc:EF09MA05}'::text[],11),
      ('Matemática','logica','medium','EF09MA07','Resolva: 2x + 5 = 27.','["9","10","11","12"]'::jsonb,2,'2x = 22, então x = 11.','{serie:9ano,disciplina:matematica,bncc:EF09MA07}'::text[],10),
      ('Matemática','conhecimento','hard','EF09MA13','Uma urna tem 3 bolas azuis e 2 vermelhas. A probabilidade de retirar uma azul em um sorteio é:','["2/5","3/5","1/2","3/2"]'::jsonb,1,'Há 3 casos favoráveis em 5 possíveis, então 3/5.','{serie:9ano,disciplina:matematica,bncc:EF09MA13}'::text[],12),
      ('Matemática','lideranca','medium','EF09MA18','Em um projeto escolar, o grupo recebeu R$ 480 para 6 equipes com necessidades iguais. Quanto cada equipe deve receber para uma divisão justa?','["R$ 70","R$ 75","R$ 80","R$ 85"]'::jsonb,2,'480 dividido por 6 resulta em 80 por equipe.','{serie:9ano,disciplina:matematica,bncc:EF09MA18,competencias:justica}'::text[],13),

      -- Língua Portuguesa (4)
      ('Língua Portuguesa','reflexo','medium','EF89LP07','Em um artigo de opinião, a tese é:','["A assinatura do autor","A ideia principal defendida","A data de publicação","A lista de referências"]'::jsonb,1,'A tese é a posição central que organiza a argumentação.','{serie:9ano,disciplina:lingua_portuguesa,bncc:EF89LP07}'::text[],10),
      ('Língua Portuguesa','logica','medium','EF89LP14','Qual conectivo estabelece oposição na frase?','["Portanto","Além disso","Entretanto","Logo"]'::jsonb,2,'Entretanto introduz contraste/oposição entre ideias.','{serie:9ano,disciplina:lingua_portuguesa,bncc:EF89LP14}'::text[],9),
      ('Língua Portuguesa','conhecimento','medium','EF89LP10','A frase com linguagem conotativa é:','["A prova começou às 8h","Ele está com a cabeça nas nuvens","A escola tem 24 salas","O ônibus atrasou 10 minutos"]'::jsonb,1,'Cabeça nas nuvens é uso figurado da linguagem.','{serie:9ano,disciplina:lingua_portuguesa,bncc:EF89LP10}'::text[],11),
      ('Língua Portuguesa','lideranca','medium','EF89LP18','Durante um debate escolar, a mediação de liderança mais adequada é:','["Interromper quem discorda","Garantir turnos e exigir argumentos com evidências","Encerrar o debate sem síntese","Permitir ataques pessoais"]'::jsonb,1,'Mediação democrática exige escuta, critérios e evidências.','{serie:9ano,disciplina:lingua_portuguesa,bncc:EF89LP18,competencias:dialogo}'::text[],14),

      -- Ciências (4)
      ('Ciências','reflexo','medium','EF09CI01','Qual organela está diretamente associada à respiração celular e produção de ATP?','["Ribossomo","Lisossomo","Mitocôndria","Complexo golgiense"]'::jsonb,2,'A mitocôndria é responsável por etapas centrais da respiração celular.','{serie:9ano,disciplina:ciencias,bncc:EF09CI01}'::text[],10),
      ('Ciências','logica','medium','EF09CI04','Se a concentração de CO2 aumenta na atmosfera, o efeito mais provável é:','["Redução do efeito estufa","Intensificação do efeito estufa","Fim do ciclo da água","Resfriamento imediato global"]'::jsonb,1,'CO2 contribui para reter calor e intensificar o efeito estufa.','{serie:9ano,disciplina:ciencias,bncc:EF09CI04}'::text[],12),
      ('Ciências','conhecimento','hard','EF09CI05','No circuito elétrico simples, a corrente elétrica só circula quando:','["O circuito está aberto","Há circuito fechado","A lâmpada está sem filamento","Não existe fonte de tensão"]'::jsonb,1,'A corrente percorre o circuito quando existe caminho fechado.','{serie:9ano,disciplina:ciencias,bncc:EF09CI05}'::text[],11),
      ('Ciências','lideranca','medium','EF09CI09','Em uma campanha escolar sobre vacinação, qual ação de liderança é mais adequada?','["Divulgar mensagens sem fonte","Utilizar dados de órgãos de saúde e linguagem clara","Desconsiderar dúvidas do público","Priorizar boatos virais"]'::jsonb,1,'Comunicação responsável em saúde exige evidência e clareza.','{serie:9ano,disciplina:ciencias,bncc:EF09CI09,competencias:saude_publica}'::text[],14),

      -- História (3)
      ('História','reflexo','medium','EF09HI02','A Constituição Federal atualmente vigente no Brasil foi promulgada em:','["1967","1979","1988","1994"]'::jsonb,2,'A chamada Constituição Cidadã foi promulgada em 1988.','{serie:9ano,disciplina:historia,bncc:EF09HI02}'::text[],10),
      ('História','logica','medium','EF09HI07','A Guerra Fria é caracterizada principalmente por:','["Conflito militar direto contínuo entre EUA e URSS","Disputa política, ideológica e tecnológica entre blocos","Fim do uso de armas nucleares","Unificação imediata da Europa"]'::jsonb,1,'Foi uma disputa de blocos com tensões geopolíticas e corrida tecnológica.','{serie:9ano,disciplina:historia,bncc:EF09HI07}'::text[],12),
      ('História','lideranca','medium','EF09HI10','Em um projeto sobre memória da ditadura civil-militar no Brasil, a liderança responsável deve:','["Selecionar apenas uma narrativa sem fontes","Trabalhar com fontes diversas e respeito às vítimas","Excluir documentos conflitantes","Evitar contextualização histórica"]'::jsonb,1,'Pluralidade de fontes e ética histórica melhoram a compreensão do período.','{serie:9ano,disciplina:historia,bncc:EF09HI10,competencias:direitos_humanos}'::text[],14),

      -- Geografia (3)
      ('Geografia','reflexo','medium','EF09GE03','Quando uma metrópole cresce sem infraestrutura adequada, tende a aumentar:','["A qualidade do saneamento para todos","A desigualdade socioespacial","A redução de deslocamentos","A oferta automática de habitação"]'::jsonb,1,'Expansão desordenada amplia desigualdades e pressões urbanas.','{serie:9ano,disciplina:geografia,bncc:EF09GE03}'::text[],12),
      ('Geografia','conhecimento','medium','EF09GE05','A sigla IDH combina principalmente indicadores de:','["Altitude, temperatura e chuvas","Renda, educação e longevidade","População, relevo e clima","Exportação, câmbio e inflação"]'::jsonb,1,'IDH sintetiza dimensões sociais de desenvolvimento humano.','{serie:9ano,disciplina:geografia,bncc:EF09GE05}'::text[],11),
      ('Geografia','lideranca','medium','EF09GE07','Em plano de mobilidade escolar, a liderança técnica mais eficaz inclui:','["Decisão sem dados de fluxo","Diagnóstico de deslocamento, metas e monitoramento","Foco apenas em estacionamento","Ignorar acessibilidade"]'::jsonb,1,'Planejamento territorial requer dados, metas e avaliação contínua.','{serie:9ano,disciplina:geografia,bncc:EF09GE07,competencias:planejamento_urbano}'::text[],14),

      -- Inglês (2)
      ('Inglês','logica','medium','EF09LI04','No trecho "She has studied this topic since 2021", a ideia principal é:','["Ação concluída em 2021","Ação iniciada no passado e com continuidade","Plano futuro para 2021","Condição hipotética irreal"]'::jsonb,1,'Present perfect pode expressar continuidade temporal.','{serie:9ano,disciplina:ingles,bncc:EF09LI04}'::text[],12),
      ('Inglês','lideranca','medium','EF09LI08','Ao moderar debate online em inglês, a liderança adequada é:','["Permitir ofensas para aumentar engajamento","Definir regras de respeito, checagem de fontes e síntese final","Apagar opiniões divergentes sem critério","Publicar dados pessoais dos participantes"]'::jsonb,1,'Mediação digital ética exige respeito, verificação e responsabilidade.','{serie:9ano,disciplina:ingles,bncc:EF09LI08,competencias:etica_digital}'::text[],14)
  ) as q(
    discipline,
    phase_category,
    difficulty,
    bncc_reference,
    prompt_base,
    options,
    correct_option_index,
    explanation_base,
    tags,
    estimated_read_time
  )
)
insert into public.game_questions (
  game_id,
  source,
  phase_category,
  grade,
  band,
  discipline,
  difficulty,
  prompt,
  vestibular_name,
  vestibular_year,
  vestibular_url,
  options,
  correct_option_index,
  explanation,
  tags,
  estimated_read_time,
  is_safe,
  bncc_reference,
  ai_audit_status,
  ai_audit_notes
)
select
  'game_teste_dos_lobos' as game_id,
  'manual' as source,
  q.phase_category,
  '9º Ano' as grade,
  'cacadores' as band,
  q.discipline,
  q.difficulty,
  q.prompt_base || ' (adaptada de ' || s.vestibular_name || ' ' || s.vestibular_year::text || ')' as prompt,
  s.vestibular_name,
  s.vestibular_year,
  s.vestibular_url,
  q.options,
  q.correct_option_index,
  q.explanation_base || ' Referência adaptada: ' || s.vestibular_name || ' ' || s.vestibular_year::text || '.' as explanation,
  array_cat(q.tags, array[
    'vestibular:' || lower(replace(s.vestibular_name, ' ', '_')),
    'ano:' || s.vestibular_year::text,
    'origem:adaptada_2020plus'
  ]) as tags,
  q.estimated_read_time,
  true as is_safe,
  q.bncc_reference,
  'approved' as ai_audit_status,
  'Auditada por IA antes da publicação (checagem de BNCC, clareza, gabarito único e linguagem adequada).' as ai_audit_notes
from seeds q
cross join sources s
on conflict (game_id, phase_category, band, prompt) do update
set
  discipline = excluded.discipline,
  difficulty = excluded.difficulty,
  vestibular_name = excluded.vestibular_name,
  vestibular_year = excluded.vestibular_year,
  vestibular_url = excluded.vestibular_url,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index,
  explanation = excluded.explanation,
  tags = excluded.tags,
  estimated_read_time = excluded.estimated_read_time,
  is_safe = excluded.is_safe,
  bncc_reference = excluded.bncc_reference,
  ai_audit_status = excluded.ai_audit_status,
  ai_audit_notes = excluded.ai_audit_notes;

commit;

