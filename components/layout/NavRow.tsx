"use client";

import { usePathname } from "next/navigation";

import { studioEntityFromPath } from "@/lib/studio-entity";
import { cn } from "@/lib/utils";

/**
 * The nav's row (2026-10-19): the site container on every page, but full
 * width with the sidebar's gutter on a project page, so the logo and the
 * breadcrumb sit right above the project name in the sidebar.
 */
export function NavRow({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const dashboard = studioEntityFromPath(pathname)?.kind === "project";
  return (
    <div
      className={cn(
        "flex h-16 items-center justify-between gap-3 sm:gap-4",
        dashboard ? "px-5 lg:pr-10" : "container",
      )}
    >
      {children}
    </div>
  );
}
