import type { ProjectDoc } from "@/lib/ideation";
import type { KitId } from "@/lib/kits";

/**
 * Which research kit a project document qualifies for. One kit today; the
 * table grows when another subsector opens. Returns null when none applies,
 * and the editor then renders nothing kit-related.
 */
export function kitForDoc(doc: Pick<ProjectDoc, "sector" | "subsectors">): KitId | null {
  if (doc.sector === "credit_lending" && (doc.subsectors ?? []).includes("lending"))
    return "lending";
  return null;
}
