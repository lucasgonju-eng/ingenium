begin;

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  sender_role text not null,
  sender_name text not null,
  sender_email text null,
  title text not null,
  body text not null,
  channel text not null default 'duvida_sugestao',
  created_at timestamptz not null default now(),
  read_at timestamptz null
);

create index if not exists idx_support_messages_recipient_created
  on public.support_messages(recipient_id, created_at desc);

create index if not exists idx_support_messages_sender_created
  on public.support_messages(sender_id, created_at desc);

create index if not exists idx_support_messages_recipient_unread
  on public.support_messages(recipient_id)
  where read_at is null;

alter table public.support_messages enable row level security;

drop policy if exists support_messages_deny_all on public.support_messages;
create policy support_messages_deny_all
  on public.support_messages
  for all
  using (false)
  with check (false);

revoke all on table public.support_messages from public;
grant all on table public.support_messages to service_role;

create or replace function public.list_my_support_messages(p_limit int default 100)
returns table (
  id uuid,
  sender_id uuid,
  recipient_id uuid,
  sender_name text,
  sender_role text,
  sender_email text,
  recipient_name text,
  recipient_role text,
  title text,
  body text,
  channel text,
  created_at timestamptz,
  read_at timestamptz,
  direction text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  return query
  select
    m.id,
    m.sender_id,
    m.recipient_id,
    m.sender_name,
    m.sender_role,
    m.sender_email,
    rp.full_name as recipient_name,
    coalesce(lower(rp.role), 'student') as recipient_role,
    m.title,
    m.body,
    m.channel,
    m.created_at,
    m.read_at,
    case when m.sender_id = v_uid then 'out' else 'in' end as direction
  from public.support_messages m
  join public.profiles rp on rp.id = m.recipient_id
  where m.sender_id = v_uid or m.recipient_id = v_uid
  order by m.created_at desc
  limit greatest(1, least(coalesce(p_limit, 100), 300));
end;
$$;

revoke all on function public.list_my_support_messages(int) from public;
grant execute on function public.list_my_support_messages(int) to authenticated, service_role;

create or replace function public.list_support_recipients_for_admin()
returns table (
  id uuid,
  full_name text,
  role text,
  email text
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_role text;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select coalesce(lower(p.role), 'student')
    into v_role
  from public.profiles p
  where p.id = v_uid;

  if v_role <> 'admin' then
    raise exception 'forbidden';
  end if;

  return query
  select
    p.id,
    p.full_name,
    coalesce(lower(p.role), 'student') as role,
    nullif(trim(u.email), '') as email
  from public.profiles p
  left join auth.users u on u.id = p.id
  where coalesce(p.is_active, true) = true
  order by coalesce(p.full_name, ''), p.id;
end;
$$;

revoke all on function public.list_support_recipients_for_admin() from public;
grant execute on function public.list_support_recipients_for_admin() to authenticated, service_role;

create or replace function public.send_support_message(
  p_title text,
  p_body text,
  p_recipient_id uuid default null,
  p_channel text default 'duvida_sugestao'
)
returns table (
  message_id uuid,
  recipient_id uuid,
  recipient_name text,
  recipient_email text,
  recipient_role text,
  sender_name text,
  sender_role text,
  recipient_is_admin boolean
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_sender_role text;
  v_sender_name text;
  v_sender_email text;
  v_target_id uuid;
  v_target_name text;
  v_target_email text;
  v_target_role text;
  v_message_id uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select
    coalesce(lower(p.role), 'student'),
    coalesce(nullif(trim(p.full_name), ''), 'Usuário InGenium'),
    nullif(trim(u.email), '')
  into v_sender_role, v_sender_name, v_sender_email
  from public.profiles p
  left join auth.users u on u.id = p.id
  where p.id = v_uid;

  if coalesce(trim(p_title), '') = '' then
    raise exception 'invalid_title';
  end if;
  if coalesce(trim(p_body), '') = '' then
    raise exception 'invalid_body';
  end if;

  if v_sender_role = 'admin' then
    v_target_id := p_recipient_id;
    if v_target_id is null then
      select p.id
        into v_target_id
      from public.profiles p
      where coalesce(lower(p.role), 'student') = 'admin'
        and p.id <> v_uid
      order by coalesce(p.updated_at, p.created_at) desc nulls last
      limit 1;
      if v_target_id is null then
        v_target_id := v_uid;
      end if;
    end if;
  else
    select p.id
      into v_target_id
    from public.profiles p
    where coalesce(lower(p.role), 'student') = 'admin'
      and coalesce(p.is_active, true) = true
    order by coalesce(p.updated_at, p.created_at) desc nulls last
    limit 1;
  end if;

  if v_target_id is null then
    raise exception 'admin_recipient_not_found';
  end if;

  select
    coalesce(nullif(trim(p.full_name), ''), 'Admin InGenium'),
    nullif(trim(u.email), ''),
    coalesce(lower(p.role), 'student')
  into v_target_name, v_target_email, v_target_role
  from public.profiles p
  left join auth.users u on u.id = p.id
  where p.id = v_target_id;

  if v_target_name is null then
    raise exception 'recipient_not_found';
  end if;

  insert into public.support_messages (
    sender_id,
    recipient_id,
    sender_role,
    sender_name,
    sender_email,
    title,
    body,
    channel
  ) values (
    v_uid,
    v_target_id,
    v_sender_role,
    v_sender_name,
    v_sender_email,
    trim(p_title),
    trim(p_body),
    coalesce(nullif(trim(p_channel), ''), 'duvida_sugestao')
  )
  returning id into v_message_id;

  return query
  select
    v_message_id,
    v_target_id,
    v_target_name,
    v_target_email,
    v_target_role,
    v_sender_name,
    v_sender_role,
    (v_target_role = 'admin') as recipient_is_admin;
end;
$$;

revoke all on function public.send_support_message(text, text, uuid, text) from public;
grant execute on function public.send_support_message(text, text, uuid, text) to authenticated, service_role;

create or replace function public.mark_my_support_messages_as_read()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_count int := 0;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  update public.support_messages
  set read_at = now()
  where recipient_id = v_uid
    and read_at is null;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.mark_my_support_messages_as_read() from public;
grant execute on function public.mark_my_support_messages_as_read() to authenticated, service_role;

commit;
