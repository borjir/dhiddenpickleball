import type { Metadata } from "next";
import type { ReactNode } from "react";
import { StaffShell } from "@/components/staff/staff-shell";
import { requireStaff } from "@/lib/staff/auth";

// The operations desk is authenticated and request-scoped. It is never
// prerendered, so blocking data access is the correct route behaviour.
// (`instant = false` was removed because it requires cacheComponents, which
// is disabled for the Cloudflare Workers deployment.)

export const metadata: Metadata = {
  title: {
    default: "Operations desk",
    template: "%s | D-Hidden operations",
  },
  description: "Staff operations desk for D-Hidden Pickleball Court & Bistro.",
  robots: { index: false, follow: false },
};

export default async function StaffLayout({ children }: { children: ReactNode }) {
  const { supabase, staff } = await requireStaff();
  const { count } = await supabase
    .from("payments")
    .select("id", { count: "exact", head: true })
    .eq("status", "awaiting_verification");

  return (
    <StaffShell staff={staff} reviewCount={count ?? 0}>
      {children}
    </StaffShell>
  );
}
