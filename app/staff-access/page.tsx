import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthFormSkeleton } from "@/components/auth/auth-form-skeleton";
import { SignInForm } from "@/components/auth/sign-in-form";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata: Metadata = {
  title: "Staff access",
  description: "Staff sign-in for the D-Hidden Pickleball operations desk.",
  robots: { index: false, follow: false },
};

export default function StaffAccessPage() {
  return (
    <AuthShell
      eyebrow="Staff access"
      title="Operations desk"
      description="This sign-in is for club staff. Player accounts are not used for court or open-play bookings."
      footer={
        <p>
          Looking for a booking?{" "}
          <Link
            href="/lookup"
            className="font-semibold text-accent-ink underline-offset-4 hover:underline"
          >
            Check it with your reference
          </Link>
        </p>
      }
    >
      <Suspense fallback={<AuthFormSkeleton />}>
        <SignInForm configured={isSupabaseConfigured()} />
      </Suspense>
    </AuthShell>
  );
}
