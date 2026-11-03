import type { Metadata } from "next";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export const metadata: Metadata = {
  title: "Design review index",
  description:
    "Review index for the Phase 3 interface system and booking preview of the D-Hidden Pickleball Court & Bistro website.",
  robots: { index: false, follow: false },
};

const implemented = [
  "Semantic light and dark themes with a saved preference and no first-paint flash",
  "Photography-led homepage with restrained entrance, hover, and disclosure motion",
  "Responsive court-reservation flow with skeleton loading, empty, error, and submitted states",
  "Official logo, court photography, and a labeled sample payment QR",
  "Client answers from 30 October applied; unconfirmed rules remain labeled",
  "15-minute hold, its payment deadline, and the cancellation outcome set by the project owner",
  "Test-mode payment path that walks the paid states without a real transfer",
  "Design-system reference updated with the new tokens, states, and components",
  "Reusable stepper, summary, status pair, policy notice, and payment-instruction components",
];

const pending = [
  "Weekend rate, partial-hour and cross-5:00-PM rounding",
  "Booking window, buffer time, and maximum players per court",
  "Holiday closures and publishable facilities",
  "Open-play schedule, price, capacity, and waitlist rules",
  "Named staff accounts and permission split",
  "Publishable social links",
  "The club's real GCash QR and receiving account name",
];

export default function DesignPreviewIndexPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Logo size={64} />
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Badge variant="lime" dot>
            Phase 3 revision
          </Badge>
        </div>
      </div>

      <p className="mt-10 text-eyebrow font-bold uppercase text-accent-ink">
        Review index
      </p>
      <h1 className="mt-3 max-w-2xl text-title font-bold text-heading">
        Interface system and booking preview
      </h1>
      <p className="mt-3 max-w-2xl text-body-lg text-muted">
        The homepage is now a presentation-quality preview at the root route. The
        booking flow demonstrates states with local browser data only: no
        booking, account, payment, or personal information is created anywhere in
        this build.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/" className={buttonClasses({ size: "lg" })}>
          Open the homepage
        </Link>
        <Link
          href="/design-preview/booking"
          className={buttonClasses({ variant: "secondary", size: "lg" })}
        >
          Open booking preview
        </Link>
        <Link
          href="/design-system"
          className={buttonClasses({ variant: "secondary", size: "lg" })}
        >
          Open design system
        </Link>
      </div>

      <Alert
        variant="warning"
        eyebrow="Preview policy"
        title="Confirmed club details only; open rules stay labeled"
        className="mt-10"
      >
        Hours, courts, rates, durations, account requirements, and the GCash
        review model come from the club. Dates, availability, the sample GCash
        code, the hold timer, and parts of the cancellation policy remain
        labeled stand-ins and must not be treated as final.
      </Alert>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <section className="rounded-xl border border-line bg-surface p-5 shadow-card sm:p-6">
          <h2 className="text-heading font-semibold text-heading">
            Included in this revision
          </h2>
          <ul className="mt-4 space-y-3">
            {implemented.map((item) => (
              <li
                key={item}
                className="flex gap-2.5 text-sm leading-relaxed text-muted"
              >
                <span
                  aria-hidden="true"
                  className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-lime"
                />
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-line bg-surface p-5 shadow-card sm:p-6">
          <h2 className="text-heading font-semibold text-heading">
            Still needed from the club
          </h2>
          <ul className="mt-4 space-y-3">
            {pending.map((item) => (
              <li
                key={item}
                className="flex gap-2.5 text-sm leading-relaxed text-muted"
              >
                <span
                  aria-hidden="true"
                  className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-yellow"
                />
                {item}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="mt-6 rounded-xl border border-line bg-surface p-5 shadow-card sm:p-6">
        <h2 className="text-heading font-semibold text-heading">
          Deliberately deferred
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
          The real booking engine, player accounts, staff operations,
          notifications, and QR payment verification belong to later blueprint
          phases. The preview holds no inventory and sends no personal or payment
          data. Coaching and DUPR integration remain conditional and unapproved,
          so no related pages, tables, or endpoints exist in this build.
        </p>
        <p className="mt-3 text-caption text-muted">
          Scope reference: blueprint sections “UI/UX design system and premium
          frontend” and the Phase 2 booking-flow requirements.
        </p>
      </section>

      <footer className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6 text-sm text-muted">
        <p>
          Full decisions and limitations are recorded in{" "}
          <code className="rounded-sm bg-surface px-1.5 py-0.5 font-mono text-xs text-ink">
            docs/PHASE_3_DESIGN.md
          </code>
          ,{" "}
          <code className="rounded-sm bg-surface px-1.5 py-0.5 font-mono text-xs text-ink">
            docs/DESIGN_BRIEF.md
          </code>
          , and{" "}
          <code className="rounded-sm bg-surface px-1.5 py-0.5 font-mono text-xs text-ink">
            docs/PROJECT_STATUS.md
          </code>
          .
        </p>
        <Link
          href="/"
          className="inline-flex min-h-11 items-center font-semibold text-accent-ink"
        >
          Back to homepage
        </Link>
      </footer>
    </main>
  );
}
