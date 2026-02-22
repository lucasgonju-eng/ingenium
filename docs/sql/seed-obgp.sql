-- Seed OBGP (2026.1) no Supabase
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
  'obgp',
  'OBGP — Olimpíada Brasileira de Geopolítica',
  'A OBGP coloca você no tabuleiro do mundo: relações internacionais, conflitos, alianças, economia e decisões globais. Excelente para repertório de atualidades e redação.',
  'Humanas / Geopolítica',
  'open',
  '2026-04-01',
  '2026-04-01',
  '2026-03-25'
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

-- Eventos oficiais da OBGP (somente se a tabela existir)
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
      ('obgp', 'registration_deadline', '2026-03-25', '2026-03-25', 'Prazo final de inscrição'),
      ('obgp', 'exam_date', '2026-04-01', '2026-04-01', 'Prova (07:00–23:00, horário de Brasília)'),
      ('obgp', 'appeals_window', '2026-04-02', '2026-04-03', 'Janela de recursos'),
      ('obgp', 'results_date', '2026-04-08', '2026-04-08', 'Divulgação de resultados'),
      ('obgp', 'medals_request_window', '2026-04-09', '2026-07-10', 'Solicitação de medalhas')
    on conflict do nothing;
  end if;
end $$;
