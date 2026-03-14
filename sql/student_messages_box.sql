-- Caixa de Mensagens do perfil do aluno.
-- Permite envio por teacher/coord/gestao/admin para estudantes.

create table if not exists public.student_messages (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete restrict,
  sender_role text not null check (sender_role in ('teacher', 'coord', 'gestao', 'admin')),
  sender_name text not null default 'Equipe InGenium',
  title text not null,
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz null
);

create index if not exists idx_student_messages_student_created
  on public.student_messages(student_id, created_at desc);

create index if not exists idx_student_messages_student_unread
  on public.student_messages(student_id)
  where read_at is null;

alter table public.student_messages enable row level security;

drop policy if exists student_messages_select_owner on public.student_messages;
create policy student_messages_select_owner
  on public.student_messages
  for select
  to authenticated
  using (student_id = auth.uid());

drop policy if exists student_messages_update_read_owner on public.student_messages;
create policy student_messages_update_read_owner
  on public.student_messages
  for update
  to authenticated
  using (student_id = auth.uid())
  with check (
    student_id = auth.uid()
    and (
      read_at is null
      or read_at >= created_at
    )
  );

drop policy if exists student_messages_insert_privileged on public.student_messages;
create policy student_messages_insert_privileged
  on public.student_messages
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.profiles actor
      where actor.id = auth.uid()
        and coalesce(lower(actor.role), 'student') in ('teacher', 'coord', 'gestao', 'admin')
    )
    and sender_id = auth.uid()
    and sender_role in ('teacher', 'coord', 'gestao', 'admin')
    and exists (
      select 1
      from public.profiles target
      where target.id = student_id
        and coalesce(lower(target.role), 'student') = 'student'
    )
  );

revoke all on table public.student_messages from public;
grant select, update, insert on table public.student_messages to authenticated;
grant all on table public.student_messages to service_role;
