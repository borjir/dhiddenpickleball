import type { Metadata } from "next";
import { Suspense } from "react";
import { ConfigNotice } from "@/components/auth/config-notice";
import { BookingTrigger } from "@/components/booking/booking-trigger";
import {
  OpenPlayBrowser,
  type OpenPlaySessionGroup,
} from "@/components/open-play/open-play-browser";
import { PageHeader } from "@/components/site/page-header";
import { PublicPage } from "@/components/site/public-page";
import { Alert } from "@/components/ui/alert";
import { buttonClasses } from "@/components/ui/button";
import {
  ArrowRightIcon,
  BallIcon,
  CalendarIcon,
  ClockIcon,
  WalletIcon,
} from "@/components/ui/icons";
import { formatBookingDate, manilaDateId } from "@/lib/bookings";
import {
  mapOpenPlaySession,
  type OpenPlaySession,
  type OpenPlaySessionRow,
} from "@/lib/open-play";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata: Metadata = {
  title: "Open play",
  description:
    "See scheduled normal open-play sessions at D-Hidden Pickleball Court & Bistro, with date, time, skill level, price, and remaining places.",
  robots: { index: false, follow: false },
};

function groupSessions(
  sessions: OpenPlaySession[],
): OpenPlaySessionGroup[] {
  const groups = new Map<string, OpenPlaySession[]>();

  for (const session of sessions) {
    const dateId = manilaDateId(session.startsAt);
    const current = groups.get(dateId) ?? [];
    current.push(session);
    groups.set(dateId, current);
  }

  return Array.from(groups, ([dateId, group]) => ({
    dateId,
    dateLabel: formatBookingDate(group[0]?.startsAt ?? dateId),
    sessions: group,
  }));
}

async function OpenPlayPanel() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8">
        <ConfigNotice />
      </div>
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_open_play_sessions");
  const sessions = (
    (Array.isArray(data) ? data : []) as OpenPlaySessionRow[]
  ).map(mapOpenPlaySession);
  // Keep the public index short even though staff can seed a full year.
  const groups = groupSessions(sessions).slice(0, 8);

  return (
    <>
      <PageHeader
        eyebrow="Open play"
        title="Pick a session. Reserve your place."
        intro="Choose a date and skill level, then enter your name and mobile number. Pay by GCash after reserving. No account needed."
      >
        <BookingTrigger
          className={buttonClasses({ variant: "secondary", size: "lg" })}
        >
          Book a court instead
        </BookingTrigger>
      </PageHeader>

      <section aria-labelledby="sessions-title" className="bg-canvas py-14 sm:py-20">
        <div className="mx-auto w-full max-w-7xl px-5 sm:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-eyebrow font-bold uppercase text-accent-ink">
                Upcoming sessions
              </p>
              <h2
                id="sessions-title"
                className="mt-2 text-title font-bold text-heading"
              >
                Open-play schedule.
              </h2>
            </div>              <p className="inline-flex items-center gap-2 text-sm text-muted">
                <BallIcon className="size-4 text-brand-lime" />
                Next eight dates · one place per player
              </p>
          </div>

          {error ? (
            <Alert
              variant="warning"
              className="mt-8"
              eyebrow="Sessions not loaded"
              title="Open-play sessions could not be read right now"
            >
              Refresh the page and try again. If it keeps failing, contact the
              club and we can check the schedule.
            </Alert>
          ) : groups.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed border-line-strong bg-surface px-6 py-12 text-center">
              <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-brand-blue-soft text-accent-ink">
                <CalendarIcon className="size-5" />
              </span>
              <h3 className="mt-4 font-display text-xl font-bold text-heading">
                No open-play sessions are published yet
              </h3>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-muted">
                The club controls the open-play schedule. Check back soon, or
                book a court if you already have a group.
              </p>
              <BookingTrigger className={buttonClasses({ className: "mt-5" })}>
                Book a court
                <ArrowRightIcon className="size-4" />
              </BookingTrigger>
            </div>
          ) : (
            <OpenPlayBrowser groups={groups} />
          )}

          <div className="mt-10 grid gap-4 rounded-2xl border border-line bg-surface p-5 shadow-card sm:grid-cols-2 sm:p-6">
            <p className="flex items-start gap-3 text-sm leading-relaxed text-muted">
              <WalletIcon className="mt-0.5 size-5 shrink-0 text-accent-ink" />
              Pay by GCash after reserving. Staff verify the transfer before it
              is marked paid.
            </p>
            <p className="flex items-start gap-3 text-sm leading-relaxed text-muted">
              <ClockIcon className="mt-0.5 size-5 shrink-0 text-accent-ink" />
              Arrive a few minutes early. Contact the club to cancel or change
              your place.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

function OpenPlaySkeleton() {
  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-8" aria-hidden="true">
      <div className="skeleton h-4 w-32 rounded" />
      <div className="mt-4 skeleton h-12 w-96 max-w-full rounded-lg" />
      <div className="mt-4 skeleton h-4 w-full max-w-2xl rounded" />
      <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="skeleton h-72 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

export default function OpenPlayPage() {
  return (
    <PublicPage>
      <Suspense fallback={<OpenPlaySkeleton />}>
        <OpenPlayPanel />
      </Suspense>
    </PublicPage>
  );
}
