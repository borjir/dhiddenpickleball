import { cn } from "@/lib/cn";

export interface StepperStep {
  label: string;
  description?: string;
}

export interface StepperProps {
  steps: readonly StepperStep[];
  /** Zero-based index of the active step. */
  current: number;
  className?: string;
}

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      fill="none"
      className="size-3.5"
    >
      <path
        d="m3.5 8.5 3 3 6-7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Visual progress for a multi-step task. The active step is announced with
 * aria-current; labels remain visible so progress never depends on color.
 */
export function Stepper({ steps, current, className }: StepperProps) {
  const safeCurrent = Math.min(Math.max(current, 0), steps.length - 1);
  const activeStep = steps[safeCurrent];
  const progress = steps.length > 1 ? (safeCurrent / (steps.length - 1)) * 100 : 100;

  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-3 sm:hidden">
        <p className="text-caption font-semibold uppercase tracking-[0.12em] text-muted">
          Step {safeCurrent + 1} of {steps.length}
        </p>
        <p className="text-sm font-semibold text-heading">{activeStep?.label}</p>
      </div>
      <div
        className="mt-2 h-1 overflow-hidden rounded-full bg-line sm:hidden"
        aria-hidden="true"
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-blue to-brand-lime transition-[width] duration-500 ease-out-expo"
          style={{ width: `${Math.max(progress, 6)}%` }}
        />
      </div>

      <ol className="hidden items-center gap-2 sm:flex" aria-label="Progress">
        {steps.map((step, index) => {
          const complete = index < safeCurrent;
          const active = index === safeCurrent;

          return (
            <li
              key={step.label}
              aria-current={active ? "step" : undefined}
              className={cn(
                "flex min-w-0 items-center gap-2.5",
                index < steps.length - 1 && "flex-1",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-full border text-xs font-bold transition-all duration-300 ease-out-expo",
                  complete &&
                    "border-brand-blue bg-brand-blue text-white shadow-[0_0_0_4px_var(--brand-blue-soft)]",
                  active &&
                    "border-brand-navy bg-brand-navy text-white shadow-[0_0_0_4px_var(--brand-blue-soft)]",
                  !complete && !active && "border-line bg-surface text-muted",
                )}
              >
                {complete ? <CheckIcon /> : index + 1}
              </span>
              <span
                className={cn(
                  "truncate text-sm font-semibold transition-colors duration-300",
                  active ? "text-heading" : "text-muted",
                )}
              >
                {step.label}
              </span>
              {index < steps.length - 1 ? (
                <span
                  aria-hidden="true"
                  className="relative hidden h-px flex-1 overflow-hidden bg-line sm:block"
                >
                  <span
                    className={cn(
                      "absolute inset-y-0 left-0 bg-brand-blue/60 transition-[width] duration-500 ease-out-expo",
                      complete ? "w-full" : "w-0",
                    )}
                  />
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
