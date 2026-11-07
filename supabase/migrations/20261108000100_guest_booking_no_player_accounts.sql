-- Guest booking and open-play access — no player accounts.
--
-- Players never sign in. A booking or open-play place belongs to a customer
-- record (full name + mandatory mobile, optional email), and the customer can
-- retrieve it with the booking reference plus that mobile number or its QR.
--
-- Staff keep their Supabase Auth accounts. Player auth users are deleted by
-- this migration after every booking/group/registration has been re-pointed at
-- a customer row, so no history is lost.

set search_path = public, extensions;

-- Mobile normalisation -------------------------------------------------------
-- Accepts 0917 123 4567, +63 917 123 4567, 639171234567, and the same with
-- spaces, dashes, or parentheses. Returns 639171234567 or null.
create or replace function public.normalize_mobile(p_mobile text)
returns text
language plpgsql
immutable
as $$
declare
  v text := regexp_replace(coalesce(p_mobile, ''), '\D', '', 'g');
begin
  if v = '' then
    return null;
  end if;

  if left(v, 4) = '0063' then
    v := substr(v, 3);
  elsif left(v, 3) = '630' then
    v := '63' || substr(v, 4);
  elsif left(v, 1) = '0' then
    v := '63' || substr(v, 2);
  elsif left(v, 1) = '9' and char_length(v) = 10 then
    v := '63' || v;
  elsif left(v, 2) = '63' then
    v := v;
  else
    return null;
  end if;

  if v !~ '^63[0-9]{10}$' then
    return null;
  end if;

  return v;
end;
$$;

revoke all on function public.normalize_mobile(text) from public, anon, authenticated;

-- Guests ---------------------------------------------------------------------
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  mobile text not null,
  email text,
  -- Kept only to map the old player profiles to their history during this
  -- migration. Staff accounts never get a customer row.
  legacy_profile_id uuid unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(btrim(full_name)) between 2 and 100)
);

create index if not exists customers_mobile_idx
  on public.customers (mobile);
create index if not exists customers_email_idx
  on public.customers (lower(email))
  where email is not null;

drop trigger if exists customers_set_updated_at on public.customers;
create trigger customers_set_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

alter table public.customers enable row level security;
revoke all on public.customers from anon, authenticated;
grant select on public.customers to authenticated;

drop policy if exists customers_staff_read on public.customers;
create policy customers_staff_read
  on public.customers for select
  to authenticated
  using (public.is_staff());

-- Attach customers to existing records ---------------------------------------
alter table public.bookings
  add column if not exists customer_id uuid references public.customers (id) on delete restrict;
alter table public.booking_groups
  add column if not exists customer_id uuid references public.customers (id) on delete restrict;
alter table public.open_play_registrations
  add column if not exists customer_id uuid references public.customers (id) on delete restrict;

insert into public.customers (full_name, mobile, email, legacy_profile_id)
select
  left(
    case
      when char_length(btrim(coalesce(p.full_name, ''))) between 2 and 100
        then btrim(p.full_name)
      when char_length(btrim(split_part(coalesce(p.email, ''), '@', 1))) between 2 and 100
        then btrim(split_part(p.email, '@', 1))
      else 'Guest'
    end,
    100
  ),
  coalesce(public.normalize_mobile(p.phone), 'unknown-' || p.id::text),
  nullif(btrim(p.email), ''),
  p.id
from public.profiles p
where p.role <> 'staff'
on conflict (legacy_profile_id) do nothing;

update public.bookings b
set customer_id = c.id
from public.customers c
where c.legacy_profile_id = b.player_id
  and b.customer_id is null;

update public.booking_groups g
set customer_id = c.id
from public.customers c
where c.legacy_profile_id = g.player_id
  and g.customer_id is null;

update public.open_play_registrations r
set customer_id = c.id
from public.customers c
where c.legacy_profile_id = r.player_id
  and r.customer_id is null;

-- A booking has always had an owner profile, so these should all be filled.
-- Fall back to a placeholder customer rather than failing the migration if an
-- orphan row exists.
insert into public.customers (full_name, mobile)
select 'Guest', 'unknown-orphan'
where exists (select 1 from public.bookings where customer_id is null)
  and not exists (select 1 from public.customers where mobile = 'unknown-orphan');

update public.bookings
set customer_id = (select id from public.customers where mobile = 'unknown-orphan' limit 1)
where customer_id is null;

update public.booking_groups
set customer_id = (select id from public.customers where mobile = 'unknown-orphan' limit 1)
where customer_id is null;

update public.open_play_registrations
set customer_id = (select id from public.customers where mobile = 'unknown-orphan' limit 1)
where customer_id is null;

alter table public.bookings alter column customer_id set not null;
alter table public.booking_groups alter column customer_id set not null;
alter table public.open_play_registrations alter column customer_id set not null;

create index if not exists bookings_customer_idx
  on public.bookings (customer_id, starts_at desc);
create index if not exists booking_groups_customer_idx
  on public.booking_groups (customer_id, created_at desc);
