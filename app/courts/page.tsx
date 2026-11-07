import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { BookingTrigger } from "@/components/booking/booking-trigger";
import { PageHeader } from "@/components/site/page-header";
import { PublicPage } from "@/components/site/public-page";
import { Reveal } from "@/components/motion/reveal";
import { Alert } from "@/components/ui/alert";
import { buttonClasses } from "@/components/ui/button";
import {
  ArrowRightIcon,
  CalendarIcon,
  ClockIcon,
  ShieldIcon,
  WalletIcon,
} from "@/components/ui/icons";
import { CLUB } from "@/lib/club";
import { COURTS } from "@/lib/courts";

export const metadata: Metadata = {
  title: "The courts",
  description:
    `Court 1 and Court 2 at D-Hidden Pickleball Court & Bistro in ${CLUB.addressShort}. Open daily 7:00 AM to 12:00 AM, with hourly start and end times.`,
  robots: { index: false, follow: false },
};

const bookingFacts = [
  {
    icon: CalendarIcon,
    label: "Hours",
    value: "Every day, 7:00 AM – 12:00 AM",
  },
  {
    icon: ClockIcon,
    label: "Court time",
    value: "Choose your start and end time",
  },
  {
    icon: WalletIcon,
    label: "Rates",
    value: "₱250/hr before 5 PM · ₱300/hr from 5 PM",
  },
  {
    icon: ShieldIcon,
    label: "Payment",
    value: "GCash, verified by staff",
  },
];

export default function CourtsPage() {
  return (
    <PublicPage>
      <PageHeader
        eyebrow="The courts"
        title="Two courts. One clear hourly rate."
        intro="Court 1 and Court 2 are bookable daily, 7:00 AM to 12:00 AM. Rates change once, at 5:00 PM."
      >
        <BookingTrigger className={buttonClasses({ size: "lg" })}>
          Book a court
          <ArrowRightIcon className="size-5" />
        </BookingTrigger>
        <Link
          href="/visit"
          className={buttonClasses({ variant: "secondary", size: "lg" })}
        >
          Plan your visit
        </Link>
      </PageHeader>

      <section aria-labelledby="court-list" className="bg-canvas py-16 sm:py-20">
        <div className="mx-auto w-full max-w-7xl px-5 sm:px-8">
          <Reveal>
            <p className="text-eyebrow font-bold uppercase text-accent-ink">
              Pick a side
            </p>
            <h2 id="court-list" className="mt-3 text-title font-bold text-heading">
              Both courts, same simple rates.
            </h2>
          </Reveal>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {COURTS.map((court, index) => (
              <Reveal key={court.slug} delay={index * 0.08}>
                <Link
                  href={`/courts/${court.slug}`}
                  className="group block overflow-hidden rounded-2xl border border-line bg-surface shadow-card transition-[transform,box-shadow] duration-500 ease-out-expo hover:-translate-y-1 hover:shadow-raised"
                >
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <Image
                      src={court.image}
                      alt={court.alt}
                      fill
                      sizes="(min-width: 768px) 50vw, 100vw"
                      className="object-cover transition-transform duration-[900ms] ease-out-expo group-hover:scale-[1.045]"
                    />
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 bg-gradient-to-t from-[#04101f]/80 via-[#04101f]/10 to-transparent"
                    />
                    <span className="absolute left-4 top-4 rounded-full border border-white/25 bg-[#04101f]/60 px-3 py-1.5 text-[0.625rem] font-bold uppercase tracking-[0.16em] text-white backdrop-blur-sm">
                      {court.name}
                    </span>
                  </div>

                  <div className="p-5 sm:p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="font-display text-2xl font-bold text-heading">
                          {court.name}
                        </h3>
                        <p className="mt-2 text-sm leading-relaxed text-muted">
                          {court.summary}
                        </p>
                      </div>
                      <span
                        aria-hidden="true"
                        className="grid size-11 shrink-0 place-items-center rounded-full border border-line bg-canvas text-accent-ink transition-colors duration-300 group-hover:border-brand-blue group-hover:bg-brand-blue group-hover:text-white"
                      >
                        <ArrowRightIcon className="size-5" />
                      </span>
                    </div>

                    <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-line pt-4">
                      <div>
                        <dt className="text-[0.625rem] font-bold uppercase tracking-[0.14em] text-muted">
                          Day rate
                        </dt>
                        <dd className="mt-1 text-sm font-semibold text-heading">
                          ₱250 / hour
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[0.625rem] font-bold uppercase tracking-[0.14em] text-muted">
                          From 5 PM
                        </dt>
                        <dd className="mt-1 text-sm font-semibold text-heading">
                          ₱300 / hour
                        </dd>
                      </div>
                    </dl>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>

          <Alert
            variant="info"
            eyebrow="Booking status"
            title="Court booking is live"
            className="mt-10"
          >
            <p>
              Confirming holds the slot for 15 minutes. Pay by GCash; staff verify
              the transfer before payment is marked paid.
            </p>
          </Alert>
        </div>
      </section>

      <section
        aria-labelledby="booking-facts"
        className="border-y border-line bg-surface py-16 sm:py-20"
      >
        <div className="mx-auto w-full max-w-7xl px-5 sm:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
            <Reveal>
              <p className="text-eyebrow font-bold uppercase text-accent-ink">
                Before you book
              </p>
              <h2
                id="booking-facts"
                className="mt-3 text-title font-bold text-heading"
              >
                What a court booking includes.
              </h2>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-muted">
                Hours, rates, and payment at a glance.
              </p>
              <Link
                href="/club/rules"
                className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-accent-ink"
              >
                Read the club rules
                <ArrowRightIcon className="size-4" />
              </Link>
            </Reveal>

            <dl className="grid gap-x-8 gap-y-7 sm:grid-cols-2">
              {bookingFacts.map((fact, index) => {
                const Icon = fact.icon;
                return (
                  <Reveal key={fact.label} delay={index * 0.06}>
                    <div className="border-t border-line pt-5">
                      <dt className="flex items-center gap-2 text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-muted">
                        <Icon className="size-4 text-brand-lime" />
                        {fact.label}
                      </dt>
                      <dd className="mt-2 text-sm font-semibold leading-relaxed text-heading">
                        {fact.value}
                      </dd>
                    </div>
                  </Reveal>
                );
              })}
            </dl>
          </div>
        </div>
      </section>

      <section className="bg-canvas py-16 sm:py-20">
        <div className="mx-auto w-full max-w-7xl px-5 sm:px-8">
          <div className="relative isolate overflow-hidden rounded-2xl bg-brand-navy-deep px-6 py-12 text-white shadow-raised sm:px-10 sm:py-16">
            <div
              aria-hidden="true"
              className="court-grid absolute inset-0 -z-10 opacity-30"
            />
            <div className="max-w-2xl">
              <p className="text-eyebrow font-bold uppercase text-brand-yellow">
                Court reservations
              </p>
              <h2 className="mt-3 text-title font-bold text-white">
                Pick a court and see the full amount.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-white/70">
                Choose a date, start time, and end time. The full total is shown
                before you confirm.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <BookingTrigger
                  className={buttonClasses({ variant: "inverse", size: "lg" })}
                >
                  Book a court
                  <ArrowRightIcon className="size-5" />
                </BookingTrigger>
                <Link
                  href="/visit"
                  className="inline-flex h-13 items-center justify-center rounded-lg border border-white/25 px-6 text-base font-semibold text-white transition-colors hover:bg-white/10"
                >
                  Find the club
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </PublicPage>
  );
}
