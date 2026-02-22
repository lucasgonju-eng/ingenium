-- OBA + OBAFOG — Astronomia, Astronáutica e Foguetes
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
  'oba-obafog',
  'OBA + OBAFOG — Astronomia, Astronáutica e Foguetes',
  'A OBA testa Astronomia/Astronáutica e a OBAFOG coloca você no modo maker: construir e lançar foguetes de verdade.',
  'Ciências / Astronomia / STEAM / Maker',
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
--   ('oba-obafog', 'inscricoes_ate', 'Inscrições (até)', '2025-05-01', null, true),
--   ('oba-obafog', 'prova_oba', 'Prova OBA', '2025-05-16', null, true),
--   ('oba-obafog', 'prazo_lancamentos_obafog_ate', 'Prazo de lançamentos OBAFOG (até)', '2025-05-16', null, true);
