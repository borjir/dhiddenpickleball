-- Phase 7 — grouped court reservations for carts with multiple dates/ranges.
-- A group is the customer-facing reservation: one reference, one total, one
-- hold, and one payment proof. Each range remains a normal booking plus court
-- reservation so the existing overlap constraint stays authoritative.

create or replace function public.generate_group_reference()
returns text
language sql
volatile
as $$
  select 'HG-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
$$;

create table if not exists public.booking_groups (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default public.generate_group_reference(),
  player_id uuid not null references public.profiles (id) on delete restrict,
  created_by uuid references public.profiles (id) on delete set null,
  status public.booking_status not null default 'pending',
  payment_status public.payment_status not null default 'unpaid',
  amount_php numeric(10, 2) not null default 0 check (amount_php >= 0),
  hold_expires_at timestamptz,
  confirmed_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  source public.booking_source not null default 'online',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'pending' or hold_expires_at is not null)
);

create index if not exists booking_groups_player_idx
  on public.booking_groups (player_id, created_at desc);
create index if not exists booking_groups_status_idx
  on public.booking_groups (status, created_at);
create index if not exists booking_groups_hold_expiry_idx
  on public.booking_groups (hold_expires_at)
  where status = 'pending';

alter table public.bookings
  add column if not exists group_id uuid references public.booking_groups (id) on delete cascade;

create index if not exists bookings_group_idx
  on public.bookings (group_id);

alter table public.payments
  alter column booking_id drop not null;

alter table public.payments
  add column if not exists group_id uuid references public.booking_groups (id) on delete cascade;

alter table public.payments
  drop constraint if exists payments_booking_or_group_check;

alter table public.payments
  add constraint payments_booking_or_group_check
  check ((booking_id is not null) <> (group_id is not null));

create index if not exists payments_group_idx
  on public.payments (group_id, created_at desc);

drop trigger if exists booking_groups_set_updated_at on public.booking_groups;
create trigger booking_groups_set_updated_at
  before update on public.booking_groups
  for each row execute function public.set_updated_at();

drop trigger if exists booking_groups_audit on public.booking_groups;
create trigger booking_groups_audit
  after insert or update or delete on public.booking_groups
  for each row execute function public.audit_row_change();

alter table public.booking_groups enable row level security;

grant select on public.booking_groups to authenticated;

drop policy if exists "booking_groups_select_own_or_staff" on public.booking_groups;
create policy "booking_groups_select_own_or_staff"
  on public.booking_groups for select
  to authenticated
  using (player_id = auth.uid() or public.is_staff());

drop policy if exists "payments_select_own_or_staff" on public.payments;
create policy "payments_select_own_or_staff"
  on public.payments for select
  to authenticated
  using (
    (
      booking_id is not null
      and exists (
        select 1
        from public.bookings b
        where b.id = booking_id
          and (b.player_id = auth.uid() or public.is_staff())
      )
    )
    or (
      group_id is not null
      and exists (
        select 1
        from public.booking_groups g
        where g.id = group_id
          and (g.player_id = auth.uid() or public.is_staff())
      )
    )
  );

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

    v_booking := public.create_court_booking(
      v_court_id,
      v_starts_at,
      v_duration,
      v_player_id
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

create or replace function public.submit_booking_group_payment_proof(
  p_group_id uuid,
  p_proof_path text,
  p_transaction_reference text default null
)
returns public.booking_groups
language plpgsql
security definer
set search_path = public, storage, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_group public.booking_groups%rowtype;
  v_reference text := nullif(btrim(coalesce(p_transaction_reference, '')), '');
  v_object_size bigint;
  v_object_type text;
begin
  if v_uid is null then
    raise exception 'Sign in to submit payment proof.' using errcode = '42501';
  end if;

  if p_group_id is null or p_proof_path is null then
    raise exception 'Booking and proof file are required.' using errcode = '22023';
  end if;

  if p_proof_path !~ (
    '^' || v_uid::text || '/' || p_group_id::text || '/[A-Za-z0-9._-]+$'
  ) then
    raise exception 'That proof file does not belong to this booking.'
      using errcode = '22023';
  end if;

  if char_length(p_proof_path) > 400 then
    raise exception 'That proof file path is too long.' using errcode = '22023';
  end if;

  if v_reference is not null and char_length(v_reference) > 120 then
    raise exception 'The transaction reference is too long.' using errcode = '22023';
  end if;

  select *
  into v_group
  from public.booking_groups
  where id = p_group_id
    and player_id = v_uid
  for update;

  if not found then
    raise exception 'Booking not found.' using errcode = '22023';
  end if;

  if v_group.status not in ('pending', 'confirmed') then
    raise exception 'This booking cannot accept payment proof.' using errcode = '22023';
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
    raise exception 'One of the court times has already started.' using errcode = '22023';
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
    'image/heif'
  ) then
    raise exception 'Use a JPEG, PNG, WebP, HEIC, or HEIF image.'
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
    v_reference,
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

-- Keep group status aligned with expired individual holds.
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
    returning id, group_id
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
  ),
  expired_groups as (
    update public.booking_groups g
    set
      status = 'cancelled',
      cancelled_at = now(),
      cancellation_reason = 'Payment hold expired',
      updated_at = now()
    where g.status = 'pending'
      and g.hold_expires_at is not null
      and g.hold_expires_at < now()
    returning g.id
  )
  select count(*) into v_count from expired;

  return v_count;
end;
$$;

revoke all on function public.create_court_booking_group(jsonb, uuid)
  from public, anon, authenticated;
grant execute on function public.create_court_booking_group(jsonb, uuid)
  to authenticated;

revoke all on function public.submit_booking_group_payment_proof(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.submit_booking_group_payment_proof(uuid, text, text)
  to authenticated;

revoke all on function public.release_expired_court_holds()
  from public, anon, authenticated;
grant execute on function public.release_expired_court_holds()
  to anon, authenticated;
