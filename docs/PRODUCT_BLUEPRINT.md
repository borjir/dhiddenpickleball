PICKLEBALL CLUB BOOKING WEBSITE PRODUCT BLUEPRINT, USER FLOWS, DESIGN
DIRECTION, AND DEVELOPMENT PHASES Version: 2.5 — Core Booking MVP First; Coaching and DUPR Deferred to Conditional Final Phases Purpose: A practical end-to-end implementation plan for a premium, client-ready website using manual QR-code payments without payment API integration.

OPENCODE WORKING STANDARD — ACT AS A SENIOR PRODUCT DESIGNER, UX/UI
DESIGNER, FRONTEND ENGINEER, BACKEND ENGINEER, AND QA ENGINEER

Treat this document as the product requirements and phased execution plan,
not permission to generate the entire application in one response. Work one
phase or small task at a time. Before coding a phase, inspect the existing
repository, summarize the current structure and relevant decisions, identify
missing client inputs, propose the smallest safe implementation plan, and
wait for the user's approval when the phase requires a product/design choice.
Do not overwrite working code or introduce a new library/framework without a
clear reason. Use TypeScript, preserve established project conventions, and
explain important decisions in plain language.

APPROVED SCOPE CHANGE — 8 NOVEMBER 2026
- Player self-service accounts, sign-up, sign-in, and the player account area
  are removed from the MVP at the client's request.
- Court bookings and open-play places are guest records: full name, mandatory
  Philippine mobile number, and an optional email. A booking reference plus the
  mobile number, or the booking QR code, is the access credential.
- Status lookup, QR download, and payment-proof upload work without an account.
- Supabase Auth is retained only for staff, through an unlisted `/staff-access`
  route with role checks. Staff operations, RLS, and email notifications remain.
- This change supersedes the player-account requirements in Phases 6–9; the
  rest of the v2.5 blueprint and its phase sequencing still apply.

VERSION 2.5 SCOPE GATE — MVP FIRST
- MVP priority: public club website, court reservations, normal open play,
  player accounts where required, staff operations, manual QR payment proof
  submission/review, notifications if approved, security, QA, launch, and handover.
- Coaching/appointments and DUPR-enabled open play/API work are uncertain
  requirements. Treat them as deferred, optional final phases, not MVP blockers.
- Do not build coaching-specific pages, database tables, admin tools, booking
  flows, or test cases beyond minimal extensibility unless the client explicitly
  approves the coaching phase.
- Do not build DUPR-specific pages, identity linking, match submission, API
  clients, or database structures beyond minimal extensibility unless the client
  approves the feature and official access/permissions are confirmed.
- Keep the architecture extensible where inexpensive, but avoid speculative
  implementation, fake integrations, placeholder functionality presented as
  working, or premature schema complexity.
- Before starting either conditional phase, ask for explicit client approval,
  document confirmed requirements, and verify the MVP is stable. If not approved,
  mark the feature OUT OF SCOPE / DEFERRED and proceed without it.


HIDDEN PICKLEBALL COURT & BISTRO — LOGO-BASED BRAND DIRECTION
Use the supplied club logo as the primary visual reference. The logo combines
deep navy lettering, a bright blue court, lime-green circular accents, a
yellow pickleball, black net details, and a warm off-white background. The
following HEX values are practical starting estimates sampled visually from
the supplied JPEG, not official brand-manual values. Recheck against the
highest-quality original logo before finalizing production tokens.

CORE COLOR TOKENS
- Primary navy: #123B78 — primary brand color for navigation, headings,
  important labels, footer areas, and selected/high-emphasis UI elements.
- Court blue: #1674D5 — primary action color for booking buttons, links,
  selected tabs, court-related graphics, and interactive highlights.
- Lime green: #78B51B — secondary accent for availability indicators,
  success states when appropriate, small decorative lines, and supporting
  highlights. Do not use lime for long text on a white background.
- Pickleball yellow: #F0E51C — sparing accent for small highlights, badges,
  illustrations, or brand moments. Avoid large yellow panels and yellow
  body text; check contrast before using it behind text.
- Warm off-white: #F8FAF1 — optional page background that echoes the logo.
- White: #FFFFFF — cards, forms, modals, and clean content surfaces.
- Ink/near-black: #171A1F — primary body text and strong neutral contrast.
- Muted gray: #667085 — secondary text, borders, helper text, and inactive UI.
- Soft border: #E4E8ED — dividers, input borders, and card outlines.

COLOR USAGE RULES
- Keep navy and white/off-white as the visual foundation; use court blue for
  the main call to action and lime/yellow as controlled accents.
- Do not use every logo color at full strength in every section. A practical
  starting balance is mostly neutral surfaces, navy typography/navigation,
  blue primary actions, and small lime/yellow accents.
- Use accessible contrast for text and controls. Do not place small white text
  on bright lime or yellow. Do not rely on color alone to communicate booking
  status; include readable status text and/or an icon.
- Define the palette as reusable design tokens/CSS variables or Tailwind theme
  tokens rather than hardcoding different values across components.
- Keep booking flows calm and easy to scan. Court availability, payment
  review, errors, and confirmation states must remain distinct and readable.
- Status colors must retain their semantic meaning. Brand lime may support a
  success state, but error, warning, and pending states must still be clearly
  differentiated and must not be recolored merely to match the logo.
- Use a restrained, modern sports-club look: confident typography, generous
  spacing, clear hierarchy, strong court/booking photography when approved,
  and purposeful use of the logo. Avoid excessive gradients, glass effects,
  neon accents, decorative pills, and repetitive generic card grids.
- Use the logo in its original proportions. Do not stretch, recolor, crop, or
  compress the master logo. If transparent or vector originals are available,
  prefer them for production; keep the supplied JPEG as a reference asset.
- Create and review favicon/app-icon variants separately; do not assume the
  full detailed logo will remain legible at tiny sizes.

SUGGESTED INITIAL TOKEN NAMES
--color-brand-navy: #123B78;
--color-brand-blue: #1674D5;
--color-brand-lime: #78B51B;
--color-brand-yellow: #F0E51C;
--color-page: #F8FAF1;
--color-surface: #FFFFFF;
--color-text: #171A1F;
--color-text-muted: #667085;
--color-border: #E4E8ED;

Treat these values as a proposed UI palette, not permission to alter the logo
artwork. Confirm the final visual direction with the client before polishing
all pages. Keep the logo and any supplied brand assets in the project's
approved assets folder and record their source/licensing where relevant.


DESIGN QUALITY GATE
- Make deliberate design decisions based on the approved brand and audience.
  The site must feel like a coherent sports brand, not a generic template or
  repeated AI-generated card grid.
- Before implementing major pages, establish a design direction, typography,
  color/spacing tokens, responsive layout, component patterns, and a page
  hierarchy. Review the homepage as a complete composition, not just isolated
  components.
- Include desktop and mobile states, meaningful hover/focus/pressed states,
  loading, empty, error, success, disabled, and unavailable states.
- Use real assets supplied or approved by the client. Never invent club facts,
  testimonials, awards, prices, coaches, schedules, or location details.
- If assets are missing, use clearly marked temporary placeholders in local
  development and record exactly what is needed. Do not block all development
  waiting for photos, but do not present placeholders as final client-ready
  content or deploy them as if real.
- After each UI phase, run available checks, inspect responsive behavior, and
  report what was tested, what remains unverified, and what requires client
  approval. Do not claim the site is polished or production-ready without
  evidence from actual checks.


ANTI-SLOP FRONTEND IMPLEMENTATION AND REVIEW GATE
This gate is mandatory. A written design brief cannot guarantee the final UI;
the implementation must be reviewed in the browser at each major stage.
Do not mark a phase complete merely because the code compiles.

IMPLEMENT IN SMALL, REVIEWABLE SLICES
- Follow the defined phases. Do not generate the entire website in one pass.
- Before building all pages, establish the visual direction and implement a
  small representative slice: shared typography/colors, navigation, buttons,
  form controls, and the homepage hero/first major section.
- Run the app and inspect that slice in a real browser at desktop and mobile
  widths. Correct visual problems before reusing the patterns across pages.
- Build one major user journey at a time. For example: public homepage ->
  choose booking type -> choose date/time -> review details -> payment
  instructions/proof upload -> confirmation.
- Reuse components for consistency, but do not force unrelated content into
  identical card grids. Each page should have a layout suited to its purpose.
- Keep changes scoped. Do not replace working architecture or rename unrelated
  files just to make a visual change. Explain any necessary structural changes.

REQUIRED VISUAL REVIEW FOR EACH MAJOR UI PHASE
- Inspect actual browser screenshots; do not rely on code review alone.
- Check at least a narrow mobile viewport, a common phone width, tablet, and
  desktop/wide desktop. Include a realistic long page, not only the first fold.
- Check alignment, spacing rhythm, typography hierarchy, line lengths, button
  size, image crops, contrast, overflow, sticky elements, dropdown clipping,
  modal fit, and whether the primary action is obvious.
