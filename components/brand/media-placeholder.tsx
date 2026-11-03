import { cn } from "@/lib/cn";

export type MediaPlaceholderTone = "light" | "dark";

/**
 * Clearly labeled image stand-in. Replace with an approved club photograph by
 * passing `src`; the placeholder label disappears automatically.
 */
export interface MediaPlaceholderProps {
  label: string;
  ratio?: "16/9" | "4/3" | "1/1" | "3/4";
  src?: string;
  alt?: string;
  tone?: MediaPlaceholderTone;
  className?: string;
}

export function MediaPlaceholder({
  label,
  ratio = "16/9",
  src,
  alt,
  tone = "light",
  className,
}: MediaPlaceholderProps) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- placeholder accepts arbitrary approved assets in later phases.
      <img
        src={src}
        alt={alt ?? label}
        style={{ aspectRatio: ratio }}
        className={cn(
          "w-full rounded-lg border border-line object-cover",
          className,
        )}
      />
    );
  }

  const dark = tone === "dark";

  return (
    <div
      role="img"
      aria-label={`${label} (development placeholder)`}
      style={{ aspectRatio: ratio }}
      className={cn(
        "relative flex w-full items-center justify-center overflow-hidden rounded-lg border border-dashed",
        dark
          ? "border-white/30 bg-white/5"
          : "border-line-strong bg-[#eef1e6]",
        className,
      )}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 320 180"
        preserveAspectRatio="none"
        className={cn(
          "absolute inset-0 size-full",
          dark ? "text-white opacity-[0.18]" : "text-brand-navy opacity-[0.13]",
        )}
      >
        <g fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="16" y="16" width="288" height="148" />
          <path d="M160 16v148M16 90h288" />
          <rect x="52" y="46" width="216" height="88" />
          <path d="M52 90h216" />
          <circle cx="160" cy="90" r="24" />
        </g>
      </svg>
      <div className="relative mx-4 max-w-[22rem] text-center">
        <p
          className={cn(
            "text-[0.625rem] font-bold uppercase tracking-[0.18em]",
            dark ? "text-white/70" : "text-brand-navy/75",
          )}
        >
          Image placeholder
        </p>
        <p
          className={cn(
            "mt-1.5 font-display text-sm font-semibold leading-snug",
            dark ? "text-white/90" : "text-brand-navy/85",
          )}
        >
          {label}
        </p>
      </div>
    </div>
  );
}
