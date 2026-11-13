"use client";

import { useEffect, useState, type ComponentType, type SVGProps } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BallIcon,
  CalendarIcon,
  ChartIcon,
  CloseIcon,
  CourtIcon,
  GridIcon,
  MenuIcon,
  ShieldIcon,
  WalletIcon,
} from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { OPEN_PLAY_ENABLED } from "@/lib/features";
import type { StaffMember } from "@/lib/staff/auth";

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  exact?: boolean;
  /** Shown in the compact mobile tab bar. */
  primary?: boolean;
  /** Only rendered for a staff member with `can_manage_accounts`. */
  managerOnly?: boolean;
};

const navGroups: Array<{ label: string; items: NavItem[] }> = [
  {
    label: "Front desk",
    items: [
      {
        href: "/staff",
        label: "Today",
        icon: GridIcon,
        exact: true,
        primary: true,
      },
      {
        href: "/staff/bookings",
        label: "Bookings",
        icon: CalendarIcon,
        primary: true,
      },
    ],
  },
  {
    label: "Money",
    items: [
      {
        href: "/staff/payments",
        label: "Payments",
        icon: WalletIcon,
        primary: true,
      },
    ],
  },
  {
    label: "Programme",
    items: [
      {
        href: "/staff/open-play",
        label: "Open play",
        icon: BallIcon,
        primary: true,
      },
      {
        href: "/staff/courts",
        label: "Courts",
        icon: CourtIcon,
      },
    ],
  },
  {
    label: "Insight",
    items: [
      {
        href: "/staff/reports",
        label: "Reports",
        icon: ChartIcon,
      },
    ],
  },
  {
    label: "Admin",
    items: [
      {
        href: "/staff/accounts",
        label: "Accounts",
        icon: ShieldIcon,
        managerOnly: true,
      },
    ],
  },
];

// Open play is hidden until the client confirms the programme. The screens stay
// in the repository; `lib/features.ts` turns them back on.
const groups = navGroups
  .map((group) => ({
    ...group,
    items: group.items.filter(
      (item) => OPEN_PLAY_ENABLED || item.href !== "/staff/open-play",
    ),
  }))
  .filter((group) => group.items.length > 0);

const items = groups.flatMap((group) => group.items);
const primaryCount = items.filter((item) => item.primary).length;

function visibleGroups(canManageAccounts: boolean) {
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => !item.managerOnly || canManageAccounts,
      ),
    }))
    .filter((group) => group.items.length > 0);
}

