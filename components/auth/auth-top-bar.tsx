import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { ArrowLeftIcon } from "@/components/ui/icons";
import { ThemeToggle } from "@/components/ui/theme-toggle";

/** Header shared by the auth pages and the signed-in account screen. */
export function AuthTopBar() {
  return (
    <header className="flex items-center justify-between gap-4">
      <Link
        href="/"
        className="flex min-h-11 items-center gap-2.5 rounded-lg"
        aria-label="D-Hidden Pickleball Court & Bistro — home"
      >
        <Logo size={42} priority />
        <span className="leading-none">
          <span className="block font-display text-sm font-extrabold uppercase tracking-[0.14em] text-heading">
            D-Hidden
          </span>
          <span className="mt-1 block text-[0.5625rem] font-semibold uppercase tracking-[0.18em] text-muted">
            Pickleball &amp; Bistro
          </span>
        </span>
      </Link>

      <div className="flex items-center gap-2">
        <NotificationBell />
        <ThemeToggle />
        <Link
          href="/"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold text-ink transition-colors hover:text-accent-ink sm:px-3"
        >
          <ArrowLeftIcon className="size-4" />
          <span className="hidden sm:inline">Back to site</span>
          <span className="sm:hidden">Home</span>
        </Link>
      </div>
    </header>
  );
}
