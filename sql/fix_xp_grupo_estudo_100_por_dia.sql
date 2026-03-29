begin;

update public.xp_activity_catalog c
set
  xp_amount = 100,
  recurrence_note = 'Planilha corrigida: 100 XP por dia.',
  updated_at = now()
where c.title = 'Participação Grupo de Estudo + Monitoria'
  and c.target_group = 'medio'
  and c.xp_amount <> 100;

with corrected_awards as (
  update public.xp_activity_awards a
  set
    xp_amount = 100,
    note = case
      when coalesce(a.note, '') ilike '%Correção automática: valor ajustado de 500 para 100 XP%'
        then a.note
      else
        coalesce(nullif(trim(a.note), ''), 'Lançamento de XP: Participação Grupo de Estudo + Monitoria')
        || ' | Correção automática: valor ajustado de 500 para 100 XP (regra: 100 XP por dia).'
    end
  from public.xp_activity_catalog c
  where a.activity_id = c.id
    and c.title = 'Participação Grupo de Estudo + Monitoria'
    and a.xp_amount = 500
  returning a.id, a.student_id, a.created_by, a.occurred_on, a.xp_event_id
), corrected_events as (
  update public.xp_events e
  set
    xp_amount = 100,
    note = case
      when coalesce(e.note, '') ilike '%Correção automática: valor ajustado de 500 para 100 XP%'
        then e.note
      else
        coalesce(nullif(trim(e.note), ''), 'Lançamento de XP')
        || ' | Correção automática: valor ajustado de 500 para 100 XP (regra: 100 XP por dia).'
    end
  from corrected_awards a
  where e.id = a.xp_event_id
  returning e.id
)
insert into public.student_messages (
  student_id,
  sender_id,
  sender_role,
  sender_name,
  title,
  body
)
select
  a.student_id,
  a.created_by,
  'admin',
  coalesce(nullif(trim(actor.full_name), ''), 'Equipe InGenium'),
  'Correção de XP em atividade',
  format(
    'Atualizamos seu XP por correção da regra da atividade.%sAtividade: Participação Grupo de Estudo + Monitoria%sData da atividade: %s%sValor anterior: 500 XP%sValor corrigido: 100 XP%sMotivo: a regra correta é 100 XP por dia.',
    E'\n',
    E'\n',
    a.occurred_on::text,
    E'\n',
    E'\n',
    E'\n'
  )
from corrected_awards a
left join public.profiles actor on actor.id = a.created_by
where not exists (
  select 1
  from public.student_messages m
  where m.student_id = a.student_id
    and m.title = 'Correção de XP em atividade'
    and m.body ilike '%Participação Grupo de Estudo + Monitoria%'
    and m.body ilike '%Valor corrigido: 100 XP%'
);

commit;
