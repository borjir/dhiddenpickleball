-- Staff accounts are operators, not players: they cannot hold court time or an
-- open-play place. The guard sits on the bookings table so every path is
-- covered — online booking, grouped booking, open-play registration, a desk
-- walk-in, and direct RPC calls — while staff can still book on behalf of a
-- player, because that booking's player_id is the player.
--
-- Raise 22023 so the existing player and staff actions surface the message
-- instead of translating it into a session or permission error.

create or replace function public.block_staff_player_booking()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if exists (
    select 1
    from public.profiles p
    where p.id = new.player_id
      and p.role = 'staff'
  ) then
    raise exception 'Staff accounts cannot book court time or reserve open-play places. Use a player account for club play.'
      using errcode = '22023';
  end if;

  return new;
end;
$$;

revoke all on function public.block_staff_player_booking()
  from public, anon, authenticated;

drop trigger if exists bookings_staff_player_guard on public.bookings;
create trigger bookings_staff_player_guard
  before insert on public.bookings
  for each row execute function public.block_staff_player_booking();
