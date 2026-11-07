import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfigNotice } from "@/components/auth/config-notice";
import { OpenPlayRegistration } from "@/components/open-play/open-play-registration";
import { FlowFrame } from "@/components/site/flow-frame";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
} from "@/components/ui/icons";
import {
  formatBookingDate,
  formatBookingTimeRange,
  formatPeso,
} from "@/lib/bookings";
import {
  isOpenPlaySessionFull,
  mapOpenPlaySession,
  openPlayLevelMeta,
  openPlaySessionStatusMeta,
  openPlaySpotsRemaining,
  type OpenPlaySessionRow,
} from "@/lib/open-play";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata: Metadata = {
  title: "Open play session",
  description:
    "View an open-play session at D-Hidden Pickleball Court & Bistro and reserve one place.",
  robots: { index: false, follow: false },
};

type PageProps = {
  params: Promise<{ id: string }>;
};

async function SessionPanel({ params }: PageProps) {
  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8">
        <ConfigNotice />
      </div>
    );
  }

  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_open_play_session", {
    p_session_id: id,
  });

  if (error) {
    return (
      <div className="mx-auto w-full max-w-3xl px-5 py-16 sm:px-8">
        <Alert
          variant="warning"
          eyebrow="Session not loaded"
          title="This open-play session could not be read"
        >
          Refresh the page and try again. If it keeps failing, contact the club
          and we can check the schedule.
        </Alert>
      </div>
    );
  }

  const row = (Array.isArray(data) ? data[0] : data) as
    | OpenPlaySessionRow
    | null;

  if (!row) notFound();

  const session = mapOpenPlaySession(row);
  const level = openPlayLevelMeta(session.skillLevel);
  const status = openPlaySessionStatusMeta(session.status);
  const full = isOpenPlaySessionFull(session);
  const remaining = openPlaySpotsRemaining(session);
  const isPast = new Date(session.startsAt).getTime() <= new Date().getTime();

  return (
    <>
      <section className="border-b border-line bg-surface">
        <div className="mx-auto w-full max-w-7xl px-5 py-7 sm:px-7 sm:py-9">
          <Link
            href="/open-play"
            className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-accent-ink transition-colors hover:text-heading"
          >
            <ArrowLeftIcon className="size-4" />
            All open-play sessions
          </Link>

          <div className="mt-5 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={level.variant} dot>
                  {level.label}
                </Badge>
                <Badge variant={full ? "danger" : status.variant} dot>
                  {full ? "Full" : status.label}
                </Badge>
              </div>
              <h1 className="mt-4 font-display text-4xl font-extrabold tracking-[-0.03em] text-heading sm:text-5xl">
                {level.label} open play
              </h1>
              <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-base text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarIcon className="size-4 text-brand-lime" />
                  {formatBookingDate(session.startsAt)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <ClockIcon className="size-4 text-brand-lime" />
                  {formatBookingTimeRange(session.startsAt, session.endsAt)} ·{" "}
                  {session.durationMinutes} min
                </span>
              </p>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
                {level.description}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:w-auto">
              <div className="rounded-xl border border-line bg-page/50 px-4 py-3">
                <p className="text-[0.625rem] font-bold uppercase tracking-[0.14em] text-muted">
                  Price
                </p>
                <p className="mt-1 font-display text-2xl font-bold text-heading">
                  {formatPeso(session.amountPhp)}
                </p>
                <p className="text-caption text-muted">per player</p>
              </div>
              <div className="rounded-xl border border-line bg-page/50 px-4 py-3">
                <p className="text-[0.625rem] font-bold uppercase tracking-[0.14em] text-muted">
                  Capacity
                </p>
                <p className="mt-1 font-display text-2xl font-bold text-heading">
                  {remaining}/{session.capacity}
                </p>
                <p className="text-caption text-muted">
                  {full ? "session full" : "places available"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-canvas py-7 sm:py-9">
        <div className="mx-auto grid w-full max-w-7xl gap-5 px-5 sm:px-7 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
          <section className="rounded-2xl border border-line bg-surface p-6 shadow-card sm:p-7">
            <p className="text-eyebrow font-bold uppercase text-accent-ink">
              Before you play
            </p>
            <h2 className="mt-1 font-display text-2xl font-bold text-heading">
              Good to know
            </h2>
            <ul className="mt-4 space-y-2.5">
              {[
                "Bring a paddle, water, and court shoes.",
                "One place per player.",
                "Pay by GCash after reserving. Upload your screenshot before the session.",
                "Contact the club to cancel or change your place.",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2.5 text-sm leading-relaxed text-muted"
                >
                  <CheckCircleIcon className="mt-0.5 size-4 shrink-0 text-brand-lime" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <aside className="order-first lg:order-none lg:sticky lg:top-24">
            <OpenPlayRegistration session={session} isPast={isPast} />
            <Link
              href="/open-play"
              className="mt-4 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-accent-ink"
            >
              See all sessions
              <ArrowRightIcon className="size-4" />
            </Link>
          </aside>
        </div>
      </section>
    </>
  );
}

function SessionSkeleton() {
  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-8" aria-hidden="true">
      <div className="skeleton h-4 w-40 rounded" />
      <div className="mt-6 skeleton h-12 w-80 max-w-full rounded-lg" />
      <div className="mt-4 skeleton h-4 w-64 max-w-full rounded" />
      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-5">
          <div className="skeleton h-72 rounded-2xl" />
          <div className="skeleton h-56 rounded-2xl" />
        </div>
        <div className="skeleton h-96 rounded-2xl" />
      </div>
    </div>
  );
}

export default function OpenPlaySessionPage({ params }: PageProps) {
  return (
    <FlowFrame closeHref="/open-play" label="Open play reservation">
      <Suspense fallback={<SessionSkeleton />}>
        <SessionPanel params={params} />
      </Suspense>
    </FlowFrame>
  );
}
