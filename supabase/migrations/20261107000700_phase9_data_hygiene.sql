-- Data hygiene for the free-plan quotas (500 MB database, 1 GB Storage).
--
-- Bookings, payments, booking groups, and payment proofs are records the club
-- keeps, so this job never touches them. It only trims tables whose rows are
-- operational leftovers once they stop being useful:
--
--   * email_outbox  — delivered, skipped, and failed rows after 30 days
--   * notifications — read alerts after 90 days, any alert after 1 year
--   * audit_logs    — entries after 1 year
--
-- The windows are conservative and live only here, so changing a number in one
-- place changes the job. Deleting audit history beyond a year is a policy
-- decision; the published privacy copy promises a reasonable retention period,
-- not permanent storage.
--
-- Measured on 7 November 2026: the whole database was 14 MB, with audit_logs
-- (480 kB) and email_outbox (152 kB) the only tables growing per booking.

create or replace function public.run_data_hygiene()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  delete from public.email_outbox
  where status in ('sent', 'skipped', 'failed')
    and created_at < now() - interval '30 days';

  delete from public.notifications
  where (read_at is not null and created_at < now() - interval '90 days')
     or created_at < now() - interval '365 days';

  delete from public.audit_logs
  where created_at < now() - interval '365 days';
end;
$$;

revoke all on function public.run_data_hygiene()
  from public, anon, authenticated;

-- pg_cron runs the job daily at 03:15 Asia/Manila (19:15 UTC). The extension
-- is optional: if it cannot be enabled here, the warning below says how to run
-- or schedule the same function by hand, and nothing else in the migration
-- depends on it.
do $$
begin
  create extension if not exists pg_cron;

  perform cron.schedule(
    'phase9-data-hygiene',
    '15 19 * * *',
    'select public.run_data_hygiene()'
  );
exception
  when others then
    raise warning 'pg_cron scheduling skipped (%): run public.run_data_hygiene() manually or schedule it from the Supabase dashboard.', sqlerrm;
end
$$;
