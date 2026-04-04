-- Garante regras fixas de XP para atividades específicas:
-- - "Nenhuma notificação de tarefa" => 160 XP e escopo individual
-- - "Einstein Science (Laboratório)" => 100 XP
-- Aplica correção retroativa e trava inserções/edições futuras.

update public.xp_activity_catalog
set xp_amount =
      case
        when lower(trim(coalesce(title, ''))) in (lower('Nenhuma notificação de tarefa'), lower('Nenhuma notificacao de tarefa')) then 160
        when lower(trim(coalesce(title, ''))) in (lower('Einstein Science (Laboratório)'), lower('Einstein Science (Laboratorio)')) then 100
        else xp_amount
      end,
    default_scope =
      case
        when lower(trim(coalesce(title, ''))) in (lower('Nenhuma notificação de tarefa'), lower('Nenhuma notificacao de tarefa')) then 'individual'
        else default_scope
      end,
    updated_at = now()
where lower(trim(coalesce(title, ''))) in (
  lower('Nenhuma notificação de tarefa'),
  lower('Nenhuma notificacao de tarefa'),
  lower('Einstein Science (Laboratório)'),
  lower('Einstein Science (Laboratorio)')
)
  and (
    (
      lower(trim(coalesce(title, ''))) in (lower('Nenhuma notificação de tarefa'), lower('Nenhuma notificacao de tarefa'))
      and (xp_amount <> 160 or coalesce(default_scope, 'individual') <> 'individual')
    )
    or
    (
      lower(trim(coalesce(title, ''))) in (lower('Einstein Science (Laboratório)'), lower('Einstein Science (Laboratorio)'))
      and xp_amount <> 100
    )
  );

update public.xp_activity_awards a
set award_scope = 'individual'
from public.xp_activity_catalog c
where c.id = a.activity_id
  and lower(trim(coalesce(c.title, ''))) in (
    lower('Nenhuma notificação de tarefa'),
    lower('Nenhuma notificacao de tarefa')
  )
  and coalesce(a.award_scope, 'individual') <> 'individual';

create or replace function public.enforce_no_task_notification_xp_160()
returns trigger
language plpgsql
as $$
declare
  v_title text := lower(trim(coalesce(new.title, '')));
begin
  if v_title in (lower('Nenhuma notificação de tarefa'), lower('Nenhuma notificacao de tarefa')) then
    new.xp_amount := 160;
    new.default_scope := 'individual';
  elsif v_title in (lower('Einstein Science (Laboratório)'), lower('Einstein Science (Laboratorio)')) then
    new.xp_amount := 100;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_no_task_notification_xp_160 on public.xp_activity_catalog;
create trigger trg_enforce_no_task_notification_xp_160
before insert or update of title, xp_amount, default_scope
on public.xp_activity_catalog
for each row
execute function public.enforce_no_task_notification_xp_160();

create or replace function public.enforce_no_task_notification_award_scope_individual()
returns trigger
language plpgsql
as $$
declare
  v_title text;
begin
  select lower(trim(coalesce(title, '')))
    into v_title
  from public.xp_activity_catalog
  where id = new.activity_id;

  if v_title in (lower('Nenhuma notificação de tarefa'), lower('Nenhuma notificacao de tarefa')) then
    new.award_scope := 'individual';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_no_task_notification_award_scope_individual on public.xp_activity_awards;
create trigger trg_enforce_no_task_notification_award_scope_individual
before insert or update of activity_id, award_scope
on public.xp_activity_awards
for each row
execute function public.enforce_no_task_notification_award_scope_individual();
