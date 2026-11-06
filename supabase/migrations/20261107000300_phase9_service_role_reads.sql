-- Phase 9 — service-role reads for the email processor.
-- Tables created by the postgres role did not inherit Supabase's service_role
-- grants. The cron endpoint could claim outbox rows, but loading a booking with
-- the admin client failed with "permission denied for table booking_groups",
-- so every message was marked skipped.
--
-- service_role is server-only and bypasses RLS; it still needs table privileges.
-- Grant only the reads the email processor (and outbox diagnostics) use.

grant usage on schema public to service_role;

grant select on
  public.booking_groups,
  public.bookings,
  public.profiles,
  public.payments,
  public.courts,
  public.court_reservations,
  public.services,
  public.open_play_sessions,
  public.open_play_registrations,
  public.email_outbox
to service_role;