- Check real interaction states: hover, focus, pressed, disabled, loading,
  success, error, empty, unavailable, and validation feedback as applicable.
- Check keyboard operation and visible focus; do not sacrifice accessibility
  for visual appearance.
- Check that real text, long names, missing images, slow requests, and empty
  database results do not break the layout.
- For booking and payment screens, verify that price, duration, selected
  date/time, payment instructions, proof-upload status, and next step are clear.
- Fix obvious visual defects before moving to the next phase. Do not accumulate
  known issues for a final polish pass.

ANTI-GENERIC-DESIGN RULES
- Do not use a stock SaaS dashboard layout for every page.
- Avoid identical repeated cards, arbitrary gradients, excessive shadows,
  oversized rounded corners, decorative blobs, random icons, and animations
  without a clear purpose.
- Do not invent photos, reviews, staff biographies, awards, player counts,
  availability, or testimonials. Use client-approved assets or clearly marked
  development placeholders until real assets arrive.
- Use a clear visual hierarchy: one dominant purpose per section and one
  obvious primary action where appropriate.
- Make the real club and courts the focus when approved photography is
  available. Do not substitute unrelated stock sports imagery that misrepresents
  the venue.
- Keep navy, blue, lime, and yellow consistent with the logo palette, but use
  neutral surfaces and readable text so brand accents do not overwhelm content.
- Do not add a dark-mode toggle, parallax, carousels, or complex animation
  unless it serves a real user need and has been approved.

PHASE EXIT REPORT
At the end of every major UI phase, report:
1. What was implemented.
2. Which routes and viewport sizes were actually inspected.
3. Which interactions and states were tested.
4. Any known visual, accessibility, responsive, or performance issues.
5. Which assets or client decisions are still missing.
6. What should be reviewed or approved before continuing.

Do not claim “premium”, “polished”, “fully responsive”, “accessible”, or
“production-ready” without stating what was checked. If browser screenshot
inspection or a test could not be performed, say so plainly and list the
remaining manual verification steps.


========================================================================
MANDATORY PREMIUM PRODUCT STANDARD — MODERN UI/UX, MOTION, AND ROLE-BASED REVIEW
========================================================================

PURPOSE
The goal is not merely to make pages that function. Build a client-presentable
product that feels intentionally art-directed, current, trustworthy, and worth
paying for. Treat the blueprint as a product brief and execution contract, not
as permission to rush through every feature. A polished result must be earned
through implementation, browser review, testing, and iteration.

REQUIRED WORKING PERSPECTIVES
For each relevant task, think and review from the perspective of:
- Product owner / product strategist: user needs, business value, scope,
  priorities, acceptance criteria, and what should not be built yet.
- UX researcher / UX designer: user journeys, user expectations, information
  architecture, friction, error prevention, clarity, and task completion.
- Visual / brand designer: art direction, composition, typography, color,
  imagery, visual hierarchy, consistency, and brand differentiation.
- Frontend engineer: responsive implementation, component quality, state
  handling, accessibility, rendering performance, and maintainability.
- Backend / database engineer: correct data model, trusted validation,
  booking integrity, transactions, permissions, and safe failure behavior.
- Security engineer: threat modeling, RLS, authorization, secret handling,
  privacy, abuse cases, and least-privilege access.
- QA / test engineer: realistic test scenarios, edge cases, regression checks,
  cross-viewport behavior, and reproducible evidence.
- Performance engineer: image delivery, bundle size, loading behavior, layout
  stability, and reasonable performance on typical mobile connections.
- Content / conversion designer: clear value proposition, credible content,
  useful calls to action, booking conversion, and no misleading claims.
- Operations / support reviewer: staff workflows, audit history, recovery,
  handover, and whether the client can operate the product without a developer.

Do not pretend every role needs a separate agent or produce long role-play
essays. Apply the relevant checks to the task, resolve conflicts explicitly,
and report important trade-offs in plain language. Correctness, accessibility,
security, clarity, and the real business rules outrank decorative effects.

MODERN UI/UX ACCEPTANCE STANDARD
- Avoid dated visual patterns: default-looking templates, dated gradients,
  excessive skeuomorphism, glossy/glass panels, heavy drop shadows, overly
  rounded everything, cramped spacing, tiny low-contrast text, inconsistent
  icon packs, oversized hero typography without hierarchy, and repetitive
  card grids used to fill space.
- Avoid blindly copying whatever is currently trendy. Create a cohesive,
  brand-specific sports-club experience using the approved logo, authentic
  photography when available, editorial composition, clear typography,
  purposeful negative space, deliberate image crops, strong alignment, and
  consistent component behavior.
- Make the public site feel like a real venue and community, not a SaaS landing
  page. Make the staff area feel like an efficient operations tool, not a
  consumer marketing page. Each page should have a layout appropriate to its
  task rather than reusing one template everywhere.
- Make the first viewport immediately communicate the club identity, core
  offering, and next action. Do not bury booking under a long introduction.
- Give every major section a clear purpose. Remove filler sections, generic
  slogans, meaningless metrics, fake social proof, decorative charts, and
  content that does not help a visitor decide or complete a task.
- Use real club assets when supplied and approved. If unavailable, use clearly
  identified replaceable placeholders during development and record what is
  needed. Do not present invented venue photography, people, testimonials,
  awards, prices, hours, schedules, or location details as real.
- Check actual text contrast, focus visibility, tap targets, line length,
  readable type sizes, and responsive behavior. A visually attractive design
  that is difficult to use does not pass.
- Do not call a design premium simply because it has animation or elaborate
  visuals. Premium means coherent art direction, credible content, fast
  interactions, excellent details, and dependable behavior.

MOTION AND TRANSITION IMPLEMENTATION STANDARD
Use motion deliberately to make the product feel responsive and well finished:
- Provide subtle hover, pressed, focus, selected, and disabled feedback where
  those states apply.
- Use short transitions for buttons, links, navigation menus, dropdowns,
  dialogs/sheets, tabs, calendar selections, time slots, and inline feedback.
- Use restrained entrance/reveal motion only where it improves hierarchy or
  storytelling. Keep it brief and avoid making users wait for content.
- Use skeletons or other stable loading feedback for asynchronous content;
  avoid flashing, jumping, and layout shifts.
- Use clear success/error feedback for actions such as booking submission,
  receipt upload, payment-proof review, and cancellation.
- Prefer transform and opacity for animation when suitable. Avoid animating
  layout-heavy properties on large regions if it causes jank.
- Keep timing consistent and brief; a typical micro-interaction can be around
  120–220 ms and a simple panel/dialog transition around 160–260 ms, adjusted
  to the interaction and existing design system. These are guidelines, not
  hard-coded universal values.
- Respect prefers-reduced-motion. Provide a reduced-motion experience that
  removes or minimizes nonessential motion while preserving understandable
  state changes.
- Never let animation delay booking, hide important information, obscure focus,
  cause accidental taps, create scroll hijacking, or interfere with assistive
  technology. Avoid constant floating effects, cursor gimmicks, long intro
  sequences, and motion added solely to look impressive.
- Do not add an animation library without checking the existing stack and
  confirming the added bundle/maintenance cost is justified. Prefer existing
  CSS or installed tools when sufficient.
- Verify animation behavior on a real browser at mobile and desktop sizes,
  including reduced-motion settings. Do not claim animations are implemented
  until they have actually been checked.

MANDATORY DESIGN-TO-IMPLEMENTATION LOOP
1. Inspect the current repository and the current phase. Read this blueprint,
   AGENTS.md, and docs/PROJECT_STATUS.md if present. Verify status in code;
   do not trust a status note blindly.
2. State the user/business goal, the smallest scoped task, unknown client
   inputs, and acceptance criteria. Ask only for decisions that block safe
   progress.
3. For design decisions, present a concise rationale and a concrete reviewable
   artifact: a page mockup, screenshot, wireframe, component slice, or browser
   preview. Do not rely only on verbal descriptions.
4. Implement one small, coherent slice using the existing project conventions.
   Do not rewrite unrelated files or build multiple phases at once.
5. Run relevant checks and open the running product in a browser when browser
   tooling is available. Inspect screenshots at narrow mobile, common phone,
   tablet, desktop, and wide desktop widths as relevant to the change.
6. Exercise real interactions and states, not just the default screenshot.
   Check console errors, failed requests, overflow, loading, empty, failure,
   success, validation, keyboard focus, and reduced motion where applicable.
7. Fix visible defects and important regressions before calling the slice done.
   If browser review or testing is unavailable, clearly say what was not tested
   and provide the exact manual checks still needed.
8. Update docs/PROJECT_STATUS.md with verified work, checks actually run,
   unresolved issues, client inputs needed, and the next smallest task.
9. Summarize the result and wait for approval whenever the phase requires it.
   Do not silently continue into the next phase.

