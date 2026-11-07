import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { AuthTopBar } from "@/components/auth/auth-top-bar";
import { Alert } from "@/components/ui/alert";
import { CourtBooking } from "@/components/booking/court-booking";
import { ConfigNotice } from "@/components/auth/config-notice";
import { manilaDateId } from "@/lib/bookings";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata: Metadata = {
  title: "Book a court",
  description:
    "Check live court availability and request a court reservation at D-Hidden Pickleball Court & Bistro.",
  robots: { index: false, follow: false },
};

type Viewer = {
  email: string;
  fullName: string;
  phone: string;
  role: "player" | "staff";
  verified: boolean;
  profileError: boolean;
};

function BookingShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-svh bg-page">
      <div className="mx-auto w-full max-w-7xl px-5 py-5 sm:px-8 sm:py-7">
        <AuthTopBar />
        {children}
      </div>
    </main>
  );
}

async function BookingPanel() {
  if (!isSupabaseConfigured()) {
    return (
      <BookingShell>
        <div className="mt-8">
          <ConfigNotice />
        </div>
      </BookingShell>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let viewer: Viewer | null = null;

  if (user) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("full_name, phone, role")
      .eq("id", user.id)
      .maybeSingle();

    viewer = {
      email: user.email ?? "",
      fullName: profile?.full_name?.trim() ?? "",
      phone: profile?.phone?.trim() ?? "",
      role: profile?.role === "staff" ? "staff" : "player",
      verified: Boolean(user.email_confirmed_at),
      profileError: Boolean(profileError),
    };
  }

  // Staff operate the desk; a booking must belong to a player account.
  if (viewer?.role === "staff") {
    return (
      <BookingShell>
        <div className="mt-8">
          <Alert
            variant="info"
            eyebrow="Staff account"
            title="Staff accounts can't book court time"
          >
            <p>
              Court bookings belong to player accounts. Use the desk to record a
              walk-in for a player, or sign in with a player account to play.
            </p>
            <p className="mt-2">
              <Link
                href="/staff/bookings/new"
                className="font-semibold text-accent-ink underline-offset-4 hover:underline"
              >
                Open the walk-in desk
              </Link>
            </p>
          </Alert>
        </div>
      </BookingShell>
    );
  }

  const { data: courtRows } = await supabase
    .from("courts")
    .select("id, name, slug")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  return (
    <CourtBooking
      viewer={viewer}
      courts={courtRows ?? []}
      today={manilaDateId(new Date())}
    />
  );
}

function BookingSkeleton() {
  return (
    <BookingShell>
      <div className="mt-10 space-y-4" aria-hidden="true">
        <div className="skeleton h-4 w-28 rounded" />
        <div className="skeleton h-12 w-72 max-w-full rounded-lg" />
        <div className="skeleton h-4 w-full max-w-xl rounded" />
        <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-5">
            <div className="skeleton h-80 rounded-2xl" />
            <div className="skeleton h-72 rounded-2xl" />
          </div>
          <div className="skeleton h-96 rounded-2xl" />
        </div>
      </div>
    </BookingShell>
  );
}

export default function BookPage() {
  return (
    <Suspense fallback={<BookingSkeleton />}>
      <BookingPanel />
    </Suspense>
  );
}
