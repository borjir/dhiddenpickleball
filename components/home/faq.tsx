"use client";

import { useId, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/cn";

const items = [
  {
    question: "What are the club's opening hours?",
    answer:
      "The courts are open every day from 7:00 AM to 12:00 AM. Slots that would run past midnight are not offered.",
  },
  {
    question: "How much does court time cost?",
    answer:
      "₱250 per court-hour before 5:00 PM and ₱300 per court-hour from 5:00 PM. You can book 60, 90, or 120 minutes, and the full amount is shown before you confirm.",
  },
  {
    question: "How do I pay?",
    answer:
      "Court bookings are paid by GCash. Scan the club's QR code, upload your payment proof, and staff will verify the actual transfer. A booking is never marked paid automatically — the payment status moves to awaiting verification first.",
  },
  {
    question: "Can I book for a group?",
    answer:
      "Yes. Group bookings are allowed and only the booker's name is required. You do not need to list every player.",
  },
  {
    question: "How do cancellations work?",
    answer:
      "Cancel at least 24 hours before your court time. Self-service cancellation is not available, so contact the club directly to make the change.",
  },
  {
    question: "Do I need an account?",
    answer:
      "Yes. You choose a time and see the price first, then create an account at review with your full name, email address, and mobile number. The email must be verified before the slot is held.",
  },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  const reduce = useReducedMotion();
  const baseId = useId();

  return (
    <div className="divide-y divide-line border-y border-line">
      {items.map((item, index) => {
        const isOpen = open === index;
        const panelId = `${baseId}-panel-${index}`;
        const buttonId = `${baseId}-button-${index}`;
        return (
          <div key={item.question}>
            <h3>
              <button
                type="button"
                id={buttonId}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpen(isOpen ? null : index)}
                className="group flex w-full items-center justify-between gap-6 py-5 text-left"
              >
                <span
                  className={cn(
                    "font-display text-base font-semibold transition-colors duration-200 sm:text-lg",
                    isOpen ? "text-accent-ink" : "text-heading group-hover:text-accent-ink",
                  )}
                >
                  {item.question}
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    "relative grid size-8 shrink-0 place-items-center rounded-full border transition-all duration-300 ease-out-expo",
                    isOpen
                      ? "rotate-45 border-brand-blue bg-brand-blue text-white"
                      : "border-line bg-surface text-muted group-hover:border-line-strong",
                  )}
                >
                  <svg viewBox="0 0 16 16" fill="none" className="size-3.5">
                    <path
                      d="M8 3.5v9M3.5 8h9"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              </button>
            </h3>
            <AnimatePresence initial={false}>
              {isOpen ? (
                <motion.div
                  key="content"
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  initial={reduce ? undefined : { height: 0, opacity: 0 }}
                  animate={reduce ? undefined : { height: "auto", opacity: 1 }}
                  exit={reduce ? undefined : { height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <p className="max-w-2xl pb-5 pr-12 text-sm leading-relaxed text-muted sm:text-base">
                    {item.answer}
                  </p>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
