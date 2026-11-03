import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface PolicyNoticeProps {
  title?: string;
  items: ReactNode[];
  note?: ReactNode;
  className?: string;
}

/**
 * Static policy recap. Wording is supplied by the caller because cancellation,
 * no-show, and refund rules still need client confirmation.
 */
export function PolicyNotice({
  title = "Before you confirm",
  items,
  note,
  className,
}: PolicyNoticeProps) {
  return (
    <section
      aria-label={title}
      className={cn(
        "rounded-lg border border-line bg-surface p-5",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg border border-line bg-brand-blue-soft text-accent-ink"
        >
          <svg viewBox="0 0 20 20" fill="none" className="size-4.5">
            <path
              d="M5 2.75h6.5L15 6.25v11H5v-14.5Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path
              d="M11.5 2.75v3.5H15M7.5 9.5h5M7.5 12.5h3.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <div className="min-w-0">
          <p className="text-eyebrow font-bold uppercase text-accent-ink">
            Booking terms
          </p>
          <h3 className="mt-1 text-heading font-semibold text-heading">
            {title}
          </h3>
        </div>
      </div>

      <ul className="mt-4 space-y-2.5">
        {items.map((item, index) => (
          <li
            key={index}
            className="flex gap-2.5 text-sm leading-relaxed text-muted"
          >
            <span
              aria-hidden="true"
              className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-lime"
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>

      {note ? (
        <p className="mt-4 border-t border-line pt-3 text-caption text-muted">
          {note}
        </p>
      ) : null}
    </section>
  );
}
