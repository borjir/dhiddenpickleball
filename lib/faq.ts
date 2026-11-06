/**
 * Answers use the club's confirmed hours, rates, account rule, payment review,
 * hold, cancellation, and open-play defaults. Anything still unconfirmed is
 * left out.
 */
export type FaqItem = {
  question: string;
  answer: string;
};

export const FAQ_ITEMS: readonly FaqItem[] = [
  {
    question: "What are the club's opening hours?",
    answer:
      "The courts are open every day from 7:00 AM to 12:00 AM. Slots that would run past midnight are not offered.",
  },
  {
    question: "How much does court time cost?",
    answer:
      "₱250 per court-hour before 5:00 PM and ₱300 per court-hour from 5:00 PM. Choose your start and end time; the full amount is shown before you confirm.",
  },
  {
    question: "How do I pay?",
    answer:
      "Court bookings are paid by GCash. The confirmation shows the current GCash QR, which is a test account while the club's official account is being confirmed. You can download the QR, pay the exact amount, and upload your GCash screenshot from the confirmation or booking page. Staff verify the actual transfer; a booking is never marked paid automatically.",
  },
  {
    question: "Is open play available?",
    answer:
      "Yes. Normal open play is listed on the open-play page. The current default schedule is Saturday sessions for beginner, intermediate, and advanced players, and the club controls the published date, time, price, capacity, and level. Payment uses the same GCash proof and staff verification as court bookings.",
  },
  {
    question: "Can I book for a group?",
    answer:
      "Yes. Group bookings are allowed and only the booker's name is required. You do not need to list every player.",
  },
  {
    question: "How do cancellations work?",
    answer:
      "Cancel at least 24 hours before your court time for a full refund or one free move. Inside 24 hours the court fee is not refunded and the slot is released. Self-service cancellation is not available, so contact the club directly to make the change.",
  },
  {
    question: "How long is my slot held?",
    answer:
      "When you confirm a booking request, the slot is held for 15 minutes. If proof is submitted before the hold expires, the slot is confirmed and the payment stays awaiting staff verification. If no proof is submitted, the request is cancelled and the slot returns to the schedule.",
  },
  {
    question: "What happens if I arrive late or miss my booking?",
    answer:
      "A late arrival keeps the booking's original end time — the court time is not extended and the fee is not partly refunded. A no-show is not refunded.",
  },
  {
    question: "What if the club closes the court?",
    answer:
      "If the club closes a court because of weather or maintenance, you can choose a full refund or a free move to another slot.",
  },
  {
    question: "Do I need an account?",
    answer:
      "Yes. You choose a time and see the price first, then create an account at review with your full name, email address, and mobile number. The email must be verified before the slot is held.",
  },
];
