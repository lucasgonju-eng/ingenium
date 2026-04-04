-- Garante que a atividade "Nenhuma notificação de tarefa" permaneça em 160 XP.
-- Aplica correção retroativa e trava inserções/edições futuras.

update public.xp_activity_catalog
set xp_amount = 160,
    updated_at = now()
where lower(trim(coalesce(title, ''))) in (
  lower('Nenhuma notificação de tarefa'),
  lower('Nenhuma notificacao de tarefa')
)
  and xp_amount <> 160;

create or replace function public.enforce_no_task_notification_xp_160()
returns trigger
language plpgsql
as $$
declare
  v_title text := lower(trim(coalesce(new.title, '')));
begin
  if v_title in (lower('Nenhuma notificação de tarefa'), lower('Nenhuma notificacao de tarefa')) then
    new.xp_amount := 160;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_no_task_notification_xp_160 on public.xp_activity_catalog;
create trigger trg_enforce_no_task_notification_xp_160
before insert or update of title, xp_amount
on public.xp_activity_catalog
for each row
execute function public.enforce_no_task_notification_xp_160();
