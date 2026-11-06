import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/site/page-header";
import { PublicPage } from "@/components/site/public-page";
import { Alert } from "@/components/ui/alert";
import {
  ArrowRightIcon,
  ClockIcon,
  ShieldIcon,
  WalletIcon,
} from "@/components/ui/icons";
import {
  getPolicy,
  POLICIES,
  POLICY_UPDATED,
} from "@/lib/policies";
import { CLUB } from "@/lib/club";

type PolicyPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return POLICIES.map((policy) => ({ slug: policy.slug }));
}

export async function generateMetadata({
  params,
}: PolicyPageProps): Promise<Metadata> {
  const { slug } = await params;
  const policy = getPolicy(slug);

  if (!policy) {
    return { title: "Policy not found", robots: { index: false, follow: false } };
  }

  return {
    title: policy.title,
    description: policy.intro,
    robots: { index: false, follow: false },
  };
}

export default async function PolicyPage({ params }: PolicyPageProps) {
  const { slug } = await params;
  const policy = getPolicy(slug);

  if (!policy) notFound();

  const otherPolicies = POLICIES.filter(
    (item) => item.slug !== policy.slug,
  );

  return (
    <PublicPage>
      <PageHeader
        eyebrow={policy.eyebrow}
        title={policy.title}
        intro={policy.intro}
      />

      <section className="bg-canvas py-12 sm:py-16">
        <div className="mx-auto w-full max-w-7xl px-5 sm:px-8">
          <div className="mb-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-caption text-muted">
            <span className="inline-flex items-center gap-1.5">
              <ClockIcon className="size-4 text-brand-lime" />
              Current as of {POLICY_UPDATED}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldIcon className="size-4 text-brand-lime" />
              Public copy approved — {POLICY_UPDATED}
            </span>
          </div>

          <Alert
            variant="info"
            eyebrow="Policy status"
            title="Published 5 November 2026"
            className="mb-10"
          >
            <p>
              These policies are kept together with the club rules and booking
              screens. If a confirmed rule changes, each surface is updated
              together.
            </p>
          </Alert>

          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_15rem] lg:gap-16">
            <div className="space-y-10">
              {policy.sections.map((section) => (
                <section
                  key={section.id}
                  id={section.id}
                  aria-labelledby={`${section.id}-title`}
                  className="scroll-mt-28 border-t border-line pt-8 first:border-t-0 first:pt-0"
                >
                  <h2
                    id={`${section.id}-title`}
                    className="font-display text-2xl font-bold text-heading"
                  >
                    {section.heading}
                  </h2>
                  {section.paragraphs?.map((paragraph) => (
                    <p
                      key={paragraph}
                      className="mt-3 text-base leading-relaxed text-muted"
                    >
                      {paragraph}
                    </p>
                  ))}
                  {section.items ? (
                    <ul className="mt-4 space-y-3">
                      {section.items.map((item) => (
                        <li
                          key={item}
                          className="flex gap-2.5 text-base leading-relaxed text-muted"
                        >
                          <span
                            aria-hidden="true"
                            className="mt-2.5 size-1.5 shrink-0 rounded-full bg-brand-lime"
                          />
                          {item}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </section>
              ))}

              <div className="border-t border-line pt-8">
                <p className="text-sm leading-relaxed text-muted">
                  Questions about this policy can go to the club at{" "}
                  <a
                    href={CLUB.phoneHref}
                    className="font-semibold text-accent-ink"
                  >
                    {CLUB.phoneDisplay}
                  </a>{" "}
                  or{" "}
                  <a
                    href={`mailto:${CLUB.email}`}
                    className="break-all font-semibold text-accent-ink"
                  >
                    {CLUB.email}
                  </a>
                  .
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  {otherPolicies.map((otherPolicy) => (
                    <Link
                      key={otherPolicy.slug}
                      href={`/policies/${otherPolicy.slug}`}
                      className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-line-strong bg-surface px-4 text-sm font-semibold text-heading transition-colors hover:bg-brand-blue-soft/60"
                    >
                      {otherPolicy.title}
                      <ArrowRightIcon className="size-4" />
                    </Link>
                  ))}
                  <Link
                    href="/club/rules"
                    className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-line-strong bg-surface px-4 text-sm font-semibold text-heading transition-colors hover:bg-brand-blue-soft/60"
                  >
                    Club rules
                    <ArrowRightIcon className="size-4" />
                  </Link>
                </div>
              </div>
            </div>

            <aside>
              <nav
                aria-label="On this page"
                className="rounded-2xl border border-line bg-surface p-5 shadow-card lg:sticky lg:top-28"
              >
                <p className="text-eyebrow font-bold uppercase text-muted">
                  On this page
                </p>
                <ul className="mt-3 space-y-1">
                  {policy.sections.map((section) => (
                    <li key={section.id}>
                      <a
                        href={`#${section.id}`}
                        className="inline-flex min-h-9 items-center text-sm font-semibold text-ink transition-colors hover:text-accent-ink"
                      >
                        {section.heading}
                      </a>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 border-t border-line pt-4">
                  {policy.slug === "privacy" || policy.slug === "terms" ? (
                    <p className="flex items-center gap-1.5 text-caption font-semibold text-muted">
                      <ShieldIcon className="size-4 text-brand-lime" />
                      Questions? Contact the club
                    </p>
                  ) : (
                    <p className="flex items-center gap-1.5 text-caption font-semibold text-muted">
                      <WalletIcon className="size-4 text-brand-lime" />
                      GCash, verified by staff
                    </p>
                  )}
                </div>
              </nav>
            </aside>
          </div>
        </div>
      </section>
    </PublicPage>
  );
}
