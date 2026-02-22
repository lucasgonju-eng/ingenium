-- Seed ONHB (2026) no Supabase
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
  'onhb',
  'ONHB — Olimpíada Nacional em História do Brasil',
  'A ONHB é uma olimpíada em equipe, com fases online semanais e final presencial. Você aprende História do Brasil analisando fontes, tomando decisões e resolvendo desafios reais.',
  'Humanas / História',
  'open',
  '2026-05-04',
  '2026-05-09',
  '2026-04-24'
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
      ('onhb', 'inscricoes', '2026-02-15', '2026-04-24', 'Inscrições'),
      ('onhb', 'fase_1', '2026-05-04', '2026-05-09', 'Fase 1 (online)'),
      ('onhb', 'fase_2', '2026-05-11', '2026-05-16', 'Fase 2 (online)'),
      ('onhb', 'fase_3', '2026-05-18', '2026-05-23', 'Fase 3 (online)'),
      ('onhb', 'fase_4', '2026-05-25', '2026-05-30', 'Fase 4 (online)'),
      ('onhb', 'fase_5', '2026-06-08', '2026-06-13', 'Fase 5 (online)'),
      ('onhb', 'selecao_para_final', '2026-06-19', '2026-06-19', 'Seleção para final'),
      ('onhb', 'medalhistas_estaduais', '2026-06-26', '2026-06-26', 'Medalhistas estaduais'),
      ('onhb', 'final_presencial', '2026-08-29', '2026-08-29', 'Final presencial'),
      ('onhb', 'cerimonia_premiacao', '2026-08-30', '2026-08-30', 'Cerimônia de premiação')
    on conflict do nothing;
  end if;
end $$;
