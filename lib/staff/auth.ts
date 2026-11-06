import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export type StaffMember = {
  id: string;
  email: string;
  fullName: string;
};

function signInPath() {
  return `/sign-in?next=${encodeURIComponent("/staff")}&notice=session-expired`;
}

/**
 * Resolve the signed-in staff member and return a request-scoped client.
 * Players are sent back to their account; signed-out visitors go to sign-in.
 * The database RLS policies remain the final access boundary.
 */
export async function requireStaff() {
  if (!isSupabaseConfigured()) {
    redirect("/account?notice=staff-config");
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) redirect(signInPath());

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "staff") {
    redirect("/account?notice=staff-only");
  }

  return {
    supabase,
    staff: {
      id: user.id,
      email: profile.email?.trim() || user.email || "Staff account",
      fullName: profile.full_name?.trim() || "Staff",
    } satisfies StaffMember,
  };
}
