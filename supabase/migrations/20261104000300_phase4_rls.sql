-- Phase 4 — row-level security, grants, and private payment-proof storage.
-- The browser may read confirmed reference data; it never writes bookings or
-- payment status directly. Trusted operations go through the SQL functions.

set search_path = public, extensions;

alter table public.profiles enable row level security;
alter table public.club_settings enable row level security;
alter table public.courts enable row level security;
alter table public.court_operating_hours enable row level security;
alter table public.court_closures enable row level security;
alter table public.services enable row level security;
alter table public.service_rates enable row level security;
alter table public.bookings enable row level security;
alter table public.court_reservations enable row level security;
alter table public.payments enable row level security;
alter table public.audit_logs enable row level security;

revoke all on
  public.profiles,
  public.club_settings,
  public.courts,
  public.court_operating_hours,
  public.court_closures,
  public.services,
  public.service_rates,
  public.bookings,
  public.court_reservations,
  public.payments,
  public.audit_logs
from anon, authenticated;

revoke all on sequence public.audit_logs_id_seq from anon, authenticated;

grant usage on schema public to anon, authenticated;

grant select on public.club_settings to anon, authenticated;
grant update on public.club_settings to authenticated;

grant select on public.courts to anon, authenticated;
grant insert, update, delete on public.courts to authenticated;

grant select on public.court_operating_hours to anon, authenticated;
grant insert, update, delete on public.court_operating_hours to authenticated;

grant select on public.court_closures to anon, authenticated;
grant insert, update, delete on public.court_closures to authenticated;

grant select on public.services to anon, authenticated;
grant insert, update, delete on public.services to authenticated;

grant select on public.service_rates to anon, authenticated;
grant insert, update, delete on public.service_rates to authenticated;

grant select on public.profiles to authenticated;
-- Column grants prevent a player from writing role or email even if a future
-- policy is loosened by mistake. The role trigger is the second line of defence.
grant update (full_name, phone) on public.profiles to authenticated;

grant select on public.bookings to authenticated;
grant update on public.bookings to authenticated;

grant select on public.court_reservations to authenticated;
grant update on public.court_reservations to authenticated;

grant select on public.payments to authenticated;
grant update on public.payments to authenticated;

grant select on public.audit_logs to authenticated;

-- Profiles -----------------------------------------------------------------
create policy "profiles_select_own_or_staff"
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.is_staff());

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Reference data -----------------------------------------------------------
create policy "club_settings_public_read"
  on public.club_settings for select
  to anon, authenticated
  using (true);

create policy "club_settings_staff_update"
  on public.club_settings for update
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

create policy "courts_public_read"
  on public.courts for select
  to anon
  using (is_active);

create policy "courts_authenticated_read"
  on public.courts for select
  to authenticated
  using (is_active or public.is_staff());

create policy "courts_staff_write"
  on public.courts for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

create policy "court_hours_public_read"
  on public.court_operating_hours for select
  to anon, authenticated
  using (true);

create policy "court_hours_staff_write"
  on public.court_operating_hours for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

create policy "court_closures_public_read"
  on public.court_closures for select
  to anon, authenticated
  using (true);

create policy "court_closures_staff_write"
  on public.court_closures for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

create policy "services_public_read"
  on public.services for select
  to anon
  using (is_active);

create policy "services_authenticated_read"
  on public.services for select
  to authenticated
  using (is_active or public.is_staff());

create policy "services_staff_write"
  on public.services for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

create policy "service_rates_public_read"
  on public.service_rates for select
  to anon
  using (is_active);

create policy "service_rates_authenticated_read"
  on public.service_rates for select
  to authenticated
  using (is_active or public.is_staff());

create policy "service_rates_staff_write"
  on public.service_rates for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- Bookings -----------------------------------------------------------------
create policy "bookings_select_own_or_staff"
  on public.bookings for select
  to authenticated
  using (player_id = auth.uid() or public.is_staff());

create policy "bookings_staff_update"
  on public.bookings for update
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

create policy "court_reservations_select_own_or_staff"
  on public.court_reservations for select
  to authenticated
  using (
    exists (
      select 1
      from public.bookings b
      where b.id = booking_id
        and (b.player_id = auth.uid() or public.is_staff())
    )
  );

create policy "court_reservations_staff_update"
  on public.court_reservations for update
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

create policy "payments_select_own_or_staff"
  on public.payments for select
  to authenticated
  using (
    exists (
      select 1
      from public.bookings b
      where b.id = booking_id
        and (b.player_id = auth.uid() or public.is_staff())
    )
  );

create policy "payments_staff_update"
  on public.payments for update
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- Audit history is read-only to staff; triggers write it as the definer.
create policy "audit_logs_staff_read"
  on public.audit_logs for select
  to authenticated
  using (public.is_staff());

-- Private payment proofs ---------------------------------------------------
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'payment-proofs',
  'payment-proofs',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "payment_proofs_owner_read" on storage.objects;
create policy "payment_proofs_owner_read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'payment-proofs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "payment_proofs_owner_insert" on storage.objects;
create policy "payment_proofs_owner_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'payment-proofs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "payment_proofs_staff_read" on storage.objects;
create policy "payment_proofs_staff_read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'payment-proofs'
    and public.is_staff()
  );

drop policy if exists "payment_proofs_staff_delete" on storage.objects;
create policy "payment_proofs_staff_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'payment-proofs'
    and public.is_staff()
  );

-- Function grants ----------------------------------------------------------
revoke all on function public.create_court_booking(uuid, timestamptz, integer, uuid)
  from public, anon, authenticated;
grant execute on function public.create_court_booking(uuid, timestamptz, integer, uuid)
  to authenticated;

revoke all on function public.expire_stale_holds()
  from public, anon, authenticated;
grant execute on function public.expire_stale_holds()
  to authenticated;

revoke all on function public.calculate_court_amount(timestamptz, integer, uuid)
  from public, anon, authenticated;

revoke all on function public.generate_booking_reference()
  from public, anon, authenticated;

revoke all on function public.audit_row_change()
  from public, anon, authenticated;

revoke all on function public.audit_profile_role_change()
  from public, anon, authenticated;

revoke all on function public.set_updated_at()
  from public, anon, authenticated;

revoke all on function public.handle_new_user()
  from public, anon, authenticated;

revoke all on function public.handle_user_email_update()
  from public, anon, authenticated;

revoke all on function public.prevent_profile_role_escalation()
  from public, anon, authenticated;
