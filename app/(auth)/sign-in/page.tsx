import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthFormSkeleton } from "@/components/auth/auth-form-skeleton";
import { SignInForm } from "@/components/auth/sign-in-form";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata: Metadata = {
  title: "Sign in",
  description:
    "Sign in to D-Hidden Pickleball Court & Bistro to manage court reservations and payment status.",
  robots: { index: false, follow: false },
};

export default function SignInPage() {
  return (
    <AuthShell
      eyebrow="Player access"
      title="Welcome back"
      description="Sign in to manage your court reservations and payment status."
      footer={
        <p>
          New here?{" "}
          <Link
            href="/sign-up"
            className="font-semibold text-accent-ink underline-offset-4 hover:underline"
          >
            Create an account
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
