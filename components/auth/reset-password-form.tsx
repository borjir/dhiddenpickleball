"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { Button, buttonClasses } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { ConfigNotice } from "@/components/auth/config-notice";
import { createClient } from "@/lib/supabase/client";
import { authErrorMessage } from "@/lib/auth/errors";
import { fieldErrorsFrom, resetPasswordSchema } from "@/lib/validation/auth";

type SessionState = "checking" | "ready" | "missing";

export function ResetPasswordForm({ configured }: { configured: boolean }) {
  const [session, setSession] = useState<SessionState>("checking");
  const [values, setValues] = useState({ password: "", confirmPassword: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!configured) return;

    let active = true;

    async function check() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.auth.getUser();

        if (!active) return;
        setSession(error || !data.user ? "missing" : "ready");
      } catch {
        if (active) setSession("missing");
      }
    }

    void check();

    return () => {
      active = false;
    };
  }, [configured]);

  function update(field: "password" | "confirmPassword", value: string) {
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

    const parsed = resetPasswordSchema.safeParse(values);

    if (!parsed.success) {
      setErrors(fieldErrorsFrom(parsed.error));
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        password: parsed.data.password,
      });

      if (error) {
        setFormError(authErrorMessage(error));
        return;
      }

      setDone(true);
    } catch (error) {
      setFormError(authErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  if (!configured) return <ConfigNotice />;

  if (session === "checking") {
    return (
      <div className="space-y-3" aria-live="polite">
        <div className="skeleton h-11 rounded-lg" />
        <div className="skeleton h-11 rounded-lg" />
        <div className="skeleton h-11 rounded-lg" />
        <p className="text-center text-sm text-muted">Checking your reset link…</p>
      </div>
    );
  }

  if (session === "missing") {
    return (
      <div className="space-y-5">
        <Alert variant="warning" title="That reset link is no longer active">
          <p>
            Reset links expire and can only be used once. Request a fresh link
            and open it in this browser.
          </p>
        </Alert>
        <Link
          href="/forgot-password"
          className={buttonClasses({ className: "w-full" })}
        >
          Request a new link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="space-y-5" aria-live="polite">
        <Alert variant="success" title="Password updated">
          <p>Your new password is ready. Sign in again on any other device.</p>
        </Alert>
        <Link
          href="/account"
          className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-brand-blue px-5 text-sm font-semibold text-white shadow-card transition-colors hover:bg-brand-blue-strong"
        >
          Go to my account
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {formError ? (
        <Alert
          variant="error"
          eyebrow="Could not update the password"
          title={formError}
          role="alert"
        />
      ) : null}

      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <Field
          id="reset-password"
          label="New password"
          hint="Use at least 8 characters."
          error={errors.password}
          required
        >
          <Input
            id="reset-password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="New password"
            value={values.password}
            onChange={(event) => update("password", event.target.value)}
            invalid={Boolean(errors.password)}
            aria-describedby={
              errors.password ? "reset-password-error" : "reset-password-hint"
            }
          />
        </Field>

        <Field
          id="reset-confirm"
          label="Confirm new password"
          error={errors.confirmPassword}
          required
        >
          <Input
            id="reset-confirm"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="Repeat the new password"
            value={values.confirmPassword}
            onChange={(event) => update("confirmPassword", event.target.value)}
            invalid={Boolean(errors.confirmPassword)}
            aria-describedby={
              errors.confirmPassword ? "reset-confirm-error" : undefined
            }
          />
        </Field>

        <Button type="submit" className="w-full" loading={loading}>
          Update password
        </Button>
      </form>
    </div>
  );
}
