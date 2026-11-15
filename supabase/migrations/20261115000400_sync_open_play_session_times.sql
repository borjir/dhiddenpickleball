-- Keep registered guests' booking rows in step with the open-play session.
-- The guest status lookup reads bookings.starts_at / ends_at, so editing a
-- session's date or time on the staff screen must also move the linked rows.

create or replace function public.sync_open_play_session_times_to_bookings()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.starts_at is distinct from old.starts_at
     or new.duration_minutes is distinct from old.duration_minutes then
    update public.bookings b
       set starts_at = new.starts_at,
           ends_at = new.starts_at + make_interval(mins => new.duration_minutes),
           duration_minutes = new.duration_minutes
      from public.open_play_registrations r
     where r.booking_id = b.id
       and r.session_id = new.id
       and r.status in ('registered', 'attended');
  end if;

  return new;
end;
$$;

drop trigger if exists sync_open_play_session_times on public.open_play_sessions;

create trigger sync_open_play_session_times
after update of starts_at, duration_minutes on public.open_play_sessions
for each row execute function public.sync_open_play_session_times_to_bookings();
