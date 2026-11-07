"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { ConfigNotice } from "@/components/auth/config-notice";
import { createClient } from "@/lib/supabase/client";
import { authErrorMessage } from "@/lib/auth/errors";
import { fieldErrorsFrom, signInSchema } from "@/lib/validation/auth";

/**
 * Staff-only sign-in. Players have no login; they use the booking reference and
 * mobile number on the public lookup page. A non-staff account that signs in
 * here is immediately signed out again so the browser never holds a player
 * session.
 */
export function SignInForm({ configured }: { configured: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedEmail = searchParams.get("email")?.trim() ?? "";
  const sessionExpired =
    searchParams.get("notice") === "session-expired" ||
    searchParams.get("notice") === "staff-only";

  const [values, setValues] = useState({
    email: requestedEmail,
    password: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update(field: "email" | "password", value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      if (!current[field]) return current;
      const nextErrors = { ...current };
      delete nextErrors[field];
      return nextErrors;
    });
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const parsed = signInSchema.safeParse(values);

    if (!parsed.success) {
      setErrors(fieldErrorsFrom(parsed.error));
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      const supabase = createClient();
      const { data: signIn, error } = await supabase.auth.signInWithPassword({
        email: parsed.data.email,
        password: parsed.data.password,
      });

      if (error) {
        setFormError(authErrorMessage(error));
        return;
      }

      let isStaff = false;

      if (signIn.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", signIn.user.id)
          .maybeSingle();

        isStaff = profile?.role === "staff";
      }

      if (!isStaff) {
        await supabase.auth.signOut();
        setFormError(
          "This sign-in is for club staff only. Players check bookings with their reference and mobile number.",
        );
        return;
      }

      router.replace("/staff");
      router.refresh();
    } catch (error) {
      setFormError(authErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  if (!configured) return <ConfigNotice />;

  return (
    <div className="space-y-5">
      {sessionExpired ? (
        <Alert
          variant="warning"
          eyebrow="Session expired"
          title="Sign in again to continue"
          role="status"
        >
          Your staff session ended for security. Sign in to return to the
          operations desk.
        </Alert>
      ) : null}

      {formError ? (
        <Alert
          variant="error"
          eyebrow="Could not sign in"
          title={formError}
          role="alert"
        />
      ) : null}

      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <Field id="sign-in-email" label="Staff email" error={errors.email} required>
          <Input
            id="sign-in-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="staff@example.com"
            value={values.email}
            onChange={(event) => update("email", event.target.value)}
            invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "sign-in-email-error" : undefined}
          />
        </Field>

        <Field
          id="sign-in-password"
          label="Password"
          error={errors.password}
          required
        >
          <Input
            id="sign-in-password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Your password"
            value={values.password}
            onChange={(event) => update("password", event.target.value)}
            invalid={Boolean(errors.password)}
            aria-describedby={
              errors.password ? "sign-in-password-error" : undefined
            }
          />
        </Field>

        <div className="-mt-1 flex justify-end">
          <Link
            href="/staff-access/forgot-password"
            className="inline-flex min-h-10 items-center text-sm font-semibold text-accent-ink underline-offset-4 hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        <Button type="submit" className="w-full" loading={loading}>
          Sign in
        </Button>
      </form>

      <p className="text-center text-xs leading-relaxed text-muted">
        Club staff only. Looking for a booking?{" "}
        <Link
          href="/lookup"
          className="font-semibold text-accent-ink underline underline-offset-2"
        >
          Check it with your reference
        </Link>
        .
      </p>
    </div>
  );
}