DEFINITION OF DONE FOR A CLIENT-REVIEWABLE UI SLICE
A UI slice is not complete merely because it compiles. It should:
- Match the approved visual direction and existing design tokens.
- Have a clear hierarchy and a specific purpose for each section.
- Work at the relevant mobile and desktop sizes without clipping or overflow.
- Include appropriate interaction, focus, loading, empty, error, success, and
  disabled states for the functionality included in that slice.
- Use real/approved content or clearly labeled placeholders.
- Have no dead primary actions, obvious console errors, or known severe visual
  defects left unreported.
- Pass relevant lint/type/build/unit checks available in the repository.
- Have its actual verification scope documented; do not claim unrun tests.
- Be reviewed as a complete flow when the change affects booking, authentication,
  payments, or staff operations—not merely as an isolated component.

DESIGN REVIEW QUESTIONS
Before approval, ask:
1. Does this look current and intentional, or could it be any generic template?
2. Does it visibly belong to Hidden Pickleball Court & Bistro?
3. Is the most important next action obvious without overwhelming the page?
4. Does the layout fit the actual content and user task?
5. Are imagery, typography, spacing, and motion helping rather than competing?
6. Does the mobile experience feel designed rather than merely compressed?
7. Are interactions understandable, accessible, and fast?
8. Is every factual claim grounded in client-approved information?
9. Can the same result be maintained without needless dependencies or fragile code?
10. Would we be comfortable showing this exact browser state to the client, and
    what evidence supports that judgment?

CLIENT VALUE AND HONESTY
Aim for a result that makes the value of the product easy to see: professional
presentation, less booking friction, reliable availability, clear payment status,
and easier staff operations. Never guarantee that a design will make the client
buy; validate the direction with the client and improve it from feedback. Do not
fake a working feature for a presentation. Label prototypes and placeholders,
and distinguish implemented behavior from visual mockups.

========================================================================


BACKEND QUALITY GATE
- Treat Supabase RLS, server-side validation, database constraints/functions,
  and role checks as core requirements, not optional polish.
- Test booking conflicts, capacity limits, unauthorized access, payment status
  transitions, duplicate submissions, and failure states.
- Never fake integrations or mark a QR payment paid automatically. Staff must
  verify the actual incoming transaction in the receiving account.
- Keep changes small, explain migrations and environment variables, and never
  expose secrets or overwrite user data without explicit approval.

CLIENT ASSET HANDLING
The user may not have the logo, photographs, exact map pin, or final content at
project start. Ask for only the assets needed for the current phase. Maintain a
short missing-assets checklist. Where safe, build the layout with named local
placeholders and easy-to-replace asset paths; keep all final assets pending
client approval. Do not fabricate an exact address or map coordinate.

======================================================================
0. PRODUCT VISION AND NON-NEGOTIABLE RULES
======================================================================

VISION Build a polished, trustworthy, easy-to-use website that makes
players want to visit the club and makes booking feel effortless. The
product should feel like a real sports brand with a clear identity,
excellent photography, deliberate typography, fast interactions, and
dependable booking logic. It must not look like a generic template or a
collection of AI-generated cards.

The website should help the club: - Present its courts, community,
services, coaches, and location professionally. - Convert visitors into
confirmed bookings. - Manage court reservations, normal open play,
DUPR-enabled open play, and coaching appointments. - Accept bookings with manual QR-code payments (GCash QR, Maya QR, and a bank-transfer option that uses the club’s GCash QR where the bank transfer route is supported), with staff manually verifying submitted proof. - Give staff a reliable dashboard to manage availability, bookings, attendance, payment verification, and payment collection. - Add an authorized DUPR integration only in
the final integration phases, after API access and rules are confirmed.

PROJECT RULES 1. Use TypeScript, not JavaScript, for the Next.js
project. 2. Use Next.js for the website and server-side routes where
appropriate. 3. Use Supabase PostgreSQL, Auth, Row Level Security (RLS),
and database functions for backend data and trusted operations. 4. Use
OpenFreeMap for the club location map. Choose a compatible map renderer,
such as MapLibre GL JS, and follow OpenFreeMap’s current documentation,
attribution, style, and usage requirements. 5. Keep initial costs low.
Do not introduce paid services unless there is a clear need and the
client understands the cost. 6. Manual QR-code payments are the planned payment workflow: GCash QR, Maya QR, and bank transfer using the same GCash QR only when the payer’s bank supports that route. Staff must verify the actual incoming transaction before marking payment PAID. Pay-at-the-club may remain as a separate option if the client approves it. 7. DUPR
API integration is intentionally postponed until the core booking system
is stable and official access/permissions are confirmed. 8. Do not store
secret keys in browser code, source control, screenshots, or public
environment variables. 9. Do not trust the browser to decide whether a
booking is available, whether a payment succeeded, or whether a user is
an administrator. 10. Build in small, testable phases. Do not build the
whole project in one giant code-generation step.

====================================================================== 1.
BEFORE DEVELOPMENT: CLIENT DISCOVERY AND PRODUCT DECISIONS
======================================================================

Do not start by coding pages. First collect the business details needed
to build the correct product.

CLIENT INFORMATION CHECKLIST [ ] Official club name and exact spelling.
[ ] Club logo in SVG or high-resolution PNG, including light and dark
versions if available. [ ] Brand colors, preferred typography, and any
existing brand guide. [ ] Real photographs of the club, courts, players,
coaches, facilities, and events. [ ] Club address, map pin, opening
hours, contact number, email, and social media links. [ ] Court count,
court names/numbers, indoor/outdoor details, and operating hours. [ ]
Court booking price, minimum/maximum duration, buffer time, and
cancellation policy. [ ] Normal open-play price, schedule, participant
capacity, skill level, and rules. [OPTIONAL LATE PHASE] DUPR-enabled open-play schedule, participant requirements, and who approves/submits results. [OPTIONAL LATE PHASE] Coaching services, coach profiles, session duration, price, and availability. [ ]
Whether guests can book without an account or must register first. [ ]
Whether a booking is immediately confirmed or requires staff approval. [
] How long a player may hold a slot before completing the booking form.
[ ] Late arrival, no-show, cancellation, rescheduling, refund, and
weather policies. [ ] Which payment options the club accepts: GCash QR, Maya QR, bank transfer using the GCash QR only when the payer’s bank supports that route, and optionally pay-at-the-club. Confirm the receiving account names, exact QR images, transfer instructions, payment-verification process, and refund policy. [ ] Who can access the
admin dashboard and what each role is allowed to do. [ ] Whether the
client already has a domain, email, hosting, or payment-provider
account. [ ] Whether the client has official DUPR API access, written
authorization, and technical documentation. [ ] Who will own the
Supabase, domain, hosting, map configuration, payment account, and
source-code repository. [ ] Who approves design, copy, booking rules,
and launch readiness.

IMPORTANT BUSINESS QUESTIONS - Are court bookings priced per court-hour,
per player, or by another rule? - Does the club permit overlapping
reservations on different courts? (Usually yes.) - Can one player
reserve a court for a group? How many players must be listed? - Does
open play have a hard capacity limit? Can a waitlist be offered? - Can a
player book multiple sessions in one checkout? - Can staff create
bookings for walk-in customers? - Does a pay-later reservation become
confirmed immediately, or wait for staff approval? - What happens if a
customer does not show up or does not pay? - Can staff block a court for
maintenance, private events, or tournaments? - Are coaching appointments
tied to a specific coach, court, or both? - What exactly makes an open
play “DUPR-enabled,” and who is responsible for submitting results? -
What data does the client expect to see in reports? - What cancellation
cutoff and refund policy should the website enforce?

DELIVERABLE BEFORE PHASE 1 Create a short, client-approved requirements
document. Record decisions, unresolved questions, policies, prices, and
out-of-scope features. Do not silently invent business rules.

======================================================================
2. TECHNOLOGY AND PROJECT FOUNDATION
======================================================================

RECOMMENDED STARTING STACK - Next.js with App Router and TypeScript. -
Tailwind CSS for styling, with a small, intentional design system. -
Supabase PostgreSQL for data. - Supabase Auth for authentication. -
Supabase RLS for access control. - Database functions/transactions for
critical booking operations. - OpenFreeMap with a compatible renderer
such as MapLibre GL JS for the club map. - Zod for validating inputs at
trusted boundaries. - date-fns or another consistent date utility for
display and date calculations. - Git and GitHub for version control. -
Vitest for focused unit tests and Playwright for end-to-end tests when
practical. - An email service for confirmations and reminders once the
core flow works. - Manual QR-code payment flow with proof submission and staff verification; no payment API is required for the initial release. - DUPR integration only in the final
phases, if official access is approved.

COST CONTROL - Start with free development tools and suitable free
tiers. - Check the current commercial-use terms and limits of hosting,
database, email, maps, and payment providers before launch. - Do not
assume a hobby/free hosting plan is allowed for a commercial club
website. - Set spending alerts or usage monitoring where available. -
Keep development, preview, and production environment variables
separate. - Avoid adding multiple libraries that solve the same
problem. - Do not pay for a service before confirming that it is
necessary. - Document all recurring fees and transaction fees for the
client.

