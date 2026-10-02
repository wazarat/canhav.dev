"use client";

import { useCallback, useEffect, useState } from "react";

import { isAuthConfiguredClient } from "@/components/studio/authConfig";
import { LaunchRowActions, type LaunchLinkProject } from "@/components/studio/LaunchRowActions";

interface OwnerView {
  project: LaunchLinkProject | null;
  candidates: LaunchLinkProject[];
}

/**
 * The owner's controls on the token page, across from the token name (M56).
 * The agent prompt and the project link. The page itself is public and
 * session free, so this asks GET /api/launches/<address>, which answers only
 * the account that recorded the launch. Everyone else sees nothing.
 */
export function OwnerLaunchActions({
  address,
  name,
  committed,
}: {
  address: string;
  name: string;
  committed: boolean;
}) {
  const [view, setView] = useState<OwnerView | null>(null);

  const load = useCallback(() => {
    fetch(`/api/launches/${address}`, { cache: "no-store" })
      .then(async (res) => setView(res.ok ? ((await res.json()) as OwnerView) : null))
      .catch(() => setView(null));
  }, [address]);

  useEffect(() => {
    if (isAuthConfiguredClient()) load();
  }, [load]);

  if (!view) return null;
  return (
    <LaunchRowActions
      address={address}
      name={name}
      committed={committed}
      linkable
      project={view.project}
      candidates={view.candidates}
      onChanged={load}
    />
  );
}
