"use client";

import { useSyncExternalStore } from "react";
import { MoonIcon, SunIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

const STORAGE_KEY = "dhidden-theme";

type Theme = "light" | "dark";

function subscribe(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
}

function getSnapshot(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function getServerSnapshot(): Theme {
  return "light";
}

/**
 * Light/dark switch. The chosen value is stored locally and also applied by the
 * inline script in the root layout before first paint. The current theme is read
 * from the DOM so the control never desynchronises from the document.
 */
export function ThemeToggle({
  className,
  tone = "auto",
}: {
  className?: string;
  /** "inverse" sits on photography or navy bands. */
  tone?: "auto" | "inverse";
}) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const isDark = theme === "dark";

  function toggle() {
    const next: Theme = isDark ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage can be blocked; the theme still applies for this session.
    }
  }

  const label = isDark ? "Switch to light theme" : "Switch to dark theme";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      aria-pressed={isDark}
      className={cn(
        "group relative grid size-11 shrink-0 place-items-center rounded-full border transition-[background-color,border-color,color,transform] duration-200 ease-quick active:scale-95",
        tone === "inverse"
          ? "border-white/25 bg-white/10 text-white hover:border-white/45 hover:bg-white/20"
          : "border-line bg-surface text-ink hover:border-line-strong hover:text-accent-ink",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-0 grid place-items-center transition-[opacity,transform] duration-300 ease-out-expo",
          isDark ? "rotate-0 opacity-100" : "-rotate-90 scale-50 opacity-0",
        )}
      >
        <MoonIcon className="size-[1.15rem]" />
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-0 grid place-items-center transition-[opacity,transform] duration-300 ease-out-expo",
          !isDark ? "rotate-0 opacity-100" : "rotate-90 scale-50 opacity-0",
        )}
      >
        <SunIcon className="size-[1.15rem]" />
      </span>
    </button>
  );
}
