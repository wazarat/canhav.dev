"use client";

import { useEffect, useRef, useState } from "react";

export type SaveState = "idle" | "saving" | "saved" | "error";

/**
 * Debounced autosave: waits for the value to settle, dedupes in-flight
 * saves, and re-saves if the value changed while a save was running. An
 * edit still waiting on the debounce when the editor unmounts (a link
 * clicked right after typing) is saved on the way out instead of dropped.
 */
export function useAutosave<T>(
  value: T,
  save: (value: T) => Promise<void>,
  delayMs = 800,
): SaveState {
  const [state, setState] = useState<SaveState>("idle");
  const first = useRef(true);
  const inFlight = useRef(false);
  const pending = useRef<T | null>(null);
  const saveRef = useRef(save);
  saveRef.current = save;
  /** The newest value that no save has been started for yet, or null. */
  const unsaved = useRef<T | null>(null);

  useEffect(
    () => () => {
      if (unsaved.current !== null) void saveRef.current(unsaved.current).catch(() => {});
    },
    [],
  );

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    unsaved.current = value;
    const timer = setTimeout(async () => {
      unsaved.current = null;
      if (inFlight.current) {
        pending.current = value;
        return;
      }
      inFlight.current = true;
      setState("saving");
      let current: T | null = value;
      try {
        while (current !== null) {
          await saveRef.current(current);
          current = pending.current;
          pending.current = null;
        }
        setState("saved");
      } catch {
        setState("error");
      } finally {
        inFlight.current = false;
      }
    }, delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return state;
}
