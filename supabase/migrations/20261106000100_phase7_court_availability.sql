-- Phase 7 — public court availability and lazy release of expired holds.
--
-- The booking window, partial-hour starts, buffer, and weekend rates are still
-- open client decisions. This function therefore exposes hourly starts inside
-- the court's configured operating hours and only the prices the current rate
-- table can calculate. It never returns another player's booking details.
--
-- Availability is public so a visitor can see times and prices before signing
-- in. Booking creation remains protected by create_court_booking and the
-- court_reservations exclusion constraint.

create or replace function public.release_expired_court_holds()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count integer;
begin
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
    returning r.id
  )
  select count(*) into v_count from expired;

  return v_count;
end;
$$;

revoke all on function public.release_expired_court_holds() from public;
grant execute on function public.release_expired_court_holds()
  to anon, authenticated;

-- Online starts are hourly because partial-hour starts are still an open
-- client decision. Staff and walk-in rows are intentionally not restricted.
create or replace function public.enforce_online_booking_hourly_start()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_timezone text;
begin
  if new.source <> 'online' then
    return new;
  end if;

  select coalesce(timezone_name, 'Asia/Manila')
    into v_timezone
  from public.club_settings
  where id = 1;

  v_timezone := coalesce(v_timezone, 'Asia/Manila');

  if extract(minute from (new.starts_at at time zone v_timezone)) <> 0 then
    raise exception 'Choose an hourly start time.' using errcode = '22023';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_online_booking_hourly_start()
  from public;

drop trigger if exists bookings_online_hourly_start on public.bookings;
create trigger bookings_online_hourly_start
  before insert or update of starts_at on public.bookings
  for each row execute function public.enforce_online_booking_hourly_start();

create or replace function public.get_court_availability(
  p_date date,
  p_duration_minutes integer
)
returns table (
  court_id uuid,
  court_name text,
  court_slug text,
  starts_at timestamptz,
  ends_at timestamptz,
  start_minute integer,
  amount_php numeric
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_timezone text;
  v_court record;
  v_hours record;
  v_slot_minute integer;
  v_start timestamptz;
  v_end timestamptz;
  v_amount numeric;
begin
  if p_date is null then
    raise exception 'Choose a date.' using errcode = '22023';
  end if;

  if p_duration_minutes not in (60, 90, 120) then
    raise exception 'Choose 60, 90, or 120 minutes.' using errcode = '22023';
  end if;

  -- Expired holds are released lazily whenever availability is requested. This
  -- keeps the slot usable without requiring a scheduler for the MVP. A later
  -- operations phase can schedule expire_stale_holds as well.
  perform public.release_expired_court_holds();

  select coalesce(timezone_name, 'Asia/Manila')
    into v_timezone
  from public.club_settings
  where id = 1;

  v_timezone := coalesce(v_timezone, 'Asia/Manila');

  for v_court in
    select c.id, c.name, c.slug
    from public.courts c
    where c.is_active
    order by c.sort_order, c.name
  loop
    select h.opens_at_minute, h.closes_at_minute
      into v_hours
    from public.court_operating_hours h
    where h.court_id = v_court.id
      and h.day_of_week = extract(dow from p_date)::smallint
      and not h.is_closed;

    if not found then
      continue;
    end if;

    v_slot_minute := v_hours.opens_at_minute;

    while v_slot_minute + p_duration_minutes <= v_hours.closes_at_minute loop
      v_start := (p_date::timestamp + make_interval(mins => v_slot_minute))
        at time zone v_timezone;
      v_end := v_start + make_interval(mins => p_duration_minutes);

      if v_start > now()
        and not exists (
          select 1
          from public.court_closures c
          where (c.court_id is null or c.court_id = v_court.id)
            and tstzrange(c.starts_at, c.ends_at, '[)')
              && tstzrange(v_start, v_end, '[)')
        )
        and not exists (
          select 1
          from public.court_reservations r
          where r.court_id = v_court.id
            and r.status = 'active'
            and tstzrange(r.starts_at, r.ends_at, '[)')
              && tstzrange(v_start, v_end, '[)')
        )
      then
        begin
          v_amount := public.calculate_court_amount(
            v_start,
            p_duration_minutes,
            v_court.id
          );
        exception
          when others then
            v_amount := null;
        end;

        if v_amount is not null then
          return query
          select
            v_court.id,
            v_court.name,
            v_court.slug,
            v_start,
            v_end,
            v_slot_minute,
            v_amount;
        end if;
      end if;

      v_slot_minute := v_slot_minute + 60;
    end loop;
  end loop;
end;
$$;

revoke all on function public.get_court_availability(date, integer)
  from public;
grant execute on function public.get_court_availability(date, integer)
  to anon, authenticated;
