import type { Metadata } from "next";
import Link from "next/link";
import { AuthTopBar } from "@/components/auth/auth-top-bar";
import { MarkAllReadButton } from "@/components/notifications/mark-all-read-button";
import { ArrowLeftIcon } from "@/components/ui/icons";
import { requireStaff } from "@/lib/staff/auth";
import { formatNotificationTime } from "@/lib/notifications/format";
import type { NotificationItem } from "@/lib/notifications/types";
import { cn } from "@/lib/cn";

export const metadata: Metadata = {
  title: "Staff notifications",
  description: "Booking, payment, and open-play updates for the operations desk.",
  robots: { index: false, follow: false },
};

export default async function NotificationsPage() {
  const { supabase, staff } = await requireStaff();

  const { data } = await supabase
    .from("notifications")
    .select("id, event, title, body, href, read_at, created_at")
    .eq("recipient_id", staff.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const notifications = (data ?? []) as NotificationItem[];

  return (
    <main className="min-h-svh bg-page">
      <div className="mx-auto w-full max-w-4xl px-5 py-5 sm:px-8 sm:py-7">
        <AuthTopBar />

        <div className="mt-8">
          <Link
            href="/staff"
            className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-accent-ink transition-colors hover:text-heading"
          >
            <ArrowLeftIcon className="size-4" />
            Back to operations desk
          </Link>

          <p className="mt-4 text-eyebrow font-bold uppercase text-accent-ink">
            Staff inbox
          </p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
            <h1 className="font-display text-4xl font-extrabold tracking-[-0.03em] text-heading sm:text-5xl">
              Notifications
            </h1>
            <MarkAllReadButton />
          </div>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
            Booking, payment, and open-play updates for the operations desk
            appear here as they happen. Email remains the copy that reaches you
            outside the site.
          </p>

          {notifications.length === 0 ? (
            <div className="mt-8 rounded-xl border border-line bg-surface p-6 text-sm text-muted">
              No notifications yet. New bookings, payment proofs, and schedule
              changes will show up here.
            </div>
          ) : (
            <ul className="mt-6 space-y-2">
              {notifications.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href ?? "/notifications"}
                    className={cn(
                      "flex gap-3 rounded-xl border p-4 transition-colors",
                      item.read_at
                        ? "border-line bg-surface hover:border-line-strong"
                        : "border-brand-blue/25 bg-brand-blue-soft/40 hover:border-brand-blue/45",
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "mt-1.5 size-2 shrink-0 rounded-full",
                        item.read_at ? "bg-line-strong" : "bg-brand-blue",
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                        <span
                          className={cn(
                            "text-sm text-heading",
                            item.read_at ? "font-medium" : "font-bold",
                          )}
                        >
                          {item.title}
                        </span>
                        <span className="text-xs text-muted">
                          {formatNotificationTime(item.created_at)}
                        </span>
                      </span>
                      {item.body ? (
                        <span className="mt-1 block text-sm leading-relaxed text-muted">
                          {item.body}
                        </span>
                      ) : null}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
