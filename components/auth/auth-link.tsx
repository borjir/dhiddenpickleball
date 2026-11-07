import Link from "next/link";
import { cn } from "@/lib/cn";

/**
 * Header entry point for guests. There is no player sign-in or account area;
 * the reference plus mobile number is the credential, so this links to the
 * public booking lookup instead.
 */
export function AuthLink({
  solid,
  className,
  onNavigate,
}: {
  solid: boolean;
  className?: string;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href="/lookup"
      onClick={onNavigate}
      className={cn(
        "inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold transition-colors duration-200",
        solid
          ? "text-ink/75 hover:bg-brand-blue-soft/70 hover:text-heading"
          : "text-white/80 hover:bg-white/10 hover:text-white",
        className,
      )}
    >
      Check booking
    </Link>
  );
}
