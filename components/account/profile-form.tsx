"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  updateProfile,
  type ProfileFormState,
} from "@/app/account/actions";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { formatBookingDate } from "@/lib/bookings";

const initialState: ProfileFormState = {
  status: "idle",
  errors: {},
  values: {
    fullName: "",
    phone: "",
  },
};

export function ProfileForm({
  fullName,
  phone,
  email,
  role,
  verified,
  createdAt,
}: {
  fullName: string;
  phone: string;
  email: string;
  role: "player" | "staff";
  verified: boolean;
  createdAt: string;
}) {
  const [state, formAction, pending] = useActionState(
    updateProfile,
    initialState,
  );

  const values =
    state.status === "idle" ? { fullName, phone } : state.values;

  return (
    <section
      aria-labelledby="account-profile"
      className="rounded-2xl border border-line bg-surface p-6 shadow-card sm:p-7"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-eyebrow font-bold uppercase text-accent-ink">
            Profile
          </p>
          <h2
            id="account-profile"
            className="mt-1 font-display text-2xl font-bold text-heading"
          >
            Your details
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={role === "staff" ? "navy" : "blue"} dot>
            {role === "staff" ? "Staff" : "Player"}
          </Badge>
          <Badge variant={verified ? "success" : "warning"} dot>
            {verified ? "Email verified" : "Email unverified"}
          </Badge>
        </div>
      </div>

      <p className="mt-2 text-sm leading-relaxed text-muted">
        Keep your name and mobile number current so the club can reach you
        about a reservation.
      </p>

      {state.status === "success" && state.message ? (
        <Alert
          variant="success"
          className="mt-5"
          role="status"
          title={state.message}
        >
          Your account now shows the details you saved.
        </Alert>
      ) : null}

      {state.status === "error" && state.message ? (
        <Alert
          variant="error"
          className="mt-5"
          role="alert"
          title={state.message}
        >
          Nothing was changed. Try again, or contact the club if it keeps
          failing.
        </Alert>
      ) : null}

      <form action={formAction} noValidate className="mt-6 space-y-5">
        <Field
          id="profile-name"
          label="Full name"
          required
          error={state.errors.fullName}
        >
          <Input
            id="profile-name"
            name="fullName"
            type="text"
            autoComplete="name"
            required
            maxLength={100}
            defaultValue={values.fullName}
            invalid={Boolean(state.errors.fullName)}
            aria-describedby={
              state.errors.fullName ? "profile-name-error" : undefined
            }
          />
        </Field>

        <Field
          id="profile-phone"
          label="Mobile number"
          optionalLabel
          hint="Used by the club on the day of your booking. Include the country code if you use one."
          error={state.errors.phone}
        >
          <Input
            id="profile-phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            maxLength={30}
            defaultValue={values.phone}
            invalid={Boolean(state.errors.phone)}
            aria-describedby={
              state.errors.phone ? "profile-phone-error" : "profile-phone-hint"
            }
          />
        </Field>

        <div className="rounded-lg border border-line bg-page/60 px-4 py-3.5">
          <p className="text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-muted">
            Email address
          </p>
          <p className="mt-1 break-all text-sm font-semibold text-heading">
            {email}
          </p>
          <p className="mt-1 text-caption leading-relaxed text-muted">
            This is your sign-in address and cannot be edited here.{" "}
            <Link
              href="/forgot-password"
              className="font-semibold text-accent-ink underline decoration-brand-blue/40 underline-offset-2 hover:text-brand-blue-strong"
            >
              Change your password
            </Link>
            .
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
          <p className="text-caption text-muted">
            Member since {formatBookingDate(createdAt)}
          </p>
          <Button type="submit" loading={pending}>
            {pending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    </section>
  );
}
