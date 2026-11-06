-- Phase 7 — allow one court booking to cover a contiguous hourly range.
-- The public UI now lets a player choose a start hour and an end hour. The
-- existing fixed durations remain valid for old rows and staff-created data.

alter table public.bookings
  drop constraint if exists bookings_duration_minutes_check;

alter table public.bookings
  add constraint bookings_duration_minutes_check
  check (
    duration_minutes in (60, 90, 120)
    or (
      duration_minutes > 120
      and duration_minutes <= 1020
      and duration_minutes % 60 = 0
    )
  );

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
  if p_duration_minutes < 60
    or p_duration_minutes > 1020
    or (
      p_duration_minutes not in (60, 90, 120)
      and p_duration_minutes % 60 <> 0
    ) then
    raise exception 'Choose a whole number of hours.' using errcode = '22023';
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

  if p_duration_minutes < 60
    or p_duration_minutes > 1020
    or (
      p_duration_minutes not in (60, 90, 120)
      and p_duration_minutes % 60 <> 0
    ) then
    raise exception 'Choose a whole number of hours.' using errcode = '22023';
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
