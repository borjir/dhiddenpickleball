import type { Metadata } from "next";
import {
  inviteStaffAccountAction,
  sendAccountRecoveryAction,
  setStaffAccessAction,
} from "@/app/staff/actions";
import { Badge } from "@/components/ui/badge";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { ShieldIcon, UsersIcon } from "@/components/ui/icons";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  StaffEmpty,
  StaffFlash,
  StaffPageHeader,
  StaffPanel,
} from "@/components/staff/staff-ui";
import { requireAccountManager } from "@/lib/staff/auth";
import { formatStaffDateTime } from "@/lib/staff/time";

export const metadata: Metadata = {
  title: "Accounts",
};

type SearchParams = Promise<{
  notice?: string | string[];
  error?: string | string[];
}>;

type StaffAccount = {
  id: string;
  full_name: string | null;
  email: string | null;
  can_manage_accounts: boolean;
  created_at: string;
};

function text(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

/** Supabase reports a ban as a far-future `banned_until` timestamp. */
function isBanned(bannedUntil: string | null | undefined) {
  if (!bannedUntil) return false;
  return new Date(bannedUntil).getTime() > Date.now();
}

export default async function AccountsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { supabase, staff } = await requireAccountManager();
  const params = await searchParams;

  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email, can_manage_accounts, created_at")
    .eq("role", "staff")
    .order("created_at", { ascending: true });

  const accounts = (data ?? []) as StaffAccount[];

  // Ban state only exists in auth.users, so it is read with the service-role
  // client. Without that key the list still renders; the toggle just stays on
  // "Disable" and the action reports the missing configuration.
  const admin = createAdminClient();
  const bannedIds = new Set<string>();

  if (admin) {
    const { data: authUsers } = await admin.auth.admin.listUsers({
      perPage: 200,
    });

    for (const user of authUsers?.users ?? []) {
      if (isBanned(user.banned_until)) bannedIds.add(user.id);
    }
  }

  return (
    <>
      <StaffPageHeader
        eyebrow="Admin"
        title="Staff accounts"
        description="Invite a staff member, switch sign-in off when someone leaves, and send a password reset. The account manager flag is set in SQL, so this page can never grant itself more access."
      />

      <div className="mt-5">
        <StaffFlash
          notice={text(params.notice) || null}
          error={text(params.error) || null}
        />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <StaffPanel
          title={`${accounts.length} staff account${accounts.length === 1 ? "" : "s"}`}
          description="Everyone listed here can open the operations desk."
        >
          {accounts.length === 0 ? (
            <StaffEmpty
              icon={UsersIcon}
              title="No staff accounts yet"
              description="Invite the first staff member with the form beside this panel."
            />
          ) : (
            <ul className="divide-y divide-line">
              {accounts.map((account) => {
                const isSelf = account.id === staff.id;
                const disabled = bannedIds.has(account.id);

                return (
                  <li key={account.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-heading">
                          {account.full_name?.trim() || "Unnamed account"}
                          {isSelf ? <Badge variant="neutral">You</Badge> : null}
                          {account.can_manage_accounts ? (
                            <Badge variant="info" dot>
                              Account manager
                            </Badge>
                          ) : null}
                          {disabled ? (
                            <Badge variant="danger" dot>
                              Sign-in disabled
                            </Badge>
                          ) : null}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-muted">
                          {account.email || "No email on file"}
                        </p>
                        <p className="mt-1 text-[0.6875rem] text-muted">
                          Joined {formatStaffDateTime(account.created_at)}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {account.email ? (
                          <form action={sendAccountRecoveryAction}>
                            <input type="hidden" name="email" value={account.email} />
                            <SubmitButton
                              variant="secondary"
                              size="sm"
                              pendingLabel="Sending…"
                            >
                              Send reset
                            </SubmitButton>
                          </form>
                        ) : null}

                        {isSelf ? null : (
                          <form action={setStaffAccessAction}>
                            <input type="hidden" name="accountId" value={account.id} />
                            <input
                              type="hidden"
                              name="enabled"
                              value={disabled ? "true" : "false"}
                            />
                            <SubmitButton
                              variant="ghost"
                              size="sm"
                              pendingLabel="Saving…"
                            >
                              {disabled ? "Enable" : "Disable"}
                            </SubmitButton>
                          </form>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </StaffPanel>

        <StaffPanel
          title="Invite a staff member"
          description="They receive an email, set their own password, and then have desk access."
        >
          <form action={inviteStaffAccountAction} className="grid gap-3">
            <Field id="account-name" label="Full name" required>
              <Input
                id="account-name"
                name="fullName"
                autoComplete="off"
                maxLength={120}
                required
              />
            </Field>
            <Field id="account-email" label="Email" required>
              <Input
                id="account-email"
                name="email"
                type="email"
                autoComplete="off"
                maxLength={180}
                required
              />
            </Field>
            <SubmitButton pendingLabel="Sending invitation…">
              Send invitation
            </SubmitButton>
            <p className="text-[0.6875rem] leading-relaxed text-muted">
              Supabase sends the invitation email, and its Free plan limits how
              many it will send per hour. If sending fails, create the user in
              the Supabase dashboard and promote them with
              <code className="mx-1 rounded bg-page px-1 py-0.5">
                update profiles set role = &apos;staff&apos;
              </code>
              .
            </p>
          </form>

          <div className="mt-4 flex items-start gap-2 border-t border-line pt-3 text-[0.6875rem] leading-relaxed text-muted">
            <ShieldIcon className="mt-0.5 size-4 shrink-0 text-muted" />
            <p>
              Disabling blocks sign-in without deleting the account, so the
              person&apos;s booking and payment history stays attached. The
              account-manager flag itself is set in SQL only:
              <code className="mx-1 rounded bg-page px-1 py-0.5">
                update profiles set can_manage_accounts = true where email = …
              </code>
            </p>
          </div>
        </StaffPanel>
      </div>
    </>
  );
}
