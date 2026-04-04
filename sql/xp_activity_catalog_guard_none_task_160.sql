-- Garante que a atividade "Nenhuma notificação de tarefa" permaneça em 160 XP
-- e com escopo individual.
-- Aplica correção retroativa e trava inserções/edições futuras.

update public.xp_activity_catalog
set xp_amount = 160,
    default_scope = 'individual',
    updated_at = now()
where lower(trim(coalesce(title, ''))) in (
  lower('Nenhuma notificação de tarefa'),
  lower('Nenhuma notificacao de tarefa')
)
  and (xp_amount <> 160 or coalesce(default_scope, 'individual') <> 'individual');

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
