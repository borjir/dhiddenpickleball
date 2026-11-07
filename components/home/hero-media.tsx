"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";

export type HeroSlide = {
  src: string;
  alt: string;
};

/** How long each photograph holds before the next crossfade begins. */
const SLIDE_INTERVAL_MS = 7000;
const CROSSFADE_SECONDS = 1.8;

/**
 * Hero photography. Photos crossfade continuously while a slow drift keeps the
 * frame moving, and the whole stack scrolls slightly slower than the page for a
 * parallax feel. The frame is taller than the hero so the shift never exposes
 * an edge. Reduced motion keeps the first photo still.
 */
export function HeroMedia({ slides }: { slides: readonly HeroSlide[] }) {
  const frame = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const [active, setActive] = useState(0);

  const { scrollYProgress } = useScroll({
    target: frame,
    offset: ["start start", "end start"],
  });
  const parallax = useTransform(scrollYProgress, [0, 1], ["0%", "6%"]);

  useEffect(() => {
    if (reducedMotion || slides.length < 2) return;

    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % slides.length);
    }, SLIDE_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [reducedMotion, slides.length]);

  return (
    <div ref={frame} className="hero-media-in absolute inset-0">
      <motion.div
        style={reducedMotion ? undefined : { y: parallax }}
        className="absolute inset-x-0 -bottom-[10%] -top-[10%]"
      >
        {slides.map((slide, index) => (
          <motion.div
            key={slide.src}
            className="absolute inset-0"
            initial={false}
            animate={{ opacity: index === active ? 1 : 0 }}
            transition={{ duration: CROSSFADE_SECONDS, ease: [0.16, 1, 0.3, 1] }}
          >
            <Image
              src={slide.src}
              alt={slide.alt}
              fill
              priority={index === 0}
              sizes="100vw"
              className="hero-slide-drift object-cover object-center"
              style={{ animationDelay: `${index * -6}s` }}
            />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
