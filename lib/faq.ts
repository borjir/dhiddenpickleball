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
      "Pay by GCash. The confirmation shows the QR, which is still a test account until the club's official one is ready. Upload your screenshot; staff verify the transfer before payment is marked paid.",
  },
  {
    question: "Is open play available?",
    answer:
      "Yes. Sessions are listed on the open-play page by date, level, price, and remaining places. Payment uses the same GCash proof and staff verification as court bookings.",
  },
  {
    question: "Can I book for a group?",
    answer:
      "Yes. Group bookings are allowed and only the booker's name is required. You do not need to list every player.",
  },
  {
    question: "How do cancellations work?",
    answer:
      "Cancel at least 24 hours before court time for a refund or one free move. Inside 24 hours, the court fee is not refunded. Contact the club for changes.",
  },
  {
    question: "How long is my slot held?",
    answer:
      "Your slot is held for 15 minutes. Upload proof before it ends. After that, the request is cancelled and the slot returns to the schedule.",
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
    question: "Do I need an account to book?",
    answer:
      "No. Choose a time, enter your full name and mobile number, then pay by GCash. Your reference and mobile number check the booking later.",
  },
];
