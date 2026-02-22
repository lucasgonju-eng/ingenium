-- Seed Canguru de Matemática Brasil (2026) no Supabase
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
  'canguru',
  'Canguru de Matemática Brasil',
  'Prova objetiva e divertida, perfeita para treinar raciocínio lógico, ganhar ritmo de prova e representar o Einstein em uma competição global.',
  'Exatas / Matemática',
  'open',
  '2026-03-19',
  '2026-03-25',
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
      ('canguru', 'janela_prova', '2026-03-19', '2026-03-25', 'Janela de prova'),
      ('canguru', 'resultado', '2026-06-02', '2026-06-02', 'Resultado'),
      ('canguru', 'janela_venda_medalhas', '2026-06-02', '2026-10-12', 'Janela de venda de medalhas')
    on conflict do nothing;
  end if;
end $$;