PROJECT STRUCTURE Organize the project by feature, not as one enormous
page/component. Suggested areas: - app/(public): homepage, services,
court information, coaches, location, policies. - app/(auth): sign-in,
sign-up, password recovery. - app/(booking): booking wizard,
checkout/confirmation, player booking history. - app/(admin): staff
dashboard and management screens. - app/api or server-side modules:
trusted operations and webhooks, if needed. - components/ui: reusable
buttons, fields, dialogs, badges, cards, skeletons. -
components/booking: calendar, time-slot picker, booking summary,
service-specific forms. - lib/supabase: browser and server clients. -
lib/validation: Zod schemas. - lib/dates: timezone-safe date helpers. -
lib/permissions: server-side role checks. - types: shared domain
types. - tests: unit and end-to-end tests.

Keep TypeScript strict. Define explicit domain types. Avoid using “any”
as a shortcut. Keep server-only code and secrets out of client
components.

======================================================================
PHASE 1 — BRAND STRATEGY, VISUAL DIRECTION, AND ASSET COLLECTION
======================================================================

GOAL Agree on a distinctive visual identity before building the pages.

A premium website does not mean adding gradients and animations
everywhere. It means strong art direction, clear hierarchy, excellent
images, consistent spacing, careful copy, and predictable interactions.

BRAND WORK [ ] Confirm club name and brand personality: energetic,
welcoming, competitive, premium, community-oriented, or a deliberate
mix. [ ] Create a compact design brief and moodboard. [ ] Choose a
restrained color palette based on the supplied Hidden Pickleball Court & Bistro logo; use the logo-based tokens above as the starting point and confirm them with the client. [ ] Select a readable
display font and body font with appropriate licensing. [ ] Define
typography scale, spacing scale, corner radii, shadows, borders, and
icon style. [ ] Define button, input, dropdown, modal, calendar, card,
table, badge, and alert styles. [ ] Define dark/light treatment only if
it supports the brand; do not add a theme toggle just for decoration. [
] Design the logo lockup and favicon if the client does not already have
usable files. [ ] Define a consistent photography treatment and
image-cropping rules.

MANDATORY IMAGE AND LOGO TASKS [ ] Obtain the official club logo. Prefer
SVG for crisp rendering; use transparent PNG if SVG is unavailable. [ ]
Create a favicon/app icon from the approved logo. [ ] Obtain real,
high-quality images of the actual club and courts. [ ] Obtain a wide
hero image showing the club, courts, or players in action. [ ] Obtain
court images for court details or booking cards, if useful. [ ] Obtain
authentic coaching/team photos and approved coach portraits. [ ] Obtain
community/open-play/event images. [ ] Obtain an image for empty states
only if a custom illustration is genuinely useful. [ ] Confirm image
permissions, photographer/owner rights, and consent where people are
identifiable. [ ] Prepare appropriate desktop and mobile crops. [ ]
Optimize image sizes and formats; avoid shipping huge uncompressed
originals. [ ] Add descriptive alt text for meaningful images; use empty
alt text for purely decorative images. [ ] Never invent fake
testimonials, fake ratings, fake player counts, or fake awards. [ ] Do
not use random stock images that misrepresent the real club. If
temporary placeholders are necessary, label them clearly and replace
them before launch.

DESIGN OUTPUTS - Approved moodboard. - Logo and favicon assets. - Image
inventory with filenames, source, permissions, and intended page. -
Color/font/spacing tokens. - Initial desktop and mobile homepage
mockups. - A reusable UI component reference page.

EXIT CHECK The client approves the visual direction and provides or
approves the required assets before the site is polished around them.

======================================================================
PHASE 2 — UX PLAN, INFORMATION ARCHITECTURE, AND PAGE WIREFRAMES
======================================================================

GOAL Make the website easy to understand for a first-time visitor and
quick for a returning player.

PUBLIC PAGES 1. Home - Strong hero with clear club identity and real
photography. - One primary action: “Book a Court” or the most important
conversion action. - Secondary action for open play or services. -
Short, accurate explanation of what the club offers. - Featured
court/open-play/coaching options. - Upcoming events or sessions only
when real data exists. - Location preview and directions action. -
Social proof only if genuine and approved. - FAQ, contact information,
and a complete footer.

2.  Book
    -   Clear choices: Court Reservation, Normal Open Play, DUPR Open
        Play, Coaching/Appointment.
    -   Show prices, duration, rules, capacity, and relevant
        requirements before asking for personal information.
    -   Explain pay-later clearly: the booking is unpaid until staff
        records receipt.
    -   Do not imply that an online payment has happened.
3.  Court Details
    -   Court name/number, approved photos, facilities, price, available
        times, and rules.
    -   Do not promise a feature such as indoor coverage or lighting
        unless confirmed by the client.
4.  Open Play
    -   Session schedule, skill level, participant capacity, price, what
        to bring, and cancellation rules.
    -   Clearly label normal open play versus DUPR-enabled open play.
    -   Explain that DUPR-related result processing is subject to club
        procedures and authorized integration.
5.  Coaching / Appointments
    -   Coach profiles and real portraits if provided.
    -   Services, duration, pricing, availability, and rescheduling
        rules.
    -   Clear booking action.
6.  Location / Contact
    -   OpenFreeMap-based map with club marker.
    -   Address, operating hours, contact channels, and directions link.
    -   Provide the address in text so the map is not the only way to
        find the club.
7.  About / Club Rules / FAQ / Policies
    -   Accurate club story and facilities.
    -   Booking, cancellation, no-show, payment, privacy, and terms
        information.
    -   Keep policy wording consistent with what the software actually
        enforces.

PLAYER ACCOUNT PAGES - Sign in / sign up. - Email verification and
password recovery. - Profile and contact details. - Upcoming and past
bookings. - Booking details and cancellation/reschedule action when
permitted. - Payment status and receipt/reference details where
appropriate. - DUPR ID/link status only if the club has a legitimate
reason and the integration is approved.

STAFF / ADMIN PAGES - Dashboard: today’s bookings, upcoming sessions,
unpaid bookings, check-ins, and exceptions. - Calendar: courts,
appointments, and open-play sessions with clear status labels. - Booking
detail: customer, service, time, price, notes, booking status, and
payment status. - Court management: create/edit courts, operating hours,
and closures. - Open-play management: schedule, capacity, sign-ups,
waitlist if implemented, and attendance. - Coaching management: coaches,
services, and availability. - Payment management: mark payment received
only after actual collection; record method, amount, time, and staff
member. - Customer management with role-appropriate access. - Reports:
bookings, occupancy, sales collected, unpaid bookings, cancellations,
no-shows. - Audit/history view for important staff actions. - Settings:
prices, booking windows, cancellation rules, contact details, and
business hours.

WIREFRAME BEFORE VISUAL DESIGN [ ] Map the primary player journey. [ ]
Map the staff workflow. [ ] Sketch mobile layouts first for booking
interactions, then desktop. [ ] Decide where login is required. Do not
force account creation before showing available options unless the
business requires it. [ ] Show the full price and payment method before
final confirmation. [ ] Include loading, empty, error, unavailable, and
success states for every major flow. [ ] Confirm labels and page
structure with the client.

======================================================================
PHASE 3 — UI/UX DESIGN SYSTEM AND PREMIUM FRONTEND
======================================================================

GOAL Make the interface feel custom-designed, calm, polished, and
trustworthy rather than like a generic dashboard template.

VISUAL PRINCIPLES - Use a strong, intentional typographic hierarchy.
Avoid making every heading oversized. - Use whitespace to separate
sections and make the primary action obvious. - Use the real brand
palette consistently; do not use random colors for individual
components. - Keep the number of font families low. - Use high-quality
real images and deliberate crops. - Use consistent alignment, spacing,
border radius, and button sizes. - Use clear labels rather than clever
but confusing wording. - Prefer one strong primary action per section. -
Avoid unnecessary glassmorphism, neon gradients, excessive pills, giant
rounded cards, and decorative blobs. - Avoid repeating the same card
grid for every section. - Do not make the homepage look like an admin
dashboard. - Do not put every piece of content inside a card. - Use
realistic copy and data, not placeholder lorem ipsum in client
reviews. - Do not add fake ratings, testimonials, member counts, or
scarcity messages. - Use icons consistently. Pair unfamiliar icons with
labels. - Keep the mobile booking controls reachable and legible. -
Design for the actual brand and target audience, not for a trend
screenshot.

