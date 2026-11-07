import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookingTrigger } from "@/components/booking/booking-trigger";
import { PublicPage } from "@/components/site/public-page";
import { Alert } from "@/components/ui/alert";
import { buttonClasses } from "@/components/ui/button";
import {
  ArrowRightIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ClockIcon,
  PinIcon,
  WalletIcon,
} from "@/components/ui/icons";
import { CLUB } from "@/lib/club";
import { COURTS, getCourt } from "@/lib/courts";

type CourtPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return COURTS.map((court) => ({ slug: court.slug }));
}

export async function generateMetadata({
  params,
}: CourtPageProps): Promise<Metadata> {
  const { slug } = await params;
  const court = getCourt(slug);

  if (!court) {
    return { title: "Court not found", robots: { index: false, follow: false } };
  }

  return {
    title: court.name,
    description: `${court.name} at D-Hidden Pickleball Court & Bistro, ${CLUB.addressLine}. Open daily 7:00 AM to 12:00 AM with hourly start and end times.`,
    robots: { index: false, follow: false },
  };
}

const bookingRules = [
  "No account is needed. Enter the booker's full name and mobile number at review, after the date, time, and price are shown; email is optional.",
  "One person may book for a group; only the booker's name is required.",
  "A confirmed request holds the slot for 15 minutes. Payment is due in the same window.",
  "Cancel at least 24 hours before court time for a full refund or one free move. Self-service changes are not available.",
  "No-shows and late arrivals are not refunded or extended.",
];

