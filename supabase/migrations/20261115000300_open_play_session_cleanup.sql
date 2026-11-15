-- One-time cleanup requested by the owner on 15 November 2026: remove the
-- generated weekly open-play schedule (three sessions every Saturday through
-- October 2027) and leave exactly one session for next week.
--
-- Kept: Saturday 21 November 2026, beginner session, 8:00–10:00 AM Asia/Manila.
-- It already has a registered player, so its booking and registration stay.
--
-- Sessions are referenced by registrations with ON DELETE RESTRICT, so the
-- registrations' bookings are deleted first (payments and registrations cascade
-- from the booking). A local JSON backup of the deleted rows is at
-- .tmp-ui/open-play-delete-2026-11-15T08-5*.json on the machine that ran it.
--
-- `created_at < now()` keeps this safe to replay: migrations do not re-run, and
-- a reset database has no sessions at all. Anything staff create afterwards is
-- later than this timestamp and is never removed by this migration.
do $$
declare
  v_keep uuid := '1e0bd3f5-f39a-4401-82d6-92fb822dd519';
begin
  if not exists (
    select 1 from public.open_play_sessions where id = v_keep
  ) then
    raise notice 'Kept open-play session is missing; cleanup skipped.';
    return;
  end if;

  delete from public.bookings b
  using public.open_play_registrations r
  join public.open_play_sessions s on s.id = r.session_id
  where r.booking_id = b.id
    and s.id <> v_keep
    and s.created_at < now();

  delete from public.open_play_sessions
  where id <> v_keep
    and created_at < now();
end;
$$;
