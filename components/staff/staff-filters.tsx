import type { ReactNode } from "react";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { ChevronDownIcon, SearchIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

/**
 * Shared staff filter controls.
 *
 * Staff are not expected to understand query strings or hidden controls, so
 * every field keeps a visible label, every list has an explicit submit button,
 * and an applied filter is always removable with one "Clear filters" link.
 */

const controlClass =
  "h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm font-semibold text-ink shadow-xs transition-[border-color,box-shadow,background-color] duration-200 placeholder:font-normal placeholder:text-muted/70 hover:border-line-strong focus:border-brand-blue focus:outline-none focus:ring-4 focus:ring-brand-blue/15 disabled:cursor-not-allowed disabled:bg-page disabled:text-muted";

export function StaffFilterBar({
  action,
  children,
  columns = "sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_11rem_12rem]",
  active,
  clearHref,
  submitLabel = "Show results",
  help = "Fill in any box, then press the button.",
}: {
  action: string;
  children: ReactNode;
  columns?: string;
  active: boolean;
  clearHref: string;
  submitLabel?: string;
  help?: string;
}) {
  return (
    <form
      action={action}
      method="get"
      className="mb-4 rounded-xl border border-line bg-surface p-3 shadow-card sm:p-4"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-muted">
          Filters
        </p>
        <p className="text-caption text-muted">{help}</p>
      </div>

      <div className={cn("mt-2.5 grid gap-2.5", columns)}>{children}</div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="submit"
          className={buttonClasses({ size: "md", className: "w-full sm:w-auto" })}
        >
          {submitLabel}
        </button>
        {active ? (
          <Link
            href={clearHref}
            className={buttonClasses({
              variant: "secondary",
              size: "md",
              className: "w-full sm:w-auto",
            })}
          >
            Clear filters
          </Link>
        ) : (
          <span className="text-caption text-muted">No filters applied</span>
        )}
      </div>
    </form>
  );
}

export function StaffFilterField({
  id,
  label,
  hint,
  className,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      <label htmlFor={id} className="text-caption font-bold text-heading">
        {label}
      </label>
      {children}
      {hint ? (
        <p className="text-[0.6875rem] leading-snug text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export function StaffSearchField({
  id,
  name = "q",
  label = "Search",
  placeholder,
  defaultValue,
  hint,
  className,
}: {
  id: string;
  name?: string;
  label?: string;
  placeholder: string;
  defaultValue?: string;
  hint?: string;
  className?: string;
}) {
  return (
    <StaffFilterField id={id} label={label} hint={hint} className={className}>
      <span className="relative block">
        <SearchIcon
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
        />
        <input
          id={id}
          name={name}
          type="search"
          defaultValue={defaultValue}
          placeholder={placeholder}
          className={cn(controlClass, "pl-9")}
        />
      </span>
    </StaffFilterField>
  );
}

export function StaffFilterDate({
  id,
  name,
  value,
  disabled,
  className,
}: {
  id: string;
  name: string;
  value?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <input
      id={id}
      name={name}
      type="date"
      defaultValue={value}
      disabled={disabled}
      className={cn(controlClass, "px-2 tabular-nums", className)}
    />
  );
}

export function StaffFilterSelect({
  id,
  name,
  value,
  options,
  className,
}: {
  id: string;
  name: string;
  value: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  className?: string;
}) {
  return (
    <span className="relative block">
      <select
        id={id}
        name={name}
        defaultValue={value}
        className={cn(controlClass, "appearance-none pr-9", className)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDownIcon
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted"
      />
    </span>
  );
}
