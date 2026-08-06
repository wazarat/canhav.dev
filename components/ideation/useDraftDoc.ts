"use client";

import { useCallback, useState } from "react";

import type { IdeationDoc } from "@/lib/ideation";

/**
 * Editor state for an ideation draft: the state IS the doc, so the same
 * object feeds the autosave payload, the live derivations, and (stamped at
 * publish) the canonical snapshot.
 */
export function useDraftDoc<T extends IdeationDoc>(initial: T) {
  const [doc, setDoc] = useState<T>(initial);

  const patch = useCallback((p: Partial<T>) => {
    setDoc((d) => ({ ...d, ...p }));
  }, []);

  /** Shallow-merge into one nested section, e.g. patchSection("supply", {...}). */
  const patchSection = useCallback(
    <K extends keyof T>(key: K, p: Partial<T[K]>) => {
      setDoc((d) => ({ ...d, [key]: { ...(d[key] as object), ...p } }));
    },
    [],
  );

  return { doc, patch, patchSection, setDoc };
}
