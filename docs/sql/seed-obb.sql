-- Seed OBB (XXII OBB 2026) no Supabase
-- Execute no SQL Editor do projeto.

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
  'obb',
  'OBB — Olimpíada Brasileira de Biologia',
  'A OBB é uma das olimpíadas mais fortes de Biologia do país, com fases eliminatórias e trilha clara de evolução. Ideal pra quem quer aprofundar e competir sério.',
  'Ciências da Natureza / Biologia',
  'open',
  '2026-03-03',
  '2026-03-03',
  '2026-02-25'
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

do $$
begin
  if to_regclass('public.olympiad_events') is not null then
    insert into public.olympiad_events (
      olympiad_id,
      event_key,
      start_date,
      end_date,
      description
    )
    values
      ('obb', 'inscricoes', '2026-01-15', '2026-02-25', 'Inscrições'),
      ('obb', 'fase_1', '2026-03-03', '2026-03-03', 'Fase 1'),
      ('obb', 'fase_2', '2026-03-18', '2026-03-18', 'Fase 2'),
      ('obb', 'fase_3', '2026-04-14', '2026-04-14', 'Fase 3 — 10:00 (horário de Brasília)'),
      ('obb', 'capacitacao_seletiva_virtual', '2026-05-07', '2026-05-08', 'Capacitação/Seletiva (virtual)'),
      ('obb', 'capacitacao_seletiva_presencial', '2026-05-11', '2026-05-16', 'Capacitação/Seletiva (presencial)')
    on conflict do nothing;
  end if;
end $$;
