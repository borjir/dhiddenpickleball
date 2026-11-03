import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type BadgeVariant =
  | "neutral"
  | "navy"
  | "blue"
  | "lime"
  | "yellow"
  | "success"
  | "warning"
  | "danger"
  | "info";

const variants: Record<BadgeVariant, string> = {
  neutral: "border-line bg-page text-muted",
  navy: "border-brand-navy/15 bg-brand-navy text-white",
  blue: "border-brand-blue/20 bg-brand-blue-soft text-accent-ink",
  lime: "border-brand-lime/30 bg-brand-lime-soft text-brand-lime-ink",
  yellow: "border-brand-yellow/60 bg-brand-yellow-soft text-ink",
  success: "border-success/20 bg-success-soft text-success",
  warning: "border-warning/25 bg-warning-soft text-warning",
  danger: "border-danger/20 bg-danger-soft text-danger",
  info: "border-info/20 bg-info-soft text-info",
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  /** Adds a status dot so meaning is not carried by color alone. */
  dot?: boolean;
}

export function Badge({
  variant = "neutral",
  dot = false,
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold leading-none",
        variants[variant],
        className,
      )}
      {...props}
    >
      {dot ? (
        <span
          aria-hidden="true"
          className="size-1.5 rounded-full bg-current"
        />
      ) : null}
      {children}
    </span>
  );
}
