import Image from "next/image";
import Link from "next/link";
import { ClubMapLazy } from "@/components/home/club-map-lazy";
import { Faq } from "@/components/home/faq";
import { HeroMedia } from "@/components/home/hero-media";
import { FadeIn, Reveal } from "@/components/motion/reveal";
import { Logo } from "@/components/brand/logo";
import { BookingTrigger } from "@/components/booking/booking-trigger";
import { OpenPlayTrigger } from "@/components/booking/open-play-trigger";
import { buttonClasses } from "@/components/ui/button";import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  BallIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  CourtIcon,
  PinIcon,
  ShieldIcon,
  WalletIcon,
} from "@/components/ui/icons";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { CLUB } from "@/lib/club";
import { COURTS } from "@/lib/courts";
import { OPEN_PLAY_ENABLED } from "@/lib/features";

const steps = [
  {
    number: "01",
    title: "Pick your time",
    body: "Choose a date and tap open hours. Add another time if you need it.",
    icon: CalendarIcon,
    detail: "Live availability",
  },
  {
    number: "02",
    title: "Check the total",
    body: "See the court, time, and full price before you enter your details.",
    icon: CourtIcon,
    detail: "No surprise total",
  },
  {
    number: "03",
    title: "Pay by GCash",
    body: "Upload your proof. Staff verify the transfer before payment is marked paid.",
    icon: WalletIcon,
    detail: "Verified by staff",
  },
];

/** Hero photography cycles continuously. Append another club photo to extend it. */
const heroSlides = [
  {
    src: "/courts/pickleball2-1376.webp",
    srcSet:
      "/courts/pickleball2-960.webp 960w, /courts/pickleball2-1376.webp 1376w",
    alt: "Doubles play on a pickleball court with hills and sea in the background",
  },
  {
    src: "/courts/pickleball1.jpg",
    alt: "Players rallying on a blue pickleball court behind the net",
  },
];

const promises = [
  {
    icon: ShieldIcon,
    title: "Payment is verified, never assumed",
    body: "Uploading a screenshot never marks a booking as paid. Staff check the transfer.",
  },
  {
    icon: ClockIcon,
    title: "A clear cancellation cutoff",
    body: "Cancel at least 24 hours before court time. Contact the club for changes.",
  },
  {
    icon: CheckCircleIcon,
    title: "The price is settled up front",
    body: "The hourly rate and full total are shown before you confirm.",
  },
  {
    icon: BallIcon,
    title: "Built for groups",
    body: "Book for your group with only the booker's name. No roster needed.",
  },
];

