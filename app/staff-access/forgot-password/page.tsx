import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthFormSkeleton } from "@/components/auth/auth-form-skeleton";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata: Metadata = {
  title: "Reset staff password",
  description: "Request a password reset link for a club staff account.",
  robots: { index: false, follow: false },
};

export default function StaffForgotPasswordPage() {
  return (
    <AuthShell
      eyebrow="Staff recovery"
      title="Forgot your password?"
      description="Enter the email connected to your staff account. We'll send a single-use link to choose a new password."
      footer={
        <p>
          Remembered it?{" "}
          <Link
            href="/staff-access"
            className="font-semibold text-accent-ink underline-offset-4 hover:underline"
          >
            Back to staff sign in
          </Link>
        </p>
      }
    >
      <Suspense fallback={<AuthFormSkeleton rows={1} />}>
        <ForgotPasswordForm configured={isSupabaseConfigured()} />
      </Suspense>
    </AuthShell>
  );
}
