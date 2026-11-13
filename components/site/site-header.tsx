"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Logo } from "@/components/brand/logo";
import { AuthLink } from "@/components/auth/auth-link";
import { useBookingModal } from "@/components/booking/booking-modal-provider";
import { buttonClasses } from "@/components/ui/button";
import { CloseIcon, MenuIcon, ArrowRightIcon } from "@/components/ui/icons";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/cn";
import { CLUB } from "@/lib/club";
import { OPEN_PLAY_ENABLED } from "@/lib/features";

const links = [
  { href: "/courts", label: "The courts" },
  { href: "/open-play", label: "Open play" },
  { href: "/#pricing", label: "Rates" },
  { href: "/visit", label: "Visit" },
  { href: "/club", label: "The club" },
].filter((link) => OPEN_PLAY_ENABLED || link.href !== "/open-play");

export function SiteHeader({ startSolid = false }: { startSolid?: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();
  const { openCourt, openOpenPlayList, prewarmCourt } = useBookingModal();

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 24);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const solid = scrolled || open || startSolid;

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,box-shadow,backdrop-filter] duration-300",
        solid
          ? "border-b border-line bg-surface/90 shadow-[0_1px_0_rgba(18,59,120,0.04)] backdrop-blur-xl"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex h-[4.75rem] w-full max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
        <Link
          href="/"
          className="flex min-h-11 items-center gap-3 rounded-lg"
          aria-label="D-Hidden Pickleball Court & Bistro — home"
        >
          <Logo size={48} priority className="drop-shadow-sm" />
          <span className="hidden leading-none sm:block">
            <span
              className={cn(
                "block font-display text-[0.95rem] font-extrabold uppercase tracking-[0.14em] transition-colors",
                solid ? "text-heading" : "text-white",
              )}
            >
              D-Hidden
            </span>
            <span
              className={cn(
                "mt-1 block text-[0.625rem] font-semibold uppercase tracking-[0.2em] transition-colors",
                solid ? "text-muted" : "text-white/70",
              )}
            >
              Pickleball &amp; Bistro
            </span>
          </span>
        </Link>

        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {links.map((link) => (
              <li key={link.href}>
                {link.href === "/open-play" ? (
                  <button
                    type="button"
                    aria-haspopup="dialog"
                    onClick={() => void openOpenPlayList()}
                    className={cn(
                      "relative inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold transition-colors duration-200",
                      solid
                        ? "text-ink/75 hover:bg-brand-blue-soft/70 hover:text-heading"
                        : "text-white/80 hover:bg-white/10 hover:text-white",
                    )}
                  >
                    {link.label}
                  </button>
                ) : (
                  <Link
                    href={link.href}
                    className={cn(
                      "relative inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold transition-colors duration-200",
                      solid
                        ? "text-ink/75 hover:bg-brand-blue-soft/70 hover:text-heading"
                        : "text-white/80 hover:bg-white/10 hover:text-white",
                    )}
                  >
                    {link.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle tone={solid ? "auto" : "inverse"} className="hidden sm:grid" />
          <span className="hidden md:inline-flex">
            <AuthLink solid={solid} />
          </span>
          <button
            type="button"
            aria-haspopup="dialog"
            onClick={() => void openCourt()}
            onPointerEnter={prewarmCourt}
            onFocus={prewarmCourt}
            className={buttonClasses({
              size: "md",
              className: cn("inline-flex", !solid && "shadow-glow"),
            })}
          >
            Book a court
            <ArrowRightIcon className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </button>

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            className={cn(
              "grid size-11 place-items-center rounded-full border transition-colors lg:hidden",
              solid
                ? "border-line bg-surface text-heading"
                : "border-white/25 bg-white/10 text-white",
            )}
          >
            {open ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open ? (
          <motion.div
            id="mobile-menu"
            initial={reduce ? undefined : { height: 0, opacity: 0 }}
            animate={reduce ? undefined : { height: "auto", opacity: 1 }}
            exit={reduce ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden border-t border-line bg-surface lg:hidden"
          >
            <nav aria-label="Mobile" className="mx-auto max-w-7xl px-5 py-4 sm:px-8">
              <ul className="space-y-1">
                {links.map((link) => (
                  <li key={link.href}>
                    {link.href === "/open-play" ? (
                      <button
                        type="button"
                        aria-haspopup="dialog"
                        onClick={() => {
                          setOpen(false);
                          void openOpenPlayList();
                        }}
                        className="flex min-h-12 w-full items-center justify-between rounded-lg px-3 text-left text-base font-semibold text-heading transition-colors hover:bg-brand-blue-soft/70"
                      >
                        {link.label}
                        <ArrowRightIcon className="size-4 text-muted" />
                      </button>
                    ) : (
                      <Link
                        href={link.href}
                        onClick={() => setOpen(false)}
                        className="flex min-h-12 items-center justify-between rounded-lg px-3 text-base font-semibold text-heading transition-colors hover:bg-brand-blue-soft/70"
                      >
                        {link.label}
                        <ArrowRightIcon className="size-4 text-muted" />
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
              <div className="mt-3 border-t border-line pt-4">
                <AuthLink
                  solid
                  onNavigate={() => setOpen(false)}
                  className="w-full hover:bg-brand-blue-soft/70"
                />
                <p className="mt-2 px-3 text-sm text-muted">
                  Open daily 7:00 AM – 12:00 AM
                </p>
                <a
                  href={CLUB.phoneHref}
                  className="inline-flex min-h-10 items-center px-3 text-sm font-semibold text-accent-ink"
                >
                  {CLUB.phoneDisplay}
                </a>
              </div>
              <div className="mt-3 flex items-center gap-2 border-t border-line pt-4">
                <button
                  type="button"
                  aria-haspopup="dialog"
                  onClick={() => {
                    setOpen(false);
                    void openCourt();
                  }}
                  className={buttonClasses({ size: "lg", className: "flex-1" })}
                >
                  Book a court
                  <ArrowRightIcon className="size-4" />
                </button>
                <ThemeToggle />
              </div>
            </nav>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
