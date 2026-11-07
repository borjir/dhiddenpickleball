"use client";

import {
  createContext,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import { Badge } from "@/components/ui/badge";
import { CloseIcon } from "@/components/ui/icons";
import { CourtBooking } from "@/components/booking/court-booking";
import { OpenPlayRegistration } from "@/components/open-play/open-play-registration";
import { OpenPlayBrowser } from "@/components/open-play/open-play-browser";
import {
  getBookingModalData,
  type BookingModalData,
} from "@/app/book/actions";
import {
  getOpenPlayModalData,
  getOpenPlayScheduleData,
  type OpenPlayModalData,
  type OpenPlayScheduleGroup,
} from "@/app/open-play/actions";
import { formatBookingDate, formatBookingTimeRange, formatPeso } from "@/lib/bookings";
import {
  isOpenPlaySessionFull,
  openPlayLevelMeta,
  openPlaySpotsRemaining,
} from "@/lib/open-play";

type BookingModalContextValue = {
  openCourt: () => Promise<void>;
  openOpenPlay: (sessionId: string) => Promise<void>;
  openOpenPlayList: () => Promise<void>;
};

const BookingModalContext = createContext<BookingModalContextValue | null>(null);

export function useBookingModal() {
  const value = useContext(BookingModalContext);

  if (!value) {
    throw new Error("useBookingModal must be used inside BookingModalProvider.");
  }

  return value;
}

type Dialog =
  | { kind: "court" }
  | { kind: "open-play" | "open-play-list"; sessionId?: string };

type CourtData = Extract<BookingModalData, { status: "ok" }>;
type OpenPlayData = Extract<OpenPlayModalData, { status: "ok" }>;

export function BookingModalProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [courtData, setCourtData] = useState<CourtData | null>(null);
  const [openPlayData, setOpenPlayData] = useState<OpenPlayData | null>(null);
  const [openPlayGroups, setOpenPlayGroups] = useState<
    OpenPlayScheduleGroup[] | null
  >(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const openCourt = useCallback(async () => {
    setDialog({ kind: "court" });
    setCourtData(null);
    setOpenPlayGroups(null);
    setError(null);
    setLoading(true);

    const result = await getBookingModalData();

    setLoading(false);
    if (result.status === "ok") {
      setCourtData(result);
    } else {
      setError(result.message);
    }
  }, []);

  const openOpenPlay = useCallback(async (sessionId: string) => {
    setDialog({ kind: "open-play", sessionId });
    setOpenPlayData(null);
    setError(null);
    setLoading(true);

    const result = await getOpenPlayModalData(sessionId);

    setLoading(false);
    if (result.status === "ok") {
      setOpenPlayData(result);
    } else {
      setError(result.message);
    }
  }, []);

  const openOpenPlayList = useCallback(async () => {
    setDialog({ kind: "open-play-list" });
    setOpenPlayData(null);
    setOpenPlayGroups(null);
    setError(null);
    setLoading(true);

    const result = await getOpenPlayScheduleData();

    setLoading(false);
    if (result.status === "ok") {
      setOpenPlayGroups(result.groups);
    } else {
      setError(result.message);
    }
  }, []);

  const close = useCallback(() => {
    setDialog(null);
    setCourtData(null);
    setOpenPlayData(null);
    setOpenPlayGroups(null);
    setError(null);
    setLoading(false);
  }, []);

  // The provider sits in the root layout, so a client-side navigation would
  // otherwise leave the overlay covering the next page. Dismiss it before an
  // in-modal link navigates; the sign-in return path can reopen it.
  function handleModalLinkNavigation(event: ReactMouseEvent<HTMLDivElement>) {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const link = target.closest("a[href]");
    if (!link) return;

    const href = link.getAttribute("href");
    if (
      !href ||
      href.startsWith("#") ||
      link.hasAttribute("download") ||
      link.getAttribute("target") === "_blank" ||
      /^(mailto|tel|sms):/i.test(href)
    ) {
      return;
    }

    close();
  }

  useEffect(() => {
    if (!dialog) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }

    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [close, dialog]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("booking") !== "1") return;

    const url = new URL(window.location.href);
    url.searchParams.delete("booking");
    window.history.replaceState({}, "", url);
    // Open on the next tick without a cancellable timer: a dev re-render can
    // run the cleanup after the param is already gone, which left the overlay
    // closed and the selection stranded.
    void Promise.resolve().then(() => openCourt());
  }, [openCourt]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("openPlay");
    if (!sessionId) return;

    const url = new URL(window.location.href);
    url.searchParams.delete("openPlay");
    window.history.replaceState({}, "", url);
    const timer = window.setTimeout(() => void openOpenPlay(sessionId), 0);
    return () => window.clearTimeout(timer);
  }, [openOpenPlay]);

  const isOpenPlay =
    dialog?.kind === "open-play" || dialog?.kind === "open-play-list";

  return (
    <BookingModalContext.Provider
      value={{ openCourt, openOpenPlay, openOpenPlayList }}
    >
      {children}

      {dialog ? (
        <div
          className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-5"
          role="dialog"
          aria-modal="true"
          aria-labelledby="booking-modal-title"
          onClickCapture={handleModalLinkNavigation}
        >
          <button
            type="button"
            aria-label="Close"
            onClick={close}
            className="absolute inset-0 bg-brand-navy/80 backdrop-blur-sm"
          />

          <div
            className={
              isOpenPlay
                ? "relative flex h-[100dvh] w-full flex-col overflow-hidden bg-page shadow-2xl sm:h-auto sm:max-h-[92vh] sm:max-w-4xl sm:rounded-3xl sm:border sm:border-line"
                : "relative flex h-[100dvh] w-full flex-col overflow-hidden bg-page shadow-2xl sm:h-auto sm:max-h-[92vh] sm:max-w-7xl sm:rounded-3xl sm:border sm:border-line"
            }
          >
            <div className="flex items-center justify-between gap-3 border-b border-line bg-surface px-5 py-3">
              <h2
                id="booking-modal-title"
                className="text-eyebrow font-bold uppercase text-accent-ink"
              >
                {dialog.kind === "court"
                  ? "Book a court"
                  : dialog.kind === "open-play-list"
                    ? "Open play schedule"
                    : "Reserve open play"}
              </h2>
              <button
                ref={closeRef}
                type="button"
                onClick={close}
                aria-label="Close"
                className="inline-flex size-11 items-center justify-center rounded-lg border border-line bg-surface text-heading transition-colors hover:border-brand-blue/50 hover:bg-brand-blue-soft/60"
              >
                <CloseIcon className="size-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {loading ? (
                <ModalSkeleton />
              ) : error ? (
                <div className="p-6 sm:p-8">
                  <p className="text-sm leading-relaxed text-muted">{error}</p>
                  <button
                    type="button"
                    onClick={() => {
                      if (dialog.kind === "court") void openCourt();
                      else if (dialog.kind === "open-play-list")
                        void openOpenPlayList();
                      else if (dialog.sessionId)
                        void openOpenPlay(dialog.sessionId);
                    }}
                    className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-brand-blue px-4 text-sm font-semibold text-white"
                  >
                    Try again
                  </button>
                </div>
              ) : dialog.kind === "open-play-list" && openPlayGroups ? (
                <div className="p-5 sm:p-7">
                  {openPlayGroups.length > 0 ? (
                    <OpenPlayBrowser groups={openPlayGroups} />
                  ) : (
                    <p className="text-sm leading-relaxed text-muted">
                      No open-play sessions are published yet. Check back soon,
                      or book a court instead.
                    </p>
                  )}
                </div>
              ) : isOpenPlay && openPlayData ? (
                <OpenPlayModal data={openPlayData} />
              ) : courtData ? (
                <Suspense fallback={<ModalSkeleton />}>
                  <CourtBooking
                    courts={courtData.courts}
                    today={courtData.today}
                    embedded
                  />
                </Suspense>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </BookingModalContext.Provider>
  );
}

function OpenPlayModal({ data }: { data: OpenPlayData }) {
  const { session, isPast } = data;
  const level = openPlayLevelMeta(session.skillLevel);
  const full = isOpenPlaySessionFull(session);
  const remaining = openPlaySpotsRemaining(session);

  return (
    <div className="p-5 sm:p-7">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={level.variant} dot>
          {level.label}
        </Badge>
        <Badge variant={full ? "danger" : "success"} dot>
          {full ? "Full" : `${remaining} left`}
        </Badge>
      </div>
      <h3 className="mt-3 font-display text-2xl font-extrabold tracking-[-0.02em] text-heading sm:text-3xl">
        {level.label} open play
      </h3>
      <p className="mt-2 text-sm text-muted">
        {formatBookingDate(session.startsAt)} ·{" "}
        {formatBookingTimeRange(session.startsAt, session.endsAt)} ·{" "}
        {session.durationMinutes} min
      </p>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        {level.description}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-line bg-surface px-4 py-3">
          <p className="text-[0.625rem] font-bold uppercase tracking-[0.14em] text-muted">
            Price
          </p>
          <p className="mt-1 font-display text-xl font-bold text-heading">
            {formatPeso(session.amountPhp)}
          </p>
          <p className="text-caption text-muted">per player</p>
        </div>
        <div className="rounded-xl border border-line bg-surface px-4 py-3">
          <p className="text-[0.625rem] font-bold uppercase tracking-[0.14em] text-muted">
            Capacity
          </p>
          <p className="mt-1 font-display text-xl font-bold text-heading">
            {remaining}/{session.capacity}
          </p>
          <p className="text-caption text-muted">places available</p>
        </div>
      </div>

      <div className="mt-5">
        <OpenPlayRegistration session={session} isPast={isPast} />
      </div>

      <details className="mt-4 rounded-xl border border-line bg-surface/70 px-4 py-3">
        <summary className="cursor-pointer text-sm font-semibold text-heading">
          Before you play
        </summary>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted">
          <li>Bring your paddle, water, and comfortable court shoes.</li>
          <li>One place per player; capacity is checked again on confirm.</li>
          <li>
            Pay by GCash after reserving. Staff verify the transfer before the
            payment is marked paid.
          </li>
        </ul>
      </details>
    </div>
  );
}

function ModalSkeleton() {
  return (
    <div className="space-y-4 p-5 sm:p-7" aria-hidden="true">
      <div className="skeleton h-4 w-28 rounded" />
      <div className="skeleton h-9 w-64 max-w-full rounded-lg" />
      <div className="skeleton h-4 w-full max-w-xl rounded" />
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-4">
          <div className="skeleton h-52 rounded-2xl" />
          <div className="skeleton h-72 rounded-2xl" />
        </div>
        <div className="skeleton h-80 rounded-2xl" />
      </div>
    </div>
  );
}