MOTION AND MICRO-INTERACTIONS Use animation to improve feedback,
orientation, and perceived quality, not to distract. - Subtle
page/section reveal when it supports the story. - Small hover/press
feedback for buttons and interactive cards. - Smooth but restrained
menu/dialog transitions. - Clear calendar date and time-slot selection
feedback. - Skeleton loading for slow data fetches. - Toasts or inline
notices for successful and failed actions. - A short, clear confirmation
state after booking. - Respect prefers-reduced-motion. - Avoid long
intro animations, scroll hijacking, constant floating effects, cursor
gimmicks, and animation that delays booking. - Keep motion performant on
mobile and avoid layout shifts.

RESPONSIVE BEHAVIOR - Test at narrow mobile widths, common phones,
tablets, laptops, and wide screens. - Do not simply shrink the desktop
layout. - On mobile, use a compact navigation menu and simple booking
steps. - Make time slots easy to tap and read. - Ensure modals fit small
screens or become full-screen sheets when appropriate. - Keep tables
usable on mobile through purposeful responsive layouts. - Check portrait
and landscape behavior. - Never hide critical booking terms or price
details on mobile.

ACCESSIBILITY AND POLISH - Use semantic headings and HTML. - All forms
must have labels and understandable validation messages. - Support
keyboard navigation and visible focus states. - Maintain adequate
text/background contrast. - Give icon-only buttons accessible names. -
Use alt text for meaningful images. - Ensure error messages explain how
to fix the problem. - Do not rely on color alone for status. - Test
reduced-motion settings. - Use consistent date/time formats and the
club’s local timezone. - Format Philippine peso prices clearly if the
club operates in the Philippines. - Show loading and disabled states
while actions are processing to prevent double submissions.

PERFORMANCE - Optimize images and use responsive image sizes. - Avoid
loading heavy animation or map code before it is needed. - Lazy-load
below-the-fold images and map when appropriate. - Prevent layout shifts
by reserving image dimensions. - Use server components by default where
suitable; add client components only for interactivity. - Keep
client-side bundles lean. - Measure real performance before launch
instead of assuming it is fast.

EXIT CHECK A first-time visitor can identify what the club offers,
understand the price, find the location, and begin a booking without
confusion. The mobile experience must be as carefully designed as
desktop.

======================================================================
PHASE 4 — DATABASE, AUTHENTICATION, PERMISSIONS, AND SECURITY
======================================================================

GOAL Build a trustworthy data foundation before connecting all the
booking screens.

CORE DATA AREAS - Profiles linked to Supabase Auth users. - Roles:
player, staff, manager/admin. Use the smallest role set the client
actually needs. - Courts and operating/closure schedules. - Services and
prices. - Open-play sessions and capacities. - Coaches and appointment
availability only if coaching is approved for a later phase. - Bookings and service-specific booking details. -
Payments and payment records. - Attendance/check-ins. - Club
configuration and policies. - Audit events for important staff
actions. - DUPR-related identifiers/matches later, only if authorized.

SUPABASE DATABASE AND FILE STORAGE STRATEGY
- Store structured records in PostgreSQL: users/profiles, bookings,
  prices, payment statuses, transaction references, audit events, and
  file paths/metadata. Do not store image binaries in database columns.
- Store actual images/files in Supabase Storage buckets. Save only the
  storage path and necessary metadata in the related database record.
- Use a private bucket for payment proofs and enforce access so the player
  can access only their own proof and authorized staff can review it.
- Keep public club marketing images separate from private payment proofs.
  Only publish approved public assets. QR images displayed to all payers
  may be stored in a bucket configured for the intended public display.
- Use unique, non-guessable file paths; validate MIME type, extension,
  actual file content where practical, and file size. Never trust the
  filename or browser-provided content type alone.
- Record a retention policy for payment proofs and delete them only when
  permitted by the client-approved policy and any applicable requirements.
- Treat free-plan quotas as limits to monitor, not guaranteed permanent
  capacity. Track database size, Storage size, and bandwidth/egress.
- Do not rely on Supabase Storage image transformations for a Free plan
  workflow; current Supabase documentation lists image resizing as Pro+
  functionality. Optimize images before upload instead.

DATA MODEL GUIDANCE A practical model may include: - profiles - courts -
services - coaches - open_play_sessions - bookings -
court_reservations - open_play_registrations - appointments - payments -
attendance/check_ins - audit_logs - club_settings - dupr_accounts and
match tables only in the later DUPR phase

Do not blindly create all tables without confirming the business rules.
Choose relationships and constraints that represent the actual service
model.

SECURITY CHECKLIST [ ] Enable RLS on all exposed tables. [ ] Write and
test explicit policies for each role and data type. [ ] Players can only
read/update their permitted profile data and their own bookings. [ ]
Staff can access only the management functions they need. [ ]
Administrative role assignment must not be editable by ordinary users. [
] Validate all submitted values on the server/database boundary. [ ]
Keep Supabase service-role keys and other secrets server-only. [ ] Use
environment variables and separate development/production configuration.
[ ] Never commit .env files or secrets to Git. [ ] Verify email/password
recovery behavior. [ ] Add rate limiting or abuse protection to public
booking/auth endpoints where appropriate. [ ] Avoid collecting
unnecessary personal data. [ ] Define retention/deletion practices for
personal information. [ ] Do not log passwords, access tokens, payment
secrets, or sensitive provider payloads. [ ] Add audit history for
sensitive staff actions.

BOOKING INTEGRITY Do not rely only on a frontend availability check. Two
customers may select the same slot at nearly the same time. - Use
database transactions/functions and constraints to validate and create
reservations atomically. - Prevent overlapping reservations for the same
court. - Enforce open-play capacity at the database operation that
confirms a place. - Validate coach availability and appointment
conflicts. - Account for club timezone, daylight-saving changes where
applicable, and duration/buffer rules. - Make booking creation safe
against accidental double submission. - Test simultaneous booking
attempts.

EXIT CHECK A player cannot access another player’s private booking,
ordinary users cannot become admins, and the database blocks double
bookings even if two requests arrive simultaneously.

======================================================================
PHASE 5 — PUBLIC WEBSITE, CONTENT, AND CLUB LOCATION (MVP SCOPE)
======================================================================

GOAL Build the complete public-facing site using approved content and
the design system.

BUILD IN THIS ORDER 1. Global typography, colors, layout, navigation,
footer, buttons, form controls. 2. Homepage using the approved logo and
real hero image. 3. Service pages and clear calls to action. 4. Court
and normal open-play information. 5. Club rules, FAQ, contact, and policy pages. 6. Location page with OpenFreeMap. 7. Responsive polish and loading/empty/error states. Do not build coaching pages or DUPR-specific public pages in this MVP phase; add them only in their approved conditional late phases.

OPENFREEMAP IMPLEMENTATION - Use OpenFreeMap for the interactive club
map and a compatible renderer such as MapLibre GL JS. - Confirm the
current OpenFreeMap style URL, API/hosting guidance, attribution
requirements, and terms in its official documentation during
implementation. - Use the exact club coordinates/address supplied and
approved by the client. - Show a clear club marker and a readable
popup/label. - Include a separate “Get directions” link to a commonly
used navigation service if the client approves. - Keep the full address
and contact details visible in text. - Ensure the map is
keyboard-accessible as far as the chosen renderer permits, and do not
make it the only way to find the club. - Lazy-load the map when
practical so it does not slow the first screen. - Test mobile
interactions and marker placement. - Do not expose a private API token
in client code if the selected map setup uses a secret token. - Add
required map/data attribution in a visible, compliant way. - Check the
service’s usage limits and suitability for production traffic; do not
assume free map infrastructure has unlimited capacity.

CONTENT AND IMAGE QUALITY GATE [ ] Replace every placeholder logo and
image. [ ] Confirm image rights and final text with the client. [ ]
Confirm prices, schedules, address, hours, phone, and social links. [ ]
Check image crop and contrast on mobile. [ ] Check that every button
goes to a real destination/action. [ ] Remove dummy testimonials, fake
statistics, and dead links.

======================================================================
PHASE 6 — ACCOUNT AND PLAYER EXPERIENCE
======================================================================

GOAL Make account management simple without putting unnecessary friction
in front of booking.

PLAYER FLOW 1. Visitor browses services and prices. 2. Visitor selects a
service and a date. 3. Website shows availability and total price. 4.
Website requests sign-in/sign-up at the agreed point in the journey. 5.
Player confirms details and accepts relevant booking terms. 6. Server
validates the requested slot/capacity and creates the booking. 7. Player
sees a confirmation/reference and the payment status the correct status, such as “Awaiting payment” or “Awaiting staff verification,” based on the selected payment method. 8. Player can view the
booking in their account. 9. Player receives confirmation through the
agreed channel once notifications are implemented. 10. Player can
cancel/reschedule only when policy and availability permit.

ACCOUNT DETAILS - Sign up, sign in, sign out, email verification,
password reset. - Profile details with validation. - Upcoming/past
bookings. - Booking detail and reference. - Clear booking/payment
status. - Cancellation/reschedule controls only when allowed. - Helpful
empty states for users with no bookings. - Clear feedback when a session
expires.