create index if not exists open_play_registrations_customer_idx
  on public.open_play_registrations (customer_id, created_at desc);

alter table public.open_play_registrations
  drop constraint if exists open_play_registrations_session_id_player_id_key;
alter table public.open_play_registrations
  add constraint open_play_registrations_session_customer_key
  unique (session_id, customer_id);

-- The profile link survives only as historical reference. It must not block
-- deleting the player auth users below.
alter table public.bookings alter column player_id drop not null;
alter table public.booking_groups alter column player_id drop not null;
alter table public.open_play_registrations alter column player_id drop not null;

alter table public.bookings drop constraint if exists bookings_player_id_fkey;
alter table public.bookings
  add constraint bookings_player_id_fkey
  foreign key (player_id) references public.profiles (id) on delete set null;

alter table public.booking_groups drop constraint if exists booking_groups_player_id_fkey;
alter table public.booking_groups
  add constraint booking_groups_player_id_fkey
  foreign key (player_id) references public.profiles (id) on delete set null;

alter table public.open_play_registrations
  drop constraint if exists open_play_registrations_player_id_fkey;
alter table public.open_play_registrations
  add constraint open_play_registrations_player_id_fkey
  foreign key (player_id) references public.profiles (id) on delete set null;

drop trigger if exists bookings_staff_player_guard on public.bookings;
drop function if exists public.block_staff_player_booking();

-- Staff-only reads -----------------------------------------------------------
drop policy if exists "bookings_select_own_or_staff" on public.bookings;
drop policy if exists bookings_select_staff on public.bookings;
create policy bookings_select_staff
  on public.bookings for select
  to authenticated
  using (public.is_staff());

drop policy if exists "court_reservations_select_own_or_staff" on public.court_reservations;
drop policy if exists court_reservations_select_staff on public.court_reservations;
create policy court_reservations_select_staff
  on public.court_reservations for select
  to authenticated
  using (public.is_staff());

drop policy if exists "payments_select_own_or_staff" on public.payments;
drop policy if exists payments_select_staff on public.payments;
create policy payments_select_staff
  on public.payments for select
  to authenticated
  using (public.is_staff());

drop policy if exists "booking_groups_select_own_or_staff" on public.booking_groups;
drop policy if exists booking_groups_select_staff on public.booking_groups;
create policy booking_groups_select_staff
  on public.booking_groups for select
  to authenticated
  using (public.is_staff());

drop policy if exists "open_play_registrations_select_own_or_staff" on public.open_play_registrations;
drop policy if exists open_play_registrations_select_staff on public.open_play_registrations;
create policy open_play_registrations_select_staff
  on public.open_play_registrations for select
  to authenticated
  using (public.is_staff());

-- Owner proof storage policies no longer apply: guests upload through the
-- server with the service role, and only staff read proofs directly.
drop policy if exists "payment_proofs_owner_read" on storage.objects;
drop policy if exists "payment_proofs_owner_insert" on storage.objects;
drop policy if exists "payment_proofs_owner_delete" on storage.objects;

-- Guests may also upload a PDF receipt through the server route.
update storage.buckets
set allowed_mime_types = array[
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/pdf'
]
where id = 'payment-proofs';

