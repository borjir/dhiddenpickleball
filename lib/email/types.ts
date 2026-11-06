export type EmailEvent =
  | "court_booking_received"
  | "open_play_reserved"
  | "payment_proof_received"
  | "payment_approved"
  | "payment_rejected"
  | "booking_cancelled"
  | "open_play_updated"
  | "booking_reminder"
  | "staff_new_booking"
  | "staff_payment_proof"
  | "staff_booking_cancelled"
  | "staff_session_full";

export type PlayerEmailEvent =
  | "court_booking_received"
  | "open_play_reserved"
  | "payment_proof_received"
  | "payment_approved"
  | "payment_rejected"
  | "booking_cancelled"
  | "open_play_updated"
  | "booking_reminder";

export type EmailAudience = "player" | "staff";

export type EmailOutboxRow = {
  id: string;
  event: EmailEvent;
  audience: EmailAudience;
  booking_id: string | null;
  group_id: string | null;
  session_id: string | null;
  dedupe_key: string;
  status: "queued" | "sending" | "sent" | "failed" | "skipped";
  attempts: number;
  available_at: string;
  last_error: string | null;
  provider_message_id: string | null;
  created_at: string;
  updated_at: string;
  sent_at: string | null;
};

export type EmailDeliveryResult =
  | { status: "sent"; providerMessageId: string | null }
  | { status: "failed"; error: string }
  | { status: "skipped"; error: string };

export type EmailContent = {
  subject: string;
  html: string;
  text: string;
};

export type EmailProcessResult = {
  claimed: number;
  sent: number;
  failed: number;
  skipped: number;
  queued: number;
  providerConfigured: boolean;
};
