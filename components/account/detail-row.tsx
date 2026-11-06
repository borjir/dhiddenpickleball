import type { ReactNode } from "react";

export function DetailRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="border-t border-line py-3.5 first:border-t-0 first:pt-0 last:pb-0">
      <dt className="text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-muted">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-semibold text-heading">{children}</dd>
    </div>
  );
}
