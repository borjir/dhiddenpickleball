"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useNotifications } from "./notifications-provider";

export function MarkAllReadButton() {
  const router = useRouter();
  const { unreadCount, markAllRead } = useNotifications();

  return (
    <Button
      variant="secondary"
      size="sm"
      disabled={unreadCount === 0}
      onClick={() => {
        void markAllRead().then(() => router.refresh());
      }}
    >
      Mark all read
    </Button>
  );
}