Do not collect unnecessary details. Explain why any required field is
needed. Keep the booking flow short and avoid asking users to re-enter
information already on their profile.

======================================================================
PHASE 7 — CORE BOOKING ENGINE: COURTS AND NORMAL OPEN PLAY
======================================================================

GOAL Make the central MVP business logic reliable for court reservations and normal open play before adding optional coaching or DUPR work.

A. COURT RESERVATION FLOW 1. Player chooses “Book a Court.” 2. Select
date and preferred duration. 3. Website shows only valid available
courts/time slots. 4. Player chooses court and time. 5. Website shows
price, duration, rules, cancellation cutoff, and QR payment instructions and manual verification policy.
6. Player enters/confirms booking details. 7. Server/database atomically
checks the slot and creates the booking. 8. Confirmation shows
reference, court, date, start/end time, amount due, and cancellation
rules. 9. Staff sees the booking in the management calendar. 10. If
another player took the slot first, explain that the slot is no longer
available and ask the player to choose another one.

B. NORMAL OPEN-PLAY FLOW 1. Player chooses normal open play. 2. Website
lists sessions by date/time, price, skill level, and remaining capacity.
3. Player opens a session detail page. 4. Website clearly states whether
the session is suitable for their level and what to bring. 5. Player
books one place. 6. Database checks capacity and creates the
registration atomically. 7. Confirmation shows session details and
payment due at the club. 8. Staff checks the player in and records
payment when collected. 9. Full sessions should show “Full” and offer a
waitlist only if the client approves building one.

DEFERRED FEATURE — DUPR-ENABLED OPEN PLAY (DO NOT BUILD IN MVP) 1. Player
selects the clearly labeled DUPR-enabled session. 2. Website explains
the club’s requirements and how results will be handled. 3. Player books
a place and provides only the player information the club actually
needs. 4. Staff checks attendance and organizes matches. 5. Results may
be recorded internally for review if the club approves this workflow. 6.
Do not claim results were sent to DUPR unless an authorized, verified
integration confirms submission. 7. Keep this service distinct from
normal open play in labels, session details, and staff tools.

DEFERRED FEATURE — COACHING / APPOINTMENT FLOW (DO NOT BUILD IN MVP) 1. Player chooses coaching or an
appointment. 2. Website displays service, coach (if applicable),
duration, price, and prerequisites. 3. Player chooses a date/time from
actual availability. 4. Server checks coach/service conflicts and any
required court availability. 5. Player confirms details and
QR payment instructions and manual verification terms. 6. Confirmation includes coach/service, location,
duration, and rescheduling policy. 7. Staff can manage availability and
mark attendance.

ADMIN BOOKING TOOLS - Calendar view by day/week and filter by
court/service/status. - Create bookings for walk-ins when permitted. -
Edit or cancel bookings with required reasons for sensitive changes. -
Block courts for maintenance/private events. - Manage open-play capacity
and session status. - Manage coach schedules and appointments. -
Check-in and no-show controls. - Search by booking reference, customer,
date, and status. - Show unpaid bookings without mislabeling them as
failed payments. - Keep a history of who changed what and when.

BOOKING/PAYMENT STATUS SEPARATION Booking status examples: - PENDING
(only if approval/temporary hold is needed) - CONFIRMED - CANCELLED -
COMPLETED - NO_SHOW

Payment status examples: - UNPAID - AWAITING_PROOF - AWAITING_VERIFICATION - PAID - REJECTED - REFUND_PENDING - PARTIALLY_REFUNDED - REFUNDED. Keep booking status separate from payment status.

A booking can be CONFIRMED while its payment is UNPAID. This is
intentional for pay-later bookings. Do not combine these into one status
field.

CANCELLATION, RESCHEDULING, AND NO-SHOW RULES - Enforce the client’s
approved cutoff and fee policy. - Prevent rescheduling into unavailable
slots. - Preserve a record of the original and updated details. - Tell
the player what happens before they confirm a cancellation. - Let staff
record no-shows consistently. - Do not invent refund rules. The client
must approve them.

EXIT CHECK Test each service from discovery through booking,
confirmation, admin visibility, cancellation/rescheduling, check-in, and
payment recording.

======================================================================
PHASE 8 — STAFF DASHBOARD, DAILY OPERATIONS, AND REPORTS
======================================================================

GOAL Give staff a clean operational tool, not an overcomplicated admin
template.

DASHBOARD PRIORITIES - Today’s court reservations. - Today’s open-play
sessions and participant counts. - Coaching appointments only if the optional coaching phase has been approved and implemented. -
Upcoming bookings. - Unpaid bookings and payments collected today. -
Conflicts, cancellations, no-shows, and sessions nearing capacity. -
Quick actions for creating a booking, checking in a player, recording
payment, and blocking a court.

OPERATIONAL FEATURES - Search and filter by date, service, status,
court, and customer. - Clear status labels with both text and color/icon
where appropriate. - Calendar and list views. - Booking details in a
side panel or dedicated page. - Confirm destructive actions. - Require a
reason for important manual overrides. - Restrict sensitive functions by
role. - Log admin changes to bookings, payments, prices, permissions,
and session capacity. - Provide sensible empty states and loading
indicators. - Use pagination or server-side filtering for growing
lists. - Keep tables readable on mobile/tablet where staff may use them.

REPORTS Start with reports the club will actually use: - Bookings by
date/service. - Court occupancy/utilization. - Open-play attendance and
capacity. - Coaching sessions only if the optional coaching phase has been approved and implemented. - Amount collected and outstanding unpaid
amounts. - Cancellations and no-shows. - Export to CSV only if useful
and protect exported customer data.

EXIT CHECK Staff can run a typical day without editing the database
manually or asking a developer to fix routine booking/payment records.

======================================================================
PHASE 9 — NOTIFICATIONS, EMAILS, AND CUSTOMER TRUST
======================================================================

GOAL Keep players informed and reduce missed bookings.

NOTIFICATIONS TO CONSIDER - Booking confirmation. - Booking cancellation
or reschedule. - Reminder before the booking/session. - Staff
notification for new booking, cancellation, or a session reaching
capacity. - Waitlist promotion if waitlists are implemented. - Payment
receipt after staff verifies the actual incoming QR payment. - Instructions for rejected or unverified QR payment proof.

IMPLEMENTATION RULES - Choose an email provider with current pricing and
usage terms suitable for the project. - Start with the essential
transactional messages; do not build a complicated marketing automation
system. - Use the club’s approved logo, colors, and contact details in
emails. - Include date, time, timezone, location, booking reference,
service, amount due, and relevant policy. - Do not include secrets or
unnecessary personal information. - Avoid sending duplicate emails when
a request is retried. - Record delivery attempts/status where
practical. - Provide a helpful fallback if email delivery fails. - Use
SMS only if the client accepts its cost and the channel is genuinely
needed.

EMAIL ASSET CHECK [ ] Approved logo for email header. [ ] Sender name
and verified sender domain. [ ] Support/contact address. [ ]
Confirmation and cancellation templates. [ ] Mobile email preview
checked.

======================================================================
PHASE 10 — QUALITY ASSURANCE, SECURITY, AND PRE-LAUNCH REVIEW
======================================================================

GOAL Prove that the site works correctly under normal and difficult
conditions.

FUNCTIONAL TESTS [ ] New player sign-up, sign-in, sign-out, password
recovery. [ ] Player can only access their own permitted data. [ ]
Admin/staff permissions work as intended. [ ] Court booking with
available and unavailable slots. [ ] Two users attempt the same
court/time simultaneously. [ ] Open-play capacity limit and simultaneous
last-place booking. [ ] Coaching appointment conflicts only if the optional coaching phase has been approved and implemented. [ ] Booking
cancellation/rescheduling and cutoff rules. [ ] Staff-created walk-in
booking. [ ] Staff marks QR payment as PAID only after verifying the actual incoming transaction; uploaded screenshots alone never automatically mark a payment as paid. [ ] Unpaid
booking remains clearly unpaid. [ ] Closed court, holiday, maintenance
block, and changed business hours. [ ] Session full/cancelled and any
waitlist behavior. [ ] Invalid dates, past dates, bad inputs, and
repeated submissions. [ ] Failed network request and recovery. [ ]
Timezone and date display around midnight. [ ] Map loads, marker is
accurate, attribution is visible, and directions work. [ ] Emails use
correct booking details and do not duplicate unexpectedly. [ ] Admin
actions are logged.

VISUAL / UX TESTS [ ] Homepage at mobile, tablet, laptop, and large
desktop widths. [ ] Every required logo/image is present and optimized.
[ ] No placeholder copy, broken links, fake testimonials, or empty
template sections. [ ] No text clipped in buttons, forms, tables, or
dropdowns. [ ] Booking wizard has clear progress and back navigation. [
] Price, duration, payment method, and cancellation terms are visible
before confirmation. [ ] Keyboard navigation and focus states work. [ ]
Contrast and accessible labels checked. [ ] Reduced-motion preference
respected. [ ] Loading, empty, success, and error states designed. [ ]
No accidental double-submit on slow connections. [ ] Check performance
on a typical mobile connection.

