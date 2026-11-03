"use client";

import { useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CheckCircleIcon } from "@/components/ui/icons";

export type ToastTone = "success" | "error";

/** Small transient confirmation. Announced politely and never color-only. */
export function Toast({
  message,
  tone = "success",
  onDismiss,
}: {
  message: string | null;
  tone?: ToastTone;
  onDismiss: () => void;
}) {
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(onDismiss, 3400);
    return () => window.clearTimeout(timer);
  }, [message, onDismiss]);

  return (
    <AnimatePresence>
      {message ? (
        <motion.div
          role="status"
          aria-live="polite"
          initial={reduce ? undefined : { opacity: 0, y: -12, scale: 0.98 }}
          animate={reduce ? undefined : { opacity: 1, y: 0, scale: 1 }}
          exit={reduce ? undefined : { opacity: 0, y: -8, scale: 0.98 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="fixed left-1/2 top-20 z-[70] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2"
        >
          <div className="flex items-start gap-2.5 rounded-xl border border-line bg-elevated px-4 py-3 text-sm font-medium text-ink shadow-raised">
            <CheckCircleIcon
              className={
                tone === "error"
                  ? "mt-0.5 size-4 shrink-0 text-danger"
                  : "mt-0.5 size-4 shrink-0 text-success"
              }
            />
            <span>{message}</span>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
