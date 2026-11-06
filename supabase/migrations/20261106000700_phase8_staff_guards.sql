-- Phase 8 hardening — protect two operational edge cases even if a future
-- action forgets to check them in application code.

set search_path = public, extensions;

create or replace function public.prevent_expired_hold_confirmation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status = 'confirmed'
    and old.status = 'pending'
    and old.hold_expires_at is not null
    and old.hold_expires_at < now()
  then
    raise exception 'This payment hold has expired. Ask the player to book again.'
      using errcode = '22023';
  end if;

  return new;
end;
$$;

drop trigger if exists bookings_prevent_expired_confirmation on public.bookings;
create trigger bookings_prevent_expired_confirmation
  before update of status on public.bookings
  for each row execute function public.prevent_expired_hold_confirmation();

create or replace function public.enforce_open_play_capacity_on_restore()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_capacity integer;
  v_registered integer;
begin
  if new.status = 'registered' and old.status is distinct from 'registered' then
    select capacity into v_capacity
    from public.open_play_sessions
    where id = new.session_id;

    if v_capacity is null then
      raise exception 'Open-play session not found.' using errcode = '22023';
    end if;

    select count(*)::integer
    into v_registered
    from public.open_play_registrations
    where session_id = new.session_id
      and status in ('registered', 'attended')
      and id <> new.id;

    if v_registered >= v_capacity then
      raise exception 'This open-play session is already full.' using errcode = '23P01';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists open_play_registrations_capacity_guard
  on public.open_play_registrations;
create trigger open_play_registrations_capacity_guard
  before update of status on public.open_play_registrations
  for each row execute function public.enforce_open_play_capacity_on_restore();

revoke all on function public.prevent_expired_hold_confirmation()
  from public, anon, authenticated;
revoke all on function public.enforce_open_play_capacity_on_restore()
  from public, anon, authenticated;
