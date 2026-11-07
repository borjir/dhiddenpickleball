-- Staff set an open-play session's end time directly instead of choosing a
-- fixed 60/90/120-minute block. duration_minutes stays the stored value because
-- registrations copy it onto their bookings and the public schedule reads it,
-- and the staff form derives it from the start and end times.
--
-- Relax the old fixed-duration check to a sanity range that still rejects
-- zero-length and absurd sessions.

alter table public.open_play_sessions
  drop constraint if exists open_play_sessions_duration_minutes_check;

alter table public.open_play_sessions
  add constraint open_play_sessions_duration_minutes_check
  check (duration_minutes between 15 and 1440);
