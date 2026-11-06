import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountShell } from "@/components/account/account-shell";
import { BookingList } from "@/components/account/booking-list";
import { ProfileForm } from "@/components/account/profile-form";
import { ConfigNotice } from "@/components/auth/config-notice";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Alert } from "@/components/ui/alert";
import { buttonClasses } from "@/components/ui/button";
import { CLUB } from "@/lib/club";
import type { AccountBooking } from "@/lib/bookings";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata: Metadata = {
  title: "My account",
  description: "Your D-Hidden Pickleball Court & Bistro account and bookings.",
  robots: { index: false, follow: false },
};

type Profile = {
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: "player" | "staff";
  created_at: string | null;
};

async function AccountPanel() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="mt-8">
        <ConfigNotice />
      </div>
    );
  }

  const supabase = await createClient();

  // getUser() verifies with the Auth server; unlike getSession(), it does not
  // trust a cookie payload on its own.
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/sign-in?next=/account&notice=session-expired");
  }

  const [profileResult, bookingsResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, email, phone, role, created_at")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("bookings")
      .select(
        `
          id,
          reference,
          starts_at,
          ends_at,
          duration_minutes,
          status,
          payment_status,
          amount_php,
          hold_expires_at,
          created_at,
          cancelled_at,
          cancellation_reason,
          group_id,
          booking_group:booking_groups(reference, amount_php, status, payment_status, hold_expires_at),
          service:services(name, code),
          court_reservations(court:courts(name, slug)),
          open_play_registrations(session:open_play_sessions(skill_level))
        `,
      )
      .eq("player_id", user.id)
      .order("starts_at", { ascending: false }),
  ]);

  const profile = (profileResult.data ?? null) as Profile | null;
  const bookings = (bookingsResult.data ?? []) as unknown as AccountBooking[];
  const role = profile?.role === "staff" ? "staff" : "player";
  const email = profile?.email?.trim() || user.email || "Not available";
  const fullName = profile?.full_name?.trim() ?? "";
  const phone = profile?.phone?.trim() ?? "";
  const createdAt = profile?.created_at ?? user.created_at ?? "";
  const verified = Boolean(user.email_confirmed_at);

  return (
    <div className="mt-8">
      <p className="text-eyebrow font-bold uppercase text-accent-ink">
        Account
      </p>
      <h1 className="mt-2 font-display text-4xl font-extrabold tracking-[-0.03em] text-heading sm:text-5xl">
        Your account
      </h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
        Signed in as{" "}
        <span className="font-semibold break-all text-ink">{email}</span>. Update
        your contact details and review your bookings in one place.
      </p>

      {profileResult.error ? (
        <Alert
          variant="warning"
          className="mt-6"
          eyebrow="Profile not loaded"
          title="Your sign-in works, but your profile could not be read"
        >
          Refresh the page and try again. If it keeps failing, contact the club
          and mention that the profile record did not load.
        </Alert>
      ) : null}

      <div className="mt-7 grid gap-5 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
        <div className="space-y-5">
          <ProfileForm
            fullName={fullName}
            phone={phone}
            email={email}
            role={role}
            verified={verified}
            createdAt={createdAt}
          />

          <section className="rounded-2xl border border-line bg-brand-blue-soft/50 p-6 shadow-card">
            <p className="text-eyebrow font-bold uppercase text-accent-ink">
              Booking changes
            </p>
            <h2 className="mt-1 font-display text-xl font-bold text-heading">
              Need to cancel or move a booking?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Contact the club before the booking starts. The club handles
              cancellations and reschedules directly; self-service changes are
              not available.
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <a
                href={CLUB.phoneHref}
                className={buttonClasses({
                  variant: "secondary",
                  className: "w-full sm:w-auto",
                })}
              >
                Call {CLUB.phoneDisplay}
              </a>
              <a
                href={`mailto:${CLUB.email}`}
                className={buttonClasses({
                  variant: "secondary",
                  className: "w-full sm:w-auto",
                })}
              >
                Email the club
              </a>
            </div>
            <p className="mt-3 text-caption text-muted">
              Read the{" "}
              <Link
                href="/policies/booking"
                className="font-semibold text-accent-ink underline decoration-brand-blue/40 underline-offset-2 hover:text-brand-blue-strong"
              >
                booking and cancellation policy
              </Link>
              .
            </p>
          </section>

          <section className="rounded-2xl border border-line bg-surface p-5 shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-bold text-heading">
                  Session
                </h2>
                <p className="mt-1 text-caption text-muted">
                  Signed in on this device.
                </p>
              </div>
              <SignOutButton className="w-full sm:w-auto" />
            </div>
          </section>
        </div>

        <BookingList
          bookings={bookings}
          error={Boolean(bookingsResult.error)}
        />
      </div>
    </div>
  );
}

function AccountSkeleton() {
  return (
    <div className="mt-10 space-y-4" aria-hidden="true">
      <div className="skeleton h-4 w-20 rounded" />
      <div className="skeleton h-12 w-64 max-w-full rounded-lg" />
      <div className="skeleton h-4 w-full max-w-xl rounded" />
      <div className="mt-6 grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-5">
          <div className="skeleton h-96 rounded-2xl" />
          <div className="skeleton h-48 rounded-2xl" />
        </div>
        <div className="skeleton h-[28rem] rounded-2xl" />
      </div>
    </div>
  );
}

export default function AccountPage() {
  return (
    <AccountShell>
      <Suspense fallback={<AccountSkeleton />}>
        <AccountPanel />
      </Suspense>
    </AccountShell>
  );
}
