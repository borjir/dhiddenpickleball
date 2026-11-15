-- The payment-proof purge deletes a dead screenshot from Storage and then
-- clears `payments.proof_path`. `service_role` was granted SELECT on
-- public.payments (see 20261107000300_phase9_service_role_reads.sql) but not
-- UPDATE, so every purge run deleted the file and then failed with
-- "permission denied for table payments" (42501), leaving rows pointing at
-- objects that no longer exist.
--
-- The grant is table-level rather than column-level because the
-- `payments_set_updated_at` trigger writes `updated_at` in the same statement.
-- service_role is server-only, bypasses RLS, and already holds the definer
-- functions that move payments through their lifecycle, so this adds no
-- privilege the app could not already reach.

grant update on public.payments to service_role;
