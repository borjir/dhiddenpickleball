import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthCodeError } from "@/components/auth/auth-code-error";
import { AuthFormSkeleton } from "@/components/auth/auth-form-skeleton";

export const metadata: Metadata = {
  title: "Email link problem",
  robots: { index: false, follow: false },
};

export default function AuthCodeErrorPage() {
  return (
    <AuthShell
      eyebrow="Account link"
      title="That link didn't work"
      description="Email and recovery links are single-use and can expire. Here is what to do next."
    >
      <Suspense fallback={<AuthFormSkeleton rows={1} />}>
        <AuthCodeError />
      </Suspense>
    </AuthShell>
  );
}
