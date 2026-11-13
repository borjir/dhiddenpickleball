-- Phase 11 — account management, rate/hours maintenance, soft void, quota trims.
--
-- Three separate concerns, deliberately kept in one migration because they all
-- belong to the same operations-desk change:
--
--   1. Account management. `profiles.can_manage_accounts` marks the one or two
--      staff members who may invite, disable, and reset other accounts. It is a
--      column, not a new role, so the confirmed player/staff role model stays
--      exactly as the client decided (D-14). Only SQL can set the flag, which
--      keeps account management out of reach of the app itself.
--   2. Soft void. Staff can retire a mistaken booking or payment without
--      deleting the row, so the audit trail and accounting history survive.
--      Voided rows are excluded from revenue and volume reporting.
--   3. Quota trims. Lapsed unpaid holds and abandoned open-play registrations
--      are deleted as soon as they stop being useful, and
--      `staff_quota_usage()` exposes the Free-plan headroom to the dashboard.

set search_path = public, extensions;

-- 1. Account management ------------------------------------------------------

alter table public.profiles
  add column if not exists can_manage_accounts boolean not null default false;

create or replace function public.is_account_manager()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'staff'
      and can_manage_accounts
  );
$$;

revoke all on function public.is_account_manager() from public, anon;
grant execute on function public.is_account_manager() to authenticated, service_role;

-- Account managers may read every profile (already allowed for staff) and see
-- the flag, but the role column stays protected by the trigger below.
create or replace function public.prevent_profile_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.role is distinct from old.role
     and auth.uid() is not null
     and not public.is_account_manager() then
    raise exception 'Only account managers can change a role.' using errcode = '42501';
  end if;

  if new.can_manage_accounts is distinct from old.can_manage_accounts
     and auth.uid() is not null then
    raise exception 'Account-manager access is changed outside the app.'
      using errcode = '42501';
  end if;

  if new.id is distinct from old.id then
    raise exception 'A profile id cannot be changed.' using errcode = '42501';
  end if;

  return new;
end;
$$;

-- 2. Soft void ---------------------------------------------------------------

alter table public.bookings
  add column if not exists voided_at timestamptz,
  add column if not exists voided_reason text,
  add column if not exists voided_by uuid references public.profiles (id);

alter table public.payments
  add column if not exists voided_at timestamptz,
  add column if not exists voided_reason text,
  add column if not exists voided_by uuid references public.profiles (id);

create index if not exists bookings_voided_idx
  on public.bookings (voided_at)
  where voided_at is not null;

create index if not exists payments_voided_idx
  on public.payments (voided_at)
  where voided_at is not null;

