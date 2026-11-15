/**
 * Temporary feature switches.
 *
 * Every open-play entry point (public header, footer, homepage hero, staff nav,
 * mobile tab bar, and staff dashboard links) is gated on this value; the
 * `/open-play` routes, database functions, and staff screens stay in place, so
 * the switch only controls whether players and staff are pointed at them.
 *
 * Enabled 15 November 2026 at the client's request. Walk-in sessions are
 * published by staff from `/staff/open-play`; the public page shows an empty
 * state until at least one session exists.
 */
export const OPEN_PLAY_ENABLED = true;
