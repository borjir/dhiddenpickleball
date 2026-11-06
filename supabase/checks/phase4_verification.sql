-- Phase 4 verification — configuration inspection
--
-- Run in the Supabase dashboard: SQL Editor → New query → paste → Run.
-- The dashboard runs as `postgres`, so it bypasses RLS. These queries prove the
-- rules exist; they do not prove runtime behaviour for a signed-in user.
--
-- Expected results are noted next to each block. All five blocks can run at once.

-- ---------------------------------------------------------------------------
-- 1. Row-level security is on for every application table.
--    Expect relrowsecurity = true on all 11 rows.
-- ---------------------------------------------------------------------------
select c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
order by c.relname;

-- ---------------------------------------------------------------------------
-- 2. Policies.
--    Expect: public read on courts / service_rates / services /
--    court_operating_hours / club_settings; own-row select and update on
--    profiles; own-booking select on bookings; staff policies for staff actions;
--    no policy that lets a player read another player's row.
-- ---------------------------------------------------------------------------
select tablename, policyname, cmd, roles
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- ---------------------------------------------------------------------------
-- 3. Column grants on profiles.
--    Expect: NO row with grantee = 'authenticated' and privilege_type = 'UPDATE'
--    and column_name IS NULL (that would be a whole-table update grant).
--    `role` must not appear for authenticated. `id` must not either.
-- ---------------------------------------------------------------------------
select grantee, privilege_type, column_name
from information_schema.column_privileges
where table_schema = 'public'
  and table_name = 'profiles'
  and grantee in ('anon', 'authenticated')
order by grantee, privilege_type, column_name nulls first;

-- ---------------------------------------------------------------------------
-- 4. Triggers on public.profiles and auth.users.
--    Expect: prevent_profile_role_escalation and set_updated_at on profiles;
--    on_auth_user_created on auth.users (calls handle_new_user).
-- ---------------------------------------------------------------------------
select tgname, tgenabled, pg_get_triggerdef(t.oid) as definition
from pg_trigger t
where t.tgrelid in ('public.profiles'::regclass, 'auth.users'::regclass)
  and not t.tgisinternal
order by t.tgrelid::regclass::text, tgname;

-- ---------------------------------------------------------------------------
-- 5. Overlap guard on court reservations.
--    Expect one exclusion constraint named court_reservations_no_overlap,
--    using gist with court_id = and tstzrange &&.
-- ---------------------------------------------------------------------------
select conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.court_reservations'::regclass
  and contype = 'x';

-- ---------------------------------------------------------------------------
-- 6. Booking functions: security mode and execute grants.
--    Expect prosecdef = true for create_court_booking and expire_stale_holds.
--    Expect anon to have no EXECUTE on either (acl shows only postgres,
--    authenticated, service_role).
-- ---------------------------------------------------------------------------
select p.proname,
       p.prosecdef as security_definer,
       coalesce(array_to_string(p.proacl, E'\n           '), '(default)') as acl
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'create_court_booking',
    'expire_stale_holds',
    'calculate_court_amount',
    'generate_booking_reference',
    'is_staff',
    'handle_new_user',
    'prevent_profile_role_escalation'
  )
order by p.proname;

-- ---------------------------------------------------------------------------
-- 7. Payment-proofs bucket is private.
--    Expect public = false.
-- ---------------------------------------------------------------------------
select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
where id = 'payment-proofs';

-- ---------------------------------------------------------------------------
-- 8. Storage policies on storage.objects.
--    Expect owner-folder insert/select for authenticated users and staff
--    select/delete. No policy that exposes other players' proofs.
-- ---------------------------------------------------------------------------
select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
order by policyname;

-- ---------------------------------------------------------------------------
-- 9. Table privileges for anon and authenticated.
--    Expect anon: SELECT only on reference tables (courts, services,
--    service_rates, court_operating_hours, club_settings). Everything else
--    absent. Expect authenticated: SELECT/INSERT/UPDATE only where intended.
-- ---------------------------------------------------------------------------
select table_name,
       grantee,
       string_agg(privilege_type, ', ' order by privilege_type) as privileges
from information_schema.table_privileges
where table_schema = 'public'
  and grantee in ('anon', 'authenticated')
group by table_name, grantee
order by table_name, grantee;

-- ---------------------------------------------------------------------------
-- 10. Roles currently assigned. Do not paste the email column anywhere public.
--     Expect every row to be 'player' unless you promoted a staff test account.
-- ---------------------------------------------------------------------------
select role, count(*) as accounts
from public.profiles
group by role
order by role;
