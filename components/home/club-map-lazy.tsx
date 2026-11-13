"use client";

import dynamic from "next/dynamic";
import { PinIcon } from "@/components/ui/icons";
import { CLUB } from "@/lib/club";

/**
 * The map is a browser-only widget. Loading it through `next/dynamic` with
 * `ssr: false` keeps MapLibre (~1.2 MB) out of the server bundle, which the
 * Cloudflare Worker size limit depends on. The placeholder reuses the same
 * `.club-map-frame` box as the real map so nothing shifts when it mounts.
 */
const ClubMap = dynamic(() => import("./club-map").then((mod) => mod.ClubMap), {
  ssr: false,
  loading: () => (
    <div className="px-2 pb-2 sm:px-3 sm:pb-3">
      <div className="club-map-frame relative w-full overflow-hidden rounded-xl ring-1 ring-inset ring-white/10">
        <div className="absolute inset-0 grid place-items-center bg-brand-navy-deep/90 p-6 text-center">
          <div className="max-w-xs">
            <PinIcon className="mx-auto size-6 text-brand-yellow" />
            <p className="mt-2 text-sm font-semibold text-white">Loading the map</p>
            <p className="mt-1 text-caption leading-relaxed text-white/65">
              {CLUB.addressLine}
            </p>
          </div>
        </div>
      </div>
    </div>
  ),
});

export function ClubMapLazy() {
  return <ClubMap />;
}
