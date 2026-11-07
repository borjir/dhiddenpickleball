export type NotificationItem = {
  id: string;
  event: string;
  title: string;
  body: string | null;
  href: string | null;
  read_at: string | null;
  created_at: string;
};

/** Payload sent over the private Realtime channel by the database trigger. */
export type NotificationPayload = Pick<
  NotificationItem,
  "id" | "event" | "title" | "body" | "href" | "created_at"
>;

/** Status/attendance changes that have no email event of their own. */
export type BookingUpdateEvent =
  | "booking_confirmed"
  | "booking_completed"
  | "booking_no_show"
  | "attendance_confirmed"
  | "attendance_no_show";
