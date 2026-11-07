import type { Metadata } from "next";
import Link from "next/link";
import { Faq } from "@/components/home/faq";
import { PageHeader } from "@/components/site/page-header";
import { PublicPage } from "@/components/site/public-page";
import { Alert } from "@/components/ui/alert";
import { ArrowRightIcon, BallIcon } from "@/components/ui/icons";
import { CLUB } from "@/lib/club";

export const metadata: Metadata = {
  title: "Common questions",
  description:
    "Answers about court hours, rates, open play, guest booking, GCash payment, holds, groups, and cancellations at D-Hidden Pickleball Court & Bistro.",
  robots: { index: false, follow: false },
};

export default function ClubFaqPage() {
  return (
    <PublicPage>
      <PageHeader
        eyebrow="Common questions"
        title="Common questions."
        intro="Short answers about booking, payment, and visiting."
      />

      <section className="bg-canvas py-12 sm:py-16">
        <div className="mx-auto w-full max-w-5xl px-5 sm:px-8">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_16rem] lg:gap-14">
            <div>
              <Faq />
              <Alert
                variant="info"
                eyebrow="Payment"
                title="The official GCash QR is still pending"
                className="mt-8"
              >
                <p>
                  The club&apos;s final GCash QR and account name are not yet
                  published. Staff verify each transfer manually.
                </p>
              </Alert>
            </div>

            <aside className="space-y-4">
              <div className="rounded-2xl border border-line bg-surface p-5 shadow-card">
                <span className="grid size-10 place-items-center rounded-lg bg-brand-blue-soft text-accent-ink">
                  <BallIcon className="size-5" />
                </span>
                <h2 className="mt-4 font-display text-lg font-bold text-heading">
                  Ask the club
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  For a booking change or a question specific to your slot,
                  contact the club directly.
                </p>
                <ul className="mt-3 space-y-1">
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
              </div>

              <Link
                href="/club/rules"
                className="flex min-h-11 items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-5 text-sm font-semibold text-heading shadow-card transition-colors hover:bg-brand-blue-soft/50"
              >
                Read the club rules
                <ArrowRightIcon className="size-4 text-accent-ink" />
              </Link>
            </aside>
          </div>
        </div>
      </section>
    </PublicPage>
  );
}
