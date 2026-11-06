"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { CheckCircleIcon } from "@/components/ui/icons";
import { ConfigNotice } from "@/components/auth/config-notice";
import { GoogleButton } from "@/components/auth/google-button";
import { OrDivider } from "@/components/auth/or-divider";
import { createClient } from "@/lib/supabase/client";
import { authErrorMessage } from "@/lib/auth/errors";
import { safeNextPath } from "@/lib/auth/redirect";
import { fieldErrorsFrom, signUpSchema } from "@/lib/validation/auth";

const emptyValues = {
  fullName: "",
  email: "",
  password: "",
  confirmPassword: "",
};

export function SignUpForm({ configured }: { configured: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNextPath(searchParams.get("next"));

  const [values, setValues] = useState(emptyValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);

  function update(field: keyof typeof values, value: string) {
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

    const parsed = signUpSchema.safeParse(values);

    if (!parsed.success) {
      setErrors(fieldErrorsFrom(parsed.error));
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      const supabase = createClient();
      const emailRedirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
        next,
      )}`;

      const { data, error } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: {
          data: { full_name: parsed.data.fullName },
          emailRedirectTo,
        },
      });

      if (error) {
        setFormError(authErrorMessage(error));
        return;
      }

      // Email confirmation is enabled, so a session normally does not exist
      // yet. If the project has confirmation switched off, continue directly.
      if (data.session) {
        router.replace(next);
        router.refresh();
        return;
      }

      setSentTo(parsed.data.email);
    } catch (error) {
      setFormError(authErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    if (!sentTo || resending) return;

    setResending(true);
    setResendError(null);
    setResendMessage(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: sentTo,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
            next,
          )}`,
        },
      });

      if (error) {
        setResendError(authErrorMessage(error));
        return;
      }

      setResendMessage("Confirmation email sent again.");
    } catch (error) {
      setResendError(authErrorMessage(error));
    } finally {
      setResending(false);
    }
  }

  if (!configured) return <ConfigNotice />;

  if (sentTo) {
    return (
      <div className="space-y-5" aria-live="polite">
        <div className="rounded-xl border border-success/25 bg-success-soft/60 p-5">
          <CheckCircleIcon className="size-7 text-success" />
          <h2 className="mt-3 font-display text-xl font-bold text-heading">
            Check your inbox
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-ink/80">
            We sent a confirmation link to{" "}
            <span className="font-semibold break-all text-heading">{sentTo}</span>.
            Open it to finish creating your account. Check the spam folder if it
            does not arrive within a few minutes.
          </p>
        </div>

        {resendMessage ? (
          <Alert variant="success" title={resendMessage} role="status" />
        ) : null}
        {resendError ? (
          <Alert
            variant="error"
            eyebrow="Could not resend"
            title={resendError}
            role="alert"
          />
        ) : null}

        <Button
          type="button"
          variant="secondary"
          className="w-full"
          onClick={resend}
          loading={resending}
        >
          Resend confirmation email
        </Button>

        <p className="text-center text-sm text-muted">
          Already confirmed?{" "}
          <Link
            href={`/sign-in?email=${encodeURIComponent(sentTo)}`}
            className="font-semibold text-accent-ink underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {formError ? (
        <Alert
          variant="error"
          eyebrow="Could not create the account"
          title={formError}
          role="alert"
        />
      ) : null}

      <GoogleButton
        label="Sign up with Google"
        next={next}
        onError={setFormError}
        disabled={loading}
      />

      <OrDivider label="or sign up with email" />

      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <Field
          id="sign-up-name"
          label="Full name"
          error={errors.fullName}
          required
        >
          <Input
            id="sign-up-name"
            name="fullName"
            type="text"
            autoComplete="name"
            placeholder="Juan Dela Cruz"
            value={values.fullName}
            onChange={(event) => update("fullName", event.target.value)}
            invalid={Boolean(errors.fullName)}
            aria-describedby={errors.fullName ? "sign-up-name-error" : undefined}
          />
        </Field>

        <Field id="sign-up-email" label="Email" error={errors.email} required>
          <Input
            id="sign-up-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="you@example.com"
            value={values.email}
            onChange={(event) => update("email", event.target.value)}
            invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "sign-up-email-error" : undefined}
          />
        </Field>

        <Field
          id="sign-up-password"
          label="Password"
          hint="At least 8 characters."
          error={errors.password}
          required
        >
          <Input
            id="sign-up-password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="Create a password"
            value={values.password}
            onChange={(event) => update("password", event.target.value)}
            invalid={Boolean(errors.password)}
            aria-describedby={
              errors.password
                ? "sign-up-password-error"
                : "sign-up-password-hint"
            }
          />
        </Field>

        <Field
          id="sign-up-confirm"
          label="Confirm password"
          error={errors.confirmPassword}
          required
        >
          <Input
            id="sign-up-confirm"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="Repeat your password"
            value={values.confirmPassword}
            onChange={(event) => update("confirmPassword", event.target.value)}
            invalid={Boolean(errors.confirmPassword)}
            aria-describedby={
              errors.confirmPassword ? "sign-up-confirm-error" : undefined
            }
          />
        </Field>

        <Button type="submit" className="w-full" loading={loading}>
          Create account
        </Button>

        <p className="text-caption leading-relaxed text-muted">
          By creating an account, you agree to the{" "}
          <Link
            href="/policies/terms"
            className="font-semibold text-accent-ink underline-offset-4 hover:underline"
          >
            Terms of use
          </Link>{" "}
          and{" "}
          <Link
            href="/policies/privacy"
            className="font-semibold text-accent-ink underline-offset-4 hover:underline"
          >
            Privacy notice
          </Link>
          . We&apos;ll email a confirmation link before your first booking. The
          account stores your name and email for court reservations.
        </p>
      </form>
    </div>
  );
}
