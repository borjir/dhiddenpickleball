import type { ReactNode } from "react";
import { AuthTopBar } from "@/components/auth/auth-top-bar";

/** Shared frame for the signed-in account pages. */
export function AccountShell({ children }: { children: ReactNode }) {
  return (
    <main className="relative isolate min-h-svh overflow-hidden bg-page">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 court-grid opacity-50"
      />
      <div className="relative mx-auto w-full max-w-5xl px-5 py-6 sm:px-8 sm:py-8">
        <AuthTopBar />
        {children}
      </div>
    </main>
  );
}
