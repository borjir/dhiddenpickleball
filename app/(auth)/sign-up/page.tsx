import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthFormSkeleton } from "@/components/auth/auth-form-skeleton";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata: Metadata = {
  title: "Create an account",
  description:
    "Create a D-Hidden Pickleball Court & Bistro account with email or Google.",
  robots: { index: false, follow: false },
};

export default function SignUpPage() {
  return (
    <AuthShell
      eyebrow="New player"
      title="Create your account"
      description="Sign up with Google, or use an email address and password. Confirm your email before your first booking."
      footer={
        <p>
          Already have an account?{" "}
          <Link
            href="/sign-in"
            className="font-semibold text-accent-ink underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>
      }
    >
      <Suspense fallback={<AuthFormSkeleton rows={4} />}>
        <SignUpForm configured={isSupabaseConfigured()} />
      </Suspense>
    </AuthShell>
  );
}
