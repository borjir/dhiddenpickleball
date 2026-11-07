"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { Toast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type {
  NotificationItem,
  NotificationPayload,
} from "@/lib/notifications/types";

const VISIBLE_LIMIT = 30;
const FALLBACK_POLL_MS = 60_000;

type NotificationsContextValue = {
  signedIn: boolean;
  items: NotificationItem[];
  unreadCount: number;
  markAllRead: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(
  null,
);

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error("useNotifications must be used inside NotificationsProvider.");
  }
  return context;
}

function getClient() {
  try {
    return createClient();
  } catch {
    return null;
  }
}

/**
 * Owns the signed-in user's private Realtime channel. The notifications table
 * is the source of truth: the socket only makes the UI instant, and the inbox
 * is re-read on subscribe, on reconnect, on focus, and on a slow poll so a
 * missed message is never lost.
 */
export function NotificationsProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const configured = isSupabaseConfigured();
  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const itemsRef = useRef<NotificationItem[]>([]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // Resolve the session without making public pages request-scoped.
  useEffect(() => {
    if (!configured) return;

    const supabase = getClient();
    if (!supabase) return;

    let active = true;

    void (async () => {
      try {
        const result = await supabase.auth.getClaims();
        const claim = result?.data?.claims?.sub;
        if (active) setUserId(typeof claim === "string" ? claim : null);
      } catch {
        // Keep the signed-out state if the check cannot complete.
      }
    })();

    const { data } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        if (!active) return;
        setUserId(session?.user?.id ?? null);
        if (!session) {
          setItems([]);
          setUnreadCount(0);
        }
      },
    );

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [configured]);

  useEffect(() => {
    if (!configured || !userId) return;

    const supabase = getClient();
    if (!supabase) return;

    let active = true;

    async function load() {
      const [listResult, countResult] = await Promise.all([
        supabase
          .from("notifications")
          .select("id, event, title, body, href, created_at, read_at")
          .eq("recipient_id", userId)
          .order("created_at", { ascending: false })
          .limit(VISIBLE_LIMIT),
        supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("recipient_id", userId)
          .is("read_at", null),
      ]);

      if (!active) return;

      if (!listResult.error && listResult.data) {
        const rows = listResult.data as NotificationItem[];
        setItems(rows);
        itemsRef.current = rows;
      }

      if (!countResult.error) {
        setUnreadCount(countResult.count ?? 0);
      }
    }

    void load();

    const channel = supabase
      .channel(`notifications:${userId}`, { config: { private: true } })
      .on(
        "broadcast",
        { event: "notification" },
        (message: { payload: unknown }) => {
          const payload = message.payload as NotificationPayload | undefined;
          if (!payload?.id) return;
          if (itemsRef.current.some((item) => item.id === payload.id)) return;

          const next: NotificationItem = { ...payload, read_at: null };
          const rows = [next, ...itemsRef.current].slice(0, VISIBLE_LIMIT);
          itemsRef.current = rows;
          setItems(rows);
          setUnreadCount((current) => current + 1);
          setToast(payload.title || "New update");
          router.refresh();
        },
      )
      .subscribe((status: string) => {
        // Reconnected tabs catch up on anything the socket did not hold.
        if (status === "SUBSCRIBED" && active) void load();
      });

    function refreshWhenVisible() {
      if (document.visibilityState === "visible") void load();
    }

    const poll = window.setInterval(refreshWhenVisible, FALLBACK_POLL_MS);
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      active = false;
      window.clearInterval(poll);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      void channel.unsubscribe();
    };
  }, [configured, userId, router]);

  const markAllRead = useCallback(async () => {
    if (!userId) return;
    const supabase = getClient();
    if (!supabase) return;

    const now = new Date().toISOString();
    setItems((current) =>
      current.map((item) =>
        item.read_at ? item : { ...item, read_at: now },
      ),
    );
    setUnreadCount(0);

    const { error } = await supabase
      .from("notifications")
      .update({ read_at: now })
      .eq("recipient_id", userId)
      .is("read_at", null);

    if (error) {
      console.error("[notifications] Could not mark all read:", error.message);
    }
  }, [userId]);

  const markRead = useCallback(
    async (id: string) => {
      const supabase = getClient();
      if (!supabase) return;

      const target = itemsRef.current.find((item) => item.id === id);
      if (!target || target.read_at) return;

      const now = new Date().toISOString();
      setItems((current) =>
        current.map((item) =>
          item.id === id ? { ...item, read_at: now } : item,
        ),
      );
      setUnreadCount((current) => Math.max(0, current - 1));

      const { error } = await supabase
        .from("notifications")
        .update({ read_at: now })
        .eq("id", id)
        .is("read_at", null);

      if (error) {
        console.error("[notifications] Could not mark read:", error.message);
      }
    },
    [],
  );

  const value = useMemo(
    () => ({
      signedIn: Boolean(userId),
      items,
      unreadCount,
      markAllRead,
      markRead,
    }),
    [userId, items, unreadCount, markAllRead, markRead],
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
      <Toast message={toast} onDismiss={() => setToast(null)} />
    </NotificationsContext.Provider>
  );
}
