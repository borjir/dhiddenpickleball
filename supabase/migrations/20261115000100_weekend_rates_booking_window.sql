-- Owner decisions, 15 November 2026:
--   1. Weekends (Saturday and Sunday) are ₱300 per court-hour all day. Weekdays
--      keep ₱250 before 5:00 PM and ₱300 from 5:00 PM.
--   2. Court bookings open 30 days ahead and no further.
--
-- `service_rates` already carries `court_id` and `day_of_week`, but
-- `calculate_court_amount` ignored both and only read the generic windows. The
-- rate windows below therefore resolve in this order:
--   court + day  >  court (any day)  >  service day  >  service (any day)
-- so a day-specific window replaces the generic one for that day instead of
-- stacking on top of it.

-- Booking window ------------------------------------------------------------
update public.club_settings
set booking_window_days = 30
where id = 1
  and booking_window_days is null;

-- Weekend rate windows ------------------------------------------------------
insert into public.service_rates (
  service_id,
  court_id,
  day_of_week,
  starts_at_minute,
  ends_at_minute,
  amount_php
)
select
  s.id,
  null,
  d.day,
  0,
  1440,
  300
from public.services s
cross join (values (0::smallint), (6::smallint)) as d(day)
where s.code = 'court_rental'
  and not exists (
    select 1
    from public.service_rates r
    where r.service_id = s.id
      and r.court_id is null
      and r.day_of_week = d.day
  );

-- Day-aware pricing ---------------------------------------------------------
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
  v_window_days integer;
  v_local_start timestamp;
  v_local_end timestamp;
  v_start_minute integer;
  v_end_minute integer;
  v_total numeric := 0;
  v_rate record;
  v_scope text;
  v_day smallint;
begin
  if p_duration_minutes < 60
    or p_duration_minutes > 1020
    or (
      p_duration_minutes not in (60, 90, 120)
      and p_duration_minutes % 60 <> 0
    ) then
    raise exception 'Choose a whole number of hours.' using errcode = '22023';
  end if;

  select coalesce(timezone_name, 'Asia/Manila'), booking_window_days
    into v_timezone, v_window_days
  from public.club_settings
  where id = 1;

  v_local_start := p_starts_at at time zone v_timezone;
  v_local_end := (p_starts_at + make_interval(mins => p_duration_minutes))
    at time zone v_timezone;

  if v_window_days is not null
    and v_local_start::date
      > (now() at time zone v_timezone)::date + v_window_days then
    raise exception 'Court bookings open % days ahead.', v_window_days
      using errcode = '22023';
  end if;

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

  -- Pick one tier of rate windows rather than mixing tiers, so a weekend
  -- override does not add a second charge on top of the generic window.
  select case
    when exists (
      select 1
      from public.service_rates r
      where r.service_id = s.id
        and r.is_active
        and r.court_id = p_court_id
        and r.day_of_week = v_day
    ) then 'court_day'
    when exists (
      select 1
      from public.service_rates r
      where r.service_id = s.id
        and r.is_active
        and r.day_of_week = v_day
    ) then 'service_day'
    when exists (
      select 1
      from public.service_rates r
      where r.service_id = s.id
        and r.is_active
        and r.court_id = p_court_id
        and r.day_of_week is null
    ) then 'court'
    else 'service'
  end
  into v_scope
  from public.services s
  where s.code = 'court_rental'
    and s.is_active
  limit 1;

  for v_rate in
    select r.starts_at_minute, r.ends_at_minute, r.amount_php
    from public.service_rates r
    join public.services s on s.id = r.service_id
    where s.code = 'court_rental'
      and s.is_active
      and r.is_active
      and (
        (v_scope = 'court_day'
          and r.court_id = p_court_id and r.day_of_week = v_day)
        or (v_scope = 'service_day'
          and r.court_id is null and r.day_of_week = v_day)
        or (v_scope = 'court'
          and r.court_id = p_court_id and r.day_of_week is null)
        or (v_scope = 'service'
          and r.court_id is null and r.day_of_week is null)
      )
    order by r.starts_at_minute
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

-- Availability outside the booking window -----------------------------------
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
  v_window_days integer;
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

  select coalesce(timezone_name, 'Asia/Manila'), booking_window_days
    into v_timezone, v_window_days
  from public.club_settings
  where id = 1;

  v_timezone := coalesce(v_timezone, 'Asia/Manila');

  if v_window_days is not null
    and p_date > (now() at time zone v_timezone)::date + v_window_days then
    return;
  end if;

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
