-- Phase 4 — core reference data, profiles, and settings.
-- Confirmed business facts only. Unknown rules (weekend rate, rounding, buffer,
-- booking window, closures) stay nullable or unseeded.

set search_path = public, extensions;

create extension if not exists btree_gist with schema extensions;

do $$
begin
  create type public.user_role as enum ('player', 'staff');
exception
  when duplicate_object then null;
end
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  phone text,
  role public.user_role not null default 'player',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles (role);
create index if not exists profiles_email_idx on public.profiles (lower(email));

create table if not exists public.club_settings (
  id smallint primary key default 1 check (id = 1),
  club_name text not null default 'D-Hidden Pickleball Court & Bistro',
  timezone_name text not null default 'Asia/Manila',
  currency text not null default 'PHP',
  hold_minutes integer not null default 15 check (hold_minutes > 0),
  payment_deadline_minutes integer not null default 15 check (payment_deadline_minutes > 0),
  cancellation_cutoff_hours integer not null default 24 check (cancellation_cutoff_hours >= 0),
  booking_window_days integer check (booking_window_days is null or booking_window_days > 0),
  buffer_minutes integer check (buffer_minutes is null or buffer_minutes >= 0),
  max_players_per_court integer check (max_players_per_court is null or max_players_per_court > 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.courts (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.court_operating_hours (
  id uuid primary key default gen_random_uuid(),
  court_id uuid not null references public.courts (id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  opens_at_minute smallint not null check (opens_at_minute between 0 and 1440),
  closes_at_minute smallint not null check (closes_at_minute between 0 and 1440),
  is_closed boolean not null default false,
  unique (court_id, day_of_week),
  check (is_closed or opens_at_minute < closes_at_minute)
);

create table if not exists public.court_closures (
  id uuid primary key default gen_random_uuid(),
  court_id uuid references public.courts (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index if not exists court_closures_time_idx
  on public.court_closures using gist (tstzrange(starts_at, ends_at, '[)'));

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.service_rates (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services (id) on delete cascade,
  court_id uuid references public.courts (id) on delete cascade,
  day_of_week smallint check (day_of_week is null or day_of_week between 0 and 6),
  starts_at_minute smallint not null check (starts_at_minute between 0 and 1440),
  ends_at_minute smallint not null check (ends_at_minute between 0 and 1440),
  amount_php numeric(10, 2) not null check (amount_php >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  check (starts_at_minute < ends_at_minute)
);

create unique index if not exists service_rates_window_key
  on public.service_rates (
    service_id,
    coalesce(court_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(day_of_week, -1),
    starts_at_minute,
    ends_at_minute
  );

create index if not exists service_rates_service_idx
  on public.service_rates (service_id, is_active);

-- Keep updated_at honest on every mutable reference table.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger club_settings_set_updated_at
  before update on public.club_settings
  for each row execute function public.set_updated_at();

create trigger courts_set_updated_at
  before update on public.courts
  for each row execute function public.set_updated_at();

create trigger services_set_updated_at
  before update on public.services
  for each row execute function public.set_updated_at();

-- Profile rows are created by Auth, never by the browser.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, email, full_name, phone)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'phone'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.handle_user_email_update()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.profiles
  set email = new.email
  where id = new.id;

  return new;
end;
$$;

drop trigger if exists on_auth_user_email_updated on auth.users;
create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row execute function public.handle_user_email_update();

-- Backfill any users created before this migration existed.
insert into public.profiles (id, email, full_name, phone)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name'),
  u.raw_user_meta_data ->> 'phone'
from auth.users u
on conflict (id) do nothing;

-- Role changes are a club operation. Ordinary sessions cannot promote
-- themselves, and staff cannot promote each other through the Data API.
create or replace function public.prevent_profile_role_escalation()
returns trigger
language plpgsql
as $$
begin
  if new.role is distinct from old.role and auth.uid() is not null then
    raise exception 'Role changes are managed by the club.'
      using errcode = '42501';
  end if;

  if new.id is distinct from old.id then
    raise exception 'A profile id cannot be changed.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger profiles_prevent_role_escalation
  before update on public.profiles
  for each row execute function public.prevent_profile_role_escalation();

-- Used by RLS policies and staff-only functions. SECURITY DEFINER prevents
-- recursive policy evaluation on profiles.
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'staff'
  );
$$;

revoke all on function public.is_staff() from public, anon;
grant execute on function public.is_staff() to authenticated, service_role;

-- Confirmed settings only. Unknown values remain null.
insert into public.club_settings (id)
values (1)
on conflict (id) do nothing;

insert into public.courts (id, name, slug, sort_order)
values
  ('00000000-0000-4000-8000-000000000001', 'Court 1', 'court-1', 1),
  ('00000000-0000-4000-8000-000000000002', 'Court 2', 'court-2', 2)
on conflict (id) do nothing;

insert into public.court_operating_hours (
  court_id,
  day_of_week,
  opens_at_minute,
  closes_at_minute
)
select
  c.id,
  d.day::smallint,
  420,
  1440
from public.courts c
cross join generate_series(0, 6) as d(day)
on conflict (court_id, day_of_week) do nothing;

insert into public.services (id, code, name, description)
values
  ('00000000-0000-4000-8000-000000000010', 'court_rental', 'Court rental', 'Per-court reservation.'),
  ('00000000-0000-4000-8000-000000000011', 'open_play', 'Open play', 'Normal open-play session.')
on conflict (id) do nothing;

-- Generic hourly windows. Weekend rates, court-specific overrides, and
-- partial-hour rounding are not encoded because the client has not confirmed
-- them. The booking function currently uses these two windows only.
insert into public.service_rates (
  id,
  service_id,
  court_id,
  day_of_week,
  starts_at_minute,
  ends_at_minute,
  amount_php
)
values
  ('00000000-0000-4000-8000-000000000020', '00000000-0000-4000-8000-000000000010', null, null, 420, 1020, 250.00),
  ('00000000-0000-4000-8000-000000000021', '00000000-0000-4000-8000-000000000010', null, null, 1020, 1440, 300.00)
on conflict (id) do nothing;
