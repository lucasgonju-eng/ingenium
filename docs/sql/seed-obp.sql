-- OP — Olimpíada de Português
-- OP 2026 com inscrições abertas no portal oficial.
-- Este seed mantém datas nulas na tabela base (calendário detalhado vive no catálogo).

insert into public.olympiads (
  id,
  title,
  description,
  category,
  status,
  start_date,
  end_date,
  registration_deadline
)
values (
  'obp',
  'OP — Olimpíada de Português',
  'Competição nacional de Língua Portuguesa para Fundamental II e Ensino Médio.',
  'Linguagens / Língua Portuguesa',
  'upcoming',
  null,
  null,
  null
)
on conflict (id) do update
set
  title = excluded.title,
  description = excluded.description,
  category = excluded.category,
  status = excluded.status,
  start_date = excluded.start_date,
  end_date = excluded.end_date,
  registration_deadline = excluded.registration_deadline;

-- Observação: o ID legado 'obp' foi mantido para compatibilidade com dados já existentes.
