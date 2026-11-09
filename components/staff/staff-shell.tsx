import type { ReactNode } from "react";
import { StaffNav } from "@/components/staff/staff-nav";
import type { StaffMember } from "@/lib/staff/auth";

export function StaffShell({
  staff,
  reviewCount,
  children,
}: {
  staff: StaffMember;
  reviewCount: number;
  children: ReactNode;
}) {
  return (
    <div className="min-h-svh bg-page">
      <a
        href="#staff-main"
        className="sr-only z-50 rounded-md bg-surface px-4 py-2 font-semibold text-heading shadow-raised focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <StaffNav staff={staff} reviewCount={reviewCount} />
      <div className="lg:pl-[16.5rem]">
        <main
          id="staff-main"
          className="mx-auto w-full max-w-[1600px] px-4 pb-24 pt-5 sm:px-6 sm:pt-6 lg:px-8 lg:pb-8 lg:pt-8"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
