import type { Metadata } from "next";
import { BookingPreview } from "@/components/booking/booking-preview";

export const metadata: Metadata = {
  title: "Booking flow preview",
  description:
    "Phase 3 responsive design preview of the court reservation flow. Sample data only; no booking is created.",
};

export default function BookingPreviewPage() {
  return <BookingPreview />;
}
