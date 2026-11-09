import type {
  ComponentPropsWithRef,
  ReactNode,
} from "react";
import { cn } from "@/lib/cn";

const control =
  "w-full rounded-lg border border-line bg-surface px-3.5 text-ink shadow-xs transition-[border-color,box-shadow,background-color] duration-200 placeholder:text-muted/60 hover:border-line-strong focus:border-brand-blue focus:outline-none focus:ring-4 focus:ring-brand-blue/15 disabled:cursor-not-allowed disabled:bg-page disabled:text-muted aria-invalid:border-danger aria-invalid:focus:border-danger aria-invalid:focus:ring-danger/15";

export interface FieldProps {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  optionalLabel?: boolean;
  className?: string;
  children: ReactNode;
}

/** Label + control + helper/error text. Pass a matching `id` to the control. */
export function Field({
  id,
  label,
  hint,
  error,
  required = false,
  optionalLabel = false,
  className,
  children,
}: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-semibold text-heading">
        {label}
        {required ? (
          <span className="ml-1 text-danger" aria-hidden="true">
            *
          </span>
        ) : null}
        {optionalLabel ? (
          <span className="ml-1.5 text-xs font-normal text-muted">
            (optional)
          </span>
        ) : null}
      </label>
      {children}
      {error ? (
        <p
          id={`${id}-error`}
          className="flex items-start gap-1.5 text-sm font-medium text-danger"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            fill="none"
            className="mt-0.5 size-4 shrink-0"
          >
            <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4" />
            <path
              d="M8 5v4M8 11h.01"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-caption text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function Input({
  className,
  invalid,
  ...props
}: ComponentPropsWithRef<"input"> & { invalid?: boolean }) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={cn(control, "h-11", className)}
      {...props}
    />
  );
}

/**
 * Mobile number input with a fixed `+63` prefix, so the Philippine country
 * requirement is visible before the guest starts typing. The value itself stays
 * in the local format and is normalised on the server.
 */
export function PhoneInput({
  className,
  invalid,
  ...props
}: ComponentPropsWithRef<"input"> & { invalid?: boolean }) {
  return (
    <span className="relative block w-full">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-sm font-medium text-muted"
      >
        +63
      </span>
      <input
        aria-invalid={invalid || undefined}
        className={cn(control, "h-11 pl-14", className)}
        {...props}
      />
    </span>
  );
}

export function Textarea({
  className,
  invalid,
  ...props
}: ComponentPropsWithRef<"textarea"> & { invalid?: boolean }) {
  return (
    <textarea
      aria-invalid={invalid || undefined}
      className={cn(control, "min-h-28 resize-y py-2.5", className)}
      {...props}
    />
  );
}

export function Select({
  className,
  invalid,
  children,
  ...props
}: ComponentPropsWithRef<"select"> & { invalid?: boolean }) {
  return (
    <span className="relative block">
      <select
        aria-invalid={invalid || undefined}
        className={cn(control, "h-11 appearance-none pr-10", className)}
        {...props}
      >
        {children}
      </select>
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        fill="none"
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted"
      >
        <path
          d="m5 8 5 5 5-5"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
