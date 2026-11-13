import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { ArrowLeftIcon, ArrowRightIcon } from "@/components/ui/icons";
import { staffPageCount, staffPageHref } from "@/lib/staff/pagination";
import { cn } from "@/lib/cn";

/**
 * Previous/Next pagination for long staff lists.
 *
 * The current range and page number stay visible so a non-technical user can
 * tell where they are, and every link keeps the active filters.
 */
export function StaffPagination({
  page,
  pageSize,
  total,
  basePath,
  params,
  noun,
}: {
  page: number;
  pageSize: number;
  total: number;
  basePath: string;
  params: Record<string, string | undefined>;
  noun: string;
}) {
  if (total <= pageSize) return null;

  const totalPages = staffPageCount(total, pageSize);
  const current = Math.min(Math.max(1, page), totalPages);
  const start = (current - 1) * pageSize + 1;
  const end = Math.min(total, current * pageSize);
  const previous = staffPageHref(basePath, params, current - 1);
  const next = staffPageHref(basePath, params, current + 1);
  const disabled = cn(
    buttonClasses({ variant: "secondary", size: "sm" }),
    "pointer-events-none opacity-40",
  );

  return (
    <nav
      aria-label={`${noun} pages`}
      className="mt-4 flex flex-col gap-3 rounded-xl border border-line bg-surface px-3 py-3 shadow-card sm:flex-row sm:items-center sm:justify-between sm:px-4"
    >
      <p className="text-caption text-muted">
        Showing <span className="font-bold text-heading">{start}–{end}</span> of{" "}
        <span className="font-bold text-heading">{total}</span> {noun}
      </p>

      <div className="flex items-center justify-between gap-2 sm:justify-end">
        {current > 1 ? (
          <Link href={previous} className={buttonClasses({ variant: "secondary", size: "sm" })}>
            <ArrowLeftIcon className="size-4" />
            Previous
          </Link>
        ) : (
          <span aria-disabled="true" className={disabled}>
            <ArrowLeftIcon className="size-4" />
            Previous
          </span>
        )}

        <span className="px-1 text-caption font-semibold text-muted">
          Page {current} of {totalPages}
        </span>

        {current < totalPages ? (
          <Link href={next} className={buttonClasses({ variant: "secondary", size: "sm" })}>
            Next
            <ArrowRightIcon className="size-4" />
          </Link>
        ) : (
          <span aria-disabled="true" className={disabled}>
            Next
            <ArrowRightIcon className="size-4" />
          </span>
        )}
      </div>
    </nav>
  );
}