create or replace function public.staff_void_booking(
  p_booking_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_booking public.bookings%rowtype;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if not public.is_staff() then
    raise exception 'Staff access is required.' using errcode = '42501';
  end if;

  if v_reason is null then
    raise exception 'Add a reason before voiding a booking.' using errcode = '22023';
  end if;

  if char_length(v_reason) > 500 then
    raise exception 'Keep the reason under 500 characters.' using errcode = '22023';
  end if;

  select * into v_booking
  from public.bookings
  where id = p_booking_id
  for update;

  if not found then
    raise exception 'Booking not found.' using errcode = '22023';
  end if;

  if v_booking.voided_at is not null then
    raise exception 'This booking is already voided.' using errcode = '22023';
  end if;

  if v_booking.payment_status = 'paid' or v_booking.status = 'pending' then
    -- A paid booking needs a refund decision, and a live hold is cancelled and
    -- then trimmed by the hygiene job. Neither is a "wrong row" case.
    raise exception 'Only closed, unpaid bookings can be voided. Cancel or refund it instead.'
      using errcode = '22023';
  end if;

  update public.bookings
  set
    voided_at = now(),
    voided_reason = v_reason,
    voided_by = auth.uid()
  where id = v_booking.id;

  update public.court_reservations
  set status = 'released', updated_at = now()
  where booking_id = v_booking.id
    and status = 'active';

  return jsonb_build_object('booking_id', v_booking.id, 'voided', true);
end;
$$;

revoke all on function public.staff_void_booking(uuid, text) from public, anon;
grant execute on function public.staff_void_booking(uuid, text) to authenticated;

create or replace function public.staff_void_payment(
  p_payment_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_payment public.payments%rowtype;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_other_paid boolean;
begin
  if not public.is_staff() then
    raise exception 'Staff access is required.' using errcode = '42501';
  end if;

  if v_reason is null then
    raise exception 'Add a reason before voiding a payment.' using errcode = '22023';
  end if;

  if char_length(v_reason) > 500 then
    raise exception 'Keep the reason under 500 characters.' using errcode = '22023';
  end if;

  select * into v_payment
  from public.payments
  where id = p_payment_id
  for update;

  if not found then
    raise exception 'Payment not found.' using errcode = '22023';
  end if;

  if v_payment.voided_at is not null then
    raise exception 'This payment is already voided.' using errcode = '22023';
  end if;

  update public.payments
  set
    voided_at = now(),
    voided_reason = v_reason,
    voided_by = auth.uid()
  where id = v_payment.id;

  -- A voided "paid" row no longer covers the booking, so put the booking back
  -- to unpaid unless another live paid payment exists for it.
  if v_payment.status = 'paid' and v_payment.booking_id is not null then
    select exists (
      select 1
      from public.payments p
      where p.booking_id = v_payment.booking_id
        and p.id <> v_payment.id
        and p.status = 'paid'
        and p.voided_at is null
    ) into v_other_paid;

    if not v_other_paid then
      update public.bookings
      set payment_status = 'unpaid', updated_at = now()
      where id = v_payment.booking_id
        and payment_status = 'paid';
    end if;
  end if;

  return jsonb_build_object('payment_id', v_payment.id, 'voided', true);
end;
$$;

revoke all on function public.staff_void_payment(uuid, text) from public, anon;
grant execute on function public.staff_void_payment(uuid, text) to authenticated;

-- 3. Quota trims -------------------------------------------------------------
--
-- The client asked for rows that never became a booking or a session to be
-- removed as soon as they lapse. Two cases qualify:
--
--   * an unpaid court hold whose 15-minute window passed and that never
--     received a payment row (a hold with proof attached is evidence and stays);
--   * an open-play registration still "registered" 24 hours after its session
--     ended, which means nobody marked it attended, no-show, or cancelled.
--
-- Payment proofs (Storage) are deliberately *not* deleted here: keeping enough
-- of them for a dispute or an accounting check is a client policy decision, and
-- `staff_quota_usage()` shows the headroom so it can be decided with numbers.

create or replace function public.run_data_hygiene()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_holds integer := 0;
  v_registrations integer := 0;
begin
  delete from public.email_outbox
  where status in ('sent', 'skipped', 'failed')
    and created_at < now() - interval '30 days';

  delete from public.notifications
  where (read_at is not null and created_at < now() - interval '90 days')
     or created_at < now() - interval '365 days';

  delete from public.audit_logs
  where created_at < now() - interval '365 days';

  -- Lapsed holds that never produced a payment. Only rows that are still a
  -- hold, or that the release function closed as expired, qualify: completed,
  -- no-show, and cancelled-by-staff bookings are club history and stay.
  with dead as (
    delete from public.bookings b
    where b.hold_expires_at is not null
      and b.hold_expires_at < now()
      and b.payment_status in ('unpaid', 'awaiting_proof')
      and (
        b.status = 'pending'
        or (
          b.status = 'cancelled'
          and b.cancellation_reason = 'Payment hold expired'
        )
      )
      and not exists (
        select 1 from public.payments p where p.booking_id = b.id
      )
    returning b.id
  )
  select count(*) into v_holds from dead;

  -- Abandoned open-play registrations on sessions that already ended. The
  -- registration is removed by the cascade when its (unpaid) booking goes.
  with dead as (
    delete from public.bookings b
    using public.open_play_registrations r, public.open_play_sessions s
    where r.booking_id = b.id
      and r.session_id = s.id
      and r.status = 'registered'
      and b.payment_status in ('unpaid', 'awaiting_proof')
      and s.starts_at + make_interval(mins => s.duration_minutes)
          < now() - interval '24 hours'
      and not exists (
        select 1 from public.payments p where p.booking_id = b.id
      )
    returning b.id
  )
  select count(*) into v_registrations from dead;

  -- Reservation groups left empty by those deletes (never a real booking).
  delete from public.booking_groups g
  where not exists (
      select 1 from public.bookings b where b.group_id = g.id
    )
    and not exists (
      select 1 from public.payments p where p.group_id = g.id
    )
    and g.created_at < now() - interval '1 day';

  if v_holds + v_registrations > 0 then
    raise notice 'Data hygiene removed % lapsed holds and % abandoned registrations.',
      v_holds, v_registrations;
  end if;
end;
$$;

revoke all on function public.run_data_hygiene() from public, anon, authenticated;

-- Free-plan headroom for the staff reports page (500 MB database, 1 GB file
-- storage). Counts are cheap; sizes come from the catalog and Storage metadata.
create or replace function public.staff_quota_usage()
returns jsonb
language plpgsql
security definer
set search_path = public, storage, pg_temp
as $$
declare
  v_result jsonb;
begin
  if not public.is_staff() then
    raise exception 'Staff access is required.' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'database_bytes', pg_database_size(current_database()),
    'storage_bytes', coalesce((
      select sum((o.metadata ->> 'size')::bigint)
      from storage.objects o
      where o.bucket_id = 'payment-proofs'
    ), 0),
    'proof_count', (
      select count(*) from storage.objects o where o.bucket_id = 'payment-proofs'
    ),
    'booking_count', (select count(*) from public.bookings),
    'payment_count', (select count(*) from public.payments),
    'audit_count', (select count(*) from public.audit_logs)
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.staff_quota_usage() from public, anon;
grant execute on function public.staff_quota_usage() to authenticated;
