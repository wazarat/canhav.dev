"use client";

import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";

import { isAuthConfiguredClient } from "@/components/studio/authConfig";
import { StudioSwitcher } from "@/components/studio/StudioSwitcher";
import { isStudioPath } from "@/lib/studio-entity";

/**
 * The breadcrumb after the logo on studio routes (2026-10-18): Studio, then
 * the open project or token design with the switcher on it, the way a
 * dashboard names the team and the project at the top left. Nothing on
 * any other route or while signed out.
 */
function Inner() {
  const { isLoaded, isSignedIn } = useUser();
  const pathname = usePathname();
  if (!isLoaded || !isSignedIn || !isStudioPath(pathname)) return null;
  return <StudioSwitcher variant="breadcrumb" />;
}

export function StudioBreadcrumb() {
  if (!isAuthConfiguredClient()) return null;
  return <Inner />;
}
