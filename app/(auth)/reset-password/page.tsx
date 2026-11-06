import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthFormSkeleton } from "@/components/auth/auth-form-skeleton";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata: Metadata = {
  title: "Choose a new password",
  description: "Set a new password for your club account.",
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return (
    <AuthShell
      eyebrow="Account recovery"
      title="Choose a new password"
      description="Use at least 8 characters. This replaces the password on your account."
    >
      <Suspense fallback={<AuthFormSkeleton rows={2} />}>
        <ResetPasswordForm configured={isSupabaseConfigured()} />
      </Suspense>
    </AuthShell>
  );
}
