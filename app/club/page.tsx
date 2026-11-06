import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PageHeader } from "@/components/site/page-header";
import { PublicPage } from "@/components/site/public-page";
import { Reveal } from "@/components/motion/reveal";
import { buttonClasses } from "@/components/ui/button";
import {
  ArrowRightIcon,
  BallIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  ShieldIcon,
  WalletIcon,
} from "@/components/ui/icons";
import { CLUB } from "@/lib/club";

export const metadata: Metadata = {
  title: "The club",
  description:
    "D-Hidden Pickleball Court & Bistro is a two-court pickleball club in Bung-aw, Pondol, Balamban, Cebu, open daily 7:00 AM to 12:00 AM.",
  robots: { index: false, follow: false },
};

const facts = [
  {
    icon: BallIcon,
    title: "Two bookable courts",
    body: "Court 1 and Court 2, both available for hourly reservations.",
  },
  {
    icon: ClockIcon,
    title: "Open every day",
    body: "7:00 AM to 12:00 AM, with no slot offered past midnight.",
  },
  {
    icon: CalendarIcon,
    title: "Choose your court time",
    body: "Pick your start and end time when you book.",
  },
  {
    icon: WalletIcon,
    title: "Clear hourly rates",
    body: "₱250 per hour before 5:00 PM and ₱300 per hour from 5:00 PM.",
  },
  {
    icon: ShieldIcon,
    title: "Staff-verified GCash",
    body: "Payment proof moves to awaiting verification; staff confirm the transfer.",
  },
  {
    icon: CheckCircleIcon,
    title: "Group-friendly",
    body: "One person can book for the group. Only the booker's name is required.",
  },
];

export default function ClubPage() {
  return (
    <PublicPage>
      <PageHeader
        eyebrow="The club"
        title="A two-court club in Balamban."
        intro="D-Hidden Pickleball Court & Bistro is a two-court pickleball club in Bung-aw, Pondol, Balamban, Cebu. The courts are open every day, and court time is booked by the hour."
      >
        <Link
          href="/courts"
          className={buttonClasses({ size: "lg" })}
        >
          See the courts
          <ArrowRightIcon className="size-5" />
        </Link>
        <Link
          href="/visit"
          className={buttonClasses({ variant: "secondary", size: "lg" })}
        >
          Visit the club
        </Link>
      </PageHeader>

      <section className="bg-canvas py-16 sm:py-20">
        <div className="mx-auto w-full max-w-7xl px-5 sm:px-8">
          <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16">
            <Reveal>
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-line shadow-card">
                <Image
                  src="/courts/pickleball2.jpg"
                  alt="Doubles play on a club pickleball court with hills and sea behind it"
                  fill
                  sizes="(min-width: 1024px) 52vw, 100vw"
                  className="object-cover"
                />
              </div>
            </Reveal>

            <Reveal delay={0.08}>
              <p className="text-eyebrow font-bold uppercase text-accent-ink">
                The essentials
              </p>
              <h2 className="mt-3 text-title font-bold text-heading">
                What the club has confirmed.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-muted">
                D-Hidden has two bookable courts, daily hours from 7:00 AM to
                12:00 AM, and hourly rates that change once at 5:00 PM. Court
                time is reserved by the hour, and payment is reviewed by staff
                before it is marked paid.
              </p>
              <p className="mt-3 text-base leading-relaxed text-muted">
                The club&apos;s full facilities list, holiday closures, and
                additional policies are still being confirmed. They are not
                presented here as facts.
              </p>
              <address className="mt-6 not-italic">
                <p className="text-sm font-semibold text-ink">
                  {CLUB.addressFull}
                </p>
                <p className="mt-1 text-caption text-muted">
                  {CLUB.coordinates}
                </p>
              </address>
            </Reveal>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="club-facts"
        className="border-y border-line bg-surface py-16 sm:py-20"
      >
        <div className="mx-auto w-full max-w-7xl px-5 sm:px-8">
          <Reveal>
            <p className="text-eyebrow font-bold uppercase text-accent-ink">
              At a glance
            </p>
            <h2 id="club-facts" className="mt-3 text-title font-bold text-heading">
              How the club runs.
            </h2>
          </Reveal>

          <div className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {facts.map((fact, index) => {
              const Icon = fact.icon;
              return (
                <Reveal key={fact.title} delay={index * 0.05}>
                  <div className="border-t border-line pt-5">
                    <span className="grid size-10 place-items-center rounded-lg bg-brand-blue-soft text-accent-ink">
                      <Icon className="size-5" />
                    </span>
                    <h3 className="mt-4 font-display text-base font-semibold text-heading">
                      {fact.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted">
                      {fact.body}
                    </p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-canvas py-16 sm:py-20">
        <div className="mx-auto w-full max-w-7xl px-5 sm:px-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                href: "/courts",
                label: "The courts",
                body: "Photos, rates, and booking facts for both courts.",
              },
              {
                href: "/club/rules",
                label: "Club rules",
                body: "Hours, payment, holds, and cancellation outcomes.",
              },
              {
                href: "/club/faq",
                label: "Common questions",
                body: "Short answers about hours, payment, and groups.",
              },
              {
                href: "/visit",
                label: "Visit",
                body: "Address, hours, contact, and the confirmed map pin.",
              },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="group rounded-2xl border border-line bg-surface p-5 shadow-card transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-raised"
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="font-display text-base font-bold text-heading">
                    {link.label}
                  </span>
                  <ArrowRightIcon className="size-4 text-accent-ink transition-transform duration-200 group-hover:translate-x-0.5" />
                </span>
                <span className="mt-2 block text-sm leading-relaxed text-muted">
                  {link.body}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </PublicPage>
  );
}
