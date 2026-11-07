-- Staff keep their auth accounts, and some staff also placed test or club
-- bookings before guest access. The guest migration backfilled customers from
-- player profiles only, so those records landed on the placeholder customer.
-- Give every remaining profile a customer row and re-point the placeholder
-- records to the real owner when one exists.

insert into public.customers (full_name, mobile, email, legacy_profile_id)
select
  left(
    case
      when char_length(btrim(coalesce(p.full_name, ''))) between 2 and 100
        then btrim(p.full_name)
      when char_length(btrim(split_part(coalesce(p.email, ''), '@', 1))) between 2 and 100
        then btrim(split_part(p.email, '@', 1))
      else 'Staff'
    end,
    100
  ),
  coalesce(public.normalize_mobile(p.phone), 'unknown-' || p.id::text),
  nullif(btrim(p.email), ''),
  p.id
from public.profiles p
where not exists (
  select 1 from public.customers c where c.legacy_profile_id = p.id
)
on conflict (legacy_profile_id) do nothing;

update public.bookings b
set customer_id = c.id
from public.customers c
where c.legacy_profile_id = b.player_id
  and b.customer_id in (
    select id from public.customers where mobile = 'unknown-orphan'
  );

update public.booking_groups g
set customer_id = c.id
from public.customers c
where c.legacy_profile_id = g.player_id
  and g.customer_id in (
    select id from public.customers where mobile = 'unknown-orphan'
  );

update public.open_play_registrations r
set customer_id = c.id
from public.customers c
where c.legacy_profile_id = r.player_id
  and r.customer_id in (
    select id from public.customers where mobile = 'unknown-orphan'
  );

-- Drop the placeholder only when nothing still points at it.
delete from public.customers c
where c.mobile = 'unknown-orphan'
  and not exists (select 1 from public.bookings b where b.customer_id = c.id)
  and not exists (select 1 from public.booking_groups g where g.customer_id = c.id)
  and not exists (
    select 1 from public.open_play_registrations r where r.customer_id = c.id
  );