SECURITY / OPERATIONS [ ] Production secrets stored only in the
appropriate server-side environment. [ ] RLS policies tested with player
and staff accounts. [ ] No service-role key exposed in browser bundle. [
] Production database backup/export plan documented. [ ] Database
migrations are version-controlled. [ ] Error logging/monitoring is
configured at a suitable cost. [ ] Account and data deletion/privacy
requests have a defined process. [ ] Privacy policy and terms reviewed
by the client; seek professional advice where legally necessary. [ ]
Domain, HTTPS, sender email, and production environment configured. [ ]
Recovery plan documented for accidental data changes. [ ] Staff trained
on booking, cancellation, payment collection, and check-in.

CLIENT ACCEPTANCE Have the client test realistic scenarios using a
checklist. Record issues, fix critical/high-priority defects, and obtain
explicit approval before public launch.

======================================================================
PHASE 11 — PRODUCTION LAUNCH AND HANDOVER
======================================================================

GOAL Launch safely and leave the client able to operate the website.

LAUNCH CHECKLIST [ ] Final approval for design, content, prices,
policies, and booking rules. [ ] Official logo and all final images
installed. [ ] Domain points to production hosting. [ ] HTTPS is active.
[ ] Production Supabase project and migrations are correct. [ ]
Production secrets are set correctly. [ ] Authentication redirect URLs
and email templates use the real domain. [ ] RLS and role permissions
tested in production. [ ] Real court/session/coach schedules and prices
entered. [ ] OpenFreeMap configuration, style, attribution, marker, and
directions tested. [ ] Test booking created, checked, cancelled, and
removed/handled appropriately. [ ] Staff understands how to record
pay-later payments. [ ] No test customers, fake bookings, dummy
testimonials, or placeholder content remain. [ ] Analytics/privacy
choices are approved and disclosed where needed. [ ] Monitoring and
support contact are ready. [ ] Client owns or has proper access to the
domain, source code, hosting, Supabase, and provider accounts. [ ]
Handover documentation and staff training are complete.

HANDOVER DOCUMENTS - How to manage courts, open-play sessions, coaches,
prices, and closures. - How to find bookings and check in players. - How
to record payments collected at the club. - How to cancel/reschedule and
record no-shows. - How to manage staff access. - How to respond to
common errors. - Where backups, logs, and environment configuration are
managed. - Recurring costs, renewal dates, provider limits, and account
owners. - Known limitations and approved future features.

POST-LAUNCH - Monitor booking failures and user feedback. - Fix critical
issues before adding extra features. - Review conversion funnel:
homepage visit -> service selection -> available slot -> completed
booking. - Ask real users where they got confused. - Prioritize
improvements based on evidence, not visual trends alone.

======================================================================
PHASE 12 — QR-CODE PAYMENTS AND MANUAL PAYMENT VERIFICATION
======================================================================

GOAL Accept GCash and Maya QR payments, plus a bank-transfer option that
uses the GCash QR only when the payer's bank supports that transfer route,
without integrating payment APIs. The system manages payment instructions,
proof submission, staff review, audit history, and accurate statuses.

CLIENT SETUP REQUIRED BEFORE LIVE PAYMENTS
[ ] Obtain the official GCash QR image and confirm the receiving account
    name shown to payers.
[ ] Obtain the official Maya QR image and confirm the receiving account
    name shown to payers.
[ ] Confirm the QR images are current, readable, and approved for the
    club's intended business use.
[ ] Confirm whether bank transfers to the GCash receiving account are
    actually supported by the payer's banks and what instructions apply.
    Never label the GCash QR as a universal bank-transfer QR.
[ ] Decide whether pay-at-the-club remains available.
[ ] Approve payment deadlines, booking expiry/cancellation rules, proof
    requirements, rejection reasons, refund policy, and staff permissions.
[ ] Never commit real QR images, transaction screenshots, account secrets,
    or private financial data to the source-code repository.

PLAYER PAYMENT FLOW
1. Player selects a service, date/time, and booking option.
2. The server validates availability and creates the booking according to
   the client-approved booking policy.
3. The player chooses one of the available methods:
   - GCash QR: display the club's official GCash QR.
   - Maya QR: display the club's official Maya QR.
   - Bank transfer: display the same GCash QR only if the client confirms
     that the transfer route is supported. Explain the exact supported
     route and do not imply the QR is a bank-specific QR.
   - Pay at the club: display only if the client enables this option.
4. Display the exact amount due, booking reference, recipient/account name,
   payment instructions, and payment submission deadline.
5. Provide a copyable booking reference. Tell players not to change the
   amount and not to share passwords, PINs, or OTPs.
6. Player completes the transfer in their own payment/banking app.
7. Player returns to the website and submits the transaction reference
   where available plus a receipt/screenshot. Validate file type and size.

IMAGE COMPRESSION AND STORAGE-SAVING RULES
- Implement client-side image optimization before upload to Supabase
  Storage because image transformations are not available on the Free plan.
- Set an explicit application upload limit (start with a maximum of 5 MB
  per payment-proof image, subject to client testing); reject larger files
  with a clear message or offer compression before retrying. Supabase's
  Free plan global per-file limit is currently up to 50 MB, but the app
  should enforce a much smaller limit to protect the 1 GB storage quota.
- For photographic uploads, resize to a practical maximum dimension such
  as 1600 px and use a sensible lossy quality setting around 0.80–0.85.
  Aim for roughly 1–2 MB or less when the content remains clear; do not
  promise a fixed output size or perfect quality for every image.
- For payment screenshots/receipts containing small text, amounts, dates,
  or transaction references, prioritize legibility over maximum savings.
  Avoid aggressive lossy compression; preserve PNG when it keeps text
  clearer, or use a high-quality format only after checking readability.
  Show the compressed preview and let the player replace it before upload.
- After optimization, verify that the amount, transaction reference,
  timestamp, and recipient information remain readable at normal zoom.
  Reject or ask for a clearer image if the proof is unreadable.
- NEVER recompress, crop, resize, or convert the club's official GCash
  or Maya QR code source files. Store the approved QR originals and only
  scale them visually in the UI without changing the underlying image.
- Do not store both the original and compressed proof by default; that
  doubles storage usage. Keep the optimized proof unless a client-approved
  audit/legal policy requires retaining the original.
- Compression reduces file size but can reduce image quality. It must be
  tested with realistic receipt screenshots on mobile and desktop before
  release.
8. Set payment status to AWAITING_VERIFICATION. A submitted screenshot is
   not proof that the money reached the club.
9. Staff independently checks the receiving account and matches amount,
   date/time, sender/reference where available, and booking reference.
10. Staff approves or rejects the submission with a reason. Only approval
    after actual receipt changes payment status to PAID.
11. Notify the player of the status change and show it in booking history.
12. If payment cannot be matched, keep it unverified and let staff request
    clarification. Do not automatically confirm payment based on the
    uploaded image or a browser action.

PAYMENT STATUS MODEL
- UNPAID: no proof submitted yet.
- AWAITING_VERIFICATION: player submitted proof; staff has not verified it.
- PAID: staff verified the actual incoming transaction.
- REJECTED: submitted proof was rejected; show a safe, useful reason.
- REFUND_PENDING / PARTIALLY_REFUNDED / REFUNDED: use only when the
  client-approved refund workflow actually applies and staff records it.

Keep booking status separate from payment status. A booking may be
CONFIRMED while payment is AWAITING_VERIFICATION if the client-approved
policy allows the slot to remain reserved. Decide and implement what
happens when the payment deadline expires; do not invent this policy.

STAFF PAYMENT REVIEW
- Show booking reference, player, service, date/time, amount due, chosen
  method, submitted transaction reference, submitted timestamp, and proof.
- Allow authorized staff to approve or reject with a reason.
- Require a deliberate confirmation before marking a payment PAID.
- Record who reviewed it, when, method, amount, and any relevant reference.
- Log all approvals, rejections, edits, and refunds in an audit trail.
- Prevent ordinary players from editing payment status or viewing other
  players' proof files.
- Use private storage and access rules for payment proof uploads. Avoid
  public, guessable proof URLs and avoid retaining proof longer than the
  client-approved retention policy requires.
- Prevent double submissions and duplicate review actions where practical.

SECURITY AND HONESTY RULES
- No payment API, webhook, or automated payment confirmation is assumed.
- Never state that a QR payment is automatically verified.
- Never mark a payment PAID merely because proof was uploaded.
- Validate file type, size, user ownership, booking ownership, amount, and
  allowed status transitions on trusted server/database boundaries.
- Keep service-role keys server-only and enforce Supabase RLS policies.
- Do not store card details, PINs, passwords, or OTPs.
- Keep payment proof private and accessible only to the player who owns
  the booking and authorized staff who need it.
