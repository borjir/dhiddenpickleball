import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { ArrowUpRightIcon } from "@/components/ui/icons";
import { CLUB } from "@/lib/club";

export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden border-t border-line bg-surface">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-lime/50 to-transparent"
      />
      <div className="mx-auto w-full max-w-7xl px-5 py-14 sm:px-8">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Logo size={56} />
            <p className="mt-4 max-w-sm font-display text-xl font-bold leading-tight text-heading">
              Two courts. Open daily.
              <br />
              {CLUB.addressLine}
            </p>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted">
              Court reservations and level-based open play with clear prices,
              GCash payment review, and staff-verified payment. Open daily,
              7:00 AM – 12:00 AM.
            </p>

            <address className="mt-5 max-w-sm not-italic">
              <p className="text-sm font-semibold text-ink">
                {CLUB.addressLine}
              </p>
              <p className="mt-1 text-caption text-muted">
                {CLUB.coordinates}
              </p>
              <ul className="mt-2 space-y-0.5">
                <li>
                  <a
                    href={CLUB.mapUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-ink transition-colors hover:text-accent-ink"
                  >
                    Open in Google Maps
                    <ArrowUpRightIcon className="size-3.5 text-muted" />
                  </a>
                </li>
                <li>
                  <a
                    href={CLUB.phoneHref}
                    className="inline-flex min-h-10 items-center text-sm font-semibold text-ink transition-colors hover:text-accent-ink"
                  >
                    {CLUB.phoneDisplay}
                  </a>
                </li>
                <li>
                  <a
                    href={`mailto:${CLUB.email}`}
                    className="inline-flex min-h-10 items-center break-all text-sm font-semibold text-ink transition-colors hover:text-accent-ink"
                  >
                    {CLUB.email}
                  </a>
                </li>
              </ul>
            </address>
          </div>

          <nav aria-label="Booking links">
            <p className="text-eyebrow font-bold uppercase text-muted">Play</p>
            <ul className="mt-4 space-y-1">
              {[
                { href: "/book", label: "Book a court" },
                { href: "/open-play", label: "Open play" },
                { href: "/courts", label: "The courts" },
                { href: "/#pricing", label: "Rates" },
                { href: "/#how-it-works", label: "How booking works" },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="inline-flex min-h-10 items-center text-sm font-semibold text-ink transition-colors hover:text-accent-ink"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <p className="text-eyebrow font-bold uppercase text-muted">Club</p>
            <ul className="mt-4 space-y-1">
              {[
                { href: "/visit", label: "Visit & hours" },
                { href: "/club", label: "About the club" },
                { href: "/club/rules", label: "Club rules" },
                { href: "/club/faq", label: "Common questions" },
                { href: "/policies/booking", label: "Booking policy" },
                { href: "/policies/payments", label: "Payment policy" },
                { href: "/policies/privacy", label: "Privacy notice" },
                { href: "/policies/terms", label: "Terms of use" },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="inline-flex min-h-10 items-center text-sm font-semibold text-ink transition-colors hover:text-accent-ink"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-line pt-6 text-caption text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 D-Hidden Pickleball Court &amp; Bistro.</p>
          <p className="max-w-xl leading-relaxed">
            Online court booking and open-play registration are live. A court
            request creates a 15-minute hold; payment is arranged with the club
            and verified by staff. No payment is taken on this site. Court
            photography, hours, and rates are supplied by the club. Booking
            confirmation currently shows the project owner&apos;s test GCash QR;
            the club&apos;s official code is still being confirmed.
          </p>
        </div>
      </div>
    </footer>
  );
}
