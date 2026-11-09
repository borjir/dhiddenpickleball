import type { ComponentType, ReactNode, SVGProps } from "react";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { ArrowRightIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

export function StaffPageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between sm:gap-6 sm:pb-6">
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-[0.6875rem] font-bold uppercase tracking-[0.18em] text-accent-ink">
          <span aria-hidden="true" className="h-[3px] w-5 rounded-full bg-brand-lime" />
          {eyebrow}
        </p>
        <h1 className="mt-2 font-display text-[1.7rem] font-extrabold leading-[1.05] tracking-[-0.035em] text-heading sm:text-[2.1rem] lg:text-[2.25rem]">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </header>
  );
}

const statTones = {
  blue: {
    bar: "bg-brand-blue",
    icon: "bg-brand-blue-soft text-accent-ink",
    wash: "from-brand-blue/[0.07]",
  },
  lime: {
    bar: "bg-brand-lime",
    icon: "bg-brand-lime-soft text-brand-lime-ink",
    wash: "from-brand-lime/[0.12]",
  },
  amber: {
    bar: "bg-warning",
    icon: "bg-warning-soft text-warning",
    wash: "from-warning/[0.1]",
  },
  red: {
    bar: "bg-danger",
    icon: "bg-danger-soft text-danger",
    wash: "from-danger/[0.08]",
  },
  navy: {
    bar: "bg-brand-navy",
    icon: "bg-page text-heading",
    wash: "from-brand-navy/[0.05]",
  },
} as const;

export function StaffStat({
  label,
  value,
  detail,
  icon: Icon,
  tone = "navy",
  href,
}: {
  label: string;
  value: ReactNode;
  detail?: string;
  icon: Icon;
  tone?: keyof typeof statTones;
  href?: string;
}) {
  const scheme = statTones[tone];

  const content = (
    <>
      <span
        aria-hidden="true"
        className={cn("absolute inset-x-0 top-0 h-[3px]", scheme.bar)}
      />
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-br to-transparent opacity-80",
          scheme.wash,
        )}
      />
      <div className="relative flex items-start justify-between gap-3">
        <p className="text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-muted">
          {label}
        </p>
        <span
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-lg",
            scheme.icon,
          )}
        >
          <Icon className="size-[1.1rem]" />
        </span>
      </div>
      <p className="relative mt-2.5 font-display text-[1.75rem] font-extrabold leading-none tracking-[-0.04em] text-heading tabular-nums sm:text-3xl">
        {value}
      </p>
      <div className="relative mt-2 flex items-end justify-between gap-2">
        {detail ? (
          <p className="max-w-[16rem] text-caption leading-snug text-muted">{detail}</p>
        ) : (
          <span />
        )}
        {href ? (
          <ArrowRightIcon
            aria-hidden="true"
            className="size-3.5 shrink-0 text-muted/60 transition-[transform,color] duration-200 group-hover:translate-x-0.5 group-hover:text-accent-ink"
          />
        ) : null}
      </div>
    </>
  );

  const className = cn(
    "group relative block overflow-hidden rounded-xl border border-line bg-surface p-4 shadow-card transition-[border-color,box-shadow,transform] duration-200",
    href && "hover:-translate-y-0.5 hover:border-line-strong hover:shadow-raised",
  );

  return href ? (
    <Link href={href} className={className}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}

export function StaffPanel({
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border border-line bg-surface shadow-card",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line bg-page/35 px-4 py-3.5 sm:px-5">
        <div className="flex min-w-0 items-start gap-2.5">
          <span
            aria-hidden="true"
            className="mt-1 h-4 w-[3px] shrink-0 rounded-full bg-brand-lime"
          />
          <div className="min-w-0">
            <h2 className="font-display text-base font-bold leading-tight text-heading">
              {title}
            </h2>
            {description ? (
              <p className="mt-0.5 text-caption text-muted">{description}</p>
            ) : null}
          </div>
        </div>
        {action}
      </div>
      <div className={cn("p-4 sm:p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

export function StaffEmpty({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: Icon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-dashed border-line-strong bg-page/45 px-5 py-9 text-center">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 [background-image:radial-gradient(circle_at_1px_1px,var(--paper-grid)_1px,transparent_0)] [background-size:18px_18px] opacity-70"
      />
      <span className="relative mx-auto grid size-11 place-items-center rounded-full bg-brand-blue-soft text-accent-ink ring-4 ring-surface">
        <Icon className="size-5" />
      </span>
      <p className="relative mt-3 font-display text-base font-bold text-heading">
        {title}
      </p>
      <p className="relative mx-auto mt-1 max-w-sm text-caption leading-relaxed text-muted">
        {description}
      </p>
      {action ? <div className="relative mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function StaffFlash({
  notice,
  error,
}: {
  notice?: string | null;
  error?: string | null;
}) {
  if (!notice && !error) return null;

  return (
    <div className="mb-5" role="status" aria-live="polite">
      {error ? (
        <Alert variant="error" title="That action did not go through" role="alert">
          {error}
        </Alert>
      ) : (
        <Alert variant="success" title={notice ?? "Saved"} />
      )}
    </div>
  );
}

export function StaffLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex min-h-9 items-center gap-1.5 text-sm font-semibold text-accent-ink transition-colors hover:text-heading",
        className,
      )}
    >
      {children}
      <ArrowRightIcon className="size-3.5" />
    </Link>
  );
}

export function StaffFacts({
  items,
  className,
}: {
  items: Array<{ label: string; value: ReactNode }>;
  className?: string;
}) {
  return (
    <dl className={cn("divide-y divide-line", className)}>
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-baseline justify-between gap-4 py-2.5 first:pt-0 last:pb-0"
        >
          <dt className="text-caption text-muted">{item.label}</dt>
          <dd className="text-right text-sm font-semibold text-ink">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function StaffSectionTitle({
  title,
  detail,
}: {
  title: string;
  detail?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="font-display text-base font-bold text-heading">{title}</h2>
      {detail ? <span className="text-caption text-muted">{detail}</span> : null}
    </div>
  );
}