- Keep a reconciliation view for awaiting verification, paid, rejected,
  and refund records.
- Test incorrect amount, duplicate proof, unreadable QR, unsupported bank
  route, expired booking, rejected proof, and unauthorized staff/player
  access.

EXIT CHECK A player can choose the right QR, understand the amount and
instructions, submit proof, and see an honest status. Staff can verify the
actual incoming payment and audit the decision. No screenshot or client-
side action can falsely mark a payment as received.

======================================================================
PHASE 13 — CONDITIONAL LATE PHASE: DUPR READINESS AND API INTEGRATION
======================================================================

GOAL Only if the client confirms the feature is wanted, assess and then connect the club’s approved DUPR workflow after the core booking MVP, staff operations, and data are reliable. This phase may be skipped entirely.

THIS PHASE IS DELIBERATELY LATE Do not build the entire booking system
around assumptions about DUPR. API availability, partner approval,
allowed uses, endpoints, rate limits, fees, data permissions, and
match-submission rules must be confirmed first.

PRE-INTEGRATION CHECKLIST [ ] Client confirms official DUPR account
ownership and the club’s intended workflow. [ ] Obtain official
API/partner documentation and authorized credentials, if available. [ ]
Confirm the integration is permitted for this specific business and use
case. [ ] Confirm what player data can be stored, displayed, and
transmitted. [ ] Confirm how players consent to linking their DUPR
identity. [ ] Confirm how matches are created, reviewed, submitted,
corrected, and disputed. [ ] Confirm supported match formats, required
fields, and validation rules. [ ] Confirm API costs, rate limits,
authentication, sandbox, support, and terms. [ ] Confirm who at the club
is responsible for match verification and submission. [ ] Design the
failure/retry/manual-review process before implementation.

TARGET DUPR FLOW, SUBJECT TO OFFICIAL API CAPABILITIES 1. Player sees a
clearly labeled DUPR-enabled open-play session. 2. Player registers for
the session. 3. If permitted, player links or verifies their DUPR
identity through an approved flow. 4. Staff checks attendance and
confirms who actually played. 5. Staff creates match records with
correct players, teams, format, and scores. 6. System validates
completeness and flags inconsistent results. 7. Authorized staff reviews
the match before submission if required. 8. Server submits the result
through the approved DUPR API only when authorized. 9. System records
external identifiers, submission status, timestamps, and safe error
details. 10. Retries are controlled and idempotent so one match is not
submitted multiple times. 11. Staff can see SUBMITTED, NEEDS_REVIEW,
FAILED, or another status defined by the real integration. 12. Staff can
correct/reconcile failed submissions through an approved workflow. 13.
Players receive only accurate status messaging. Never promise a rating
update until DUPR confirms the applicable result.

DATA AND SECURITY RULES - Store only the data necessary and permitted by
the official terms. - Protect DUPR credentials on the server. - Never
expose API keys in client components. - Use explicit consent where
required. - Keep internal club match records distinct from official
DUPR-submitted records. - Do not scrape DUPR or bypass access
restrictions. - Do not fabricate a working API or pretend a manual
result is an official submission. - If API access is unavailable, retain
a clear manual staff workflow and document the limitation.

EXIT CHECK The client verifies the real end-to-end DUPR workflow with
authorized test access and approves the result/status experience before
production use.

======================================================================
PHASE 14 — CONDITIONAL LATE PHASE: COACHING / APPOINTMENTS
======================================================================

GOAL Add coaching only if the client confirms that coaching appointments are required after the core booking MVP is stable. This phase may be skipped entirely.

PRECONDITIONS [ ] Client explicitly approves coaching as in scope. [ ] Coach/service details, prices, durations, availability, cancellation/rescheduling rules, and any court requirements are confirmed. [ ] The core court and normal open-play booking flows have passed acceptance testing. [ ] The client approves the UI and operational workflow.

IMPLEMENTATION, IF APPROVED - Add coaching services and coach profiles using client-approved information only. - Add coach availability and conflict-safe appointment booking. - Enforce any required court availability and prevent double-booking. - Add staff tools to manage coach schedules, appointments, attendance, cancellations, and rescheduling. - Keep coaching payment handling consistent with the approved manual QR/payment workflow. - Add tests for overlapping appointments, unavailable coaches, required court conflicts, permissions, and cancellation rules.

EXIT CHECK Coaching is tested end-to-end and explicitly accepted by the client. If not approved, document it as out of scope and do not create placeholder coaching functionality.

======================================================================
PHASE 15 — POST-LAUNCH IMPROVEMENTS AND FUTURE FEATURES
======================================================================

Only add features after the basic site is stable and the client/user
evidence justifies them.

Possible future improvements: - Waitlists and automatic promotion when a
spot opens. - Membership plans, packages, or credits. - Promo codes and
referral offers. - Tournaments and event registration. - Player skill
preferences and community features. - Advanced occupancy/revenue
reports. - Multi-branch support if the club expands. - Calendar export
and reminder preferences. - SMS or messaging integrations after
evaluating cost and consent. - Online waiver/signature workflow if
required. - Gift cards or prepaid bundles. - Automated refunds only if
provider and policy rules are safe. - Additional languages if the
customer base needs them. - Better analytics with consent/privacy
considerations. - More advanced DUPR features after authorized
integration is proven.

Do not build a feature merely because it is possible. Each feature must
solve a real club or player problem.

======================================================================
CORE PLAYER JOURNEY — END TO END
======================================================================

1.  Player lands on a visually polished homepage.
2.  Player immediately understands the club, its main services, and how
    to book.
3.  Player checks service details, prices, rules, and location.
4.  Player chooses court reservation, normal open play, DUPR open play,
    or coaching.
5.  Player selects a date and sees accurate availability.
6.  Player selects a valid slot/session and sees the full cost and
    terms.
7.  Player signs in or creates an account at the agreed point.
8.  Server/database revalidates availability and creates the booking
    atomically.
9.  Player sees a clear confirmation/reference and the correct payment
    status.
10. Player receives confirmation/reminders through configured channels.
11. Staff sees the booking in the admin calendar.
12. Staff checks the player in and records payment when actually
    collected.
13. Staff marks the service completed or records a no-show/cancellation.
14. Player can review booking history and relevant status.
15. For QR payment, the player submits proof and staff verifies the actual incoming transaction before payment becomes PAID.
16. If authorized DUPR access is later enabled, reviewed eligible
    results are submitted and reconciled through the approved
    integration.

======================================================================
CORE STAFF JOURNEY — END TO END
======================================================================

1.  Staff signs in with the correct role.
2.  Dashboard highlights today’s bookings, sessions, appointments,
    unpaid bookings, and operational issues.
3.  Staff opens the calendar/list and selects a booking.
4.  Staff confirms customer, service, schedule, and status.
5.  Staff checks in the customer.
6.  Staff collects payment using the club’s accepted method.
7.  Staff records the actual amount, method, time, and responsible staff
    member.
8.  System updates payment status and records an audit event.
9.  Staff handles cancellations, reschedules, closures, and no-shows
    under policy.
10. Manager reviews reports and reconciles outstanding payments.
11. For DUPR-enabled sessions, authorized staff verifies match
    participants/results and uses the approved submission process only
    after the late-phase integration exists.

======================================================================
FINAL DEFINITION OF DONE
======================================================================

The project is not done merely because the homepage looks good or the
build passes.

The website is ready for launch only when: [ ] Client-approved branding,
logo, images, content, pricing, rules, and policies are present. [ ] The
website feels coherent, premium, responsive, and intentionally designed.
[ ] All four service types are represented accurately: court
reservation, normal open play, DUPR-enabled open play,
coaching/appointments. [ ] Booking availability is validated by trusted
database/server logic. [ ] Concurrent requests cannot create conflicting
court bookings or exceed open-play capacity. [ ] Player and staff
permissions are tested. [ ] QR payment instructions are clear and payments are recorded only after staff verifies receipt
only when actually received. [ ] The staff can manage a normal operating
day without developer intervention. [ ] OpenFreeMap displays the correct
club location and required attribution. [ ] Email/confirmation behavior
works if included in the approved scope. [ ] Security, privacy, error
handling, responsive behavior, accessibility, and performance have been
reviewed. [ ] Production ownership, backups, support, recurring costs,
and handover are documented. [ ] QR payments work through submitted proof and manual staff verification; no payment API is required or falsely simulated. [ ] DUPR is either excluded/deferred pending client approval and official authorization, or verified end-to-end with official access in the conditional late phase. Coaching is either excluded/deferred or tested and accepted in its conditional late phase. [ ] Client has completed realistic
acceptance testing and explicitly approved launch.

THE STANDARD Build for trust first, beauty second, and operational
reliability throughout. Beauty earns attention; clarity earns bookings;
reliability earns repeat customers. A million-dollar feel comes from
excellent execution of small details—not from piling on effects,
animations, or fashionable components.
