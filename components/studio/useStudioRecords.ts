"use client";

import { useEffect, useState } from "react";

/** Where each studio record kind is listed and edited. Shared by the command menu and the switcher (M92). */
export const STUDIO_ROUTES = {
  project: { api: "/api/ideation/projects", editor: "/studio/project" },
  token: { api: "/api/ideation/token-designs", editor: "/studio/token" },
} as const;

export interface StudioRecordRow {
  id: string;
  draft_doc: { name?: string };
  updated_at: string;
}

export interface StudioRecords {
  projects: StudioRecordRow[];
  designs: StudioRecordRow[];
}

/**
 * The account's projects and token designs, fetched each time `enabled`
 * turns true (a menu opening) and kept while it reloads, so a record made
 * since the last open shows up without a page reload.
 */
export function useStudioRecords(enabled: boolean): { records: StudioRecords | null; loading: boolean } {
  const [records, setRecords] = useState<StudioRecords | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let live = true;
    setLoading(true);
    Promise.all([STUDIO_ROUTES.project.api, STUDIO_ROUTES.token.api].map((url) => fetch(url, { cache: "no-store" })))
      .then(async ([p, d]) => {
        if (!p.ok || !d.ok) throw new Error();
        const [pj, dj] = (await Promise.all([p.json(), d.json()])) as [
          { rows: StudioRecordRow[] },
          { rows: StudioRecordRow[] },
        ];
        if (live) setRecords({ projects: pj.rows, designs: dj.rows });
      })
      .catch(() => {
        if (live) setRecords((r) => r ?? { projects: [], designs: [] });
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [enabled]);

  return { records, loading };
}
