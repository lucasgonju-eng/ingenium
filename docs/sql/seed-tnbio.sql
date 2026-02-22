-- Seed TNBio (2026) no Supabase
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
  'tnbio',
  'TNBio — Torneio Nacional de Biologia',
  'Competição online com prova objetiva, ótima para entrar na cultura olímpica e medir desempenho em Biologia com calendário claro.',
  'Ciências da Natureza / Biologia',
  'open',
  '2026-05-20',
  '2026-05-20',
  '2026-05-13'
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
      ('tnbio', 'inscricoes', '2025-11-25', '2026-05-13', 'Inscrições'),
      ('tnbio', 'prova_fase_unica', '2026-05-20', '2026-05-20', 'Prova (fase única)'),
      ('tnbio', 'recursos', '2026-05-21', '2026-05-22', 'Recursos'),
      ('tnbio', 'resultados_certificados', '2026-05-27', '2026-05-27', 'Resultados e certificados'),
      ('tnbio', 'solicitacao_medalhas', '2026-05-28', '2026-07-10', 'Solicitação de medalhas')
    on conflict do nothing;
  end if;
end $$;
