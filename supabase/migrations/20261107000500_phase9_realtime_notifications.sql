-- Phase 9 extension: in-app realtime notifications.
--
-- Email stays the off-app channel. This adds a durable in-app inbox for the
-- same booking/open-play events plus staff-driven status changes, broadcast to
-- a private per-user Realtime channel. The notifications table is the source of
-- truth; Realtime is only transport, so a disconnected tab catches up on load.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null
    references public.profiles (id) on delete cascade,
  audience text not null check (audience in ('player', 'staff')),
  event text not null,
  title text not null,
  body text,
  href text,
  booking_id uuid references public.bookings (id) on delete cascade,
  group_id uuid references public.booking_groups (id) on delete cascade,
  session_id uuid references public.open_play_sessions (id) on delete cascade,
  dedupe_key text not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (recipient_id, dedupe_key)
);

create index if not exists notifications_inbox_idx
  on public.notifications (recipient_id, created_at desc);

create index if not exists notifications_unread_idx
  on public.notifications (recipient_id)
  where read_at is null;

alter table public.notifications enable row level security;

-- Reading and marking read happen in the browser. Creation is restricted to
-- the Security Definer helpers below, so no insert/delete grant is issued.
revoke all on public.notifications from public, anon, authenticated;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own
  on public.notifications
  for select
  to authenticated
  using (recipient_id = (select auth.uid()));

drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own
  on public.notifications
  for update
  to authenticated
  using (recipient_id = (select auth.uid()))
  with check (recipient_id = (select auth.uid()));

-- Broadcast each new row to a private topic named for its recipient. The
-- exception block keeps a Realtime outage or an unprovisioned helper from
-- failing the booking/payment transaction that produced the notification.
create or replace function public.broadcast_notification()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  begin
    perform realtime.send(
      payload => jsonb_build_object(
        'id', new.id,
        'event', new.event,
        'title', new.title,
        'body', new.body,
        'href', new.href,
        'created_at', new.created_at
      ),
      event => 'notification',
      topic => 'notifications:' || new.recipient_id::text,
      private => true
    );
  exception
    when others then
      raise warning 'Realtime broadcast skipped for notification %: %',
        new.id, sqlerrm;
  end;

  return new;
end;
$$;

drop trigger if exists notifications_broadcast on public.notifications;
create trigger notifications_broadcast
  after insert on public.notifications
  for each row execute function public.broadcast_notification();

-- Clients may join only their own private notification topic. Realtime already
-- enables RLS on realtime.messages; do not issue ALTER TABLE there from a
-- migration (the migration role does not own the table).
drop policy if exists notifications_channel_read on realtime.messages;
create policy notifications_channel_read
  on realtime.messages
  for select
  to authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and realtime.topic() = 'notifications:' || (select auth.uid())::text
  );

-- Internal writer. Called only by Security Definer functions, so no execute
-- grant is given to application roles.
create or replace function public.insert_notification(
  p_recipient_id uuid,
  p_audience text,
  p_event text,
  p_title text,
  p_body text,
  p_href text,
  p_booking_id uuid,
  p_group_id uuid,
  p_session_id uuid,
  p_dedupe_key text
)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
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
  values (
    p_recipient_id,
    p_audience,
    p_event,
    p_title,
    p_body,
    p_href,
    p_booking_id,
    p_group_id,
    p_session_id,
    p_dedupe_key
  )
  on conflict (recipient_id, dedupe_key) do nothing;
$$;

revoke all on function public.insert_notification(
  uuid, text, text, text, text, text, uuid, uuid, uuid, text
) from public, anon, authenticated;

-- Build the player and staff inbox rows for one booking/group event. The same
-- dedupe keys as the email outbox are reused so a retried action cannot create
-- duplicate notifications.
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
  v_dedupe text;
  v_player_id uuid;
  v_player_name text;
  v_reference text;
  v_payment_status text;
  v_cancel_reason text;
  v_rejection_reason text;
  v_starts_at timestamptz;
  v_place text;
  v_is_open_play boolean := false;
  v_when text;
  v_href text;
  v_title text;
  v_body text;
  v_staff_title text;
  v_staff_body text;
  v_staff_href text;
  v_count integer := 0;
