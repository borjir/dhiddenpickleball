import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/site/page-header";
import { PublicPage } from "@/components/site/public-page";
import { Alert } from "@/components/ui/alert";
import { ArrowRightIcon, ClockIcon, ShieldIcon, WalletIcon } from "@/components/ui/icons";
import { CLUB } from "@/lib/club";
import { POLICY_UPDATED } from "@/lib/policies";

export const metadata: Metadata = {
  title: "Club rules",
  description:
    "Court hours, rates, booking, payment, hold, and cancellation rules for D-Hidden Pickleball Court & Bistro.",
  robots: { index: false, follow: false },
};

type RuleSection = {
  id: string;
  heading: string;
  paragraphs?: readonly string[];
  items?: readonly string[];
};

const sections: readonly RuleSection[] = [
  {
    id: "hours-and-courts",
    heading: "Hours and courts",
    items: [
      "The club is open every day from 7:00 AM to 12:00 AM.",
      "Court 1 and Court 2 are bookable by the hour.",
      "A session that would run past midnight is not offered.",
      "Holiday and maintenance closures are not published yet. Contact the club before travelling on a holiday.",
    ],
  },
  {
    id: "rates-and-durations",
    heading: "Rates and durations",
    paragraphs: [
      "Court time is priced per court-hour. The rate changes once at 5:00 PM.",
    ],
    items: [
      "₱250 per court-hour before 5:00 PM.",
      "₱300 per court-hour from 5:00 PM.",
      "Choose your start and end time. The amount is based on the hourly rate.",
      "Weekend pricing and partial-hour rounding are still being confirmed, so they are not stated as policy here.",
    ],
  },
  {
    id: "booking-and-account",
    heading: "Booking details",
    items: [
      "No account is needed. Enter the booker's full name and mobile number at review, after the date, time, and price are shown. An email address is optional.",
      "The reference and mobile number are how you check the booking, download the QR pass, and upload payment proof later.",
      "One person may book for a group. Only the booker's name is required; a full player roster is not.",
      "Keep the QR code and reference private. Anyone with them and the mobile number can view the booking.",
    ],
  },
  {
    id: "payment-and-hold",
    heading: "Payment and hold",
    items: [
      "GCash is the confirmed payment method for court bookings.",
      "A confirmed request holds the slot for 15 minutes. The payment deadline is the same window.",
      "Uploading proof moves the payment to awaiting verification; it does not mark the payment as paid.",
      "Staff verify the actual incoming transfer before a payment becomes paid.",
      "If the deadline passes without payment, the request is cancelled and the slot returns to the schedule.",
    ],
  },
  {
    id: "cancellation-and-rescheduling",
    heading: "Cancellation and rescheduling",
    items: [
      "Cancel at least 24 hours before court time for a full refund to the paying GCash number, or one free move to another slot.",
      "Cancel inside 24 hours: the court fee is not refunded and the slot is released to other players.",
      "Reschedule at least 24 hours ahead: one free move per booking, subject to availability.",
      "No-show: no refund and no extension.",
      "Late arrival: the booking still ends at its scheduled time, with no extension or partial refund.",
      "Club closure for weather or maintenance: full refund or a free move, at the player's choice.",
      "Self-service cancellation and rescheduling are not available. Contact the club to make the change.",
    ],
  },
  {
    id: "group-bookings",
    heading: "Group bookings",
    paragraphs: [
      "One person may book for a group. Only the booker's name is required. The maximum number of players per court has not been confirmed, so no limit is published here.",
    ],
  },
  {
    id: "still-being-confirmed",
    heading: "Still being confirmed",
    paragraphs: [
      "The club has not confirmed weekend pricing, partial-hour rounding, buffer time between bookings, how far ahead bookings open, same-day cutoffs, maximum players per court, holiday closures, the facilities list, or the official GCash QR and receiving account name. These are left open rather than stated as rules.",
    ],
  },
  {
    id: "contact",
    heading: "Contact",
    paragraphs: [
      `For a cancellation, reschedule, or a question about a booking, contact the club at ${CLUB.phoneDisplay} or ${CLUB.email}.`,
    ],
  },
];

