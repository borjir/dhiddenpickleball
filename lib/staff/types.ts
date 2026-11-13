import type { BookingStatus, PaymentStatus } from "@/lib/bookings";
import type { OpenPlaySkillLevel, OpenPlaySessionStatus } from "@/lib/open-play";

export type StaffPerson = {
  full_name: string | null;
  email: string | null;
  phone: string | null;
};

export type StaffPayment = {
  id: string;
  status: PaymentStatus;
  amount_php: number | string;
  transaction_reference: string | null;
  proof_path: string | null;
  submitted_at: string | null;
  rejection_reason: string | null;
  /** Voided rows stay for the audit trail but drop out of every total. */
  voided_at?: string | null;
  voided_reason?: string | null;
  booking:
    | {
        reference: string;
        starts_at: string;
        player: StaffPerson | null;
      }
    | null;
  group:
    | {
        reference: string;
        created_at: string;
        player: StaffPerson | null;
      }
    | null;
};

export type StaffBooking = {
  id: string;
  reference: string;
  starts_at: string;
  ends_at: string;
  duration_minutes: number;
  status: BookingStatus;
  payment_status: PaymentStatus;
  amount_php: number | string;
  hold_expires_at: string | null;
  created_at: string;
  confirmed_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  group_id: string | null;
  booking_group?: { reference: string } | null;
  source: "online" | "walk_in" | "staff";
  notes: string | null;
  player: StaffPerson | null;
  service: { name: string; code: string } | null;
  court_reservations: Array<{ court: { name: string } | null }> | null;
  /** Present when the select asks for it; voided rows are excluded from totals. */
  voided_at?: string | null;
  voided_reason?: string | null;
};

export type StaffOpenPlaySession = {
  id: string;
  starts_at: string;
  duration_minutes: number;
  skill_level: OpenPlaySkillLevel;
  capacity: number;
  amount_php: number | string;
  status: OpenPlaySessionStatus;
  open_play_registrations: Array<{ id: string; status: string }> | null;
};

export function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export function personLabel(person: StaffPerson | null | undefined) {
  return person?.full_name?.trim() || person?.email?.trim() || "Guest";
}
