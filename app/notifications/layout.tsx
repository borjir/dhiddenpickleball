import type { ReactNode } from "react";
import { NotificationsProvider } from "@/components/notifications/notifications-provider";

/**
 * The staff inbox is outside the `/staff` shell, so it mounts its own
 * notification provider. Public routes do not load the Supabase client.
 */
export default function NotificationsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <NotificationsProvider>{children}</NotificationsProvider>;
}
