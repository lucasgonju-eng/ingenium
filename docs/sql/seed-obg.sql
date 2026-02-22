-- Seed OBG (2026) no Supabase
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
  'obg',
  'OBG — Olimpíada Brasileira de Geografia',
  'A OBG é uma competição que mistura geografia física e humana com desafios aplicados, leitura de mapas e análise do mundo real. Ideal pra quem curte humanas e trabalho em equipe.',
  'Humanas / Geografia',
  'upcoming',
  '2026-08-05',
  '2026-08-12',
  '2026-06-16'
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
      ('obg', 'registrations', '2026-04-06', '2026-06-16', 'Inscrições'),
      ('obg', 'fase_1_online', '2026-08-05', '2026-08-12', 'Fase 1 online'),
      ('obg', 'divulgacao_classificados_medalhistas_estaduais', '2026-09-01', '2026-09-01', 'Divulgação de classificados e medalhistas estaduais'),
      ('obg', 'fase_2_online', '2026-09-14', '2026-09-19', 'Fase 2 online'),
      ('obg', 'fase_3_online', '2026-10-05', '2026-10-10', 'Fase 3 online'),
      ('obg', 'final_presencial', null, null, 'Semana de novembro/2026 (data exata a confirmar no portal)')
    on conflict do nothing;
  end if;
end $$;
