"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Logo } from "@/components/brand/logo";
import { buttonClasses } from "@/components/ui/button";
import { CloseIcon, MenuIcon, ArrowRightIcon } from "@/components/ui/icons";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/cn";

const links = [
  { href: "#courts", label: "The courts" },
  { href: "#pricing", label: "Rates" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#faq", label: "FAQ" },
];

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();

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

  const solid = scrolled || open;

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
                <a
                  href={link.href}
                  className={cn(
                    "relative inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold transition-colors duration-200",
                    solid
                      ? "text-ink/75 hover:bg-brand-blue-soft/70 hover:text-heading"
                      : "text-white/80 hover:bg-white/10 hover:text-white",
                  )}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <span
            className={cn(
              "mr-1 hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.625rem] font-bold uppercase tracking-[0.14em] xl:inline-flex",
              solid
                ? "border-line bg-page text-muted"
                : "border-white/25 bg-white/10 text-white/80",
            )}
          >
            <span aria-hidden="true" className="size-1.5 rounded-full bg-brand-yellow" />
            Preview build
          </span>
          <ThemeToggle tone={solid ? "auto" : "inverse"} className="hidden sm:grid" />
          <Link
            href="/design-preview/booking"
            className={buttonClasses({
              size: "md",
              className: cn(
                "hidden sm:inline-flex",
                !solid && "shadow-glow",
              ),
            })}
          >
            Book a court
            <ArrowRightIcon className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>

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
                    <a
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className="flex min-h-12 items-center justify-between rounded-lg px-3 text-base font-semibold text-heading transition-colors hover:bg-brand-blue-soft/70"
                    >
                      {link.label}
                      <ArrowRightIcon className="size-4 text-muted" />
                    </a>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex items-center gap-2 border-t border-line pt-4">
                <Link
                  href="/design-preview/booking"
                  className={buttonClasses({ size: "lg", className: "flex-1" })}
                >
                  Book a court
                  <ArrowRightIcon className="size-4" />
                </Link>
                <ThemeToggle />
              </div>
            </nav>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
