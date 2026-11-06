-- Phase 4 — bookings, reservations, payments, audit, and booking integrity.
-- Open-play sessions/registrations, attendance, coaching, and DUPR tables are
-- intentionally deferred until their rules and phases are confirmed.

set search_path = public, extensions;

do $$
begin
  create type public.booking_status as enum ('pending', 'confirmed', 'cancelled', 'completed', 'no_show');
exception when duplicate_object then null;
end
$$;

do $$
begin
  create type public.payment_status as enum (
    'unpaid',
    'awaiting_proof',
    'awaiting_verification',
    'paid',
    'rejected',
    'refund_pending',
    'partially_refunded',
    'refunded'
  );
exception when duplicate_object then null;
end
$$;

do $$
begin
  create type public.payment_method as enum ('gcash', 'maya', 'bank_transfer', 'cash', 'test');
exception when duplicate_object then null;
end
$$;

do $$
begin
  create type public.booking_source as enum ('online', 'walk_in', 'staff');
exception when duplicate_object then null;
end
$$;

do $$
begin
  create type public.reservation_status as enum ('active', 'released');
exception when duplicate_object then null;
end
$$;

create or replace function public.generate_booking_reference()
returns text
language sql
volatile
as $$
  select 'HP-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
$$;

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default public.generate_booking_reference(),
  player_id uuid not null references public.profiles (id) on delete restrict,
  created_by uuid references public.profiles (id) on delete set null,
  service_id uuid not null references public.services (id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  duration_minutes integer not null check (duration_minutes in (60, 90, 120)),
  status public.booking_status not null default 'pending',
  payment_status public.payment_status not null default 'unpaid',
  amount_php numeric(10, 2) not null check (amount_php >= 0),
  hold_expires_at timestamptz,
  confirmed_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  source public.booking_source not null default 'online',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at = starts_at + make_interval(mins => duration_minutes)),
  check (status <> 'pending' or hold_expires_at is not null)
);

create index if not exists bookings_player_idx on public.bookings (player_id, starts_at desc);
create index if not exists bookings_status_idx on public.bookings (status, starts_at);
create index if not exists bookings_payment_status_idx on public.bookings (payment_status);
create index if not exists bookings_hold_expiry_idx
  on public.bookings (hold_expires_at)
  where status = 'pending';

