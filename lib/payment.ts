/**
 * Payment details shown after a booking is created.
 *
 * The club's official GCash QR and receiving account name are still pending.
 * Until the client supplies them, the live confirmation uses the project
 * owner's test QR. Replace these values when D-07 is answered; no component
 * should hardcode a wallet image or account name.
 */
export const PAYMENT_DETAILS = {
  methodLabel: "GCash QR",
  qrSrc: "/qr/gcash-test-qr.png",
  qrAlt: "GCash QR code for the project owner's test account",
  qrWidth: 540,
  qrHeight: 540,
  qrDownloadName: "dhidden-gcash-qr.png",
  isTest: true,
  testNote:
    "This is the project owner's test GCash QR, not the club's receiving account. Pay the exact amount, keep the booking reference, and upload your screenshot. Staff verify every transfer.",
} as const;
