import type { Metadata } from "next";
import Link from "next/link";
import { ClubMap } from "@/components/home/club-map";
import { PageHeader } from "@/components/site/page-header";
import { PublicPage } from "@/components/site/public-page";
import { Reveal } from "@/components/motion/reveal";
import { Alert } from "@/components/ui/alert";
import { buttonClasses } from "@/components/ui/button";
import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  ClockIcon,
  PinIcon,
  WalletIcon,
} from "@/components/ui/icons";
import { CLUB } from "@/lib/club";

export const metadata: Metadata = {
  title: "Visit",
  description:
    "Find D-Hidden Pickleball Court & Bistro at Bung-aw, Pondol, Balamban, Cebu. Open daily 7:00 AM to 12:00 AM. Phone 0956 167 0905.",
  robots: { index: false, follow: false },
};

export default function VisitPage() {
  return (
    <PublicPage>
      <PageHeader
        eyebrow="Visit"
        title="Find the club in Balamban."
        intro="D-Hidden is at Bung-aw, Pondol, Balamban, Cebu. The address, hours, and contact details are written out below, so the map is never the only way to find the club."
      >
        <a
          href={CLUB.mapUrl}
          target="_blank"
          rel="noreferrer"
          className={buttonClasses({ size: "lg" })}
        >
          Get directions
          <ArrowUpRightIcon className="size-4" />
        </a>
        <a
          href={CLUB.phoneHref}
          className={buttonClasses({ variant: "secondary", size: "lg" })}
        >
          Call {CLUB.phoneDisplay}
        </a>
      </PageHeader>

      <section className="bg-canvas py-16 sm:py-20">
        <div className="mx-auto w-full max-w-7xl px-5 sm:px-8">
          <div className="grid gap-6 md:grid-cols-3">
            <Reveal>
              <div className="h-full rounded-2xl border border-line bg-surface p-6 shadow-card">
                <span className="grid size-10 place-items-center rounded-lg bg-brand-blue-soft text-accent-ink">
                  <PinIcon className="size-5" />
                </span>
                <h2 className="mt-4 font-display text-lg font-bold text-heading">
                  Address
                </h2>
                <p className="mt-2 text-sm font-semibold leading-relaxed text-ink">
                  {CLUB.addressFull}
                </p>
                <p className="mt-2 text-caption text-muted">
                  Pin {CLUB.coordinates}
                </p>
                <a
                  href={CLUB.mapUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-accent-ink"
                >
                  Open in Google Maps
                  <ArrowUpRightIcon className="size-3.5" />
                </a>
              </div>
            </Reveal>

            <Reveal delay={0.06}>
              <div className="h-full rounded-2xl border border-line bg-surface p-6 shadow-card">
                <span className="grid size-10 place-items-center rounded-lg bg-brand-lime-soft text-brand-lime-ink">
                  <ClockIcon className="size-5" />
                </span>
                <h2 className="mt-4 font-display text-lg font-bold text-heading">
                  Hours
                </h2>
                <p className="mt-2 text-sm font-semibold text-ink">
                  Monday to Sunday
                </p>
                <p className="mt-1 text-sm text-muted">7:00 AM – 12:00 AM</p>
                <p className="mt-3 text-caption leading-relaxed text-muted">
                  Slots that would run past midnight are not offered. Holiday
                  closures are not published yet.
                </p>
              </div>
            </Reveal>

            <Reveal delay={0.12}>
              <div className="h-full rounded-2xl border border-line bg-surface p-6 shadow-card">
                <span className="grid size-10 place-items-center rounded-lg bg-brand-yellow-soft text-heading">
                  <WalletIcon className="size-5" />
                </span>
                <h2 className="mt-4 font-display text-lg font-bold text-heading">
                  Contact
                </h2>
                <ul className="mt-2 space-y-1">
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
                <p className="mt-2 text-caption leading-relaxed text-muted">
                  Call or email for cancellations, rescheduling, and same-day
                  questions.
                </p>
              </div>
            </Reveal>
          </div>

          <Alert
            variant="info"
            eyebrow="Before you arrive"
            title="Court time is by reservation"
            className="mt-8"
          >
            <p>
              Choose a court and time before you travel. Online court booking is
              live; a confirmed request creates a 15-minute hold. Contact the
              club to arrange payment. Parking, access notes, and other arrival
              details will be published only when the club confirms them.
            </p>
          </Alert>
        </div>
      </section>

      <section className="relative overflow-hidden bg-brand-navy-deep py-16 text-white sm:py-20">
        <div
          aria-hidden="true"
          className="court-grid absolute inset-0 opacity-40"
        />
        <div className="relative mx-auto w-full max-w-7xl px-5 sm:px-8">
          <div className="max-w-2xl">
            <p className="text-eyebrow font-bold uppercase text-brand-yellow">
              The map
            </p>
            <h2 className="mt-3 text-title font-bold text-white">
              The pin is the club&apos;s confirmed location.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-white/70">
              The map loads when it approaches the viewport. If it cannot load,
              the address and the directions link above still work.
            </p>
          </div>
          <div className="mt-8">
            <ClubMap />
          </div>
        </div>
      </section>

      <section className="bg-canvas py-16 sm:py-20">
        <div className="mx-auto w-full max-w-7xl px-5 sm:px-8">
          <div className="grid gap-8 rounded-2xl border border-line bg-surface p-6 shadow-card sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-eyebrow font-bold uppercase text-accent-ink">
                Next step
              </p>
              <h2 className="mt-2 text-heading font-semibold text-heading">
                See the courts and the rates.
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
                Two courts, hourly start and end times, and one rate change at
                5:00 PM. The full amount is shown before you confirm.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/courts"
                className={buttonClasses({ size: "lg" })}
              >
                View the courts
                <ArrowRightIcon className="size-5" />
              </Link>
              <Link
                href="/club/rules"
                className={buttonClasses({ variant: "secondary", size: "lg" })}
              >
                Club rules
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PublicPage>
  );
}
