-- Phase 7 — normal open play.
-- Sessions are stored as editable rows, not hardcoded UI values. The defaults
-- below are the project owner's 6 November 2026 starting values: ₱75 per player,
-- Saturdays, beginner/intermediate/advanced levels, 12 places, two hours.
-- Staff can edit price, time, level, capacity, and status in the table.

set search_path = public, extensions;

do $$
begin
  create type public.open_play_skill_level as enum (
    'beginner',
    'intermediate',
    'advanced'
  );
exception when duplicate_object then null;
end
$$;

do $$
begin
  create type public.open_play_session_status as enum (
    'scheduled',
    'cancelled',
    'completed'
  );
exception when duplicate_object then null;
end
$$;

do $$
begin
  create type public.open_play_registration_status as enum (
    'registered',
    'cancelled',
    'attended',
    'no_show'
  );
exception when duplicate_object then null;
end
$$;

create table if not exists public.open_play_sessions (
  id uuid primary key default gen_random_uuid(),
  starts_at timestamptz not null,
  duration_minutes integer not null default 120
    check (duration_minutes in (60, 90, 120)),
  skill_level public.open_play_skill_level not null default 'beginner',
  capacity integer not null default 12 check (capacity > 0 and capacity <= 100),
  amount_php numeric(10, 2) not null default 75 check (amount_php >= 0),
  status public.open_play_session_status not null default 'scheduled',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (starts_at, skill_level)
);

create index if not exists open_play_sessions_time_idx
  on public.open_play_sessions (starts_at, status);

create table if not exists public.open_play_registrations (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null
    references public.open_play_sessions (id) on delete restrict,
  player_id uuid not null
    references public.profiles (id) on delete restrict,
  booking_id uuid not null unique
    references public.bookings (id) on delete cascade,
  status public.open_play_registration_status not null default 'registered',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, player_id)
);

create index if not exists open_play_registrations_player_idx
  on public.open_play_registrations (player_id, created_at desc);

create index if not exists open_play_registrations_session_idx
  on public.open_play_registrations (session_id, status);

create trigger open_play_sessions_set_updated_at
  before update on public.open_play_sessions
  for each row execute function public.set_updated_at();

create trigger open_play_registrations_set_updated_at
  before update on public.open_play_registrations
  for each row execute function public.set_updated_at();

create trigger open_play_sessions_audit
  after insert or update or delete on public.open_play_sessions
  for each row execute function public.audit_row_change();

create trigger open_play_registrations_audit
  after insert or update or delete on public.open_play_registrations
  for each row execute function public.audit_row_change();

alter table public.open_play_sessions enable row level security;
alter table public.open_play_registrations enable row level security;

revoke all on public.open_play_sessions, public.open_play_registrations
  from anon, authenticated;

grant select on public.open_play_sessions to anon, authenticated;
grant insert, update, delete on public.open_play_sessions to authenticated;

grant select on public.open_play_registrations to authenticated;

create policy "open_play_sessions_public_read"
  on public.open_play_sessions for select
  to anon, authenticated
  using (true);

create policy "open_play_sessions_staff_write"
  on public.open_play_sessions for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

create policy "open_play_registrations_select_own_or_staff"
  on public.open_play_registrations for select
  to authenticated
  using (player_id = auth.uid() or public.is_staff());


