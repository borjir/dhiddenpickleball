import { CLUB } from "@/lib/club";

/**
 * Payment details shown after a booking is created.
 *
 * The client supplied the official GCash QR on 9 November 2026. The QR artwork
 * is the source of truth for the receiving account: GCash masks the name as
 * "MA*Y GR**E M." and the mobile number is the club's published contact number.
 * Never crop, recompress, resize, or recolour the QR file; scale it visually
 * only. Every surface that shows payment details reads from here.
 */
export const PAYMENT_DETAILS = {
  methodLabel: "GCash QR",
  accountName: "MA*Y GR**E M.",
  accountNumber: CLUB.phoneDisplay,
  qrSrc: "/qr/client-official-gcash-qr.jpg",
  qrAlt: "Official GCash QR code for the receiving account MA*Y GR**E M.",
  qrWidth: 828,
  qrHeight: 1608,
  qrDownloadName: "dhidden-gcash-qr.jpg",
} as const;
