import { CLUB } from "@/lib/club";
import { PAYMENT_DETAILS } from "@/lib/payment";

/**
 * Public policy copy. Booking, payment, and cancellation statements come from
 * the club's 30 October answers and the project owner's 4 November 2026
 * decisions. Privacy and website terms were added on 5 November 2026. Rules
 * that are still unconfirmed are named as open rather than presented as policy.
 */
export type PolicySection = {
  id: string;
  heading: string;
  paragraphs?: readonly string[];
  items?: readonly string[];
};

export type PolicySlug = "booking" | "payments" | "privacy" | "terms";

export type Policy = {
  slug: PolicySlug;
  title: string;
  eyebrow: string;
  intro: string;
  sections: readonly PolicySection[];
};

export const POLICY_UPDATED = "6 November 2026";

export const POLICIES: readonly Policy[] = [
  {
    slug: "booking",
    title: "Booking and cancellation policy",
    eyebrow: "Policies",
    intro:
      "How a court request or open-play place is held, confirmed, paid, and cancelled at D-Hidden Pickleball Court & Bistro.",
    sections: [
      {
        id: "booking-a-court",
        heading: "Booking a court",
        paragraphs: [
          "Court time is booked by the hour. The confirmed rates are ₱250 per hour before 5:00 PM and ₱300 per hour from 5:00 PM. A booking runs from your chosen start time to your chosen end time.",
        ],
        items: [
          "A full name and valid mobile number are required at review, after the date, time, and price are shown. No account is created.",
          "An email address is optional and is used only for booking updates and reminders.",
          "One person may book for a group; only the booker's name is required.",
        ],
      },
      {
        id: "open-play",
        heading: "Open play",
        paragraphs: [
          "Normal open-play sessions are listed with their current date, time, skill level, price, and remaining capacity. A place is reserved when registration is confirmed, and the database checks capacity before accepting it. There is no waitlist.",
          "Open play uses the same GCash proof and staff verification as a court booking. A place is reserved immediately; payment remains unpaid until proof is submitted and staff verify the actual transfer.",
        ],
      },
      {
        id: "hold-and-payment-deadline",
        heading: "Hold and payment deadline",
        paragraphs: [
          "Confirming a booking request holds the slot for 15 minutes. The payment deadline is the same 15-minute window.",
          "If the deadline passes before payment is arranged, the request is cancelled and the slot returns to the schedule. Booking status and payment status are always shown separately.",
        ],
      },
      {
        id: "cancellation-and-rescheduling",
        heading: "Cancellation and rescheduling",
        items: [
          "Cancel at least 24 hours before court time for a full refund to the paying GCash number, or one free move to another slot.",
          "Cancel inside 24 hours: the court fee is not refunded and the slot is released to other players.",
          "Reschedule at least 24 hours ahead: one free move per booking, subject to availability.",
          "No-show: no refund and no extension.",
          "Late arrival: the booking still ends at its scheduled time, with no extension or partial refund.",
          "Club closure for weather or maintenance: full refund or a free move, at the player's choice.",
          "Self-service cancellation and rescheduling are not available. Contact the club to make the change.",
        ],
      },
      {
        id: "still-being-confirmed",
        heading: "Additional rules",
        paragraphs: [
          "Weekend pricing, partial-hour rounding, buffer time, booking windows, player limits, and holiday closures are not yet published. Contact the club if your booking depends on one of these.",
        ],
      },
      {
        id: "contact",
        heading: "Contact",
        paragraphs: [
          "For a cancellation, reschedule, or a question about a booking, contact the club directly at 0956 167 0905 or gracemilan87@gmail.com.",
        ],
      },
    ],
  },
  {
    slug: "payments",
    title: "Payment policy",
    eyebrow: "Policies",
    intro:
      "How GCash payment is arranged, verified, and kept separate from booking status.",
    sections: [
      {
        id: "accepted-method",
        heading: "Accepted method",
        paragraphs: [
          "GCash is the confirmed payment method for court bookings and normal open play. Other methods, including bank transfer, are not confirmed and are not offered.",
        ],
      },
      {
        id: "how-payment-is-verified",
        heading: "How payment is verified",
        paragraphs: [
          "Scan the QR shown on the booking confirmation or booking page, or send to the GCash number shown, pay the exact amount shown, and keep the transaction reference and screenshot. The QR can be downloaded if you are paying from another device.",
          "Upload the GCash screenshot from the confirmation or booking page. For a court booking, send it before the 15-minute hold ends. For open play, send it before the session starts. The payment status becomes awaiting verification; it does not become paid automatically. Staff check the actual incoming transfer in the receiving account, and only a staff member can mark the payment as paid.",
        ],
      },
      {
        id: "payment-deadline",
        heading: "Payment deadline",
        paragraphs: [
          "A court slot is held for 15 minutes from the moment the request is confirmed. Submitting proof before the hold expires confirms the slot and leaves payment awaiting staff verification. If no proof is submitted, the request is cancelled and the slot returns to the schedule.",
          "An open-play place is reserved immediately and does not use the 15-minute court hold. Payment still stays separate until proof is reviewed.",
        ],
      },
      {
        id: "proof-and-privacy",
        heading: "Proof and privacy",
        paragraphs: [
          "Payment proof is stored privately. Only the player who owns the booking and authorized staff can access it.",
          "We keep payment proof only as long as needed to verify the payment, handle a refund or dispute, and meet accounting or legal requirements. The privacy notice explains this in more detail.",
        ],
      },
      {
        id: "refunds",
        heading: "Refunds",
        paragraphs: [
          "A cancellation at least 24 hours before court time gives a full refund to the paying GCash number or one free move. Inside 24 hours the court fee is not refunded. No-shows and late arrivals are not refunded.",
          "The club has not set a service level for how quickly a refund is returned. Contact the club for the status of a specific refund.",
        ],
      },
      {
        id: "payment-safety",
        heading: "Payment safety",
        items: [
          "Pay the exact amount shown for the booking.",
          "Keep the booking reference with the transfer.",
          "Never share passwords, PINs, or one-time codes with anyone.",
          "Do not treat an uploaded screenshot as proof that the club has received the money.",
        ],
      },
      {
        id: "receiving-account",
        heading: "Receiving account",
        paragraphs: [
          `The receiving account is the club's official GCash account. The confirmation shows the GCash QR, the account name ${PAYMENT_DETAILS.accountName}, and the number ${CLUB.phoneDisplay}. Staff verify each transfer manually.`,
        ],
      },
      {
        id: "contact",
        heading: "Contact",
        paragraphs: [
          "For a payment question or a refund status, contact the club at 0956 167 0905 or gracemilan87@gmail.com.",
        ],
      },
    ],
  },
  {
    slug: "privacy",
    title: "Privacy notice",
    eyebrow: "Policies",
    intro:
      "What D-Hidden collects when you use this website, book a court, or join open play, and how that information is handled.",
    sections: [
      {
        id: "who-we-are",
        heading: "Who we are",
        paragraphs: [
          `D-Hidden Pickleball Court & Bistro is at ${CLUB.addressFull}. It is the personal information controller for the information described in this notice. For privacy questions or requests, contact us at ${CLUB.email} or ${CLUB.phoneDisplay}.`,
        ],
      },
      {
        id: "what-we-collect",
        heading: "What we collect",
        items: [
          "Guest details: your full name, mobile number, and optional email address. No player account or password is created. Staff accounts are separate and are managed by the club.",
          "Booking details: the court or open-play session, skill level where applicable, date, start and end time, duration, amount, booking reference, and booking and payment status.",
          "Payment proof: the GCash transaction reference, the amount, and any receipt or screenshot you submit. Do not send your GCash PIN, one-time code, or password.",
          "Communications: messages you send by phone, email, or the site about a booking.",
          "Technical information: server logs and the basic device, browser, and network information needed to run and protect the site. Staff session cookies keep staff signed in; your theme choice is stored in your browser.",
        ],
      },
      {
        id: "why-we-use-it",
        heading: "Why we use it",
        items: [
          "To identify your guest booking and let you check it with the reference and mobile number.",
          "To hold, confirm, change, and manage court bookings and open-play places.",
          "To verify GCash payments, process refunds, and handle disputes.",
          "To contact you about a booking, cancellation, or payment problem.",
          "To prevent fraud and abuse, and to keep the site and club records secure.",
          "To meet accounting, tax, and other legal requirements.",
          "To understand how the service is used and improve it, using aggregated information where possible.",
        ],
      },
      {
        id: "legal-basis",
        heading: "Why we are allowed to process it",
        paragraphs: [
          "We process this information because it is needed to provide the service you ask for, to meet legal and accounting obligations, and for the legitimate interests described above. Where we rely on consent, you can withdraw it.",
        ],
      },
      {
        id: "when-we-share-it",
        heading: "When we share it",
        paragraphs: [
          "We do not sell personal information. We share it only with authorized club staff who need it to run bookings and verify payments, and with service providers that host the site, database, authentication, and file storage, including Supabase. Those providers process the information for us.",
          "We also share information with OpenFreeMap when the visit page loads map tiles, and with authorities or professional advisers when the law requires it or when needed to establish or defend a claim.",
          "GCash processes the transfer you make. We do not control GCash's own privacy practices; review GCash's notice for information about its service.",
        ],
      },
      {
        id: "payment-proof",
        heading: "Payment proof",
        paragraphs: [
          "Payment proof is private. It is visible only to authorized staff. Uploading proof does not mark a payment as paid; staff verify the actual transfer before the payment status becomes paid.",
        ],
      },
      {
        id: "retention",
        heading: "How long we keep it",
        paragraphs: [
          "We keep guest and booking records for a reasonable period for accounting, dispute, security, and legal purposes. We keep payment proof only as long as needed to verify the payment, handle a refund or dispute, and meet accounting or legal requirements, then delete or anonymize it.",
          "We may keep a record longer when the law requires it or when an open dispute needs it. You may ask us to delete guest contact details we do not need to keep.",
        ],
      },
      {
        id: "security",
        heading: "How we protect it",
        paragraphs: [
          "We use access controls, private storage, and encrypted connections. Only authorized staff can review payment proof. No website can promise complete security, so contact us immediately if you think someone has used your booking reference or mobile number.",
        ],
      },
      {
        id: "your-rights",
        heading: "Your rights",
        paragraphs: [
          `Under the Philippine Data Privacy Act, you may ask to access, correct, object to, erase or block, or obtain a copy of your personal data, and you may withdraw consent where consent is the basis for processing. Contact us at ${CLUB.email} or ${CLUB.phoneDisplay}. We may need to verify your identity before acting on a request.`,
          "If you believe we have mishandled your information, contact us first. You may also complain to the National Privacy Commission.",
        ],
      },
      {
        id: "cookies-and-map",
        heading: "Cookies and the map",
        paragraphs: [
          "The site uses essential cookies to keep you signed in and stores your theme choice in your browser. The visit page loads map tiles from OpenFreeMap, and those requests share the technical information needed to serve the map. The Google Maps directions link opens Google's service. The current site does not use advertising cookies.",
        ],
      },
      {
        id: "changes",
        heading: "Changes to this notice",
        paragraphs: [
          "We may update this notice as the service changes. The date at the top shows the latest version. If a change materially affects how we use personal data, we will post a clear notice before it applies.",
        ],
      },
      {
        id: "contact",
        heading: "Contact",
        paragraphs: [
          `For a privacy question or request, contact the club at ${CLUB.phoneDisplay} or ${CLUB.email}.`,
        ],
      },
    ],
  },
  {
    slug: "terms",
    title: "Terms of use",
    eyebrow: "Policies",
    intro:
      "The rules for using the D-Hidden website and booking court time or an open-play place.",
    sections: [
      {
        id: "agreement",
        heading: "Agreement to these terms",
        paragraphs: [
          "These terms govern your use of the D-Hidden Pickleball Court & Bistro website and booking service. By using the site or making a booking, you agree to these terms and to the privacy notice. If you do not agree, do not use the booking service.",
        ],
      },
      {
        id: "the-service",
        heading: "The service",
        paragraphs: [
          `The site lets players check court information, request court time, and register for normal open play at ${CLUB.addressFull}. A court request creates a 15-minute hold. Open play reserves a place against the published capacity. GCash is processed by the club, not automatically by this site.`,
          "A court slot is confirmed when proof is submitted inside the hold, while payment stays awaiting staff verification. An open-play place is confirmed when registration succeeds, while payment stays separate. Uploading proof never marks a payment as paid by itself.",
        ],
      },
      {
        id: "accounts",
        heading: "Your booking details",
        items: [
          "Provide an accurate full name and mobile number, and tell us if they change before your booking.",
          "Keep your booking reference and QR code secure. Anyone with the QR code, or the reference plus your mobile number, can view that booking.",
          "Tell us promptly if you think someone else has used your reference or mobile number.",
        ],
      },
      {
        id: "booking-rules",
        heading: "Booking rules",
        paragraphs: [
          "Court time is priced per court-hour: ₱250 before 5:00 PM and ₱300 from 5:00 PM. Choose your start and end time. Open-play sessions show their own price per player. The full amount is shown before you confirm or reserve.",
        ],
        items: [
          "A confirmed court request holds the slot for 15 minutes. The payment deadline is the same window. If proof is not submitted in time, the request is cancelled and the slot returns to the schedule.",
          "An open-play place is reserved immediately against capacity. Payment stays separate and is verified by staff.",
          "A full name and a valid Philippine mobile number are required at review. An email address is optional and is used only for the confirmation.",
          "One person may book for a group; only the booker's details are required.",
          "The club may close a court for weather, maintenance, or safety. You may choose a full refund or a free move.",
        ],
      },
      {
        id: "payments-and-refunds",
        heading: "Payments and refunds",
        paragraphs: [
          "GCash is the confirmed payment method for court bookings and normal open play. Pay the exact amount to the QR shown by the club and keep the transaction reference with your receipt or screenshot for staff verification. Staff verify the actual transfer before a payment is marked as paid.",
          "Cancel at least 24 hours before court time for a full refund to the paying GCash number or one free move. Inside 24 hours the court fee is not refunded and the slot is released. No-shows and late arrivals are not refunded. Refund timing depends on GCash; contact the club for the status of a specific refund.",
          "The booking and payment policies form part of these terms.",
        ],
      },
      {
        id: "court-conduct",
        heading: "Court conduct and safety",
        paragraphs: [
          "Follow the club rules and staff instructions, use the courts safely and lawfully, and do not damage property or interfere with other players. Pickleball involves physical activity and the ordinary risk of injury. You are responsible for your health, equipment, and belongings.",
          "We may cancel a booking or refuse future bookings if we reasonably believe there is fraud, abuse, a safety risk, or a serious breach of these terms.",
        ],
      },
      {
        id: "liability",
        heading: "Liability",
        paragraphs: [
          "To the extent permitted by Philippine law, the club is not liable for indirect or consequential loss, or for loss of personal property, arising from use of the site or the courts. Nothing in these terms excludes liability that cannot lawfully be excluded, or limits your rights under consumer and data-protection law.",
        ],
      },
      {
        id: "content-and-links",
        heading: "Content and third-party links",
        paragraphs: [
          "The logo, photographs, text, and design are owned by the club or used with permission. Do not copy or reuse them for commercial purposes without permission.",
          "The site links to Google Maps and OpenFreeMap. Those services have their own terms and privacy notices.",
        ],
      },
      {
        id: "changes-and-law",
        heading: "Changes and governing law",
        paragraphs: [
          "We may update these terms. The date at the top shows the latest version. Continued use after an update means you accept the revised terms. These terms are governed by the laws of the Republic of the Philippines.",
        ],
      },
      {
        id: "contact",
        heading: "Contact",
        paragraphs: [
          `For a question about these terms, contact the club at ${CLUB.phoneDisplay} or ${CLUB.email}.`,
        ],
      },
    ],
  },
];

export function getPolicy(slug: string): Policy | undefined {
  return POLICIES.find((policy) => policy.slug === slug);
}