export default async function CourtPage({ params }: CourtPageProps) {
  const { slug } = await params;
  const court = getCourt(slug);

  if (!court) notFound();

  return (
    <PublicPage>
      <div className="bg-canvas">
        <div className="mx-auto w-full max-w-7xl px-5 pt-6 sm:px-8">
          <nav aria-label="Breadcrumb" className="text-sm text-muted">
            <Link
              href="/courts"
              className="inline-flex min-h-10 items-center gap-1.5 font-semibold text-accent-ink transition-colors hover:text-heading"
            >
              <ChevronDownIcon className="size-4 rotate-90" />
              All courts
            </Link>
          </nav>
        </div>

        <section className="mx-auto w-full max-w-7xl px-5 py-6 sm:px-8 sm:py-10">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start lg:gap-12">
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-line shadow-card">
              <Image
                src={court.image}
                alt={court.alt}
                fill
                priority
                sizes="(min-width: 1024px) 58vw, 100vw"
                className="object-cover"
              />
            </div>

            <div>
              <p className="text-eyebrow font-bold uppercase text-accent-ink">
                The courts
              </p>
              <h1 className="mt-3 text-title font-bold text-heading">
                {court.name}
              </h1>
              <p className="mt-4 text-body-lg leading-relaxed text-muted">
                {court.summary}
              </p>

              <dl className="mt-7 divide-y divide-line border-y border-line">
                {[
                  {
                    label: "Hours",
                    value: "Every day, 7:00 AM – 12:00 AM",
                    icon: ClockIcon,
                  },
                  {
                    label: "Court time",
                    value: "Choose your start and end time",
                    icon: ClockIcon,
                  },
                  {
                    label: "Day rate",
                    value: "₱250 per hour before 5:00 PM",
                    icon: WalletIcon,
                  },
                  {
                    label: "Evening rate",
                    value: "₱300 per hour from 5:00 PM",
                    icon: WalletIcon,
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.label}
                      className="flex items-start justify-between gap-6 py-3.5"
                    >
                      <dt className="flex items-center gap-2 text-sm text-muted">
                        <Icon className="size-4 text-brand-lime" />
                        {item.label}
                      </dt>
                      <dd className="max-w-[16rem] text-right text-sm font-semibold leading-relaxed text-heading">
                        {item.value}
                      </dd>
                    </div>
                  );
                })}
              </dl>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <BookingTrigger className={buttonClasses({ size: "lg" })}>
                  Book this court
                  <ArrowRightIcon className="size-5" />
                </BookingTrigger>
                <Link
                  href="/courts"
                  className={buttonClasses({
                    variant: "secondary",
                    size: "lg",
                  })}
                >
                  Compare both courts
                </Link>
              </div>
              <p className="mt-3 text-caption text-muted">
                Live booking creates a 15-minute hold. No payment is taken on
                this site.
              </p>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="court-details"
          className="border-y border-line bg-surface py-16 sm:py-20"
        >
          <div className="mx-auto w-full max-w-7xl px-5 sm:px-8">
            <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
              <div>
                <p className="text-eyebrow font-bold uppercase text-accent-ink">
                  Court details
                </p>
                <h2
                  id="court-details"
                  className="mt-3 text-title font-bold text-heading"
                >
                  Confirmed facts only.
                </h2>
                <p className="mt-4 text-sm leading-relaxed text-muted">
                  {court.name} is one of two bookable courts at the club. The
                  club has not confirmed a facilities list yet, so this page does
                  not claim lighting, covered areas, parking, or other amenities.
                </p>

                <div className="mt-7 rounded-xl border border-line bg-canvas p-4">
                  <p className="flex items-start gap-2.5 text-sm leading-relaxed text-ink/80">
                    <CheckCircleIcon className="mt-0.5 size-4 shrink-0 text-brand-lime" />
                    Group bookings are allowed. Only the booker&apos;s name is
                    required.
                  </p>
                </div>
              </div>

              <div>
                <p className="text-eyebrow font-bold uppercase text-accent-ink">
                  Booking rules
                </p>
                <h2 className="mt-3 text-title font-bold text-heading">
                  What applies to every court.
                </h2>
                <ul className="mt-5 space-y-3">
                  {bookingRules.map((rule) => (
                    <li
                      key={rule}
                      className="flex gap-2.5 text-sm leading-relaxed text-muted"
                    >
                      <span
                        aria-hidden="true"
                        className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-lime"
                      />
                      {rule}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/club/rules"
                  className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-accent-ink"
                >
                  Read the full club rules
                  <ArrowRightIcon className="size-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-canvas py-16 sm:py-20">
          <div className="mx-auto w-full max-w-7xl px-5 sm:px-8">
            <div className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-start lg:gap-12">
              <div>
                <p className="text-eyebrow font-bold uppercase text-accent-ink">
                  Availability
                </p>
                <h2 className="mt-3 text-title font-bold text-heading">
                  Check live court availability.
                </h2>
                <p className="mt-4 max-w-lg text-sm leading-relaxed text-muted">
                  The booking page reads the club&apos;s live schedule for both
                  courts, shows the computed amount, and creates a 15-minute hold
                  when you confirm.
                </p>
                <Alert
                  variant="info"
                  eyebrow="Payment note"
                  title="The club&apos;s payment QR is still pending"
                  className="mt-6"
                >
                  <p>
                    Bookings can be requested now. Contact the club with your
                    booking reference to arrange payment; no payment is taken on
                    this site.
                  </p>
                </Alert>
              </div>

              <div className="rounded-2xl border border-line bg-surface p-6 shadow-card sm:p-7">
                <div className="flex items-center gap-2 text-sm font-semibold text-heading">
                  <PinIcon className="size-4 text-accent-ink" />
                  {CLUB.addressLine}
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  The club is open daily from 7:00 AM to 12:00 AM. The address is
                  written here so the map is not the only way to find it.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <a
                    href={CLUB.mapUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={buttonClasses({ variant: "secondary", size: "md" })}
                  >
                    Get directions
                  </a>
                  <Link
                    href="/visit"
                    className="inline-flex min-h-11 items-center text-sm font-semibold text-accent-ink"
                  >
                    Visit page
                    <ArrowRightIcon className="ml-1 size-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </PublicPage>
  );
}