-- Public session reads expose the count, not the player list.
create or replace function public.get_open_play_sessions(
  p_from timestamptz default now()
)
returns table (
  id uuid,
  starts_at timestamptz,
  ends_at timestamptz,
  duration_minutes integer,
  skill_level public.open_play_skill_level,
  capacity integer,
  amount_php numeric,
  status public.open_play_session_status,
  registered_count integer
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    s.id,
    s.starts_at,
    s.starts_at + make_interval(mins => s.duration_minutes) as ends_at,
    s.duration_minutes,
    s.skill_level,
    s.capacity,
    s.amount_php,
    s.status,
    coalesce(count(r.id), 0)::integer as registered_count
  from public.open_play_sessions s
  left join public.open_play_registrations r
    on r.session_id = s.id
    and r.status in ('registered', 'attended')
  where s.starts_at > coalesce(p_from, now())
    and s.status = 'scheduled'
  group by s.id
  order by s.starts_at, s.skill_level;
$$;

create or replace function public.get_open_play_session(
  p_session_id uuid
)
returns table (
  id uuid,
  starts_at timestamptz,
  ends_at timestamptz,
  duration_minutes integer,
  skill_level public.open_play_skill_level,
  capacity integer,
  amount_php numeric,
  status public.open_play_session_status,
  registered_count integer
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    s.id,
    s.starts_at,
    s.starts_at + make_interval(mins => s.duration_minutes) as ends_at,
    s.duration_minutes,
    s.skill_level,
    s.capacity,
    s.amount_php,
    s.status,
    coalesce(count(r.id), 0)::integer as registered_count
  from public.open_play_sessions s
  left join public.open_play_registrations r
    on r.session_id = s.id
    and r.status in ('registered', 'attended')
  where s.id = p_session_id
  group by s.id;
$$;

create or replace function public.create_open_play_registration(
  p_session_id uuid,
  p_player_id uuid default null
)
returns public.bookings
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_player_id uuid := coalesce(p_player_id, auth.uid());
  v_actor_id uuid := auth.uid();
  v_is_staff boolean := public.is_staff();
  v_session public.open_play_sessions%rowtype;
  v_service_id uuid;
  v_registered integer;
  v_booking public.bookings%rowtype;
  v_source public.booking_source;
begin
  if v_player_id is null or v_actor_id is null then
    raise exception 'Sign in to reserve an open-play place.' using errcode = '42501';
  end if;

  if p_player_id is not null and p_player_id <> v_actor_id and not v_is_staff then
    raise exception 'Only staff can reserve a place for another player.'
      using errcode = '42501';
  end if;

  if not exists (select 1 from public.profiles where id = v_player_id) then
    raise exception 'Player profile not found.' using errcode = '23503';
  end if;

  -- Locking the session serializes the capacity check and last-place race.
  select *
  into v_session
  from public.open_play_sessions
  where id = p_session_id
  for update;

  if not found then
    raise exception 'That open-play session could not be found.'
      using errcode = '22023';
  end if;

  if v_session.status <> 'scheduled' then
    raise exception 'That open-play session is not open for registration.'
      using errcode = '22023';
  end if;

  if v_session.starts_at <= now() then
    raise exception 'That open-play session has already started.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.open_play_registrations
    where session_id = v_session.id
      and player_id = v_player_id
  ) then
    raise exception 'You already have a place in this session.'
      using errcode = '23505';
  end if;

  select count(*)::integer
  into v_registered
  from public.open_play_registrations
  where session_id = v_session.id
    and status in ('registered', 'attended');

  if v_registered >= v_session.capacity then
    raise exception 'This open-play session is full.' using errcode = '23P01';
  end if;

  select id into v_service_id
  from public.services
  where code = 'open_play'
    and is_active
  limit 1;

  if v_service_id is null then
    raise exception 'Open play is not configured.' using errcode = '55000';
  end if;

  v_source := case
    when v_is_staff and v_player_id <> v_actor_id then 'walk_in'::public.booking_source
    when v_is_staff then 'staff'::public.booking_source
    else 'online'::public.booking_source
  end;

  insert into public.bookings (
    player_id,
    created_by,
    service_id,
    starts_at,
    ends_at,
    duration_minutes,
    status,
    payment_status,
    amount_php,
    hold_expires_at,
    confirmed_at,
    source
  )
  values (
    v_player_id,
    v_actor_id,
    v_service_id,
    v_session.starts_at,
    v_session.starts_at + make_interval(mins => v_session.duration_minutes),
    v_session.duration_minutes,
    'confirmed',
    'unpaid',
    v_session.amount_php,
    null,
    now(),
    v_source
  )
  returning * into v_booking;

  insert into public.open_play_registrations (
    session_id,
    player_id,
    booking_id,
    status
  )
  values (
    v_session.id,
    v_player_id,
    v_booking.id,
    'registered'
  );

  return v_booking;
exception
  when unique_violation then
    raise exception 'You already have a place in this session.'
      using errcode = '23505';
end;
$$;

revoke all on function public.get_open_play_sessions(timestamptz)
  from public, anon, authenticated;
grant execute on function public.get_open_play_sessions(timestamptz)
  to anon, authenticated;

revoke all on function public.get_open_play_session(uuid)
  from public, anon, authenticated;
grant execute on function public.get_open_play_session(uuid)
  to anon, authenticated;

revoke all on function public.create_open_play_registration(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.create_open_play_registration(uuid, uuid)
  to authenticated;

-- Editable starting schedule. Times are Asia/Manila. If staff change these
-- rows, the public list and existing registrations follow the stored values.
with saturdays as (
  select
    (
      date_trunc(
        'week',
        (now() at time zone 'Asia/Manila')::date
      )::date + interval '5 days'
      + make_interval(weeks => n)
    )::date as session_date
  from generate_series(0, 51) as n
)
insert into public.open_play_sessions (
  starts_at,
  duration_minutes,
  skill_level,
  capacity,
  amount_php
)
select
  ((s.session_date + t.start_time)::timestamp at time zone 'Asia/Manila'),
  120,
  t.skill_level::public.open_play_skill_level,
  12,
  75
from saturdays s
cross join (
  values
    (time '08:00', 'beginner'),
    (time '10:00', 'intermediate'),
    (time '16:00', 'advanced')
) as t(start_time, skill_level)
on conflict (starts_at, skill_level) do nothing;
