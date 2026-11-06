import type { ReactNode } from "react";
import Image from "next/image";
import { AuthTopBar } from "@/components/auth/auth-top-bar";
import {
  CheckCircleIcon,
  PinIcon,
  WalletIcon,
} from "@/components/ui/icons";

const facts = [
  "Two courts, open daily 7:00 AM – 12:00 AM",
  "₱250 per hour before 5:00 PM, ₱300 after",
  "Choose your court start and end time",
  "A 15-minute hold while you send payment",
];

/**
 * Shared frame for sign-in, sign-up, and password recovery. The form sits on
 * the right; the left panel uses a real court photograph and confirmed club
 * facts only. Every auth page gets the same header, theme control, and exit.
 */
export function AuthShell({
  eyebrow,
  title,
  description,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="relative isolate min-h-svh overflow-hidden bg-page">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 court-grid opacity-60"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 -top-40 size-[28rem] rounded-full bg-brand-blue/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-48 -left-32 size-[26rem] rounded-full bg-brand-lime/10 blur-3xl"
      />

      <div className="relative mx-auto flex min-h-svh w-full max-w-6xl flex-col px-5 py-6 sm:px-8 sm:py-8">
        <AuthTopBar />

        <div className="grid min-w-0 flex-1 items-center gap-8 py-8 sm:py-10 lg:grid-cols-[1.02fr_0.98fr] lg:gap-12">
          <section
            aria-label="About the club"
            className="relative hidden min-h-[34rem] overflow-hidden rounded-2xl bg-brand-navy shadow-raised lg:block"
          >
            <Image
              src="/courts/pickleball1.jpg"
              alt=""
              fill
              priority
              sizes="(min-width: 1024px) 46vw, 0px"
              className="object-cover"
            />
            <div aria-hidden="true" className="absolute inset-0 bg-scrim" />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-brand-navy-deep/90 via-brand-navy-deep/20 to-brand-navy/30"
            />

            <div className="relative flex h-full flex-col justify-between p-8 text-white xl:p-10">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-white/85">
                  <PinIcon className="size-3.5" />
                  Balamban, Cebu
                </span>
                <h2 className="mt-5 max-w-sm font-display text-3xl font-extrabold leading-[1.05] tracking-[-0.03em] text-white xl:text-4xl">
                  Court time without the guesswork.
                </h2>
                <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/75">
                  Pick a slot, see the full amount, and send your GCash proof.
                  Staff verify the transfer before the court is confirmed.
                </p>
              </div>

              <div className="mt-10">
                <ul className="space-y-2.5 border-t border-white/20 pt-6">
                  {facts.map((fact) => (
                    <li
                      key={fact}
                      className="flex items-start gap-2.5 text-sm font-medium text-white/85"
                    >
                      <CheckCircleIcon className="mt-0.5 size-4 shrink-0 text-brand-yellow" />
                      {fact}
                    </li>
                  ))}
                </ul>
                <p className="mt-6 flex items-start gap-2 text-xs leading-relaxed text-white/60">
                  <WalletIcon className="mt-0.5 size-3.5 shrink-0" />
                  Manual payment review. Nothing is marked paid automatically.
                </p>
              </div>
            </div>
          </section>

          <section className="w-full min-w-0 max-w-md justify-self-center lg:justify-self-end">
            <div className="rounded-2xl border border-line bg-surface p-6 shadow-card sm:p-8">
              <p className="text-eyebrow font-bold uppercase text-accent-ink">
                {eyebrow}
              </p>
              <h1 className="mt-2 font-display text-3xl font-extrabold tracking-[-0.03em] text-heading sm:text-[2.1rem]">
                {title}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {description}
              </p>

              <div className="mt-6">{children}</div>
            </div>

            {footer ? (
              <div className="mt-5 text-center text-sm text-muted">{footer}</div>
            ) : null}

            <p className="mt-6 text-center text-xs leading-relaxed text-muted">
              D-Hidden Pickleball Court &amp; Bistro · Bung-aw, Pondol,
              Balamban
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
