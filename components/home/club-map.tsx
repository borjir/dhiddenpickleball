"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { ArrowUpRightIcon, PinIcon } from "@/components/ui/icons";
import { CLUB } from "@/lib/club";

/**
 * OpenFreeMap's Positron style. No key, token, or account is required. Positron
 * keeps the tiles light and neutral, so the navy pin and the street network
 * stay readable in both themes.
 */
const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/positron";
const CENTER: [number, number] = [CLUB.longitude, CLUB.latitude];

/**
 * The confirmed address, split into the labels a visitor needs to place the
 * club. Only values from the club's own address are listed; no street name or
 * purok number is invented.
 */
const LOCATION_PARTS = [
  { label: "Purok / area", value: "Bung-aw" },
  { label: "Barangay", value: "Pondol" },
  { label: "Municipality", value: "Balamban" },
  { label: "Province", value: "Cebu" },
  { label: "ZIP code", value: "6041" },
] as const;

/**
 * Interactive club map. MapLibre is imported and the tiles are requested only
 * when the panel approaches the viewport, so the map does not cost anything on
 * the first screen. The address stays visible in text beside the map, and a
 * failed map leaves the address and the directions link usable.
 */
export function ClubMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  // Environments without IntersectionObserver load the map immediately.
  const [shouldLoad, setShouldLoad] = useState(
    typeof IntersectionObserver === "undefined",
  );
  const [status, setStatus] = useState<"loading" | "ready" | "failed">(
    "loading",
  );

  useEffect(() => {
    const node = containerRef.current;
    if (!node || shouldLoad) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: "300px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [shouldLoad]);

  useEffect(() => {
    const node = containerRef.current;
    if (!shouldLoad || !node) return;

    let map: MapLibreMap | null = null;
    let cancelled = false;

    void (async () => {
      try {
        const maplibre = await import("maplibre-gl");
        if (cancelled) return;

        // The bundler does not emit the worker beside its JS chunk, so the copy
        // made by scripts/sync-maplibre-worker.mjs is served from /public.
        maplibre.setWorkerUrl("/vendor/maplibre-gl-worker.mjs");

        map = new maplibre.MapLibreMap({
          container: node,
          style: MAP_STYLE_URL,
          center: CENTER,
          zoom: 15.6,
          minZoom: 11,
          maxZoom: 18,
          dragRotate: false,
          cooperativeGestures: true,
          attributionControl: { compact: true },
        });

        if (cancelled) {
          map.remove();
          return;
        }

        // Street labels stay upright, which reads better for a location map.
        map.touchZoomRotate.disableRotation();

        map.addControl(
          new maplibre.NavigationControl({ showCompass: false }),
          "top-right",
        );

        // The popup is the only on-map label and it sits on light map tiles,
        // not on the dark band, so it carries its own surface colours instead
        // of inheriting the surrounding white text. The second line names the
        // area so the pin reads without needing the map labels behind it.
        const label = document.createElement("span");
        label.style.cssText =
          "display:block;max-width:min(16rem,72vw);padding:8px 12px;border-radius:12px;" +
          "background:#ffffff;color:#123b78;text-align:center;" +
          "font:600 12px/1.4 ui-sans-serif,system-ui,sans-serif;" +
          "box-shadow:0 8px 24px rgba(4,14,30,0.24),0 0 0 1px rgba(18,59,120,0.08);";

        const clubName = document.createElement("span");
        clubName.style.cssText = "display:block;";
        clubName.textContent = "D-Hidden Pickleball Court & Bistro";

        const clubArea = document.createElement("span");
        clubArea.style.cssText =
          "display:block;margin-top:2px;font-size:11px;font-weight:500;color:#5a6779;";
        clubArea.textContent = CLUB.addressLine;

        label.append(clubName, clubArea);

        const popup = new maplibre.Popup({
          offset: 34,
          closeButton: false,
          focusAfterOpen: false,
          maxWidth: "280px",
        }).setDOMContent(label);

        const marker = new maplibre.Marker({ color: "#123B78" })
          .setLngLat(CENTER)
          .setPopup(popup)
          .addTo(map);

        // Keep the club name readable without requiring a click on the pin.
        marker.togglePopup();

        // MapLibre's popup chrome assumes its own stylesheet wins the cascade,
        // and the design system reset leaves it transparent. Clear the wrapper
        // so the label reads as a plain pill on the map.
        const popupContent = popup
          .getElement()
          ?.querySelector<HTMLElement>(".maplibregl-popup-content");
        if (popupContent) {
          popupContent.style.padding = "0";
          popupContent.style.borderRadius = "0";
          popupContent.style.background = "transparent";
          popupContent.style.boxShadow = "none";
        }

        const canvas = map.getCanvas();
        canvas.setAttribute("tabindex", "0");
        canvas.setAttribute(
          "aria-label",
          "Map of the club location. Use the arrow keys to pan and plus or minus to zoom.",
        );

        map.once("load", () => {
          if (cancelled || !map) return;

          // A soft halo anchors the pin to a small area so the exact spot is
          // easy to find at a glance. It is a visual marker, not a surveyed
          // club boundary.
          map.addSource("club-area", {
            type: "geojson",
            data: {
              type: "Feature",
              properties: {},
              geometry: { type: "Point", coordinates: CENTER },
            },
          });
          map.addLayer({
            id: "club-area",
            type: "circle",
            source: "club-area",
            paint: {
              "circle-radius": [
                "interpolate",
                ["linear"],
                ["zoom"],
                12,
                8,
                16,
                46,
                18,
                120,
              ],
              "circle-color": "#1674d5",
              "circle-opacity": 0.12,
              "circle-stroke-color": "#1674d5",
              "circle-stroke-width": 1.5,
              "circle-stroke-opacity": 0.45,
            },
          });

          setStatus("ready");
        });
      } catch {
        if (!cancelled) setStatus("failed");
      }
    })();

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [shouldLoad]);

  return (
    <div className="overflow-hidden rounded-2xl border border-white/12 bg-brand-navy/45 shadow-raised backdrop-blur-sm">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3 px-5 py-4 sm:px-6">
        <div className="flex min-w-0 items-start gap-3">
          <span
            aria-hidden="true"
            className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/15 bg-brand-blue/25 text-brand-yellow"
          >
            <PinIcon className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[0.625rem] font-bold uppercase tracking-[0.18em] text-white/55">
              Location
            </p>
            <p className="mt-1 text-[0.9375rem] font-semibold leading-snug text-white">
              {CLUB.addressLine}
            </p>
          </div>
        </div>

        <a
          href={CLUB.mapUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3.5 text-sm font-semibold text-white transition-colors duration-200 hover:border-brand-yellow/50 hover:bg-white/15 hover:text-brand-yellow"
        >
          Get directions
          <ArrowUpRightIcon className="size-3.5" />
        </a>
      </div>

      <div className="px-2 pb-2 sm:px-3 sm:pb-3">
        <div
          role="region"
          aria-label={`Map of ${CLUB.addressFull}`}
          className="club-map-frame relative w-full overflow-hidden rounded-xl ring-1 ring-inset ring-white/10"
        >
          <div ref={containerRef} className="h-full w-full" />
          {status !== "ready" ? (
            <div className="absolute inset-0 grid place-items-center bg-brand-navy-deep/90 p-6 text-center">
              <div className="max-w-xs">
                <PinIcon className="mx-auto size-6 text-brand-yellow" />
                <p className="mt-2 text-sm font-semibold text-white">
                  {status === "failed"
                    ? "The map could not load"
                    : "Loading the map"}
                </p>
                <p className="mt-1 text-caption leading-relaxed text-white/65">
                  {status === "failed"
                    ? `Find us at ${CLUB.addressLine}. The address and the directions link still work.`
                    : CLUB.addressLine}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-t border-white/10 px-5 py-4 sm:grid-cols-4 sm:px-6">
        {LOCATION_PARTS.map((part) => (
          <div key={part.label} className="min-w-0">
            <dt className="text-[0.625rem] font-bold uppercase tracking-[0.16em] text-white/55">
              {part.label}
            </dt>
            <dd className="mt-1 truncate text-[0.9375rem] font-semibold text-white">
              {part.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-col gap-1 border-t border-white/10 px-5 py-3 text-[0.6875rem] leading-relaxed text-white/50 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="font-semibold tracking-wide text-white/70">
          Pin {CLUB.coordinates}
        </p>
        <p>
          © OpenStreetMap contributors · OpenFreeMap · Arrow keys pan, + / −
          zoom
        </p>
      </div>
    </div>
  );
}
