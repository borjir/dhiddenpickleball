import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type AlertVariant = "info" | "success" | "warning" | "error";

const styles: Record<
  AlertVariant,
  { container: string; label: string; labelText: string }
> = {
  info: {
    container: "border-info/25 border-l-info bg-info-soft/60",
    label: "text-info",
    labelText: "Information",
  },
  success: {
    container: "border-success/25 border-l-success bg-success-soft/60",
    label: "text-success",
    labelText: "Success",
  },
  warning: {
    container: "border-warning/30 border-l-warning bg-warning-soft/70",
    label: "text-warning",
    labelText: "Attention",
  },
  error: {
    container: "border-danger/25 border-l-danger bg-danger-soft/60",
    label: "text-danger",
    labelText: "Error",
  },
};

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
  title: string;
  children?: ReactNode;
  /** Overrides the default spoken label, e.g. "Payment not verified". */
  eyebrow?: string;
}

export function Alert({
  variant = "info",
  title,
  eyebrow,
  className,
  children,
  ...props
}: AlertProps) {
  const style = styles[variant];

  return (
    <div
      className={cn(
        "rounded-lg border border-l-4 px-4 py-3.5 sm:px-5",
        style.container,
        className,
      )}
      {...props}
    >
      <p
        className={cn(
          "text-[0.6875rem] font-bold uppercase tracking-[0.14em]",
          style.label,
        )}
      >
        {eyebrow ?? style.labelText}
      </p>
      <p className="mt-1 font-display text-base font-semibold text-heading">
        {title}
      </p>
      {children ? (
        <div className="mt-1.5 text-sm leading-relaxed text-ink/80">
          {children}
        </div>
      ) : null}
    </div>
  );
}
