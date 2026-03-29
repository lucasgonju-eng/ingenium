begin;

update public.xp_activity_catalog c
set
  xp_amount = 50,
  recurrence_note = 'Planilha corrigida: 50 XP por dia.',
  updated_at = now()
where c.title = 'Organização da sala de aula!'
  and c.default_scope = 'collective'
  and c.xp_amount <> 50;

commit;
