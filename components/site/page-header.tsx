import type { ReactNode } from "react";
import { FadeIn } from "@/components/motion/reveal";

/**
 * Shared heading block for public pages. Every page uses exactly one h1 here,
 * followed by section-level h2 headings in the page body.
 */
export function PageHeader({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  children?: ReactNode;
}) {
  return (
    <section className="border-b border-line bg-surface">
      <div className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
        <FadeIn className="max-w-3xl">
          <p className="text-eyebrow font-bold uppercase text-accent-ink">
            {eyebrow}
          </p>
          <h1 className="mt-3 text-title font-bold text-heading">{title}</h1>
          <p className="mt-4 text-body-lg leading-relaxed text-muted">
            {intro}
          </p>
        </FadeIn>
        {children ? (
          <div className="mt-7 flex flex-wrap items-center gap-3">{children}</div>
        ) : null}
      </div>
    </section>
  );
}
