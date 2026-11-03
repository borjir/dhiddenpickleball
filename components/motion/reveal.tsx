"use client";

import { motion, useReducedMotion } from "motion/react";
import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Short, purposeful entrance for a section as it enters the viewport. Movement
 * is removed entirely when the visitor prefers reduced motion.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 22,
  duration = 0.65,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  duration?: number;
}) {
  const reduce = useReducedMotion();

  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-12% 0px -8% 0px" }}
      transition={{ duration, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Entrance for content that is already in the first viewport. This is a CSS
 * animation, not a client animation, so the hero is visible and animating at
 * first paint instead of waiting for hydration.
 */
export function FadeIn({
  children,
  className,
  delay = 0,
  y = 18,
}: {
  children: ReactNode;
  className?: string;
  /** Seconds. */
  delay?: number;
  y?: number;
}) {
  return (
    <div
      className={cn("rise-in", className)}
      style={
        {
          animationDelay: `${delay}s`,
          "--rise-y": `${y}px`,
        } as CSSProperties
      }
    >
      {children}
    </div>
  );
}
