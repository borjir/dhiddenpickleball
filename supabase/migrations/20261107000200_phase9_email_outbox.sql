-- Phase 9 — transactional email outbox.
-- Email rows are written in the same request as the booking change, then
-- claimed by the server-only processor. A unique dedupe key prevents a retry
-- or a grouped-booking loop from sending the same message twice.

set search_path = public, extensions;

create table if not exists public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  event text not null check (
    event in (
      'court_booking_received',
      'open_play_reserved',
      'payment_proof_received',
      'payment_approved',
      'payment_rejected',
      'booking_cancelled',
      'open_play_updated',
      'booking_reminder',
      'staff_new_booking',
      'staff_payment_proof',
      'staff_booking_cancelled',
      'staff_session_full'
    )
  ),
  audience text not null default 'player' check (audience in ('player', 'staff')),
  booking_id uuid references public.bookings (id) on delete cascade,
  group_id uuid references public.booking_groups (id) on delete cascade,
  session_id uuid references public.open_play_sessions (id) on delete cascade,
  dedupe_key text not null unique,
  status text not null default 'queued' check (
    status in ('queued', 'sending', 'sent', 'failed', 'skipped')
  ),
  attempts integer not null default 0 check (attempts >= 0),
  available_at timestamptz not null default now(),
  last_error text,
  provider_message_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz,
  check (
    (audience = 'player' and (booking_id is not null or group_id is not null))
    or (
      audience = 'staff'
      and (booking_id is not null or group_id is not null or session_id is not null)
    )
  )
);

create index if not exists email_outbox_queue_idx
  on public.email_outbox (status, available_at, created_at);

create index if not exists email_outbox_booking_idx
  on public.email_outbox (booking_id, created_at desc);

create index if not exists email_outbox_group_idx
  on public.email_outbox (group_id, created_at desc);

drop trigger if exists email_outbox_set_updated_at on public.email_outbox;
create trigger email_outbox_set_updated_at
  before update on public.email_outbox
  for each row execute function public.set_updated_at();

alter table public.email_outbox enable row level security;
revoke all on public.email_outbox from public, anon, authenticated;

-- Enqueue one player event and, where useful, the matching internal staff
-- alert. Only the booking owner or staff can enqueue for a booking/group.
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

  -- A session edit can legitimately happen more than once; every other event
  -- is one-per-booking/group.
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

  return v_count;
end;
$$;

revoke all on function public.enqueue_booking_email_event(text, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.enqueue_booking_email_event(text, uuid, uuid)
  to authenticated;

-- Staff capacity alert. It is written by the registration trigger so it also
-- covers registrations created by staff and the last-place race.
create or replace function public.enqueue_open_play_full_event()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_capacity integer;
  v_registered integer;
begin
  if new.status not in ('registered', 'attended') then
    return new;
  end if;

  select capacity into v_capacity
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
  end if;

  return new;
end;
$$;

drop trigger if exists open_play_registration_email_event
  on public.open_play_registrations;
create trigger open_play_registration_email_event
  after insert or update of status on public.open_play_registrations
  for each row execute function public.enqueue_open_play_full_event();

-- A 24-hour reminder, one per booking/group. The processor expands a grouped
-- reminder into all ranges in the reservation.
create or replace function public.enqueue_due_booking_reminders()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count integer := 0;
begin
  insert into public.email_outbox (
    event,
    audience,
    booking_id,
    group_id,
    dedupe_key,
    available_at
  )
  select
    'booking_reminder',
    'player',
    b.id,
    b.group_id,
    'player:booking_reminder:' || coalesce(b.group_id::text, b.id::text),
    now()
  from public.bookings b
  where b.status = 'confirmed'
    and b.starts_at >= now() + interval '23 hours'
    and b.starts_at < now() + interval '25 hours'
  on conflict (dedupe_key) do nothing;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.enqueue_due_booking_reminders()
  from public, anon, authenticated;
grant execute on function public.enqueue_due_booking_reminders()
  to service_role;

-- Claim queued rows for the server-only processor. FOR UPDATE SKIP LOCKED
-- makes overlapping cron invocations safe; failed rows retry up to five times.
create or replace function public.claim_email_outbox(p_limit integer default 25)
returns setof public.email_outbox
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  return query
  update public.email_outbox e
  set
    status = 'sending',
    attempts = e.attempts + 1,
    updated_at = now()
  where e.id in (
    select o.id
    from public.email_outbox o
    where o.available_at <= now()
      and (
        o.status = 'queued'
        or (o.status = 'failed' and o.attempts < 5)
      )
    order by o.created_at
    limit greatest(1, least(coalesce(p_limit, 25), 100))
    for update skip locked
  )
  returning e.*;
end;
$$;

revoke all on function public.claim_email_outbox(integer)
  from public, anon, authenticated;
grant execute on function public.claim_email_outbox(integer)
  to service_role;

create or replace function public.complete_email_delivery(
  p_id uuid,
  p_status text,
  p_provider_message_id text default null,
  p_error text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_status not in ('sent', 'failed', 'skipped') then
    raise exception 'That delivery status is not supported.' using errcode = '22023';
  end if;

  update public.email_outbox
  set
    status = case
      when p_status = 'failed' and attempts >= 5 then 'failed'::text
      when p_status = 'failed' then 'queued'::text
      else p_status
    end,
    provider_message_id = case
      when p_status = 'sent' then p_provider_message_id
      else provider_message_id
    end,
    last_error = case
      when p_status = 'sent' then null
      else left(coalesce(p_error, 'Unknown email error.'), 1000)
    end,
    sent_at = case when p_status = 'sent' then now() else sent_at end,
    available_at = case
      when p_status = 'failed' and attempts < 5 then now() + interval '15 minutes'
      else available_at
    end,
    updated_at = now()
  where id = p_id
    and status = 'sending';
end;
$$;

revoke all on function public.complete_email_delivery(uuid, text, text, text)
  from public, anon, authenticated;
grant execute on function public.complete_email_delivery(uuid, text, text, text)
  to service_role;