export function HomePage() {
  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative isolate flex min-h-[82svh] items-end overflow-hidden bg-brand-navy-deep pb-10 pt-32 sm:pb-14 lg:min-h-[88svh]">
          <div className="absolute inset-0 -z-20">
            <HeroMedia slides={heroSlides} />
          </div>
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-[linear-gradient(100deg,rgba(4,14,30,0.94)_0%,rgba(5,20,40,0.78)_46%,rgba(5,20,40,0.28)_100%)]"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(4,14,30,0.55)_0%,transparent_35%,rgba(4,14,30,0.86)_100%)]"
          />
          <div
            aria-hidden="true"
            className="court-grid absolute inset-0 -z-10 opacity-40"
          />

          <div className="mx-auto w-full max-w-7xl px-5 sm:px-8">
            <div className="flex flex-col gap-12 lg:flex-row lg:items-end lg:justify-between lg:gap-16">
              <div className="max-w-3xl">
                <FadeIn>
                  <p className="inline-flex items-center gap-2.5 rounded-full border border-white/20 bg-white/[0.08] px-3.5 py-1.5 text-[0.6875rem] font-bold uppercase tracking-[0.16em] text-white/85 backdrop-blur-sm">
                    <span
                      aria-hidden="true"
                      className="size-1.5 rounded-full bg-brand-lime shadow-[0_0_0_4px_rgba(120,181,27,0.22)]"
                    />
                    {CLUB.addressShort} · Open daily 7:00 AM – 12:00 AM
                  </p>
                </FadeIn>

                <FadeIn delay={0.08}>
                  <h1 className="mt-6 text-display font-extrabold text-white">
                    Court time,
                    <br />
                    <span className="text-brand-yellow">zero guesswork.</span>
                  </h1>
                </FadeIn>

                <FadeIn delay={0.16}>
                  <p className="mt-6 max-w-xl text-base leading-relaxed text-white/80 sm:text-lg">
                    Two courts in {CLUB.addressShort}. See live times, the full
                    price, and the payment steps before you book.
                  </p>
                </FadeIn>

                <FadeIn delay={0.24}>
                  <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <BookingTrigger
                      className={buttonClasses({
                        size: "lg",
                        className: "w-full shadow-glow sm:w-auto",
                      })}
                    >
                      Book a court
                      <ArrowRightIcon className="size-5 transition-transform duration-200 group-hover:translate-x-0.5" />
                    </BookingTrigger>
                    {OPEN_PLAY_ENABLED ? (
                      <OpenPlayTrigger
                        className="group inline-flex h-13 w-full items-center justify-center gap-2 rounded-lg border border-white/25 bg-white/[0.06] px-6 text-base font-semibold text-white backdrop-blur-sm transition-colors duration-200 hover:border-white/50 hover:bg-white/15 sm:w-auto"
                      >
                        See open play
                        <ArrowRightIcon className="size-4 text-white/70 transition-transform duration-200 group-hover:translate-x-0.5" />
                      </OpenPlayTrigger>
                    ) : null}
                  </div>
                  <p className="mt-3 text-[0.6875rem] text-white/50">
                    Book online. Your slot is held for 15 minutes while you pay
                    by GCash.
                  </p>
                </FadeIn>

                <FadeIn delay={0.32}>
                  <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-white/15 pt-5">
                    {[
                      ["₱250", "per hour before 5 PM"],
                      ["₱300", "per hour from 5 PM"],
                      ["Hourly", "choose your own end time"],
                    ].map(([value, label]) => (
                      <div key={label}>
                        <dt className="font-display text-xl font-bold text-white sm:text-2xl">
                          {value}
                        </dt>
                        <dd className="mt-1 text-[0.6875rem] leading-snug text-white/60">
                          {label}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </FadeIn>
              </div>

              <FadeIn delay={0.4} className="w-full lg:max-w-sm">
                <aside
                  aria-label="Club booking facts"
                  className="relative overflow-hidden rounded-2xl border border-white/15 bg-[#061426]/90 p-5 text-white shadow-raised backdrop-blur-xl sm:p-6"
                >
                  <div
                    aria-hidden="true"
                    className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-yellow/70 to-transparent"
                  />
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[0.625rem] font-bold uppercase tracking-[0.18em] text-brand-yellow">
                        Court reservations
                      </p>
                      <p className="mt-2 font-display text-xl font-bold leading-tight">
                        Ready when you are.
                      </p>
                    </div>
                    <Logo size={44} className="opacity-95" />
                  </div>

                  <dl className="mt-5 space-y-3 border-t border-white/10 pt-4 text-sm">
                    {[
                      ["Courts", "Court 1 · Court 2"],
                      ["Open", "7:00 AM – 12:00 AM daily"],
                      ["Court time", "Choose start and end"],
                      ["Payment", "GCash · staff verified"],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="flex items-baseline justify-between gap-4"
                      >
                        <dt className="text-white/55">{label}</dt>
                        <dd className="text-right font-semibold text-white">
                          {value}
                        </dd>
                      </div>
                    ))}
                  </dl>

                  <BookingTrigger
                    className={buttonClasses({
                      variant: "inverse",
                      size: "md",
                      className: "mt-5 w-full",
                    })}
                  >
                    Check availability
                    <ArrowRightIcon className="size-4" />
                  </BookingTrigger>
                  <p className="mt-2.5 text-center text-[0.6875rem] text-white/45">
                    Live availability · 15-minute hold
                  </p>
                </aside>
              </FadeIn>
            </div>
          </div>
        </section>

        {/* Courts */}
        <section
          id="courts"
          aria-labelledby="courts-title"
          className="scroll-mt-24 bg-canvas py-14 sm:py-20"
        >
          <div className="mx-auto w-full max-w-7xl px-5 sm:px-8">
            <Reveal>
              <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                <div className="max-w-2xl">
                  <p className="text-eyebrow font-bold uppercase text-accent-ink">
                    The courts
                  </p>
                  <h2
                    id="courts-title"
                    className="mt-3 text-title font-bold text-heading"
                  >
                    Two courts. Pick your side.
                  </h2>
                  <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
                    Both courts are bookable by the hour, daily. Pick a side;
                    the time and price follow you through checkout.
                  </p>
                </div>
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-muted">
                  <span
                    aria-hidden="true"
                    className="size-2 rounded-full bg-brand-lime"
                  />
                  Club photography
                </p>
              </div>
            </Reveal>

            <div className="mt-10 grid gap-6 md:grid-cols-2">
              {COURTS.map((court, index) => (
                <Reveal key={court.name} delay={index * 0.08}>
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
                        className="absolute inset-0 bg-gradient-to-t from-[#04101f]/85 via-[#04101f]/10 to-transparent"
                      />
                      <span className="absolute left-4 top-4 rounded-full border border-white/25 bg-[#04101f]/60 px-3 py-1.5 text-[0.625rem] font-bold uppercase tracking-[0.16em] text-white backdrop-blur-sm">
                        {court.name}
                      </span>
                      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 text-white sm:p-6">
                        <div>
                          <p className="font-display text-2xl font-bold leading-none">
                            {court.name}
                          </p>
                          <p className="mt-2 text-sm text-white/70">
                            ₱250/hr before 5 PM · ₱300/hr after
                          </p>
                        </div>
                        <span
                          aria-hidden="true"
                          className="grid size-11 shrink-0 place-items-center rounded-full border border-white/30 bg-white/10 transition-colors duration-300 group-hover:border-brand-yellow group-hover:bg-brand-yellow group-hover:text-brand-navy"
                        >
                          <ArrowRightIcon className="size-5" />
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4 sm:px-6">
                      <span className="inline-flex items-center gap-2 text-sm text-muted">
                        <ClockIcon className="size-4 text-brand-lime" />
                        Choose your start and end time
                      </span>
                      <span className="text-sm font-semibold text-accent-ink">
                        View court
                      </span>
                    </div>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section
          id="pricing"
          aria-labelledby="pricing-title"
          className="scroll-mt-24 border-y border-line bg-surface py-14 sm:py-20"
        >
          <div className="mx-auto w-full max-w-7xl px-5 sm:px-8">
            <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-16">
              <Reveal>
                <p className="text-eyebrow font-bold uppercase text-accent-ink">
                  Rates
                </p>
                <h2
                  id="pricing-title"
                  className="mt-3 text-title font-bold text-heading"
                >
                  Simple hourly rates.
                  <br />
                  Nothing buried.
                </h2>
                <p className="mt-4 max-w-md text-base leading-relaxed text-muted">
                  Day rate before 5:00 PM, evening rate after. The full amount
                  appears before you confirm.
                </p>
                <BookingTrigger
                  className={buttonClasses({ size: "lg", className: "mt-7" })}
                >
                  Start a booking
                  <ArrowRightIcon className="size-5" />
                </BookingTrigger>
              </Reveal>

              <Reveal delay={0.1}>
                <div className="relative overflow-hidden rounded-2xl border border-brand-navy/20 bg-brand-navy p-6 text-white shadow-raised sm:p-8">
                  <div
                    aria-hidden="true"
                    className="court-grid absolute inset-0 opacity-30"
                  />
                  <div className="relative">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[0.625rem] font-bold uppercase tracking-[0.18em] text-brand-yellow">
                        Court time
                      </p>
                      <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-white/75">
                        Two courts
                      </span>
                    </div>

                    <div className="mt-6 space-y-1">
                      <div className="flex items-end justify-between gap-4 border-b border-white/12 py-4 first:pt-0">
                        <div>
                          <p className="font-display text-base font-semibold">
                            Day rate
                          </p>
                          <p className="mt-1 text-sm text-white/55">
                            Before 5:00 PM
                          </p>
                        </div>
                        <p className="text-right font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
                          ₱250
                          <span className="ml-1 text-sm font-semibold text-white/50">
                            /hr
                          </span>
                        </p>
                      </div>
                      <div className="flex items-end justify-between gap-4 border-b border-white/12 py-4">
                        <div>
                          <p className="font-display text-base font-semibold">
                            Evening rate
                          </p>
                          <p className="mt-1 text-sm text-white/55">
                            From 5:00 PM
                          </p>
                        </div>
                        <p className="text-right font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
                          ₱300
                          <span className="ml-1 text-sm font-semibold text-white/50">
                            /hr
                          </span>
                        </p>
                      </div>
                      <div className="flex items-end justify-between gap-4 py-4">
                        <div>
                          <p className="font-display text-base font-semibold">
                            Court time
                          </p>
                          <p className="mt-1 text-sm text-white/55">
                            Choose start and end
                          </p>
                        </div>
                        <p className="text-right font-display text-lg font-bold">
                          Start + end
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-white/12 bg-white/[0.06] px-4 py-3">
                      <ShieldIcon className="mt-0.5 size-4 shrink-0 text-brand-lime" />
                      <p className="text-[0.8125rem] leading-relaxed text-white/70">
                        The full amount, cancellation cutoff, and payment method
                        are shown before you confirm.
                      </p>
                    </div>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section
          id="how-it-works"
          aria-labelledby="how-title"
          className="scroll-mt-24 bg-canvas py-14 sm:py-20"
        >
          <div className="mx-auto w-full max-w-7xl px-5 sm:px-8">
            <Reveal>
              <p className="text-eyebrow font-bold uppercase text-accent-ink">
                How booking works
              </p>
              <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <h2
                  id="how-title"
                  className="max-w-2xl text-title font-bold text-heading"
                >
                  Three steps. No account.
                </h2>
                <p className="max-w-sm text-sm leading-relaxed text-muted">
                  Pick a time, check the total, then pay by GCash.
                </p>
              </div>
            </Reveal>

            <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
              {steps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <Reveal key={step.number} delay={index * 0.08}>
                    <li className="group relative">
                      <div className="flex items-center gap-3 border-t border-line pt-5">
                        <span className="font-mono text-xs font-bold tracking-[0.18em] text-accent-ink">
                          {step.number}
                        </span>
                        <span
                          aria-hidden="true"
                          className="h-px flex-1 bg-line transition-colors duration-300 group-hover:bg-brand-blue/40"
                        />
                        <span className="grid size-10 place-items-center rounded-full border border-line bg-surface text-accent-ink transition-[background-color,color,border-color] duration-300 group-hover:border-brand-blue group-hover:bg-brand-blue group-hover:text-white">
                          <Icon className="size-5" />
                        </span>
                      </div>
                      <h3 className="mt-5 text-heading font-semibold text-heading">
                        {step.title}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted">
                        {step.body}
                      </p>
                      <p className="mt-4 inline-flex items-center gap-1.5 text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-brand-lime-ink">
                        <CheckCircleIcon className="size-3.5" />
                        {step.detail}
                      </p>
                    </li>
                  </Reveal>
                );
              })}
            </ol>
          </div>
        </section>

        {/* Details */}
        <section
          aria-labelledby="details-title"
          className="border-y border-line bg-surface py-14 sm:py-20"
        >
          <div className="mx-auto w-full max-w-7xl px-5 sm:px-8">
            <div className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:gap-16">
              <Reveal>
                <p className="text-eyebrow font-bold uppercase text-accent-ink">
                  Good to know
                </p>
                <h2
                  id="details-title"
                  className="mt-3 text-title font-bold text-heading"
                >
                  Clear before you commit.
                </h2>
                <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">
                  The court, price, and payment status stay separate, so nothing
                  important is hidden.
                </p>
              </Reveal>

              <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
                {promises.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <Reveal key={item.title} delay={index * 0.06}>
                      <div className="border-t border-line pt-5">
                        <span className="grid size-10 place-items-center rounded-lg bg-brand-blue-soft text-accent-ink">
                          <Icon className="size-5" />
                        </span>
                        <h3 className="mt-4 font-display text-base font-semibold text-heading">
                          {item.title}
                        </h3>
                        <p className="mt-1.5 text-sm leading-relaxed text-muted">
                          {item.body}
                        </p>
                      </div>
                    </Reveal>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Location */}
        <section
          id="location"
          aria-labelledby="location-title"
          className="relative scroll-mt-24 overflow-hidden bg-brand-navy-deep py-20 text-white sm:py-28"
        >
          <div
            aria-hidden="true"
            className="court-grid absolute inset-0 opacity-40"
          />
          <div
            aria-hidden="true"
            className="absolute -right-32 top-1/2 size-[34rem] -translate-y-1/2 rounded-full bg-brand-blue/20 blur-[120px]"
          />
          <div className="relative mx-auto w-full max-w-7xl px-5 sm:px-8">
            <div className="grid gap-8 lg:grid-cols-2 lg:grid-rows-[auto_1fr] lg:items-stretch lg:gap-10">
              <Reveal className="lg:col-start-1 lg:row-start-1">
                <p className="text-eyebrow font-bold uppercase text-brand-yellow">
                  Find the club
                </p>
                <h2
                  id="location-title"
                  className="mt-3 text-title font-bold text-white"
                >
                  Close to home.
                  <br />
                  Easy to find.
                </h2>
                <p className="mt-4 max-w-md text-base leading-relaxed text-white/70">
                  D-Hidden is at {CLUB.addressLine}.
                </p>

                <div className="mt-8 flex items-start gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-full border border-white/20 bg-white/10 text-brand-yellow">
                    <PinIcon className="size-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {CLUB.addressLine}
                    </p>
                    <p className="text-caption text-white/55">
                      {CLUB.coordinates}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-5 gap-y-1">
                      <a
                        href={CLUB.mapUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-brand-yellow transition-colors hover:text-white"
                      >
                        Open in Google Maps
                        <ArrowUpRightIcon className="size-3.5" />
                      </a>
                      <Link
                        href="/visit"
                        className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-white/80 transition-colors hover:text-white"
                      >
                        Plan your visit
                        <ArrowRightIcon className="size-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              </Reveal>

              <Reveal delay={0.1} className="lg:col-start-1 lg:row-start-2">
                <div className="relative h-full overflow-hidden rounded-2xl border border-white/15 bg-white/[0.06] p-6 backdrop-blur-md sm:p-8">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[0.625rem] font-bold uppercase tracking-[0.18em] text-white/60">
                      Club information
                    </p>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-lime/30 bg-brand-lime/10 px-2.5 py-1 text-[0.625rem] font-bold uppercase tracking-[0.12em] text-brand-lime">
                      <span
                        aria-hidden="true"
                        className="size-1.5 rounded-full bg-brand-lime"
                      />
                      Daily
                    </span>
                  </div>

                  <dl className="mt-5 divide-y divide-white/10">
                    {[
                      ["Hours", "7:00 AM – 12:00 AM"],
                      ["Courts", "Court 1 · Court 2"],
                      ["Court time", "Choose start and end"],
                      ["Payment", "GCash QR, verified by staff"],
                      ["Cancellation", "Free up to 24 hours before"],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="flex items-baseline justify-between gap-6 py-3.5"
                      >
                        <dt className="text-sm text-white/55">{label}</dt>
                        <dd className="text-right text-sm font-semibold text-white">
                          {value}
                        </dd>
                      </div>
                    ))}
                  </dl>

                  <div className="mt-4 rounded-xl border border-white/12 bg-white/[0.04] px-4 py-3">
                    <p className="text-[0.625rem] font-bold uppercase tracking-[0.18em] text-white/60">
                      Contact
                    </p>
                    <ul className="mt-1.5 space-y-0.5">
                      <li>
                        <a
                          href={CLUB.phoneHref}
                          className="inline-flex min-h-10 items-center text-[0.8125rem] font-semibold text-white transition-colors hover:text-brand-yellow"
                        >
                          {CLUB.phoneDisplay}
                        </a>
                      </li>
                      <li>
                        <a
                          href={`mailto:${CLUB.email}`}
                          className="inline-flex min-h-10 items-center break-all text-[0.8125rem] font-semibold text-white transition-colors hover:text-brand-yellow"
                        >
                          {CLUB.email}
                        </a>
                      </li>
                    </ul>
                  </div>
                </div>
              </Reveal>
              <Reveal
                delay={0.16}
                className="lg:col-start-2 lg:row-span-2 lg:row-start-1"
              >
                <div className="[&>div]:h-full">
                  <ClubMapLazy />
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section
          id="faq"
          aria-labelledby="faq-title"
          className="scroll-mt-24 bg-canvas py-14 sm:py-20"
        >
          <div className="mx-auto w-full max-w-7xl px-5 sm:px-8">
            <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
              <Reveal>
                <p className="text-eyebrow font-bold uppercase text-accent-ink">
                  Common questions
                </p>
                <h2
                  id="faq-title"
                  className="mt-3 text-title font-bold text-heading"
                >
                  Common questions.
                </h2>
                <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">
                  Booking, payment, and visiting, answered.
                </p>
              </Reveal>

              <Reveal delay={0.08}>
                <Faq />
              </Reveal>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section aria-labelledby="cta-title" className="bg-canvas pb-14 sm:pb-20">
          <div className="mx-auto w-full max-w-7xl px-5 sm:px-8">
            <Reveal>
              <div className="relative isolate overflow-hidden rounded-2xl border border-line bg-brand-navy-deep px-6 py-14 text-center text-white shadow-raised sm:px-10 sm:py-20">
                <Image
                  src="/courts/pickleball1.jpg"
                  alt=""
                  fill
                  sizes="(min-width: 1280px) 1216px, 100vw"
                  className="-z-20 object-cover object-center"
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(4,14,30,0.82),rgba(4,14,30,0.94))]"
                />
                <div
                  aria-hidden="true"
                  className="court-grid absolute inset-0 -z-10 opacity-30"
                />
                <p className="text-eyebrow font-bold uppercase text-brand-yellow">
                  Court reservations
                </p>
                <h2
                  id="cta-title"
                  className="mx-auto mt-4 max-w-2xl text-title font-bold text-white"
                >
                  Your next game is one booking away.
                </h2>
                <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-white/70">
                  Pick a court, choose your session, and see the full amount
                  before you commit.
                </p>
                <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <BookingTrigger
                    className={buttonClasses({
                      variant: "inverse",
                      size: "lg",
                      className: "w-full sm:w-auto",
                    })}
                  >
                    Book a court
                    <ArrowRightIcon className="size-5" />
                  </BookingTrigger>
                  <a
                    href="#pricing"
                    className="inline-flex h-13 w-full items-center justify-center rounded-lg border border-white/25 px-6 text-base font-semibold text-white transition-colors hover:bg-white/10 sm:w-auto"
                  >
                    Review the rates
                  </a>
                </div>
                <p className="mt-5 text-[0.6875rem] text-white/40">
                  Live availability · 15-minute hold · staff-verified payment
                </p>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
