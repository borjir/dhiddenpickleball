import type { ReactNode } from "react";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";

/**
 * Shell for public pages that do not open with a full-bleed hero. The fixed
 * header is solid from the first paint so its links stay readable on light
 * surfaces, and the main element reserves the header's height.
 */
export function PublicPage({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader startSolid />
      <main className="flex-1 pt-[4.75rem]">{children}</main>
      <SiteFooter />
    </div>
  );
}
