"use client";

import { useState, type ComponentType, type SVGProps } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  ArrowLeftIcon,
  BallIcon,
  CalendarIcon,
  ChartIcon,
  CloseIcon,
  CourtIcon,
  GridIcon,
  MenuIcon,
  WalletIcon,
} from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import type { StaffMember } from "@/lib/staff/auth";

const items: Array<{
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  exact?: boolean;
}> = [
  { href: "/staff", label: "Today", icon: GridIcon, exact: true },
  { href: "/staff/bookings", label: "Bookings", icon: CalendarIcon },
  { href: "/staff/payments", label: "Payments", icon: WalletIcon },
  { href: "/staff/open-play", label: "Open play", icon: BallIcon },
  { href: "/staff/courts", label: "Courts", icon: CourtIcon },
  { href: "/staff/reports", label: "Reports", icon: ChartIcon },
];

function isActive(pathname: string, href: string, exact?: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

function NavItems({
  pathname,
  reviewCount,
  onNavigate,
}: {
  pathname: string;
  reviewCount: number;
  onNavigate?: () => void;
}) {
  return (
    <ul className="space-y-1">
      {items.map((item) => {
        const active = isActive(pathname, item.href, item.exact);
        const Icon = item.icon;

        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-semibold transition-colors",
                active
                  ? "bg-white text-brand-navy shadow-[inset_3px_0_0_var(--color-brand-lime)]"
                  : "text-white/70 hover:bg-white/10 hover:text-white",
              )}
            >
              <Icon className="size-[1.1rem] shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.href === "/staff/payments" && reviewCount > 0 ? (
                <span
                  className={cn(
                    "grid min-w-5 place-items-center rounded-full px-1.5 py-0.5 text-[0.625rem] font-extrabold leading-none",
                    active ? "bg-brand-navy text-white" : "bg-brand-yellow text-brand-navy",
                  )}
                >
                  {reviewCount > 99 ? "99+" : reviewCount}
                </span>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function StaffIdentity({ staff }: { staff: StaffMember }) {
  const initials = staff.fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <div className="flex items-center gap-2.5">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-yellow font-display text-xs font-extrabold text-brand-navy">
        {initials || "S"}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-white">
          {staff.fullName}
        </span>
        <span className="mt-0.5 block truncate text-[0.6875rem] text-white/50">
          {staff.email}
        </span>
      </span>
    </div>
  );
}

export function StaffNav({
  staff,
  reviewCount,
}: {
  staff: StaffMember;
  reviewCount: number;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[16.5rem] flex-col bg-brand-navy px-3 py-5 text-white lg:flex">
        <Link
          href="/staff"
          className="flex min-h-12 items-center gap-2.5 rounded-lg px-2"
          aria-label="D-Hidden operations desk"
        >
          <Logo size={42} priority />
          <span className="leading-none">
            <span className="block font-display text-[0.95rem] font-extrabold uppercase tracking-[0.12em]">
              D-Hidden
            </span>
            <span className="mt-1 block text-[0.5625rem] font-bold uppercase tracking-[0.18em] text-brand-lime">
              Operations desk
            </span>
          </span>
        </Link>

        <p className="mt-7 px-3 text-[0.625rem] font-bold uppercase tracking-[0.18em] text-white/40">
          Daily work
        </p>
        <nav aria-label="Staff" className="mt-2">
          <NavItems pathname={pathname} reviewCount={reviewCount} />
        </nav>

        <div className="mt-auto border-t border-white/10 pt-4">
          <div className="flex items-center gap-1 px-1">
            <NotificationBell tone="inverse" placement="up" align="left" />
            <ThemeToggle tone="inverse" className="size-10" />
            <Link
              href="/"
              className="inline-flex min-h-10 flex-1 items-center gap-2 rounded-lg px-2 text-xs font-semibold text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            >
              <ArrowLeftIcon className="size-4" />
              Public site
            </Link>
          </div>
          <div className="mt-3 px-1">
            <StaffIdentity staff={staff} />
          </div>
          <SignOutButton className="mt-3 [&_button]:h-9 [&_button]:justify-start [&_button]:border-white/15 [&_button]:bg-white/5 [&_button]:px-3 [&_button]:text-white/75 [&_button]:hover:bg-white/10 [&_button]:hover:text-white" />
        </div>
      </aside>

      <header className="sticky top-0 z-40 border-b border-white/10 bg-brand-navy text-white lg:hidden">
        <div className="flex h-16 items-center justify-between gap-3 px-4">
          <Link href="/staff" className="flex items-center gap-2.5">
            <Logo size={38} priority />
            <span className="font-display text-sm font-extrabold uppercase tracking-[0.12em]">
              Operations
            </span>
          </Link>
          <div className="flex items-center gap-1.5">
            <NotificationBell tone="inverse" />
            {reviewCount > 0 ? (
              <Link
                href="/staff/payments"
                className="rounded-full bg-brand-yellow px-2.5 py-1 text-[0.6875rem] font-extrabold text-brand-navy"
              >
                {reviewCount} to review
              </Link>
            ) : null}
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              aria-expanded={open}
              aria-controls="staff-mobile-menu"
              aria-label={open ? "Close staff menu" : "Open staff menu"}
              className="grid size-10 place-items-center rounded-lg border border-white/20 bg-white/10"
            >
              {open ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>

        {open ? (
          <div id="staff-mobile-menu" className="border-t border-white/10 bg-brand-navy px-3 pb-4 pt-3">
            <NavItems
              pathname={pathname}
              reviewCount={reviewCount}
              onNavigate={() => setOpen(false)}
            />
            <div className="mt-3 border-t border-white/10 pt-3">
              <StaffIdentity staff={staff} />
              <div className="mt-2 flex items-center gap-2">
                <ThemeToggle tone="inverse" className="size-10" />
                <Link
                  href="/"
                  onClick={() => setOpen(false)}
                  className="inline-flex min-h-10 flex-1 items-center gap-2 rounded-lg px-2 text-xs font-semibold text-white/70"
                >
                  <ArrowLeftIcon className="size-4" />
                  Public site
                </Link>
              </div>
              <SignOutButton className="mt-2 [&_button]:h-9 [&_button]:justify-start [&_button]:border-white/15 [&_button]:bg-white/5 [&_button]:px-3 [&_button]:text-white/75" />
            </div>
          </div>
        ) : null}
      </header>
    </>
  );
}
