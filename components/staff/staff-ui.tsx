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
    <header className="flex flex-col gap-4 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="text-eyebrow font-bold uppercase tracking-[0.16em] text-accent-ink">
          {eyebrow}
        </p>
        <h1 className="mt-1.5 font-display text-2xl font-extrabold tracking-[-0.03em] text-heading sm:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted">
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
  blue: "border-t-brand-blue bg-brand-blue-soft/35",
  lime: "border-t-brand-lime bg-brand-lime-soft/60",
  amber: "border-t-warning bg-warning-soft/55",
  red: "border-t-danger bg-danger-soft/45",
  navy: "border-t-brand-navy bg-page",
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
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-muted">
          {label}
        </p>
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface text-accent-ink ring-1 ring-line">
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-2 font-display text-3xl font-extrabold tracking-[-0.04em] text-heading">
        {value}
      </p>
      {detail ? <p className="mt-1 text-caption leading-snug text-muted">{detail}</p> : null}
    </>
  );

  const className = cn(
    "block rounded-xl border border-line border-t-[3px] bg-surface p-4 shadow-card transition-[border-color,box-shadow,transform] duration-200",
    statTones[tone],
    href && "hover:-translate-y-px hover:shadow-raised",
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
    <section className={cn("overflow-hidden rounded-xl border border-line bg-surface shadow-card", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3.5 sm:px-5">
        <div>
          <h2 className="font-display text-base font-bold text-heading">{title}</h2>
          {description ? <p className="mt-0.5 text-caption text-muted">{description}</p> : null}
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
    <div className="rounded-lg border border-dashed border-line-strong bg-page/45 px-5 py-8 text-center">
      <span className="mx-auto grid size-10 place-items-center rounded-full bg-brand-blue-soft text-accent-ink">
        <Icon className="size-5" />
      </span>
      <p className="mt-3 font-display text-base font-bold text-heading">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-caption leading-relaxed text-muted">
        {description}
      </p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
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
    <div className="mb-5">
      {error ? (
        <Alert variant="error" title="That action did not go through" role="alert">
          {error}
        </Alert>
      ) : (
        <Alert variant="success" title={notice ?? "Saved"} role="status" />
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
        <div key={item.label} className="flex items-baseline justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
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
