/**
 * Temporary feature switches.
 *
 * Restore: set OPEN_PLAY_ENABLED back to `true` and rebuild. Every open-play
 * entry point (public header, footer, homepage hero, staff nav, mobile tab bar,
 * and staff dashboard links) is gated on this value; the `/open-play` routes,
 * database functions, and staff screens stay in place, so nothing is lost.
 *
 * Open play is hidden pending client clarification (schedule, pricing,
 * capacity, and skill levels are still unconfirmed).
 */
export const OPEN_PLAY_ENABLED = false;
