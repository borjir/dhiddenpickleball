import { Alert } from "@/components/ui/alert";

/**
 * Shown when the public Supabase environment variables are absent. This is a
 * local setup state, not a production screen; it never prints secret values.
 */
export function ConfigNotice() {
  return (
    <Alert variant="warning" title="Accounts are not connected in this environment">
      <p>
        Add <code className="break-all font-semibold">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
        <code className="break-all font-semibold">
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
        </code>{" "}
        to <code className="font-semibold">.env.local</code>, then restart the
        development server. The publishable key is safe for the browser; never
        add a service-role or secret key here.
      </p>
    </Alert>
  );
}
