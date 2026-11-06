"use client";

import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { ConfigNotice } from "@/components/auth/config-notice";
import { createClient } from "@/lib/supabase/client";
import { authErrorMessage } from "@/lib/auth/errors";
import { fieldErrorsFrom, forgotPasswordSchema } from "@/lib/validation/auth";

export function ForgotPasswordForm({ configured }: { configured: boolean }) {
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const parsed = forgotPasswordSchema.safeParse({ email });

    if (!parsed.success) {
      setErrors(fieldErrorsFrom(parsed.error));
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(
        parsed.data.email,
        {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
            "/reset-password",
          )}`,
        },
      );

      if (error) {
        setFormError(authErrorMessage(error));
        return;
      }

      // Always show the same result so the form cannot be used to discover
      // whether an email address has an account.
      setSentTo(parsed.data.email);
    } catch (error) {
      setFormError(authErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  if (!configured) return <ConfigNotice />;

  if (sentTo) {
    return (
      <div className="space-y-5" aria-live="polite">
        <Alert variant="success" title="Check your inbox">
          <p>
            If an account uses{" "}
            <span className="font-semibold break-all">{sentTo}</span>, a password
            reset link is on its way. The link is single-use and expires.
          </p>
        </Alert>
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          onClick={() => {
            setSentTo(null);
            setEmail("");
          }}
        >
          Use a different email
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {formError ? (
        <Alert
          variant="error"
          eyebrow="Could not send the link"
          title={formError}
          role="alert"
        />
      ) : null}

      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <Field
          id="forgot-email"
          label="Email"
          hint="Use the email connected to your account."
          error={errors.email}
          required
        >
          <Input
            id="forgot-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="you@example.com"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              if (errors.email) {
                setErrors((current) => {
                  const nextErrors = { ...current };
                  delete nextErrors.email;
                  return nextErrors;
                });
              }
            }}
            invalid={Boolean(errors.email)}
            aria-describedby={
              errors.email ? "forgot-email-error" : "forgot-email-hint"
            }
          />
        </Field>

        <Button type="submit" className="w-full" loading={loading}>
          Send reset link
        </Button>
      </form>
    </div>
  );
}
