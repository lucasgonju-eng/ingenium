begin;

create or replace function public.list_xp_activity_awards_admin(
  p_limit integer default 500,
  p_offset integer default 0,
  p_grade text default null,
  p_search text default null
)
returns table (
  award_id uuid,
  award_batch_id uuid,
  activity_id uuid,
  activity_title text,
  target_group text,
  target_grade text,
  student_id uuid,
  student_full_name text,
  student_grade text,
  student_class_name text,
  award_scope text,
  xp_amount integer,
  note text,
  occurred_on date,
  source_ref text,
  xp_event_id uuid,
  created_by uuid,
  created_by_name text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    a.id as award_id,
    a.award_batch_id,
    a.activity_id,
    c.title as activity_title,
    c.target_group,
    c.target_grade,
    a.student_id,
    s.full_name as student_full_name,
    a.student_grade,
    a.student_class_name,
    a.award_scope,
    a.xp_amount,
    a.note,
    a.occurred_on,
    a.source_ref,
    a.xp_event_id,
    a.created_by,
    actor.full_name as created_by_name,
    a.created_at
  from public.xp_activity_awards a
  join public.xp_activity_catalog c on c.id = a.activity_id
  left join public.profiles s on s.id = a.student_id
  left join public.profiles actor on actor.id = a.created_by
  where exists (
      select 1
      from public.profiles admin_actor
      where admin_actor.id = auth.uid()
        and coalesce(lower(admin_actor.role), 'student') = 'admin'
    )
    and (
      nullif(trim(coalesce(p_grade, '')), '') is null
      or a.student_grade = nullif(trim(coalesce(p_grade, '')), '')
    )
    and (
      nullif(trim(coalesce(p_search, '')), '') is null
      or coalesce(s.full_name, '') ilike '%' || nullif(trim(coalesce(p_search, '')), '') || '%'
      or coalesce(c.title, '') ilike '%' || nullif(trim(coalesce(p_search, '')), '') || '%'
    )
  order by a.created_at desc
  limit greatest(coalesce(p_limit, 500), 1)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

revoke all on function public.list_xp_activity_awards_admin(integer, integer, text, text) from public;
grant execute on function public.list_xp_activity_awards_admin(integer, integer, text, text) to authenticated, service_role;

create or replace function public.list_xp_activity_awards_admin(
  p_limit integer default 500,
  p_grade text default null,
  p_search text default null
)
returns table (
  award_id uuid,
  award_batch_id uuid,
  activity_id uuid,
  activity_title text,
  target_group text,
  target_grade text,
  student_id uuid,
  student_full_name text,
  student_grade text,
  student_class_name text,
  award_scope text,
  xp_amount integer,
  note text,
  occurred_on date,
  source_ref text,
  xp_event_id uuid,
  created_by uuid,
  created_by_name text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select *
  from public.list_xp_activity_awards_admin(
    p_limit => p_limit,
    p_offset => 0,
    p_grade => p_grade,
    p_search => p_search
  );
$$;

revoke all on function public.list_xp_activity_awards_admin(integer, text, text) from public;
grant execute on function public.list_xp_activity_awards_admin(integer, text, text) to authenticated, service_role;

create or replace function public.count_xp_activity_awards_admin(
  p_grade text default null,
  p_search text default null
)
returns bigint
language sql
security definer
set search_path = public
as $$
  select count(*)
  from public.xp_activity_awards a
  join public.xp_activity_catalog c on c.id = a.activity_id
  left join public.profiles s on s.id = a.student_id
  where exists (
      select 1
      from public.profiles admin_actor
      where admin_actor.id = auth.uid()
        and coalesce(lower(admin_actor.role), 'student') = 'admin'
    )
    and (
      nullif(trim(coalesce(p_grade, '')), '') is null
      or a.student_grade = nullif(trim(coalesce(p_grade, '')), '')
    )
    and (
      nullif(trim(coalesce(p_search, '')), '') is null
      or coalesce(s.full_name, '') ilike '%' || nullif(trim(coalesce(p_search, '')), '') || '%'
      or coalesce(c.title, '') ilike '%' || nullif(trim(coalesce(p_search, '')), '') || '%'
    );
$$;

revoke all on function public.count_xp_activity_awards_admin(text, text) from public;
grant execute on function public.count_xp_activity_awards_admin(text, text) to authenticated, service_role;

commit;
