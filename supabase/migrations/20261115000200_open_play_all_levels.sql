-- Owner request, 15 November 2026: open play should be bookable by any player,
-- not only beginner/intermediate/advanced sessions. `all_levels` joins the enum
-- so staff can publish a session that every level may join.
alter type public.open_play_skill_level add value if not exists 'all_levels';