create table if not exists public.court_reservations (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings (id) on delete cascade,
  court_id uuid not null references public.courts (id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.reservation_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

-- The database, not the browser, is the final authority on double booking.
-- Released reservations drop out of the exclusion index.
alter table public.court_reservations
  add constraint court_reservations_no_overlap
  exclude using gist (
    court_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status = 'active');

create index if not exists court_reservations_court_time_idx
  on public.court_reservations (court_id, starts_at);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  method public.payment_method not null,
  status public.payment_status not null default 'unpaid',
  amount_php numeric(10, 2) not null check (amount_php >= 0),
  transaction_reference text,
  proof_path text,
  submitted_at timestamptz,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payments_booking_idx on public.payments (booking_id, created_at desc);
create index if not exists payments_status_idx on public.payments (status, created_at);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  table_name text not null,
  row_id text,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_table_time_idx
  on public.audit_logs (table_name, created_at desc);

create index if not exists audit_logs_actor_time_idx
  on public.audit_logs (actor_id, created_at desc);

-- One generic audit writer for operational tables. Auth user data is never
-- copied here; payment rows contain a storage path, not the image itself.
create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row_id text;
begin
  v_row_id := coalesce(
    to_jsonb(new) ->> 'id',
    to_jsonb(old) ->> 'id'
  );

  insert into public.audit_logs (
    actor_id,
    action,
    table_name,
    row_id,
    before_data,
    after_data
  )
  values (
    auth.uid(),
    tg_op,
    tg_table_name,
    v_row_id,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

create or replace function public.audit_profile_role_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.role is distinct from old.role then
    insert into public.audit_logs (
      actor_id,
      action,
      table_name,
      row_id,
      before_data,
      after_data
    )
    values (
      auth.uid(),
      'ROLE_CHANGE',
      'profiles',
      new.id::text,
      jsonb_build_object('role', old.role),
      jsonb_build_object('role', new.role)
    );
  end if;

  return new;
end;
$$;

create trigger bookings_audit
  after insert or update or delete on public.bookings
  for each row execute function public.audit_row_change();

create trigger court_reservations_audit
  after insert or update or delete on public.court_reservations
  for each row execute function public.audit_row_change();

create trigger payments_audit
  after insert or update or delete on public.payments
  for each row execute function public.audit_row_change();

create trigger courts_audit
  after insert or update or delete on public.courts
  for each row execute function public.audit_row_change();

create trigger services_audit
  after insert or update or delete on public.services
  for each row execute function public.audit_row_change();

create trigger service_rates_audit
  after insert or update or delete on public.service_rates
  for each row execute function public.audit_row_change();

create trigger court_closures_audit
  after insert or update or delete on public.court_closures
  for each row execute function public.audit_row_change();

create trigger club_settings_audit
  after update on public.club_settings
  for each row execute function public.audit_row_change();

create trigger profiles_role_audit
  after update on public.profiles
  for each row execute function public.audit_profile_role_change();

create trigger bookings_set_updated_at
  before update on public.bookings
  for each row execute function public.set_updated_at();

create trigger court_reservations_set_updated_at
  before update on public.court_reservations
  for each row execute function public.set_updated_at();

create trigger payments_set_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

-- Pro-rates a court booking across the confirmed 5:00 PM rate change.
-- This arithmetic is a working default, not an approved rounding rule.
create or replace function public.calculate_court_amount(
  p_starts_at timestamptz,
  p_duration_minutes integer,
  p_court_id uuid
)
returns numeric
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_timezone text;
  v_local_start timestamp;
  v_local_end timestamp;
  v_start_minute integer;
  v_end_minute integer;
  v_total numeric := 0;
  v_rate record;
begin
  if p_duration_minutes not in (60, 90, 120) then
    raise exception 'Invalid duration.' using errcode = '22023';
  end if;

  select timezone_name into v_timezone
  from public.club_settings
  where id = 1;

  v_timezone := coalesce(v_timezone, 'Asia/Manila');
  v_local_start := p_starts_at at time zone v_timezone;
  v_local_end := (p_starts_at + make_interval(mins => p_duration_minutes)) at time zone v_timezone;

  v_start_minute :=
    extract(hour from v_local_start)::integer * 60
    + extract(minute from v_local_start)::integer;
  v_end_minute :=
    extract(hour from v_local_end)::integer * 60
    + extract(minute from v_local_end)::integer;

  if v_local_end::date > v_local_start::date then
    v_end_minute := 1440 + v_end_minute;
  end if;

  for v_rate in
    select starts_at_minute, ends_at_minute, amount_php
    from public.service_rates
    where service_id = (
      select id
      from public.services
      where code = 'court_rental'
        and is_active
      limit 1
    )
      and is_active
      -- Generic windows only until court/day overrides are approved.
      and court_id is null
      and day_of_week is null
    order by starts_at_minute
  loop
    v_total := v_total + (
      greatest(
        0,
        least(v_end_minute, v_rate.ends_at_minute)
          - greatest(v_start_minute, v_rate.starts_at_minute)
      ) / 60.0
    ) * v_rate.amount_php;
  end loop;

  if v_total <= 0 then
    raise exception 'No rate is configured for that time.' using errcode = '22023';
  end if;

  return round(v_total, 2);
end;
$$;

create or replace function public.create_court_booking(
  p_court_id uuid,
  p_starts_at timestamptz,
  p_duration_minutes integer,
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
  v_settings public.club_settings%rowtype;
  v_court public.courts%rowtype;
  v_local_start timestamp;
  v_local_end timestamp;
  v_day smallint;
  v_start_minute integer;
  v_end_minute integer;
  v_amount numeric;
  v_service_id uuid;
  v_booking public.bookings%rowtype;
  v_source public.booking_source;
begin
  if v_player_id is null or v_actor_id is null then
    raise exception 'Sign in to create a booking.' using errcode = '42501';
  end if;

  if p_player_id is not null and p_player_id <> v_actor_id and not v_is_staff then
    raise exception 'Only staff can book for another player.' using errcode = '42501';
  end if;

  if not exists (select 1 from public.profiles where id = v_player_id) then
    raise exception 'Player profile not found.' using errcode = '23503';
  end if;

  if p_duration_minutes not in (60, 90, 120) then
    raise exception 'Choose 60, 90, or 120 minutes.' using errcode = '22023';
  end if;

  if p_starts_at <= now() then
    raise exception 'Choose a future start time.' using errcode = '22023';
  end if;

  select * into v_settings from public.club_settings where id = 1;
  if not found then
    raise exception 'Club settings are missing.' using errcode = '55000';
  end if;

  select * into v_court
  from public.courts
  where id = p_court_id
    and is_active;

  if not found then
    raise exception 'That court is not available.' using errcode = '22023';
  end if;

  v_local_start := p_starts_at at time zone v_settings.timezone_name;
  v_local_end := (p_starts_at + make_interval(mins => p_duration_minutes))
    at time zone v_settings.timezone_name;
  v_day := extract(dow from v_local_start)::smallint;
  v_start_minute :=
    extract(hour from v_local_start)::integer * 60
    + extract(minute from v_local_start)::integer;
  v_end_minute :=
    extract(hour from v_local_end)::integer * 60
    + extract(minute from v_local_end)::integer;

  if v_local_end::date > v_local_start::date then
    v_end_minute := 1440 + v_end_minute;
  end if;

  if not exists (
    select 1
    from public.court_operating_hours h
    where h.court_id = p_court_id
      and h.day_of_week = v_day
      and not h.is_closed
      and v_start_minute >= h.opens_at_minute
      and v_end_minute <= h.closes_at_minute
  ) then
    raise exception 'That time is outside the court''s operating hours.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.court_closures c
    where (c.court_id is null or c.court_id = p_court_id)
      and tstzrange(c.starts_at, c.ends_at, '[)')
        && tstzrange(
          p_starts_at,
          p_starts_at + make_interval(mins => p_duration_minutes),
          '[)'
        )
  ) then
    raise exception 'That court is closed at the requested time.'
      using errcode = '22023';
  end if;

  select id into v_service_id
  from public.services
  where code = 'court_rental'
    and is_active
  limit 1;

  if v_service_id is null then
    raise exception 'Court rental is not configured.' using errcode = '55000';
  end if;

  v_amount := public.calculate_court_amount(
    p_starts_at,
    p_duration_minutes,
    p_court_id
  );

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
    source
  )
  values (
    v_player_id,
    v_actor_id,
    v_service_id,
    p_starts_at,
    p_starts_at + make_interval(mins => p_duration_minutes),
    p_duration_minutes,
    'pending',
    'unpaid',
    v_amount,
    now() + make_interval(mins => v_settings.hold_minutes),
    v_source
  )
  returning * into v_booking;

  insert into public.court_reservations (
    booking_id,
    court_id,
    starts_at,
    ends_at,
    status
  )
  values (
    v_booking.id,
    p_court_id,
    v_booking.starts_at,
    v_booking.ends_at,
    'active'
  );

  return v_booking;
exception
  when exclusion_violation then
    raise exception 'That court and time are no longer available.'
      using errcode = '23P01';
end;
$$;

-- Releases expired holds. A later phase can call this from a scheduled job;
-- until then it is available for staff/server maintenance only.
create or replace function public.expire_stale_holds()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count integer;
begin
  if auth.uid() is not null and not public.is_staff() then
    raise exception 'Staff only.' using errcode = '42501';
  end if;

  with expired as (
    update public.bookings
    set
      status = 'cancelled',
      cancelled_at = now(),
      cancellation_reason = 'Payment hold expired',
      updated_at = now()
    where status = 'pending'
      and hold_expires_at is not null
      and hold_expires_at < now()
    returning id
  ),
  released as (
    update public.court_reservations r
    set
      status = 'released',
      updated_at = now()
    from expired e
    where r.booking_id = e.id
      and r.status = 'active'
  )
  select count(*) into v_count from expired;

  return v_count;
end;
$$;