-- Customer resolution --------------------------------------------------------
create or replace function public.resolve_guest_customer(
  p_full_name text,
  p_mobile text,
  p_email text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_name text := btrim(coalesce(p_full_name, ''));
  v_mobile text := public.normalize_mobile(p_mobile);
  v_email text := nullif(btrim(coalesce(p_email, '')), '');
  v_id uuid;
begin
  if char_length(v_name) < 2 or char_length(v_name) > 100 then
    raise exception 'Enter the full name for this booking.' using errcode = '22023';
  end if;

  if v_mobile is null then
    raise exception 'Enter a valid Philippine mobile number, for example 0917 123 4567.'
      using errcode = '22023';
  end if;

  if v_email is not null and v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Enter a valid email address, or leave it blank.'
      using errcode = '22023';
  end if;

  if v_email is not null and char_length(v_email) > 254 then
    raise exception 'That email address is too long.' using errcode = '22023';
  end if;

  select id into v_id
  from public.customers
  where mobile = v_mobile
    and lower(full_name) = lower(v_name)
  order by created_at desc
  limit 1;

  if v_id is not null then
    if v_email is not null then
      update public.customers
      set email = v_email
      where id = v_id;
    end if;

    return v_id;
  end if;

  insert into public.customers (full_name, mobile, email)
  values (v_name, v_mobile, v_email)
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.resolve_guest_customer(text, text, text)
  from public, anon, authenticated;

-- Guest court booking --------------------------------------------------------
create or replace function public.create_guest_court_booking_internal(
  p_court_id uuid,
  p_starts_at timestamptz,
  p_duration_minutes integer,
  p_customer_id uuid,
  p_allow_parallel_holds boolean default false
)
returns public.bookings
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
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
begin
  if p_customer_id is null or not exists (
    select 1 from public.customers where id = p_customer_id
  ) then
    raise exception 'Enter your booking details again.' using errcode = '22023';
  end if;

  -- One unpaid court hold per customer. Submitting proof, or letting the hold
  -- expire, releases the next booking.
  if not p_allow_parallel_holds and exists (
    select 1
    from public.bookings b
    where b.customer_id = p_customer_id
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

  insert into public.bookings (
    customer_id,
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
    p_customer_id,
    v_service_id,
    p_starts_at,
    p_starts_at + make_interval(mins => p_duration_minutes),
    p_duration_minutes,
    'pending',
    'unpaid',
    v_amount,
    now() + make_interval(mins => v_settings.hold_minutes),
    'online'
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

revoke all on function public.create_guest_court_booking_internal(
  uuid, timestamptz, integer, uuid, boolean
) from public, anon, authenticated;

create or replace function public.create_guest_court_booking(
  p_court_id uuid,
  p_starts_at timestamptz,
  p_duration_minutes integer,
  p_full_name text,
  p_mobile text,
  p_email text default null
)
returns public.bookings
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_customer_id uuid;
begin
  v_customer_id := public.resolve_guest_customer(
    p_full_name,
    p_mobile,
    p_email
  );

  return public.create_guest_court_booking_internal(
    p_court_id,
    p_starts_at,
    p_duration_minutes,
    v_customer_id,
    false
  );
end;
$$;

create or replace function public.create_guest_court_booking_group(
  p_ranges jsonb,
  p_full_name text,
  p_mobile text,
  p_email text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_customer_id uuid;
  v_settings public.club_settings%rowtype;
  v_group public.booking_groups%rowtype;
  v_booking public.bookings%rowtype;
  v_item jsonb;
  v_ranges_count integer;
  v_total numeric := 0;
  v_court_id uuid;
  v_starts_at timestamptz;
  v_duration integer;
begin
  v_customer_id := public.resolve_guest_customer(
    p_full_name,
    p_mobile,
    p_email
  );

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

  if exists (
    select 1
    from public.bookings b
    where b.customer_id = v_customer_id
      and b.status = 'pending'
      and b.payment_status = 'unpaid'
      and b.hold_expires_at is not null
      and b.hold_expires_at > now()
  ) then
    raise exception 'You already have a court booking waiting for payment. Upload your payment proof, or wait for its 15-minute hold to expire, before booking another court.'
      using errcode = '55000';
  end if;

  insert into public.booking_groups (
    customer_id,
    status,
    payment_status,
    amount_php,
    hold_expires_at,
    source
  )
  values (
    v_customer_id,
    'pending',
    'unpaid',
    0,
    now() + make_interval(mins => v_settings.hold_minutes),
    'online'
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

    v_booking := public.create_guest_court_booking_internal(
      v_court_id,
      v_starts_at,
      v_duration,
      v_customer_id,
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
    'customer', (
      select jsonb_build_object(
        'fullName', cu.full_name,
        'mobile', cu.mobile,
        'email', cu.email
      )
      from public.customers cu
      where cu.id = v_customer_id
    ),
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

-- Guest open play ------------------------------------------------------------
create or replace function public.create_guest_open_play_registration(
  p_session_id uuid,
  p_full_name text,
  p_mobile text,
  p_email text default null
)
returns public.bookings
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_customer_id uuid;
  v_session public.open_play_sessions%rowtype;
  v_service_id uuid;
  v_registered integer;
  v_booking public.bookings%rowtype;
begin
  v_customer_id := public.resolve_guest_customer(
    p_full_name,
    p_mobile,
    p_email
  );

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
      and customer_id = v_customer_id
      and status in ('registered', 'attended')
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

  insert into public.bookings (
    customer_id,
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
    v_customer_id,
    v_service_id,
    v_session.starts_at,
    v_session.starts_at + make_interval(mins => v_session.duration_minutes),
    v_session.duration_minutes,
    'confirmed',
    'unpaid',
    v_session.amount_php,
    null,
    now(),
    'online'
  )
  returning * into v_booking;

  insert into public.open_play_registrations (
    session_id,
    customer_id,
    booking_id,
    status
  )
  values (
    v_session.id,
    v_customer_id,
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

-- Guest lookup ---------------------------------------------------------------
create or replace function public.mask_mobile(p_mobile text)
returns text
language sql
immutable
as $$
  select case
    when p_mobile is null or p_mobile = '' then ''
    when char_length(p_mobile) < 7 then '••••'
    else substr(p_mobile, 1, 4) || '•••' || right(p_mobile, 4)
  end;
$$;

revoke all on function public.mask_mobile(text) from public, anon, authenticated;

create or replace function public.lookup_guest_record(
  p_reference text,
  p_mobile text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_reference text := upper(btrim(coalesce(p_reference, '')));
  v_mobile text := public.normalize_mobile(p_mobile);
  v_group public.booking_groups%rowtype;
  v_booking public.bookings%rowtype;
  v_customer public.customers%rowtype;
  v_kind text;
  v_is_open_play boolean := false;
  v_level text;
  v_payment public.payments%rowtype;
  v_items jsonb;
begin
  if v_reference = '' or char_length(v_reference) > 40 then
    raise exception 'Enter the booking reference.' using errcode = '22023';
  end if;

  if v_mobile is null then
    raise exception 'Enter the mobile number used for the booking.'
      using errcode = '22023';
  end if;

  select * into v_group
  from public.booking_groups
  where reference = v_reference;

  if found then
    select * into v_customer
    from public.customers
    where id = v_group.customer_id;

    if v_customer.mobile <> v_mobile then
      raise exception 'That reference and mobile number do not match a booking.'
        using errcode = '22023';
    end if;

    select
      coalesce(jsonb_agg(
        jsonb_build_object(
          'courtName', c.name,
          'startsAt', b.starts_at,
          'endsAt', b.ends_at,
          'durationMinutes', b.duration_minutes,
          'amountPhp', b.amount_php
        )
        order by b.starts_at
      ), '[]'::jsonb)
    into v_items
    from public.bookings b
    join public.court_reservations r on r.booking_id = b.id
    join public.courts c on c.id = r.court_id
    where b.group_id = v_group.id;

    select * into v_payment
    from public.payments
    where group_id = v_group.id
    order by created_at desc
    limit 1;

    return jsonb_build_object(
      'kind', 'group',
      'id', v_group.id,
      'reference', v_group.reference,
      'fullName', v_customer.full_name,
      'mobile', v_customer.mobile,
      'mobileMasked', public.mask_mobile(v_customer.mobile),
      'status', v_group.status,
      'paymentStatus', v_group.payment_status,
      'amountPhp', v_group.amount_php,
      'holdExpiresAt', v_group.hold_expires_at,
      'createdAt', v_group.created_at,
      'cancellationReason', v_group.cancellation_reason,
      'isOpenPlay', false,
      'openPlayLevel', null,
      'items', v_items,
      'payment', case
        when v_payment.id is null then null
        else jsonb_build_object(
          'status', v_payment.status,
          'submittedAt', v_payment.submitted_at,
          'rejectionReason', v_payment.rejection_reason
        )
      end
    );
  end if;

  select * into v_booking
  from public.bookings
  where reference = v_reference;

  if not found then
    raise exception 'That reference and mobile number do not match a booking.'
      using errcode = '22023';
  end if;

  select * into v_customer
  from public.customers
  where id = v_booking.customer_id;

  if v_customer.mobile <> v_mobile then
    raise exception 'That reference and mobile number do not match a booking.'
      using errcode = '22023';
  end if;

  select (
    exists (
      select 1
      from public.services s
      where s.id = v_booking.service_id
        and s.code = 'open_play'
    )
    or exists (
      select 1
      from public.open_play_registrations r
      where r.booking_id = v_booking.id
    )
  )
  into v_is_open_play;

  select s.skill_level::text
  into v_level
  from public.open_play_registrations r
  join public.open_play_sessions s on s.id = r.session_id
  where r.booking_id = v_booking.id
  limit 1;

  if v_is_open_play then
    v_kind := 'open_play';
    v_items := jsonb_build_array(
      jsonb_build_object(
        'courtName', 'Open play',
        'startsAt', v_booking.starts_at,
        'endsAt', v_booking.ends_at,
        'durationMinutes', v_booking.duration_minutes,
        'amountPhp', v_booking.amount_php
      )
    );
  else
    v_kind := 'booking';
    select
      coalesce(jsonb_agg(
        jsonb_build_object(
          'courtName', c.name,
          'startsAt', v_booking.starts_at,
          'endsAt', v_booking.ends_at,
          'durationMinutes', v_booking.duration_minutes,
          'amountPhp', v_booking.amount_php
        )
      ), '[]'::jsonb)
    into v_items
    from public.court_reservations r
    join public.courts c on c.id = r.court_id
    where r.booking_id = v_booking.id;

    if v_items = '[]'::jsonb then
      v_items := jsonb_build_array(
        jsonb_build_object(
          'courtName', 'Court',
          'startsAt', v_booking.starts_at,
          'endsAt', v_booking.ends_at,
          'durationMinutes', v_booking.duration_minutes,
          'amountPhp', v_booking.amount_php
        )
      );
    end if;
  end if;

  select * into v_payment
  from public.payments
  where booking_id = v_booking.id
  order by created_at desc
  limit 1;

  return jsonb_build_object(
    'kind', v_kind,
    'id', v_booking.id,
    'reference', v_booking.reference,
    'fullName', v_customer.full_name,
    'mobile', v_customer.mobile,
    'mobileMasked', public.mask_mobile(v_customer.mobile),
    'status', v_booking.status,
    'paymentStatus', v_booking.payment_status,
    'amountPhp', v_booking.amount_php,
    'holdExpiresAt', v_booking.hold_expires_at,
    'createdAt', v_booking.created_at,
    'cancellationReason', v_booking.cancellation_reason,
    'isOpenPlay', v_is_open_play,
    'openPlayLevel', v_level,
    'items', v_items,
    'payment', case
      when v_payment.id is null then null
      else jsonb_build_object(
        'status', v_payment.status,
        'submittedAt', v_payment.submitted_at,
        'rejectionReason', v_payment.rejection_reason
      )
    end
  );
end;
$$;

-- Guest payment proof --------------------------------------------------------
create or replace function public.submit_guest_payment_proof(
  p_reference text,
  p_mobile text,
  p_proof_path text,
  p_transaction_reference text default null
)
returns public.payments
language plpgsql
security definer
set search_path = public, storage, pg_temp
as $$
declare
  v_booking public.bookings%rowtype;
  v_customer public.customers%rowtype;
  v_payment public.payments%rowtype;
  v_mobile text := public.normalize_mobile(p_mobile);
  v_reference text := upper(btrim(coalesce(p_reference, '')));
  v_reference_text text := nullif(btrim(coalesce(p_transaction_reference, '')), '');
  v_object_size bigint;
  v_object_type text;
begin
  if v_mobile is null or v_reference = '' then
    raise exception 'Enter the booking reference and mobile number again.'
      using errcode = '22023';
  end if;

  select * into v_booking
  from public.bookings
  where reference = v_reference
  for update;

  if not found then
    raise exception 'Booking not found.' using errcode = '22023';
  end if;

  select * into v_customer
  from public.customers
  where id = v_booking.customer_id;

  if v_customer.mobile <> v_mobile then
    raise exception 'Booking not found.' using errcode = '22023';
  end if;

  if p_proof_path is null
    or p_proof_path !~ (
      '^guests/' || v_booking.id::text || '/[A-Za-z0-9._-]+$'
    )
  then
    raise exception 'That proof file does not belong to this booking.'
      using errcode = '22023';
  end if;

  if char_length(p_proof_path) > 400 then
    raise exception 'That proof file path is too long.' using errcode = '22023';
  end if;

  if v_reference_text is not null and char_length(v_reference_text) > 120 then
    raise exception 'The transaction reference is too long.'
      using errcode = '22023';
  end if;

  if v_booking.status not in ('pending', 'confirmed') then
    raise exception 'This booking cannot accept payment proof.' using errcode = '22023';
  end if;

  if v_booking.starts_at <= now() then
    raise exception 'This booking has already started.' using errcode = '22023';
  end if;

  if v_booking.status = 'pending'
    and (v_booking.hold_expires_at is null or v_booking.hold_expires_at < now())
  then
    raise exception 'The payment hold has expired. Contact the club for the next step.'
      using errcode = '22023';
  end if;

  if v_booking.payment_status = 'awaiting_verification' then
    raise exception 'Proof has already been submitted for this booking.'
      using errcode = '22023';
  end if;

  if v_booking.payment_status in (
    'paid',
    'rejected',
    'refund_pending',
    'partially_refunded',
    'refunded'
  ) then
    raise exception 'This payment is not accepting new proof. Contact the club.'
      using errcode = '22023';
  end if;

  select
    nullif(o.metadata ->> 'size', '')::bigint,
    nullif(o.metadata ->> 'mimetype', '')
  into v_object_size, v_object_type
  from storage.objects o
  where o.bucket_id = 'payment-proofs'
    and o.name = p_proof_path;

  if not found then
    raise exception 'The uploaded proof file could not be found. Try again.'
      using errcode = '22023';
  end if;

  if v_object_size is not null and v_object_size > 5242880 then
    raise exception 'Payment proof must be 5 MB or smaller.' using errcode = '22023';
  end if;

  if v_object_type is not null and v_object_type not in (
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'application/pdf'
  ) then
    raise exception 'Use a JPEG, PNG, WebP, HEIC, HEIF, or PDF file.'
      using errcode = '22023';
  end if;

  insert into public.payments (
    booking_id,
    method,
    status,
    amount_php,
    transaction_reference,
    proof_path,
    submitted_at
  )
  values (
    v_booking.id,
    'gcash',
    'awaiting_verification',
    v_booking.amount_php,
    v_reference_text,
    p_proof_path,
    now()
  )
  returning * into v_payment;

  update public.bookings
  set
    payment_status = 'awaiting_verification',
    status = case
      when status = 'pending' then 'confirmed'::public.booking_status
      else status
    end,
    confirmed_at = case
      when status = 'pending' then now()
      else confirmed_at
    end,
    hold_expires_at = case
      when status = 'pending' then null
      else hold_expires_at
    end,
    updated_at = now()
  where id = v_booking.id;

  return v_payment;
end;
$$;

create or replace function public.submit_guest_group_payment_proof(
  p_reference text,
  p_mobile text,
  p_proof_path text,
  p_transaction_reference text default null
)
returns public.booking_groups
language plpgsql
security definer
set search_path = public, storage, pg_temp
as $$
declare
  v_group public.booking_groups%rowtype;
  v_customer public.customers%rowtype;
  v_mobile text := public.normalize_mobile(p_mobile);
  v_reference_text text := nullif(btrim(coalesce(p_transaction_reference, '')), '');
  v_object_size bigint;
  v_object_type text;
begin
  if v_mobile is null then
    raise exception 'Enter the mobile number used for the booking.'
      using errcode = '22023';
  end if;

  select * into v_group
  from public.booking_groups
  where reference = upper(btrim(coalesce(p_reference, '')))
  for update;

  if not found then
    raise exception 'Reservation not found.' using errcode = '22023';
  end if;

  select * into v_customer
  from public.customers
  where id = v_group.customer_id;

  if v_customer.mobile <> v_mobile then
    raise exception 'Reservation not found.' using errcode = '22023';
  end if;

  if p_proof_path is null
    or p_proof_path !~ (
      '^guests/' || v_group.id::text || '/[A-Za-z0-9._-]+$'
    )
  then
    raise exception 'That proof file does not belong to this reservation.'
      using errcode = '22023';
  end if;

  if char_length(p_proof_path) > 400 then
    raise exception 'That proof file path is too long.' using errcode = '22023';
  end if;

  if v_reference_text is not null and char_length(v_reference_text) > 120 then
    raise exception 'The transaction reference is too long.'
      using errcode = '22023';
  end if;

  if v_group.status not in ('pending', 'confirmed') then
    raise exception 'This reservation cannot accept payment proof.'
      using errcode = '22023';
  end if;

  if v_group.status = 'pending'
    and (v_group.hold_expires_at is null or v_group.hold_expires_at < now())
  then
    raise exception 'The payment hold has expired. Contact the club for the next step.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.bookings b
    where b.group_id = v_group.id
      and b.starts_at <= now()
  ) then
    raise exception 'One of the court times has already started.'
      using errcode = '22023';
  end if;

  if v_group.payment_status = 'awaiting_verification' then
    raise exception 'Proof has already been submitted for this booking.'
      using errcode = '22023';
  end if;

  if v_group.payment_status in (
    'paid',
    'rejected',
    'refund_pending',
    'partially_refunded',
    'refunded'
  ) then
    raise exception 'This payment is not accepting new proof. Contact the club.'
      using errcode = '22023';
  end if;

  select
    nullif(o.metadata ->> 'size', '')::bigint,
    nullif(o.metadata ->> 'mimetype', '')
  into v_object_size, v_object_type
  from storage.objects o
  where o.bucket_id = 'payment-proofs'
    and o.name = p_proof_path;

  if not found then
    raise exception 'The uploaded proof file could not be found. Try again.'
      using errcode = '22023';
  end if;

  if v_object_size is not null and v_object_size > 5242880 then
    raise exception 'Payment proof must be 5 MB or smaller.' using errcode = '22023';
  end if;

  if v_object_type is not null and v_object_type not in (
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'application/pdf'
  ) then
    raise exception 'Use a JPEG, PNG, WebP, HEIC, HEIF, or PDF file.'
      using errcode = '22023';
  end if;

  insert into public.payments (
    group_id,
    method,
    status,
    amount_php,
    transaction_reference,
    proof_path,
    submitted_at
  )
  values (
    v_group.id,
    'gcash',
    'awaiting_verification',
    v_group.amount_php,
    v_reference_text,
    p_proof_path,
    now()
  );

  update public.bookings
  set
    payment_status = 'awaiting_verification',
    status = case
      when status = 'pending' then 'confirmed'::public.booking_status
      else status
    end,
    confirmed_at = case
      when status = 'pending' then now()
      else confirmed_at
    end,
    hold_expires_at = case
      when status = 'pending' then null
      else hold_expires_at
    end,
    updated_at = now()
  where group_id = v_group.id;

  update public.booking_groups
  set
    payment_status = 'awaiting_verification',
    status = case
      when status = 'pending' then 'confirmed'::public.booking_status
      else status
    end,
    confirmed_at = case
      when status = 'pending' then now()
      else confirmed_at
    end,
    hold_expires_at = case
      when status = 'pending' then null
      else hold_expires_at
    end,
    updated_at = now()
  where id = v_group.id
  returning * into v_group;

  return v_group;
end;
$$;

-- Staff walk-in --------------------------------------------------------------
drop function if exists public.staff_create_walk_in_booking(
  uuid, uuid, timestamptz, integer, boolean, public.payment_method, text, text
);

create or replace function public.staff_create_walk_in_booking(
  p_full_name text,
  p_mobile text,
  p_court_id uuid,
  p_starts_at timestamptz,
  p_duration_minutes integer,
  p_collected boolean default false,
  p_method public.payment_method default 'cash',
  p_reference text default null,
  p_notes text default null,
  p_email text default null
)
returns public.bookings
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_customer_id uuid;
  v_booking public.bookings%rowtype;
  v_notes text := nullif(btrim(coalesce(p_notes, '')), '');
begin
  if not public.is_staff() then
    raise exception 'Staff access is required.' using errcode = '42501';
  end if;

  if v_notes is not null and char_length(v_notes) > 500 then
    raise exception 'Keep the booking note under 500 characters.'
      using errcode = '22023';
  end if;

  v_customer_id := public.resolve_guest_customer(p_full_name, p_mobile, p_email);

  v_booking := public.create_guest_court_booking_internal(
    p_court_id,
    p_starts_at,
    p_duration_minutes,
    v_customer_id,
    false
  );

  update public.bookings
  set
    status = 'confirmed',
    confirmed_at = now(),
    hold_expires_at = null,
    source = 'walk_in',
    notes = v_notes,
    updated_at = now()
  where id = v_booking.id
  returning * into v_booking;

  if p_collected then
    perform public.staff_record_payment(
      v_booking.id,
      null,
      p_method,
      p_reference
    );

    select * into v_booking
    from public.bookings
    where id = v_booking.id;
  end if;

  return v_booking;
end;
$$;

-- Notifications and email ----------------------------------------------------
-- Players have no inbox any more. Staff notifications keep working and now read
-- the guest customer's name instead of a profile.
create or replace function public.queue_notifications(
  p_event text,
  p_booking_id uuid default null,
  p_group_id uuid default null
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_target text;
  v_customer_name text;
  v_reference text;
  v_starts_at timestamptz;
  v_place text;
  v_when text;
  v_cancel_reason text;
  v_staff_title text;
  v_staff_body text;
  v_staff_href text;
  v_count integer := 0;
begin
  if (p_booking_id is null) = (p_group_id is null) then
    return 0;
  end if;

  if p_group_id is not null then
    select g.reference, g.cancellation_reason, cu.full_name
      into v_reference, v_cancel_reason, v_customer_name
    from public.booking_groups g
    join public.customers cu on cu.id = g.customer_id
    where g.id = p_group_id;

    select min(b.starts_at)
      into v_starts_at
    from public.bookings b
    where b.group_id = p_group_id;

    select c.name
      into v_place
    from public.bookings b
    join public.court_reservations cr on cr.booking_id = b.id
    join public.courts c on c.id = cr.court_id
    where b.group_id = p_group_id
    order by b.starts_at
    limit 1;
  else
    select b.reference, b.cancellation_reason, b.starts_at, cu.full_name
      into v_reference, v_cancel_reason, v_starts_at, v_customer_name
    from public.bookings b
    join public.customers cu on cu.id = b.customer_id
    where b.id = p_booking_id;

    select c.name
      into v_place
    from public.court_reservations cr
    join public.courts c on c.id = cr.court_id
    where cr.booking_id = p_booking_id;

    v_place := coalesce(v_place, 'Court');
  end if;

  v_target := coalesce(p_group_id, p_booking_id)::text;
  v_when := coalesce(
    to_char(
      v_starts_at at time zone 'Asia/Manila',
      'Dy, Mon FMDD "at" FMHH12:MI AM'
    ),
    'the scheduled time'
  );

  case p_event
    when 'court_booking_received' then
      v_staff_title := 'New booking ' || v_reference;
      v_staff_body := v_customer_name || ' · ' || coalesce(v_place, 'Court') ||
        ' · ' || v_when;
      v_staff_href := '/staff/bookings/' || v_reference;
    when 'open_play_reserved' then
      v_staff_title := 'New open-play registration';
      v_staff_body := v_customer_name || ' · ' || v_when;
      v_staff_href := '/staff/open-play';
    when 'payment_proof_received' then
      v_staff_title := 'Payment proof waiting';
      v_staff_body := v_reference || ' · ' || coalesce(v_customer_name, 'Guest');
      v_staff_href := '/staff/payments';
    when 'booking_cancelled' then
      v_staff_title := 'Booking cancelled';
      v_staff_body := v_reference || ' · ' ||
        coalesce(v_customer_name, 'Guest') ||
        coalesce(' · ' || v_cancel_reason, '');
      v_staff_href := '/staff/bookings/' || v_reference;
    else
      v_staff_title := null;
  end case;

  if v_staff_title is not null then
    insert into public.notifications (
      recipient_id,
      audience,
      event,
      title,
      body,
      href,
      booking_id,
      group_id,
      session_id,
      dedupe_key
    )
    select
      pr.id,
      'staff',
      p_event,
      v_staff_title,
      v_staff_body,
      v_staff_href,
      p_booking_id,
      p_group_id,
      null,
      'staff:' || p_event || ':' || v_target
    from public.profiles pr
    where pr.role = 'staff'
      and (v_actor is null or pr.id <> v_actor)
    on conflict (recipient_id, dedupe_key) do nothing;

    v_count := v_count + 1;
  end if;

  return v_count;
end;
$$;

-- Guest actions are not authenticated, so they enqueue through the server-only
-- service role. The function is not executable by anon or authenticated.
create or replace function public.enqueue_guest_booking_email_event(
  p_event text,
  p_booking_id uuid default null,
  p_group_id uuid default null
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_target text;
  v_dedupe text;
  v_staff_event text;
  v_customer_email text;
  v_count integer := 0;
begin
  if p_event not in (
    'court_booking_received',
    'open_play_reserved',
    'payment_proof_received',
    'payment_approved',
    'payment_rejected',
    'booking_cancelled',
    'open_play_updated'
  ) then
    raise exception 'That email event is not supported.' using errcode = '22023';
  end if;

  if (p_booking_id is null) = (p_group_id is null) then
    raise exception 'Choose one booking or reservation group.' using errcode = '22023';
  end if;

  if p_group_id is not null then
    select cu.email into v_customer_email
    from public.booking_groups g
    join public.customers cu on cu.id = g.customer_id
    where g.id = p_group_id;

    if not found then
      return 0;
    end if;

    v_target := p_group_id::text;
  else
    select cu.email into v_customer_email
    from public.bookings b
    join public.customers cu on cu.id = b.customer_id
    where b.id = p_booking_id;

    if not found then
      return 0;
    end if;

    v_target := p_booking_id::text;
  end if;

  v_dedupe := 'player:' || p_event || ':' || v_target;

  if p_event = 'open_play_updated' then
    v_dedupe := v_dedupe || ':' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISSUS');
  end if;

  if v_customer_email is not null and btrim(v_customer_email) <> '' then
    insert into public.email_outbox (
      event,
      audience,
      booking_id,
      group_id,
      dedupe_key
    )
    values (
      p_event,
      'player',
      p_booking_id,
      p_group_id,
      v_dedupe
    )
    on conflict (dedupe_key) do nothing;

    get diagnostics v_count = row_count;
  end if;

  v_staff_event := case p_event
    when 'court_booking_received' then 'staff_new_booking'
    when 'open_play_reserved' then 'staff_new_booking'
    when 'payment_proof_received' then 'staff_payment_proof'
    when 'booking_cancelled' then 'staff_booking_cancelled'
    else null
  end;

  if v_staff_event is not null then
    insert into public.email_outbox (
      event,
      audience,
      booking_id,
      group_id,
      dedupe_key
    )
    values (
      v_staff_event,
      'staff',
      p_booking_id,
      p_group_id,
      'staff:' || v_staff_event || ':' || v_target
    )
    on conflict (dedupe_key) do nothing;
  end if;

  perform public.queue_notifications(p_event, p_booking_id, p_group_id);

  return v_count;
end;
$$;

-- Function grants ------------------------------------------------------------
revoke all on function public.create_guest_court_booking_internal(
  uuid, timestamptz, integer, uuid, boolean
) from public, anon, authenticated;

revoke all on function public.create_guest_court_booking(
  uuid, timestamptz, integer, text, text, text
) from public, anon, authenticated;
grant execute on function public.create_guest_court_booking(
  uuid, timestamptz, integer, text, text, text
) to anon, authenticated;

revoke all on function public.create_guest_court_booking_group(
  jsonb, text, text, text
) from public, anon, authenticated;
grant execute on function public.create_guest_court_booking_group(
  jsonb, text, text, text
) to anon, authenticated;

revoke all on function public.create_guest_open_play_registration(
  uuid, text, text, text
) from public, anon, authenticated;
grant execute on function public.create_guest_open_play_registration(
  uuid, text, text, text
) to anon, authenticated;

revoke all on function public.lookup_guest_record(text, text)
  from public, anon, authenticated;
grant execute on function public.lookup_guest_record(text, text)
  to anon, authenticated;

revoke all on function public.submit_guest_payment_proof(
  text, text, text, text
) from public, anon, authenticated;
grant execute on function public.submit_guest_payment_proof(
  text, text, text, text
) to anon, authenticated;

revoke all on function public.submit_guest_group_payment_proof(
  text, text, text, text
) from public, anon, authenticated;
grant execute on function public.submit_guest_group_payment_proof(
  text, text, text, text
) to anon, authenticated;

revoke all on function public.staff_create_walk_in_booking(
  text, text, uuid, timestamptz, integer, boolean,
  public.payment_method, text, text, text
) from public, anon, authenticated;
grant execute on function public.staff_create_walk_in_booking(
  text, text, uuid, timestamptz, integer, boolean,
  public.payment_method, text, text, text
) to authenticated;

revoke all on function public.enqueue_guest_booking_email_event(
  text, uuid, uuid
) from public, anon, authenticated;
grant execute on function public.enqueue_guest_booking_email_event(
  text, uuid, uuid
) to service_role;

revoke all on function public.queue_notifications(text, uuid, uuid)
  from public, anon, authenticated;

-- Retire the player-account entry points -------------------------------------
drop function if exists public.create_court_booking(uuid, timestamptz, integer, uuid);
drop function if exists public.create_court_booking_internal(
  uuid, timestamptz, integer, uuid, boolean
);
drop function if exists public.create_court_booking_group(jsonb, uuid);
drop function if exists public.create_open_play_registration(uuid, uuid);
drop function if exists public.submit_payment_proof(uuid, text, text);
drop function if exists public.submit_booking_group_payment_proof(uuid, text, text);

-- Remove player auth users, keeping staff. Profiles cascade; booking links are
-- set to null, and every record keeps its customer row.
delete from auth.users u
where not exists (
  select 1
  from public.profiles p
  where p.id = u.id
    and p.role = 'staff'
);
