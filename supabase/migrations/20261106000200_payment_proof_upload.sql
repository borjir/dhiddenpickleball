-- Payment proof upload — private storage record and owner-only submission.
-- This is an early slice of the manual QR verification flow. Staff review,
-- rejection reasons, and the verification queue remain separate work.

set search_path = public, extensions;

create or replace function public.submit_payment_proof(
  p_booking_id uuid,
  p_proof_path text,
  p_transaction_reference text default null
)
returns public.payments
language plpgsql
security definer
set search_path = public, storage, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_booking public.bookings%rowtype;
  v_payment public.payments%rowtype;
  v_reference text := nullif(btrim(coalesce(p_transaction_reference, '')), '');
  v_object_size bigint;
  v_object_type text;
begin
  if v_uid is null then
    raise exception 'Sign in to submit payment proof.' using errcode = '42501';
  end if;

  if p_booking_id is null or p_proof_path is null then
    raise exception 'Booking and proof file are required.' using errcode = '22023';
  end if;

  -- The object must live in this player's folder for this exact booking.
  if p_proof_path !~ (
    '^' || v_uid::text || '/' || p_booking_id::text || '/[A-Za-z0-9._-]+$'
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
  into v_booking
  from public.bookings
  where id = p_booking_id
    and player_id = v_uid
  for update;

  if not found then
    raise exception 'Booking not found.' using errcode = '22023';
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
    'image/heif'
  ) then
    raise exception 'Use a JPEG, PNG, WebP, HEIC, or HEIF image.'
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
    v_reference,
    p_proof_path,
    now()
  )
  returning * into v_payment;

  -- Submitting proof before the hold ends keeps the slot, but it does not
  -- verify the transfer. Only staff review can move payment_status to paid.
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

revoke all on function public.submit_payment_proof(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.submit_payment_proof(uuid, text, text)
  to authenticated;

-- A failed registration can leave an unreferenced upload. Let the owner clean
-- up only files inside their own folder; staff retain their separate delete
-- policy from Phase 4.
drop policy if exists "payment_proofs_owner_delete" on storage.objects;
create policy "payment_proofs_owner_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'payment-proofs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
