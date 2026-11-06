-- Phase 8 — staff operations.
-- These functions keep sensitive changes behind a staff check and update the
-- related booking/group rows together. The existing audit triggers record the
-- actor for every changed row.

set search_path = public, extensions;

create or replace function public.staff_review_payment(
  p_payment_id uuid,
  p_decision text,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_payment public.payments%rowtype;
  v_booking public.bookings%rowtype;
  v_group public.booking_groups%rowtype;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_decision public.payment_status;
begin
  if not public.is_staff() then
    raise exception 'Staff access is required.' using errcode = '42501';
  end if;

  if p_decision not in ('approve', 'reject') then
    raise exception 'Choose approve or reject.' using errcode = '22023';
  end if;

  if p_decision = 'reject' and v_reason is null then
    raise exception 'Add a reason before rejecting a payment.' using errcode = '22023';
  end if;

  if v_reason is not null and char_length(v_reason) > 500 then
    raise exception 'Keep the payment note under 500 characters.' using errcode = '22023';
  end if;

  v_decision := case
    when p_decision = 'approve' then 'paid'::public.payment_status
    else 'rejected'::public.payment_status
  end;

  select * into v_payment
  from public.payments
  where id = p_payment_id
  for update;

  if not found then
    raise exception 'Payment not found.' using errcode = '22023';
  end if;

  if v_payment.status <> 'awaiting_verification' then
    raise exception 'This payment is no longer waiting for review.' using errcode = '22023';
  end if;

  update public.payments
  set
    status = v_decision,
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    rejection_reason = case when p_decision = 'reject' then v_reason else null end
  where id = v_payment.id;

  if v_payment.group_id is not null then
    select * into v_group
    from public.booking_groups
    where id = v_payment.group_id
    for update;

    if not found then
      raise exception 'Reservation not found.' using errcode = '22023';
    end if;

    if v_group.status in ('cancelled', 'completed') then
      raise exception 'This reservation is no longer open for payment review.' using errcode = '22023';
    end if;

    update public.booking_groups
    set
      payment_status = v_decision,
      status = case
        when p_decision = 'approve' and status = 'pending' then 'confirmed'::public.booking_status
        else status
      end,
      confirmed_at = case
        when p_decision = 'approve' and status = 'pending' then now()
        else confirmed_at
      end,
      hold_expires_at = case
        when p_decision = 'approve' and status = 'pending' then null
        else hold_expires_at
      end,
      updated_at = now()
    where id = v_group.id;

    update public.bookings
    set
      payment_status = v_decision,
      status = case
        when p_decision = 'approve' and status = 'pending' then 'confirmed'::public.booking_status
        else status
      end,
      confirmed_at = case
        when p_decision = 'approve' and status = 'pending' then now()
        else confirmed_at
      end,
      hold_expires_at = case
        when p_decision = 'approve' and status = 'pending' then null
        else hold_expires_at
      end,
      updated_at = now()
    where group_id = v_group.id;

    return jsonb_build_object(
      'target', 'group',
      'reference', v_group.reference,
      'payment_status', v_decision
    );
  end if;

  select * into v_booking
  from public.bookings
  where id = v_payment.booking_id
  for update;

  if not found then
    raise exception 'Booking not found.' using errcode = '22023';
  end if;

  if v_booking.status in ('cancelled', 'completed') then
    raise exception 'This booking is no longer open for payment review.' using errcode = '22023';
  end if;

  update public.bookings
  set
    payment_status = v_decision,
    status = case
      when p_decision = 'approve' and status = 'pending' then 'confirmed'::public.booking_status
      else status
    end,
    confirmed_at = case
      when p_decision = 'approve' and status = 'pending' then now()
      else confirmed_at
    end,
    hold_expires_at = case
      when p_decision = 'approve' and status = 'pending' then null
      else hold_expires_at
    end,
    updated_at = now()
  where id = v_booking.id;

  return jsonb_build_object(
    'target', 'booking',
    'reference', v_booking.reference,
    'payment_status', v_decision
  );
end;
$$;

create or replace function public.staff_record_payment(
  p_booking_id uuid default null,
  p_group_id uuid default null,
  p_method public.payment_method default 'cash',
  p_reference text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_booking public.bookings%rowtype;
  v_group public.booking_groups%rowtype;
  v_amount numeric;
  v_reference text := nullif(btrim(coalesce(p_reference, '')), '');
begin
  if not public.is_staff() then
    raise exception 'Staff access is required.' using errcode = '42501';
  end if;

  if (p_booking_id is null) = (p_group_id is null) then
    raise exception 'Choose one booking or reservation group.' using errcode = '22023';
  end if;

  if p_method not in ('cash', 'gcash', 'maya', 'bank_transfer') then
    raise exception 'Choose cash, GCash, Maya, or bank transfer.' using errcode = '22023';
  end if;

  if v_reference is not null and char_length(v_reference) > 120 then
    raise exception 'Keep the transaction reference under 120 characters.' using errcode = '22023';
  end if;

  if p_group_id is not null then
    select * into v_group
    from public.booking_groups
    where id = p_group_id
    for update;

    if not found then
      raise exception 'Reservation not found.' using errcode = '22023';
    end if;

    if v_group.status in ('cancelled', 'completed') then
      raise exception 'This reservation is closed.' using errcode = '22023';
    end if;

    if v_group.payment_status = 'paid' then
      raise exception 'This reservation is already paid.' using errcode = '22023';
    end if;

    v_amount := v_group.amount_php;

    insert into public.payments (
      group_id,
      method,
      status,
      amount_php,
      transaction_reference,
      submitted_at,
      reviewed_by,
      reviewed_at
    )
    values (
      v_group.id,
      p_method,
      'paid',
      v_amount,
      v_reference,
      now(),
      auth.uid(),
      now()
    );

    update public.booking_groups
    set
      payment_status = 'paid',
      status = case when status = 'pending' then 'confirmed'::public.booking_status else status end,
      confirmed_at = case when status = 'pending' then now() else confirmed_at end,
      hold_expires_at = case when status = 'pending' then null else hold_expires_at end,
      updated_at = now()
    where id = v_group.id;

    update public.bookings
    set
      payment_status = 'paid',
      status = case when status = 'pending' then 'confirmed'::public.booking_status else status end,
      confirmed_at = case when status = 'pending' then now() else confirmed_at end,
      hold_expires_at = case when status = 'pending' then null else hold_expires_at end,
      updated_at = now()
    where group_id = v_group.id;

    return jsonb_build_object('target', 'group', 'reference', v_group.reference, 'amount_php', v_amount);
  end if;

  select * into v_booking
  from public.bookings
  where id = p_booking_id
  for update;

  if not found then
    raise exception 'Booking not found.' using errcode = '22023';
  end if;

  if v_booking.status in ('cancelled', 'completed') then
    raise exception 'This booking is closed.' using errcode = '22023';
  end if;

  if v_booking.payment_status = 'paid' then
    raise exception 'This booking is already paid.' using errcode = '22023';
  end if;

  v_amount := v_booking.amount_php;

  insert into public.payments (
    booking_id,
    method,
    status,
    amount_php,
    transaction_reference,
    submitted_at,
    reviewed_by,
    reviewed_at
  )
  values (
    v_booking.id,
    p_method,
    'paid',
    v_amount,
    v_reference,
    now(),
    auth.uid(),
    now()
  );

  update public.bookings
  set
    payment_status = 'paid',
    status = case when status = 'pending' then 'confirmed'::public.booking_status else status end,
    confirmed_at = case when status = 'pending' then now() else confirmed_at end,
    hold_expires_at = case when status = 'pending' then null else hold_expires_at end,
    updated_at = now()
  where id = v_booking.id;

  return jsonb_build_object('target', 'booking', 'reference', v_booking.reference, 'amount_php', v_amount);
end;
$$;

create or replace function public.staff_update_booking_status(
  p_booking_id uuid,
  p_status public.booking_status,
  p_reason text default null
)
returns public.bookings
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

  if p_status not in ('confirmed', 'cancelled', 'completed', 'no_show') then
    raise exception 'That booking status cannot be set manually.' using errcode = '22023';
  end if;

  if p_status = 'cancelled' and v_reason is null then
    raise exception 'Add a reason before cancelling a booking.' using errcode = '22023';
  end if;

  if v_reason is not null and char_length(v_reason) > 500 then
    raise exception 'Keep the cancellation reason under 500 characters.' using errcode = '22023';
  end if;

  select * into v_booking
  from public.bookings
  where id = p_booking_id
  for update;

  if not found then
    raise exception 'Booking not found.' using errcode = '22023';
  end if;

  if v_booking.group_id is not null then
    raise exception 'Manage this booking from its reservation group.' using errcode = '22023';
  end if;

  if v_booking.status in ('cancelled', 'completed') and p_status = 'confirmed' then
    raise exception 'This booking cannot be reopened from the dashboard.' using errcode = '22023';
  end if;

  update public.bookings
  set
    status = p_status,
    cancelled_at = case when p_status = 'cancelled' then now() else cancelled_at end,
    cancellation_reason = case when p_status = 'cancelled' then v_reason else cancellation_reason end,
    confirmed_at = case
      when p_status = 'confirmed' and confirmed_at is null then now()
      else confirmed_at
    end,
    hold_expires_at = case when p_status in ('confirmed', 'cancelled') then null else hold_expires_at end,
    updated_at = now()
  where id = v_booking.id
  returning * into v_booking;

  if p_status = 'cancelled' then
    update public.court_reservations
    set status = 'released', updated_at = now()
    where booking_id = v_booking.id
      and status = 'active';
  end if;

  return v_booking;
end;
$$;

create or replace function public.staff_update_group_status(
  p_group_id uuid,
  p_status public.booking_status,
  p_reason text default null
)
returns public.booking_groups
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_group public.booking_groups%rowtype;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if not public.is_staff() then
    raise exception 'Staff access is required.' using errcode = '42501';
  end if;

  if p_status not in ('confirmed', 'cancelled', 'completed', 'no_show') then
    raise exception 'That reservation status cannot be set manually.' using errcode = '22023';
  end if;

  if p_status = 'cancelled' and v_reason is null then
    raise exception 'Add a reason before cancelling a reservation.' using errcode = '22023';
  end if;

  if v_reason is not null and char_length(v_reason) > 500 then
    raise exception 'Keep the cancellation reason under 500 characters.' using errcode = '22023';
  end if;

  select * into v_group
  from public.booking_groups
  where id = p_group_id
  for update;

  if not found then
    raise exception 'Reservation not found.' using errcode = '22023';
  end if;

  if v_group.status in ('cancelled', 'completed') and p_status = 'confirmed' then
    raise exception 'This reservation cannot be reopened from the dashboard.' using errcode = '22023';
  end if;

  update public.booking_groups
  set
    status = p_status,
    cancelled_at = case when p_status = 'cancelled' then now() else cancelled_at end,
    cancellation_reason = case when p_status = 'cancelled' then v_reason else cancellation_reason end,
    confirmed_at = case
      when p_status = 'confirmed' and confirmed_at is null then now()
      else confirmed_at
    end,
    hold_expires_at = case when p_status in ('confirmed', 'cancelled') then null else hold_expires_at end,
    updated_at = now()
  where id = v_group.id
  returning * into v_group;

  update public.bookings
  set
    status = p_status,
    cancelled_at = case when p_status = 'cancelled' then now() else cancelled_at end,
    cancellation_reason = case when p_status = 'cancelled' then v_reason else cancellation_reason end,
    confirmed_at = case
      when p_status = 'confirmed' and confirmed_at is null then now()
      else confirmed_at
    end,
    hold_expires_at = case when p_status in ('confirmed', 'cancelled') then null else hold_expires_at end,
    updated_at = now()
  where group_id = v_group.id
    and status not in ('cancelled', 'completed', 'no_show');

  if p_status = 'cancelled' then
    update public.court_reservations r
    set status = 'released', updated_at = now()
    from public.bookings b
    where r.booking_id = b.id
      and b.group_id = v_group.id
      and r.status = 'active';
  end if;

  return v_group;
end;
$$;

create or replace function public.staff_cancel_open_play_session(
  p_session_id uuid,
  p_reason text
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_session public.open_play_sessions%rowtype;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_count integer := 0;
begin
  if not public.is_staff() then
    raise exception 'Staff access is required.' using errcode = '42501';
  end if;

  if v_reason is null then
    raise exception 'Add a reason before cancelling a session.' using errcode = '22023';
  end if;

  select * into v_session
  from public.open_play_sessions
  where id = p_session_id
  for update;

  if not found then
    raise exception 'Session not found.' using errcode = '22023';
  end if;

  if v_session.status = 'cancelled' then
    raise exception 'This session is already cancelled.' using errcode = '22023';
  end if;

  update public.open_play_sessions
  set status = 'cancelled', updated_at = now()
  where id = v_session.id;

  with cancelled as (
    update public.open_play_registrations
    set status = 'cancelled', updated_at = now()
    where session_id = v_session.id
      and status = 'registered'
    returning booking_id
  )
  update public.bookings b
  set
    status = 'cancelled',
    cancelled_at = now(),
    cancellation_reason = v_reason,
    hold_expires_at = null,
    updated_at = now()
  from cancelled c
  where b.id = c.booking_id
    and b.status <> 'cancelled';

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.staff_update_open_play_registration(
  p_registration_id uuid,
  p_status public.open_play_registration_status
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_registration public.open_play_registrations%rowtype;
  v_session public.open_play_sessions%rowtype;
  v_booking public.bookings%rowtype;
begin
  if not public.is_staff() then
    raise exception 'Staff access is required.' using errcode = '42501';
  end if;

  select * into v_registration
  from public.open_play_registrations
  where id = p_registration_id
  for update;

  if not found then
    raise exception 'Registration not found.' using errcode = '22023';
  end if;

  select * into v_session
  from public.open_play_sessions
  where id = v_registration.session_id;

  if p_status = 'registered' and v_session.status <> 'scheduled' then
    raise exception 'This session is not open for registration.' using errcode = '22023';
  end if;

  update public.open_play_registrations
  set status = p_status, updated_at = now()
  where id = v_registration.id
  returning * into v_registration;

  select * into v_booking
  from public.bookings
  where id = v_registration.booking_id
  for update;

  update public.bookings
  set
    status = case p_status
      when 'cancelled' then 'cancelled'::public.booking_status
      when 'attended' then 'completed'::public.booking_status
      when 'no_show' then 'no_show'::public.booking_status
      else 'confirmed'::public.booking_status
    end,
    cancelled_at = case when p_status = 'cancelled' then now() else cancelled_at end,
    cancellation_reason = case when p_status = 'cancelled' then 'Open-play registration cancelled by staff' else cancellation_reason end,
    updated_at = now()
  where id = v_booking.id;

  return jsonb_build_object(
    'reference', v_booking.reference,
    'status', p_status
  );
end;
$$;

create or replace function public.staff_create_walk_in_booking(
  p_player_id uuid,
  p_court_id uuid,
  p_starts_at timestamptz,
  p_duration_minutes integer,
  p_collected boolean default false,
  p_method public.payment_method default 'cash',
  p_reference text default null,
  p_notes text default null
)
returns public.bookings
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_booking public.bookings%rowtype;
  v_notes text := nullif(btrim(coalesce(p_notes, '')), '');
begin
  if not public.is_staff() then
    raise exception 'Staff access is required.' using errcode = '42501';
  end if;

  if v_notes is not null and char_length(v_notes) > 500 then
    raise exception 'Keep the booking note under 500 characters.' using errcode = '22023';
  end if;

  v_booking := public.create_court_booking(
    p_court_id,
    p_starts_at,
    p_duration_minutes,
    p_player_id
  );

  update public.bookings
  set
    status = 'confirmed',
    confirmed_at = now(),
    hold_expires_at = null,
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

revoke all on function public.staff_review_payment(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.staff_review_payment(uuid, text, text)
  to authenticated;

revoke all on function public.staff_record_payment(uuid, uuid, public.payment_method, text)
  from public, anon, authenticated;
grant execute on function public.staff_record_payment(uuid, uuid, public.payment_method, text)
  to authenticated;

revoke all on function public.staff_update_booking_status(uuid, public.booking_status, text)
  from public, anon, authenticated;
grant execute on function public.staff_update_booking_status(uuid, public.booking_status, text)
  to authenticated;

revoke all on function public.staff_update_group_status(uuid, public.booking_status, text)
  from public, anon, authenticated;
grant execute on function public.staff_update_group_status(uuid, public.booking_status, text)
  to authenticated;

revoke all on function public.staff_cancel_open_play_session(uuid, text)
  from public, anon, authenticated;
grant execute on function public.staff_cancel_open_play_session(uuid, text)
  to authenticated;

revoke all on function public.staff_update_open_play_registration(uuid, public.open_play_registration_status)
  from public, anon, authenticated;
grant execute on function public.staff_update_open_play_registration(uuid, public.open_play_registration_status)
  to authenticated;

revoke all on function public.staff_create_walk_in_booking(uuid, uuid, timestamptz, integer, boolean, public.payment_method, text, text)
  from public, anon, authenticated;
grant execute on function public.staff_create_walk_in_booking(uuid, uuid, timestamptz, integer, boolean, public.payment_method, text, text)
  to authenticated;
