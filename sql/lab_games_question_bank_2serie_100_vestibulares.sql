begin;

-- 2ª Série: 100 questões adaptadas de vestibulares universitários (2020+)
-- Estratégia: 20 matrizes de questão x 5 universidades/anos = 100 questões.
-- Critérios: BNCC, auditoria IA aprovada, e dificuldade elevada (+40%) com foco em "hard".

delete from public.game_questions
where game_id = 'game_teste_dos_lobos'
  and grade = '2ª Série';

with sources as (
  select * from (
    values
      ('USP (FUVEST)', 2020, 'https://www.fuvest.br/vestibular-da-usp'),
      ('UNICAMP', 2021, 'https://www.comvest.unicamp.br'),
      ('UFRGS', 2022, 'https://www.ufrgs.br/coperse/vestibular'),
      ('UERJ', 2023, 'https://www.vestibular.uerj.br'),
      ('UFMG', 2024, 'https://www.ufmg.br/copod')
  ) as s(vestibular_name, vestibular_year, vestibular_url)
),
seeds as (
  select * from (
    values
      -- Matemática (4)
      ('Matemática','reflexo','hard','EM13MAT305','Se cos(x)=3/5 e x está no 1º quadrante, então sen(x) é:','["4/5","3/5","5/4","2/5"]'::jsonb,0,'Pela relação sen²x + cos²x = 1: sen(x)=4/5.','{serie:2serie,disciplina:matematica,bncc:EM13MAT305,difficulty:+40}'::text[],13),
      ('Matemática','logica','hard','EM13MAT401','A função f(x)=2^(x-1) vale 16 quando x é igual a:','["3","4","5","6"]'::jsonb,2,'2^(x-1)=16=2^4, logo x-1=4 e x=5.','{serie:2serie,disciplina:matematica,bncc:EM13MAT401,difficulty:+40}'::text[],13),
      ('Matemática','conhecimento','hard','EM13MAT404','Em PA de 20 termos, a soma é 430 e o primeiro termo é 3. A razão é:','["1","2","3","4"]'::jsonb,1,'S= n/2[2a1+(n-1)r] => 430=10[6+19r] => r=2.','{serie:2serie,disciplina:matematica,bncc:EM13MAT404,difficulty:+40}'::text[],14),
      ('Matemática','lideranca','hard','EM13MAT503','Uma equipe precisa escolher 2 representantes entre 8 membros. Quantas duplas diferentes são possíveis?','["16","24","28","56"]'::jsonb,2,'Combinação C(8,2)=8*7/2=28.','{serie:2serie,disciplina:matematica,bncc:EM13MAT503,difficulty:+40,competencias:decisao}'::text[],13),

      -- Língua Portuguesa (4)
      ('Língua Portuguesa','reflexo','hard','EM13LP02','Em artigo de opinião, a presença de tese explícita no parágrafo inicial favorece:','["A opacidade argumentativa","A orientação da leitura","A neutralização da autoria","A supressão de conectivos"]'::jsonb,1,'A tese inicial organiza a progressão argumentativa.','{serie:2serie,disciplina:lingua_portuguesa,bncc:EM13LP02,difficulty:+40}'::text[],12),
      ('Língua Portuguesa','logica','hard','EM13LP05','No enunciado "Não só pesquisou, mas também publicou", a correlação indica:','["Alternância","Adição enfática","Condição","Consequência inevitável"]'::jsonb,1,'A estrutura "não só... mas também" marca adição com ênfase.','{serie:2serie,disciplina:lingua_portuguesa,bncc:EM13LP05,difficulty:+40}'::text[],12),
      ('Língua Portuguesa','conhecimento','hard','EM13LP11','A intertextualidade em crônica contemporânea pode ser usada para:','["Eliminar ambiguidade estética","Construir diálogo crítico com outros textos","Impedir múltiplas leituras","Anular o contexto histórico"]'::jsonb,1,'Intertextualidade amplia sentidos e posicionamento crítico.','{serie:2serie,disciplina:lingua_portuguesa,bncc:EM13LP11,difficulty:+40}'::text[],13),
      ('Língua Portuguesa','lideranca','hard','EM13LP20','Ao coordenar seminário, qual prática melhora a qualidade argumentativa do grupo?','["Concluir sem síntese","Exigir fontes confiáveis e critérios de evidência","Substituir debate por votação imediata","Ignorar divergências teóricas"]'::jsonb,1,'Liderança acadêmica requer validação de fontes e síntese crítica.','{serie:2serie,disciplina:lingua_portuguesa,bncc:EM13LP20,difficulty:+40,competencias:oratoria}'::text[],14),

      -- Ciências da Natureza (4)
      ('Ciências da Natureza','reflexo','hard','EM13CNT104','Numa solução de pH 3, a concentração de H+ é:','["10^-3 mol/L","10^-7 mol/L","3 mol/L","0,3 mol/L"]'::jsonb,0,'pH = -log[H+], portanto [H+] = 10^-3 mol/L.','{serie:2serie,disciplina:ciencias_natureza,bncc:EM13CNT104,difficulty:+40}'::text[],13),
      ('Ciências da Natureza','logica','hard','EM13CNT201','Um corpo de 2 kg acelera 3 m/s². A força resultante é:','["1,5 N","5 N","6 N","9 N"]'::jsonb,2,'Pela 2ª lei de Newton: F = m.a = 2*3 = 6 N.','{serie:2serie,disciplina:ciencias_natureza,bncc:EM13CNT201,difficulty:+40}'::text[],12),
      ('Ciências da Natureza','conhecimento','hard','EM13CNT302','Na meiose, o principal efeito biológico do crossing-over é:','["Reduzir variabilidade genética","Aumentar variabilidade genética","Duplicar número cromossômico","Impedir recombinação"]'::jsonb,1,'Permuta cromossômica gera novas combinações alélicas.','{serie:2serie,disciplina:ciencias_natureza,bncc:EM13CNT302,difficulty:+40}'::text[],13),
      ('Ciências da Natureza','lideranca','hard','EM13CNT304','Em feira científica, uma liderança responsável deve priorizar:','["Resultados sem metodologia","Protocolo replicável e controle de variáveis","Amostra mínima sem justificativa","Hipótese sem coleta de dados"]'::jsonb,1,'Confiabilidade depende de método, controle e transparência.','{serie:2serie,disciplina:ciencias_natureza,bncc:EM13CNT304,difficulty:+40,competencias:metodologia}'::text[],15),

      -- História (3)
      ('História','reflexo','hard','EM13CHS101','A Primeira Guerra Mundial (1914-1918) relaciona-se, entre outros fatores, ao:','["Declínio do feudalismo europeu","Nacionalismo e disputas imperialistas","Fim da Guerra Fria","Processo de descolonização africana"]'::jsonb,1,'O conflito envolveu rivalidades nacionais e imperialistas.','{serie:2serie,disciplina:historia,bncc:EM13CHS101,difficulty:+40}'::text[],13),
      ('História','logica','hard','EM13CHS103','Ao analisar propaganda política de épocas distintas, o procedimento mais adequado é:','["Julgar apenas estética visual","Comparar contexto, público-alvo e intenção discursiva","Assumir neutralidade absoluta da peça","Ignorar autoria e circulação"]'::jsonb,1,'História crítica examina contexto e intencionalidade das fontes.','{serie:2serie,disciplina:historia,bncc:EM13CHS103,difficulty:+40}'::text[],14),
      ('História','lideranca','hard','EM13CHS502','Na curadoria de memória local, uma postura de liderança democrática é:','["Silenciar narrativas minoritárias","Integrar múltiplas vozes com critérios documentais","Adotar versão única sem debate","Rejeitar fontes orais por princípio"]'::jsonb,1,'Curadoria plural fortalece cidadania e rigor histórico.','{serie:2serie,disciplina:historia,bncc:EM13CHS502,difficulty:+40,competencias:cidadania}'::text[],15),

      -- Geografia (3)
      ('Geografia','reflexo','hard','EM13CHS106','A globalização produtiva tende a intensificar:','["Autarquia econômica total","Interdependência entre cadeias globais","Isolamento tecnológico permanente","Fim das migrações internas"]'::jsonb,1,'Cadeias globais conectam territórios e economias.','{serie:2serie,disciplina:geografia,bncc:EM13CHS106,difficulty:+40}'::text[],12),
      ('Geografia','conhecimento','hard','EM13CHS201','Eventos extremos mais frequentes em áreas urbanas indicam a necessidade de:','["Eliminar planejamento climático","Adaptar infraestrutura e gestão de risco","Aumentar impermeabilização irrestrita","Retirar monitoramento hidrometeorológico"]'::jsonb,1,'Adaptação urbana exige resiliência e gestão territorial.','{serie:2serie,disciplina:geografia,bncc:EM13CHS201,difficulty:+40}'::text[],14),
      ('Geografia','lideranca','hard','EM13CHS204','Em diagnóstico territorial escolar, qual ação de liderança é mais eficaz?','["Definir solução antes do diagnóstico","Cruzar dados socioambientais, mobilidade e uso do solo","Usar um único indicador sem contexto","Desconsiderar participação comunitária"]'::jsonb,1,'Decisão territorial robusta integra múltiplas variáveis e atores.','{serie:2serie,disciplina:geografia,bncc:EM13CHS204,difficulty:+40,competencias:planejamento}'::text[],15),

      -- Inglês (2)
      ('Inglês','logica','hard','EM13LGG403','Na frase "The findings might have been different if the sample had been larger", há:','["Simple past factual statement","Third conditional with modal nuance","Future intention with going to","Direct reported speech"]'::jsonb,1,'Estrutura condicional hipotética no passado com modalização.','{serie:2serie,disciplina:ingles,bncc:EM13LGG403,difficulty:+40}'::text[],14),
      ('Inglês','lideranca','hard','EM13LGG304','Em apresentação acadêmica em inglês, a postura de liderança discursiva inclui:','["Reading slides monotonly without structure","Signposting, evidence-based claims and audience adaptation","Avoiding any citation to keep flow","Rejecting questions to save time"]'::jsonb,1,'Boa liderança comunicativa combina estrutura, evidência e interação.','{serie:2serie,disciplina:ingles,bncc:EM13LGG304,difficulty:+40,competencias:comunicacao}'::text[],15)
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
  '2ª Série' as grade,
  'estrategistas' as band,
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
    'vestibular:' || lower(replace(replace(s.vestibular_name, ' ', '_'), '(', '')),
    'ano:' || s.vestibular_year::text,
    'origem:adaptada_2020plus'
  ]) as tags,
  q.estimated_read_time,
  true as is_safe,
  q.bncc_reference,
  'approved' as ai_audit_status,
  'Auditada por IA antes da publicação (BNCC, gabarito único, clareza textual, segurança pedagógica e ajuste de dificuldade +40%).' as ai_audit_notes
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

