"use client";

import { StatusChip } from "@/components/ui/StatusChip";
import type { SaveState } from "@/components/ideation/useAutosave";

export function AutosaveIndicator({ state }: { state: SaveState }) {
  if (state === "idle") return null;
  if (state === "saving") return <StatusChip tone="neutral">Saving…</StatusChip>;
  if (state === "saved") return <StatusChip tone="success">Saved</StatusChip>;
  return <StatusChip tone="error">Not saved — edits retry automatically</StatusChip>;
}
