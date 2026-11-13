import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export type StaffMember = {
  id: string;
  email: string;
  fullName: string;
  /** Set in SQL for the owners who may invite, disable, and reset accounts. */
  canManageAccounts: boolean;
};

function signInPath() {
  return "/staff-access?notice=session-expired";
}

/**
 * Resolve the signed-in staff member and return a request-scoped client.
 * Signed-out visitors go to the unlisted staff sign-in; non-staff sessions go
 * back to the public booking lookup. The database RLS policies remain the final
 * access boundary.
 */
export async function requireStaff() {
  if (!isSupabaseConfigured()) {
    redirect("/staff-access?notice=config");
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) redirect(signInPath());

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, role, can_manage_accounts")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "staff") {
    redirect("/lookup?notice=staff-only");
  }

  return {
    supabase,
    staff: {
      id: user.id,
      email: profile.email?.trim() || user.email || "Staff account",
      fullName: profile.full_name?.trim() || "Staff",
      canManageAccounts: Boolean(profile.can_manage_accounts),
    } satisfies StaffMember,
  };
}

/**
 * Account management is a narrower permission than staff access. The flag is
 * set in SQL only; the app can never grant it to itself.
 */
export async function requireAccountManager() {
  const session = await requireStaff();

  if (!session.staff.canManageAccounts) {
    redirect("/staff?error=Only+an+account+manager+can+open+accounts.");
  }

  return session;
}
