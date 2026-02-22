-- OBP — Olimpíada do Bem Público (FGV)
-- 2026 ainda não publicado: inserir olimpíada com status de calendário "a confirmar".
-- Este seed NÃO insere eventos oficiais de 2026.

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
  'OBP — Olimpíada do Bem Público (FGV)',
  'Competição de escrita e argumentação com etapa de apresentação oral (pitch).',
  'Linguagens / Redação / Cidadania',
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

-- Histórico 2025 (opcional): se existir tabela/flag de histórico, inserir com is_historical=true.
-- Exemplo (ajuste para seu schema):
-- insert into public.olympiad_events (olympiad_id, key, label, starts_at, ends_at, is_historical)
-- values
--   ('obp', 'inscricoes', 'Inscrições', '2025-08-11', '2025-09-30', true),
--   ('obp', 'submissao_redacoes', 'Submissão de redações', '2025-09-08', '2025-10-10', true),
--   ('obp', 'pitches', 'Pitches', '2025-12-08', '2025-12-19', true),
--   ('obp', 'medalhistas_ate', 'Medalhistas (até)', '2025-12-23', null, true),
--   ('obp', 'cerimonia_ate', 'Cerimônia (até)', '2026-02-14', null, true);
