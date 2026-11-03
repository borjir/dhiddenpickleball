import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "navy"
  | "ghost"
  | "danger"
  | "inverse";

export type ButtonSize = "sm" | "md" | "lg";

const base =
  "group relative inline-flex select-none items-center justify-center gap-2 rounded-lg font-semibold transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-quick hover:-translate-y-px active:translate-y-0 disabled:pointer-events-none disabled:opacity-50 disabled:hover:translate-y-0";

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-13 px-6 text-base",
};

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-blue text-white shadow-card hover:bg-brand-blue-strong hover:shadow-raised",
  secondary:
    "border border-line-strong bg-surface text-heading hover:border-accent-ink/50 hover:bg-brand-blue-soft/60",
  navy: "bg-brand-navy text-white shadow-card hover:bg-brand-navy-deep hover:shadow-raised",
  ghost: "text-heading hover:bg-brand-blue-soft/70",
  danger: "bg-danger text-white hover:bg-danger-strong",
  inverse: "bg-white text-brand-navy shadow-raised hover:bg-brand-yellow",
};

/** Shared classes so anchors can look like buttons without nesting controls. */
export function buttonClasses({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}) {
  return cn(base, sizes[size], variants[variant], className);
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  className,
  children,
  disabled,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses({ variant, size, className })}
      {...props}
    >
      {loading ? (
        <span
          aria-hidden="true"
          className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      ) : null}
      {children}
    </button>
  );
}