function isActive(pathname: string, href: string, exact?: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

function currentItem(pathname: string) {
  return (
    items.find((item) => isActive(pathname, item.href, item.exact)) ?? items[0]
  );
}

function NavItems({
  pathname,
  reviewCount,
  canManageAccounts,
  onNavigate,
  compact = false,
}: {
  pathname: string;
  reviewCount: number;
  canManageAccounts: boolean;
  onNavigate?: () => void;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "space-y-3" : "space-y-5"}>
      {visibleGroups(canManageAccounts).map((group) => (
        <div key={group.label}>
          <p className="px-3 text-[0.625rem] font-bold uppercase tracking-[0.18em] text-white/35">
            {group.label}
          </p>
          <ul className="mt-1.5 space-y-0.5">
            {group.items.map((item) => {
              const active = isActive(pathname, item.href, item.exact);
              const Icon = item.icon;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold transition-[background-color,color,transform] duration-200",
                      active
                        ? "bg-white text-brand-navy shadow-[inset_3px_0_0_var(--color-brand-lime)]"
                        : "text-white/70 hover:bg-white/10 hover:text-white",
                    )}
                  >
                    <Icon
                      className={cn(
                        "size-[1.1rem] shrink-0 transition-colors",
                        active ? "text-brand-blue" : "text-white/45 group-hover:text-brand-lime",
                      )}
                    />
                    <span className="flex-1">{item.label}</span>
                    {item.href === "/staff/payments" && reviewCount > 0 ? (
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-0.5 text-[0.625rem] font-extrabold leading-none tabular-nums",
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
        </div>
      ))}
    </div>
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
  const activeItem = currentItem(pathname);
  const moreActive =
    pathname.startsWith("/staff/courts") ||
    pathname.startsWith("/staff/reports") ||
    pathname.startsWith("/staff/accounts");

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[16.5rem] flex-col overflow-hidden bg-brand-navy text-white lg:flex">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(140%_90%_at_0%_0%,rgba(22,116,213,0.35),transparent_58%)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 [background-image:linear-gradient(to_right,rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.045)_1px,transparent_1px)] [background-size:56px_56px]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-lime via-brand-yellow to-brand-blue"
        />

        <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-5">
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

          <div className="mt-6">
            <NavItems
              pathname={pathname}
              reviewCount={reviewCount}
              canManageAccounts={staff.canManageAccounts}
              onNavigate={() => setOpen(false)}
            />
          </div>

          {reviewCount > 0 ? (
            <Link
              href="/staff/payments"
              className="group mt-6 flex items-center gap-3 rounded-xl border border-brand-yellow/35 bg-white/[0.07] p-3 transition-colors hover:bg-white/[0.12]"
            >
              <span className="relative grid size-9 shrink-0 place-items-center rounded-lg bg-brand-yellow/15 text-brand-yellow">
                <span className="absolute inset-0 animate-ping rounded-lg bg-brand-yellow/20 [animation-duration:2.5s]" />
                <WalletIcon className="relative size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-bold text-white">
                  {reviewCount} payment{reviewCount === 1 ? "" : "s"} waiting
                </span>
                <span className="mt-0.5 block text-[0.6875rem] text-white/55">
                  Check the actual transfer
                </span>
              </span>
              <ArrowRightIcon className="size-4 shrink-0 text-white/45 transition-transform group-hover:translate-x-0.5" />
            </Link>
          ) : null}

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
        </div>
      </aside>

      <header className="sticky top-0 z-40 border-b border-white/10 bg-brand-navy/95 text-white backdrop-blur lg:hidden">
        <div className="flex h-15 items-center justify-between gap-3 px-4">
          <Link href="/staff" className="flex min-w-0 items-center gap-2.5">
            <Logo size={34} priority />
            <span className="min-w-0 leading-none">
              <span className="block text-[0.5625rem] font-bold uppercase tracking-[0.18em] text-brand-lime">
                Operations desk
              </span>
              <span className="mt-1 block truncate font-display text-sm font-extrabold uppercase tracking-[0.1em]">
                {activeItem?.label ?? "Today"}
              </span>
            </span>
          </Link>
          <div className="flex shrink-0 items-center gap-1.5">
            <NotificationBell tone="inverse" />
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-expanded={open}
              aria-controls="staff-mobile-menu"
              aria-label="Open staff menu"
              className="grid size-10 place-items-center rounded-lg border border-white/20 bg-white/10 transition-colors hover:bg-white/15"
            >
              <MenuIcon />
            </button>
          </div>
        </div>
      </header>

      <nav
        aria-label="Staff shortcuts"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-brand-navy pb-[env(safe-area-inset-bottom)] text-white shadow-[0_-12px_32px_-16px_rgba(4,12,24,0.6)] lg:hidden"
      >
        <ul
          className="grid"
          style={{ gridTemplateColumns: `repeat(${primaryCount + 1}, minmax(0, 1fr))` }}
        >
          {items
            .filter((item) => item.primary)
            .map((item) => {
              const active = isActive(pathname, item.href, item.exact);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative flex min-h-16 flex-col items-center justify-center gap-1 px-1 pt-2 pb-1.5 text-[0.625rem] font-semibold transition-colors",
                      active ? "text-white" : "text-white/55 hover:text-white/85",
                    )}
                  >
                    {active ? (
                      <span
                        aria-hidden="true"
                        className="absolute inset-x-3 top-0 h-0.5 rounded-b-full bg-brand-lime"
                      />
                    ) : null}
                    <span className="relative">
                      <Icon className="size-[1.35rem]" />
                      {item.href === "/staff/payments" && reviewCount > 0 ? (
                        <span className="absolute -right-2.5 -top-1.5 grid min-w-4 place-items-center rounded-full bg-brand-yellow px-1 py-0.5 text-[0.5625rem] font-extrabold leading-none text-brand-navy">
                          {reviewCount > 9 ? "9+" : reviewCount}
                        </span>
                      ) : null}
                    </span>
                    {item.label}
                  </Link>
                </li>
              );
            })}
          <li>
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-expanded={open}
              aria-controls="staff-mobile-menu"
              className={cn(
                "relative flex min-h-16 w-full flex-col items-center justify-center gap-1 px-1 pt-2 pb-1.5 text-[0.625rem] font-semibold transition-colors",
                moreActive || open ? "text-white" : "text-white/55 hover:text-white/85",
              )}
            >
              {moreActive ? (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-3 top-0 h-0.5 rounded-b-full bg-brand-lime"
                />
              ) : null}
              <MenuIcon className="size-[1.35rem]" />
              More
            </button>
          </li>
        </ul>
      </nav>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Staff menu">
          <button
            type="button"
            aria-label="Close staff menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-[rgb(4_12_24/0.6)] backdrop-blur-[2px]"
          />
          <div
            id="staff-mobile-menu"
            className="absolute inset-x-0 top-0 max-h-[92svh] overflow-y-auto overscroll-contain rounded-b-2xl border-b border-white/10 bg-brand-navy px-4 pb-6 pt-4 text-white shadow-raised"
          >
            <div className="flex items-center justify-between gap-3">
              <Link
                href="/staff"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5"
                aria-label="D-Hidden operations desk"
              >
                <Logo size={38} priority />
                <span className="leading-none">
                  <span className="block font-display text-sm font-extrabold uppercase tracking-[0.12em]">
                    D-Hidden
                  </span>
                  <span className="mt-1 block text-[0.5625rem] font-bold uppercase tracking-[0.18em] text-brand-lime">
                    Operations desk
                  </span>
                </span>
              </Link>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close staff menu"
                className="grid size-10 place-items-center rounded-lg border border-white/20 bg-white/10"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="mt-5">
              <NavItems
                pathname={pathname}
                reviewCount={reviewCount}
                canManageAccounts={staff.canManageAccounts}
                onNavigate={() => setOpen(false)}
                compact
              />
            </div>

            <div className="mt-5 border-t border-white/10 pt-4">
              <StaffIdentity staff={staff} />
              <div className="mt-3 flex items-center gap-2">
                <ThemeToggle tone="inverse" className="size-10" />
                <Link
                  href="/"
                  onClick={() => setOpen(false)}
                  className="inline-flex min-h-10 flex-1 items-center gap-2 rounded-lg px-2 text-xs font-semibold text-white/70 hover:bg-white/10 hover:text-white"
                >
                  <ArrowLeftIcon className="size-4" />
                  Public site
                </Link>
              </div>
              <SignOutButton className="mt-2 [&_button]:h-9 [&_button]:justify-start [&_button]:border-white/15 [&_button]:bg-white/5 [&_button]:px-3 [&_button]:text-white/75" />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