begin
  if (p_booking_id is null) = (p_group_id is null) then
    return 0;
  end if;

  if p_group_id is not null then
    select
      g.player_id,
      pr.full_name,
      g.reference,
      g.payment_status::text,
      g.cancellation_reason
      into
      v_player_id,
      v_player_name,
      v_reference,
      v_payment_status,
      v_cancel_reason
    from public.booking_groups g
    join public.profiles pr on pr.id = g.player_id
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

    v_href := '/account/bookings/group/' || v_reference;
  else
    select
      b.player_id,
      pr.full_name,
      b.reference,
      b.payment_status::text,
      b.cancellation_reason,
      b.starts_at,
      s.code = 'open_play'
      into
      v_player_id,
      v_player_name,
      v_reference,
      v_payment_status,
      v_cancel_reason,
      v_starts_at,
      v_is_open_play
    from public.bookings b
    join public.profiles pr on pr.id = b.player_id
    join public.services s on s.id = b.service_id
    where b.id = p_booking_id;

    if v_is_open_play then
      v_place := 'Open play';
    else
      select c.name
        into v_place
      from public.court_reservations cr
      join public.courts c on c.id = cr.court_id
      where cr.booking_id = p_booking_id;
      v_place := coalesce(v_place, 'Court');
    end if;

    v_href := '/account/bookings/' || v_reference;
  end if;

  if v_player_id is null then
    return 0;
  end if;

  v_target := coalesce(p_group_id, p_booking_id)::text;
  v_when := coalesce(
    to_char(
      v_starts_at at time zone 'Asia/Manila',
      'Dy, Mon FMDD "at" FMHH12:MI AM'
    ),
    'the scheduled time'
  );

  if p_event = 'payment_rejected' then
    select p.rejection_reason
      into v_rejection_reason
    from public.payments p
    where (
      (p_group_id is not null and p.group_id = p_group_id)
      or (p_group_id is null and p.booking_id = p_booking_id)
    )
      and p.rejection_reason is not null
    order by p.created_at desc
    limit 1;
  end if;

  v_dedupe := 'player:' || p_event || ':' || v_target;

  -- These can legitimately repeat for the same target.
  if p_event in ('open_play_updated', 'payment_rejected') then
    v_dedupe := v_dedupe || ':' ||
      to_char(clock_timestamp(), 'YYYYMMDDHH24MISSUS');
  end if;

  case p_event
    when 'court_booking_received' then
      v_title := 'Booking received';
      if v_payment_status = 'paid' then
        v_body := 'Booking ' || v_reference || ' for ' || v_when ||
          ' is marked paid.';
      else
        v_body := 'We are holding ' || v_reference || ' for ' || v_when ||
          '. Send your GCash proof from your account to confirm it.';
      end if;
    when 'open_play_reserved' then
      v_title := 'Open-play place reserved';
      v_body := 'You are in for ' || v_when ||
        '. Submit your GCash proof from your account to keep your place.';
    when 'payment_proof_received' then
      v_title := 'Payment proof received';
      v_body := 'Staff will check the actual transfer for ' || v_reference ||
        ' before marking it paid.';
    when 'payment_approved' then
      v_title := 'Payment verified';
      v_body := v_reference || ' is marked paid. See you at the club.';
    when 'payment_rejected' then
      v_title := 'Payment proof rejected';
      v_body := 'Submit a new proof for ' || v_reference || '.' ||
        coalesce(' Reason: ' || v_rejection_reason, '');
    when 'booking_cancelled' then
      v_title := 'Booking cancelled';
      v_body := v_reference || ' was cancelled.' ||
        coalesce(' Reason: ' || v_cancel_reason, '');
    when 'open_play_updated' then
      v_title := 'Open-play details changed';
      v_body := 'The session for ' || v_reference ||
        ' changed. Check the new time before you play.';
    when 'booking_confirmed' then
      v_title := 'Booking confirmed';
      v_body := v_reference || ' is confirmed for ' || v_when || '.';
    when 'booking_completed' then
      v_title := 'Booking completed';
      v_body := 'Thanks for playing. ' || v_reference ||
        ' is marked completed.';
    when 'booking_no_show' then
      v_title := 'No-show recorded';
      v_body := v_reference || ' was recorded as a no-show.';
    when 'attendance_confirmed' then
      v_title := 'Checked in';
      v_body := 'You are checked in for ' || v_when || '.';
    when 'attendance_no_show' then
      v_title := 'No-show recorded';
      v_body := 'You were marked as a no-show for ' || v_when || '.';
    else
      v_title := null;
  end case;

  case p_event
    when 'court_booking_received' then
      v_staff_title := 'New booking ' || v_reference;
      v_staff_body := v_player_name || ' · ' || coalesce(v_place, 'Court') ||
        ' · ' || v_when;
      v_staff_href := '/staff/bookings/' || v_reference;
    when 'open_play_reserved' then
      v_staff_title := 'New open-play registration';
      v_staff_body := v_player_name || ' · ' || v_when;
      v_staff_href := '/staff/open-play';
    when 'payment_proof_received' then
      v_staff_title := 'Payment proof waiting';
      v_staff_body := v_reference || ' · ' || coalesce(v_player_name, 'Player');
      v_staff_href := '/staff/payments';
    when 'booking_cancelled' then
      v_staff_title := 'Booking cancelled';
      v_staff_body := v_reference || ' · ' ||
        coalesce(v_player_name, 'Player') ||
        coalesce(' · ' || v_cancel_reason, '');
      v_staff_href := '/staff/bookings/' || v_reference;
    else
      v_staff_title := null;
  end case;

  if v_title is not null then
    perform public.insert_notification(
      v_player_id,
      'player',
      p_event,
      v_title,
      v_body,
      v_href,
      p_booking_id,
      p_group_id,
      null,
      v_dedupe
    );
    v_count := v_count + 1;
  end if;

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

