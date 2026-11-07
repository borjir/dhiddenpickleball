"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { BellIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { formatNotificationTime } from "@/lib/notifications/format";
import { useNotifications } from "./notifications-provider";

/**
 * Bell + inbox popover. It renders nothing for signed-out visitors and is
 * driven by the shared NotificationsProvider, so history survives reloads and
 * the popover stays cheap to mount in more than one shell.
 */
export function NotificationBell({
  tone = "auto",
  placement = "down",
  align = "right",
}: {
  tone?: "auto" | "inverse";
  placement?: "down" | "up";
  align?: "left" | "right";
}) {
  const { signedIn, items, unreadCount, markAllRead, markRead } =
    useNotifications();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!signedIn) return null;

  const label =
    unreadCount > 0
      ? `Notifications, ${unreadCount} unread`
      : "Notifications";

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="notification-panel"
        aria-label={label}
        className={cn(
          "relative grid size-11 place-items-center rounded-full border transition-colors duration-200",
          tone === "inverse"
            ? "border-white/25 bg-white/10 text-white hover:bg-white/15"
            : "border-line bg-surface text-heading hover:bg-brand-blue-soft/70",
        )}
      >
        <BellIcon className="size-[1.15rem]" />
        {unreadCount > 0 ? (
          <span
            aria-hidden="true"
            className="absolute -right-0.5 -top-0.5 grid min-w-[1.15rem] place-items-center rounded-full bg-brand-yellow px-1 py-0.5 text-[0.625rem] font-extrabold leading-none text-brand-navy"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            id="notification-panel"
            role="dialog"
            aria-label="Notifications"
            initial={reduce ? undefined : { opacity: 0, y: placement === "up" ? 6 : -6 }}
            animate={reduce ? undefined : { opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: placement === "up" ? 4 : -4 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "absolute z-[70] w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-line bg-elevated text-ink shadow-raised",
              align === "left" ? "left-0" : "right-0",
              placement === "up" ? "bottom-full mb-2" : "mt-2",
            )}
          >
            <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
              <span className="text-sm font-bold text-heading">
                Notifications
                {unreadCount > 0 ? (
                  <span className="ml-2 rounded-full bg-brand-blue-soft px-2 py-0.5 text-[0.625rem] font-extrabold text-accent-ink">
                    {unreadCount} new
                  </span>
                ) : null}
              </span>
              {unreadCount > 0 ? (
                <button
                  type="button"
                  onClick={() => void markAllRead()}
                  className="text-xs font-semibold text-accent-ink hover:underline"
                >
                  Mark all read
                </button>
              ) : null}
            </div>

            <div className="max-h-[22rem] overflow-y-auto overscroll-contain">
              {items.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-muted">
                  No notifications yet. Booking, payment, and open-play updates
                  will appear here.
                </p>
              ) : (
                <ul className="divide-y divide-line">
                  {items.map((item) => (
                    <li key={item.id}>
                      <Link
                        href={item.href ?? "/notifications"}
                        onClick={() => {
                          void markRead(item.id);
                          setOpen(false);
                        }}
                        className="flex gap-2.5 px-4 py-3 transition-colors hover:bg-brand-blue-soft/60"
                      >
                        <span
                          aria-hidden="true"
                          className={cn(
                            "mt-1.5 size-2 shrink-0 rounded-full",
                            item.read_at ? "bg-line-strong" : "bg-brand-blue",
                          )}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline justify-between gap-2">
                            <span
                              className={cn(
                                "text-sm text-heading",
                                item.read_at ? "font-medium" : "font-bold",
                              )}
                            >
                              {item.title}
                            </span>
                            <span className="shrink-0 text-[0.625rem] text-muted">
                              {formatNotificationTime(item.created_at)}
                            </span>
                          </span>
                          {item.body ? (
                            <span className="mt-0.5 block line-clamp-2 text-xs leading-relaxed text-muted">
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

            <div className="border-t border-line px-4 py-2.5">
              <Link
                href="/notifications"
                onClick={() => setOpen(false)}
                className="text-xs font-semibold text-accent-ink hover:underline"
              >
                View all notifications
              </Link>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