export default function ClubRulesPage() {
  return (
    <PublicPage>
      <PageHeader
        eyebrow="Club rules"
        title="How a booking works at D-Hidden."
        intro="The confirmed court, booking, payment, and cancellation rules in one place. Anything still awaiting the club's answer is named as open."
      />

      <section className="bg-canvas py-12 sm:py-16">
        <div className="mx-auto w-full max-w-7xl px-5 sm:px-8">
          <div className="mb-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-caption text-muted">
            <span className="inline-flex items-center gap-1.5">
              <ClockIcon className="size-4 text-brand-lime" />
              Current as of {POLICY_UPDATED}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldIcon className="size-4 text-brand-lime" />
              Public copy approved — {POLICY_UPDATED}
            </span>
          </div>

          <Alert
            variant="info"
            eyebrow="Policy status"
            title="These rules reflect the club's current decisions"
            className="mb-10"
          >
            <p>
              The public copy was approved on {POLICY_UPDATED}. Facilities,
              holiday closures, weekend pricing, and the official GCash QR
              remain open and are not stated as rules.
            </p>
          </Alert>

          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_15rem] lg:gap-16">
            <div className="space-y-10">
              {sections.map((section) => (
                <section
                  key={section.id}
                  id={section.id}
                  aria-labelledby={`${section.id}-title`}
                  className="scroll-mt-28 border-t border-line pt-8 first:border-t-0 first:pt-0"
                >
                  <h2
                    id={`${section.id}-title`}
                    className="font-display text-2xl font-bold text-heading"
                  >
                    {section.heading}
                  </h2>
                  {section.paragraphs?.map((paragraph) => (
                    <p
                      key={paragraph}
                      className="mt-3 text-base leading-relaxed text-muted"
                    >
                      {paragraph}
                    </p>
                  ))}
                  {section.items ? (
                    <ul className="mt-4 space-y-3">
                      {section.items.map((item) => (
                        <li
                          key={item}
                          className="flex gap-2.5 text-base leading-relaxed text-muted"
                        >
                          <span
                            aria-hidden="true"
                            className="mt-2.5 size-1.5 shrink-0 rounded-full bg-brand-lime"
                          />
                          {item}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </section>
              ))}

              <div className="border-t border-line pt-8">
                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/policies/booking"
                    className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-line-strong bg-surface px-4 text-sm font-semibold text-heading transition-colors hover:bg-brand-blue-soft/60"
                  >
                    Booking policy
                    <ArrowRightIcon className="size-4" />
                  </Link>
                  <Link
                    href="/policies/payments"
                    className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-line-strong bg-surface px-4 text-sm font-semibold text-heading transition-colors hover:bg-brand-blue-soft/60"
                  >
                    Payment policy
                    <ArrowRightIcon className="size-4" />
                  </Link>
                  <Link
                    href="/policies/privacy"
                    className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-line-strong bg-surface px-4 text-sm font-semibold text-heading transition-colors hover:bg-brand-blue-soft/60"
                  >
                    Privacy notice
                    <ArrowRightIcon className="size-4" />
                  </Link>
                  <Link
                    href="/policies/terms"
                    className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-line-strong bg-surface px-4 text-sm font-semibold text-heading transition-colors hover:bg-brand-blue-soft/60"
                  >
                    Terms of use
                    <ArrowRightIcon className="size-4" />
                  </Link>
                  <Link
                    href="/club/faq"
                    className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-line-strong bg-surface px-4 text-sm font-semibold text-heading transition-colors hover:bg-brand-blue-soft/60"
                  >
                    Common questions
                    <ArrowRightIcon className="size-4" />
                  </Link>
                </div>
              </div>
            </div>

            <aside>
              <nav
                aria-label="On this page"
                className="rounded-2xl border border-line bg-surface p-5 shadow-card lg:sticky lg:top-28"
              >
                <p className="text-eyebrow font-bold uppercase text-muted">
                  On this page
                </p>
                <ul className="mt-3 space-y-1">
                  {sections.map((section) => (
                    <li key={section.id}>
                      <a
                        href={`#${section.id}`}
                        className="inline-flex min-h-9 items-center text-sm font-semibold text-ink transition-colors hover:text-accent-ink"
                      >
                        {section.heading}
                      </a>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 border-t border-line pt-4">
                  <p className="flex items-center gap-1.5 text-caption font-semibold text-muted">
                    <WalletIcon className="size-4 text-brand-lime" />
                    GCash, verified by staff
                  </p>
                </div>
              </nav>
            </aside>
          </div>
        </div>
      </section>
    </PublicPage>
  );
}