revoke all on function public.queue_notifications(text, uuid, uuid)
  from public, anon, authenticated;

-- Email enqueueing already runs after every booking/payment/open-play change,
-- so it is the single seam that keeps email and in-app notifications aligned.
create or replace function public.enqueue_booking_email_event(
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
  v_dedupe text;
  v_staff_event text;
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
    if not exists (
      select 1
      from public.booking_groups g
      where g.id = p_group_id
        and (g.player_id = v_actor or public.is_staff())
    ) then
      raise exception 'Reservation not found.' using errcode = '22023';
    end if;

    v_target := p_group_id::text;
    v_dedupe := 'player:' || p_event || ':' || v_target;
  else
    if not exists (
      select 1
      from public.bookings b
      where b.id = p_booking_id
        and (b.player_id = v_actor or public.is_staff())
    ) then
      raise exception 'Booking not found.' using errcode = '22023';
    end if;

    v_target := p_booking_id::text;
    v_dedupe := 'player:' || p_event || ':' || v_target;
  end if;

  if p_event = 'open_play_updated' then
    v_dedupe := v_dedupe || ':' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISSUS');
  end if;

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

-- Staff-driven status and attendance changes that have no email event still
-- belong in the player's inbox.
create or replace function public.notify_booking_update(
  p_event text,
  p_booking_id uuid default null,
  p_group_id uuid default null
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_staff() then
    raise exception 'Staff access is required.' using errcode = '42501';
  end if;

  if p_event not in (
    'booking_confirmed',
    'booking_completed',
    'booking_no_show',
    'attendance_confirmed',
    'attendance_no_show'
  ) then
    raise exception 'That notification event is not supported.'
      using errcode = '22023';
  end if;

  if (p_booking_id is null) = (p_group_id is null) then
    raise exception 'Choose one booking or reservation group.'
      using errcode = '22023';
  end if;

  return public.queue_notifications(p_event, p_booking_id, p_group_id);
end;
$$;

revoke all on function public.notify_booking_update(text, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.notify_booking_update(text, uuid, uuid)
  to authenticated;

-- Open-play capacity alert, now also in the staff inbox. The trigger fires for
-- staff-created walk-ins too; the dedupe key keeps it to one alert per session.
create or replace function public.enqueue_open_play_full_event()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_capacity integer;
  v_registered integer;
  v_level text;
  v_starts_at timestamptz;
  v_when text;
begin
  if new.status not in ('registered', 'attended') then
    return new;
  end if;

  select capacity, skill_level::text, starts_at
    into v_capacity, v_level, v_starts_at
  from public.open_play_sessions
  where id = new.session_id;

  if v_capacity is null then
    return new;
  end if;

  select count(*)::integer into v_registered
  from public.open_play_registrations
  where session_id = new.session_id
    and status in ('registered', 'attended');

  if v_registered >= v_capacity then
    insert into public.email_outbox (
      event,
      audience,
      session_id,
      dedupe_key
    )
    values (
      'staff_session_full',
      'staff',
      new.session_id,
      'staff:session-full:' || new.session_id::text
    )
    on conflict (dedupe_key) do nothing;

    v_when := coalesce(
      to_char(
        v_starts_at at time zone 'Asia/Manila',
        'Dy, Mon FMDD "at" FMHH12:MI AM'
      ),
      'the scheduled time'
    );

    insert into public.notifications (
      recipient_id,
      audience,
      event,
      title,
      body,
      href,
      session_id,
      dedupe_key
    )
    select
      pr.id,
      'staff',
      'staff_session_full',
      'Open-play session full',
      initcap(v_level) || ' · ' || v_when || ' · ' ||
        v_registered || '/' || v_capacity,
      '/staff/open-play/' || new.session_id::text,
      new.session_id,
      'staff:session-full:' || new.session_id::text
    from public.profiles pr
    where pr.role = 'staff'
      and (auth.uid() is null or pr.id <> auth.uid())
    on conflict (recipient_id, dedupe_key) do nothing;
  end if;

  return new;
end;
$$;
