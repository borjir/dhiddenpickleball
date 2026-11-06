-- Phase 10 — one active unpaid court hold per player.
--
-- A player who already has a pending, unpaid court booking with an unexpired
-- 15-minute hold cannot create another one. Submitting payment proof changes
-- the booking status from 'pending' to 'confirmed', and an expired hold no
-- longer blocks a new request. Staff walk-ins remain exempt.
--
-- The public four-argument function is a guarded wrapper. Group bookings call
-- the internal function with the parallel-hold flag so one group can create
-- all of its ranges under a single payment hold. Direct clients cannot execute
-- the internal function.

create or replace function public.create_court_booking_internal(
  p_court_id uuid,
  p_starts_at timestamptz,
  p_duration_minutes integer,
  p_player_id uuid default null,
  p_allow_parallel_holds boolean default false
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

  -- A player may hold only one unpaid booking at a time. Submitting proof
  -- moves that booking out of 'pending', and an expired hold no longer blocks
  -- a new request. Staff-created bookings and the group loop are exempt.
  if not v_is_staff and not p_allow_parallel_holds and exists (
    select 1
    from public.bookings b
    where b.player_id = v_player_id
      and b.status = 'pending'
      and b.payment_status = 'unpaid'
      and b.hold_expires_at is not null
      and b.hold_expires_at > now()
  ) then
    raise exception 'You already have a court booking waiting for payment. Upload your payment proof, or wait for its 15-minute hold to expire, before booking another court.'
      using errcode = '55000';
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

create or replace function public.create_court_booking(
  p_court_id uuid,
  p_starts_at timestamptz,
  p_duration_minutes integer,
  p_player_id uuid default null
)
returns public.bookings
language sql
security definer
set search_path = public, pg_temp
as $$
  select public.create_court_booking_internal(
    p_court_id,
    p_starts_at,
    p_duration_minutes,
    p_player_id,
    false
  );
$$;

revoke all on function public.create_court_booking(
  uuid,
  timestamptz,
  integer,
  uuid
) from public, anon, authenticated;
grant execute on function public.create_court_booking(
  uuid,
  timestamptz,
  integer,
  uuid
) to authenticated;

revoke all on function public.create_court_booking_internal(
  uuid,
  timestamptz,
  integer,
  uuid,
  boolean
) from public, anon, authenticated;

create or replace function public.create_court_booking_group(
  p_ranges jsonb,
  p_player_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_player_id uuid := coalesce(p_player_id, auth.uid());
  v_actor_id uuid := auth.uid();
  v_is_staff boolean := public.is_staff();
  v_settings public.club_settings%rowtype;
  v_group public.booking_groups%rowtype;
  v_booking public.bookings%rowtype;
  v_item jsonb;
  v_ranges_count integer;
  v_total numeric := 0;
  v_source public.booking_source;
  v_court_id uuid;
  v_starts_at timestamptz;
  v_duration integer;
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

  -- Check once before inserting the group. The individual ranges then call
  -- the internal booking function with the parallel-hold flag so the group can
  -- create all of its court times under one payment hold.
  if not v_is_staff and exists (
    select 1
    from public.bookings b
    where b.player_id = v_player_id
      and b.status = 'pending'
      and b.payment_status = 'unpaid'
      and b.hold_expires_at is not null
      and b.hold_expires_at > now()
  ) then
    raise exception 'You already have a court booking waiting for payment. Upload your payment proof, or wait for its 15-minute hold to expire, before booking another court.'
      using errcode = '55000';
  end if;


  if p_ranges is null or jsonb_typeof(p_ranges) <> 'array' then
    raise exception 'Choose at least one court time.' using errcode = '22023';
  end if;

  select count(*) into v_ranges_count from jsonb_array_elements(p_ranges);

  if v_ranges_count < 1 or v_ranges_count > 8 then
    raise exception 'Choose between 1 and 8 court times.' using errcode = '22023';
  end if;

  select * into v_settings from public.club_settings where id = 1;
  if not found then
    raise exception 'Club settings are missing.' using errcode = '55000';
  end if;

  v_source := case
    when v_is_staff and v_player_id <> v_actor_id then 'walk_in'::public.booking_source
    when v_is_staff then 'staff'::public.booking_source
    else 'online'::public.booking_source
  end;

  insert into public.booking_groups (
    player_id,
    created_by,
    status,
    payment_status,
    amount_php,
    hold_expires_at,
    source
  )
  values (
    v_player_id,
    v_actor_id,
    'pending',
    'unpaid',
    0,
    now() + make_interval(mins => v_settings.hold_minutes),
    v_source
  )
  returning * into v_group;

  for v_item in select value from jsonb_array_elements(p_ranges)
  loop
    begin
      v_court_id := (v_item ->> 'courtId')::uuid;
      v_starts_at := (v_item ->> 'startsAt')::timestamptz;
      v_duration := (v_item ->> 'durationMinutes')::integer;
    exception
      when others then
        raise exception 'One of the selected court times is invalid.'
          using errcode = '22023';
    end;

    if v_court_id is null or v_starts_at is null or v_duration is null then
      raise exception 'One of the selected court times is incomplete.'
        using errcode = '22023';
    end if;

    v_booking := public.create_court_booking_internal(
      v_court_id,
      v_starts_at,
      v_duration,
      v_player_id,
      true
    );

    update public.bookings
    set group_id = v_group.id
    where id = v_booking.id;

    v_total := v_total + v_booking.amount_php;
  end loop;

  update public.booking_groups
  set amount_php = v_total
  where id = v_group.id
  returning * into v_group;

  return jsonb_build_object(
    'group', to_jsonb(v_group),
    'items', (
      select jsonb_agg(
        jsonb_build_object(
          'id', b.id,
          'reference', b.reference,
          'courtId', r.court_id,
          'courtName', c.name,
          'startsAt', b.starts_at,
          'endsAt', b.ends_at,
          'durationMinutes', b.duration_minutes,
          'amountPhp', b.amount_php
        )
        order by b.starts_at
      )
      from public.bookings b
      join public.court_reservations r on r.booking_id = b.id
      join public.courts c on c.id = r.court_id
      where b.group_id = v_group.id
    )
  );
exception
  when exclusion_violation then
    raise exception 'One of those court times was just taken. Choose another.'
      using errcode = '23P01';
end;
$$;
