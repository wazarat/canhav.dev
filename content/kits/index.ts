import type { ProjectDoc } from "@/lib/ideation";
import { type KitId, kitsForSectors } from "@/lib/kits";
import { docSectors } from "@/lib/sectors";

/**
 * Which research kits a project document qualifies for: one per chosen
 * sector that has a kit and at least one chosen subsector (Credit and
 * Liquidity today). Empty when none applies, and the editor then renders
 * nothing kit-related.
 */
export function kitsForDoc(doc: Pick<ProjectDoc, "sector" | "sectors" | "subsectors">): KitId[] {
  return kitsForSectors(docSectors(doc), doc.subsectors ?? []);
}

/** The first kit, for callers that want one. */
export function kitForDoc(doc: Pick<ProjectDoc, "sector" | "sectors" | "subsectors">): KitId | null {
  return kitsForDoc(doc)[0] ?? null;
}
