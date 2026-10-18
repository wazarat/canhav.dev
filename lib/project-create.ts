import { DEFAULT_PROJECT_CHAIN, isProjectChain } from "@/lib/chains";
import { sectorsChange } from "@/lib/classify";
import { isStoredImageUrl } from "@/lib/image-url";
import { PROJECT_LIMITS, type ProjectDoc, emptyProjectDoc } from "@/lib/ideation";
import { SECTOR_VALUES, type Sector } from "@/lib/sectors";

/**
 * The fields the new project flow sends (M91). Every one is optional and
 * every one is checked the way the editor and the agent patches check it;
 * a bad value is dropped, never an error, so a blank draft always works.
 * `name` stays lenient (no minimum) because agents and the token track
 * create blank drafts through the same handler. Pure, so it can be checked
 * without a server.
 */
export function projectDocFromCreate(body: unknown): { doc: ProjectDoc; withTokenDesign: boolean } {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const name = typeof b.name === "string" ? b.name.trim().slice(0, PROJECT_LIMITS.name.max) : "";
  let doc = emptyProjectDoc(name);
  if (Array.isArray(b.sectors)) {
    const sectors = b.sectors.filter((s): s is Sector => SECTOR_VALUES.includes(s as Sector));
    if (sectors.length) doc = { ...doc, ...sectorsChange(doc, sectors) };
  }
  // Only a non default chain is stored, so the key is never injected (M52).
  if (isProjectChain(b.chain) && b.chain !== DEFAULT_PROJECT_CHAIN) doc.chain = b.chain;
  if (typeof b.whatItDoes === "string") doc.whatItDoes = b.whatItDoes.trim().slice(0, PROJECT_LIMITS.whatItDoes.max);
  if (typeof b.logo === "string" && isStoredImageUrl(b.logo.trim())) doc.logo = b.logo.trim();
  return { doc, withTokenDesign: b.withTokenDesign === true };
}
