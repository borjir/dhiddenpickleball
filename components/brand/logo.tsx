import Image from "next/image";
import { cn } from "@/lib/cn";

/**
 * Official club mark supplied by the client on 3 November 2026.
 * The artwork is used as delivered: no recolouring, cropping, or redrawing.
 * The circular badge carries its own cream disc, so it is placed on any
 * surface without an added background.
 */
export function Logo({
  size = 48,
  className,
  priority = false,
}: {
  size?: number;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src="/logo/hidden-pickleball.webp"
      alt="D-Hidden Pickleball Court & Bistro logo"
      width={size}
      height={size}
      priority={priority}
      className={cn("shrink-0 select-none", className)}
    />
  );
}
