import Link from "next/link";
import { PageHeader } from "@/components/site/page-header";
import { PublicPage } from "@/components/site/public-page";
import { buttonClasses } from "@/components/ui/button";
import { ArrowRightIcon } from "@/components/ui/icons";

/**
 * Shared 404 content. It is used by the root not-found route and by the
 * dynamic court and policy segments so an unknown slug has the same recovery
 * links as an unknown path.
 */
export function NotFoundContent() {
  return (
    <PublicPage>
      <PageHeader
        eyebrow="404"
        title="That page is not here."
        intro="The address may have changed, or the page may not exist yet. These routes cover the club, the courts, and the visit."
      >
        <Link href="/" className={buttonClasses({ size: "lg" })}>
          Back to the homepage
          <ArrowRightIcon className="size-5" />
        </Link>
        <Link
          href="/courts"
          className={buttonClasses({ variant: "secondary", size: "lg" })}
        >
          See the courts
        </Link>
      </PageHeader>

      <section className="bg-canvas py-16 sm:py-20">
        <div className="mx-auto w-full max-w-7xl px-5 sm:px-8">
          <h2 className="text-heading font-semibold text-heading">
            Looking for something else?
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { href: "/courts", label: "The courts" },
              { href: "/visit", label: "Visit & directions" },
              { href: "/club/rules", label: "Club rules" },
              { href: "/club/faq", label: "Common questions" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="group flex min-h-11 items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-sm font-semibold text-heading shadow-card transition-colors hover:bg-brand-blue-soft/50"
              >
                {link.label}
                <ArrowRightIcon className="size-4 text-accent-ink transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
            ))}
          </div>
        </div>
      </section>
    </PublicPage>
  );
}
