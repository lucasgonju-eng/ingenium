-- Seed OBF (2026 TBD) no Supabase
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
  'obf',
  'OBF — Olimpíada Brasileira de Física',
  'A OBF é a olimpíada oficial de Física da SBF e é referência nacional. Ideal pra quem gosta de desafios e quer treinar resolução de problemas em alto nível.',
  'Exatas / Física',
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

-- 2026 não publicado: não inserir eventos oficiais.
