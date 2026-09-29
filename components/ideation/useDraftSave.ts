"use client";

import { useCallback, useRef, useState } from "react";

import type { IdeationDoc } from "@/lib/ideation";

/**
 * The editor's save call with the stale draft guard. The editor sends the
 * agent revision it loaded with; the server refuses the save (409) when an
 * agent write has landed since, and saving pauses until the draft is pulled
 * again or the page reloads. `rev` undefined means the row predates the
 * revision column and saves go through unguarded, as before.
 */
export function useDraftSave(path: "projects" | "token-designs", id: string, initialRev?: number) {
  const rev = useRef(initialRev);
  const [stale, setStale] = useState(false);
  const staleRef = useRef(false);

  const save = useCallback(
    async (doc: IdeationDoc) => {
      if (staleRef.current) throw new Error("stale");
      const res = await fetch(`/api/ideation/${path}/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(rev.current === undefined ? { doc } : { doc, rev: rev.current }),
      });
      if (res.status === 409) {
        staleRef.current = true;
        setStale(true);
        throw new Error("stale");
      }
      if (!res.ok) throw new Error("save failed");
    },
    [path, id],
  );

  /** The editor pulled the latest draft, so saving may resume at this revision. */
  const adopt = useCallback((nextRev: number) => {
    rev.current = nextRev;
    staleRef.current = false;
    setStale(false);
  }, []);

  return { save, stale, adopt, rev };
}
