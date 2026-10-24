import { offeredShapes } from "@/content/kits/copy";
import { DEFAULT_PROJECT_CHAIN, isProjectChain } from "@/lib/chains";
import { sectorsChange, shapesChange, subsectorsChange } from "@/lib/classify";
import { isStoredImageUrl } from "@/lib/image-url";
import { PROJECT_LIMITS, type ProjectDoc, emptyProjectDoc } from "@/lib/ideation";
import { PRODUCT_SHAPE_VALUES, type ProductShape } from "@/lib/kits";
import { SECTOR_VALUES, type Sector, type Subsector, docSectors, subsectorsOf } from "@/lib/sectors";

/**
 * The fields the new project flow sends (M91, subsectors and shapes since
 * M130). Every one is optional and every one is checked the way the editor
 * and the agent patches check it; a bad value is dropped, never an error, so
 * a blank draft always works. `name` stays lenient (no minimum) because
 * agents and the token track create blank drafts through the same handler.
 * Pure, so it can be checked without a server.
 */
export function projectDocFromCreate(body: unknown): { doc: ProjectDoc; withTokenDesign: boolean } {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const name = typeof b.name === "string" ? b.name.trim().slice(0, PROJECT_LIMITS.name.max) : "";
  let doc = emptyProjectDoc(name);
  if (Array.isArray(b.sectors)) {
    const sectors = b.sectors.filter((s): s is Sector => SECTOR_VALUES.includes(s as Sector));
    if (sectors.length) doc = { ...doc, ...sectorsChange(doc, sectors) };
  }
  // Subsectors of the chosen sectors, then the shapes they offer, through the
  // same cascade the editor and the agent use (a single shape subsector picks it).
  if (Array.isArray(b.subsectors)) {
    const own = subsectorsOf(docSectors(doc));
    const subs = b.subsectors.filter((s): s is Subsector => own.includes(s as Subsector)).slice(0, PROJECT_LIMITS.subsectors.max * docSectors(doc).length);
    if (subs.length) doc = { ...doc, ...subsectorsChange(doc, subs) };
  }
  if (Array.isArray(b.shapes)) {
    const offered = offeredShapes(doc.subsectors ?? []);
    const shapes = b.shapes.filter((s): s is ProductShape => PRODUCT_SHAPE_VALUES.includes(s as ProductShape) && offered.includes(s as ProductShape));
    if (shapes.length) doc = { ...doc, ...shapesChange(doc, [...new Set([...(doc.kit?.shapes ?? []), ...shapes])]) };
  }
  // A new project stores its chain explicitly (M139); only documents from before carry none and read as Robinhood.
  doc.chain = isProjectChain(b.chain) ? b.chain : DEFAULT_PROJECT_CHAIN;
  if (typeof b.whatItDoes === "string") doc.whatItDoes = b.whatItDoes.trim().slice(0, PROJECT_LIMITS.whatItDoes.max);
  if (typeof b.logo === "string" && isStoredImageUrl(b.logo.trim())) doc.logo = b.logo.trim();
  return { doc, withTokenDesign: b.withTokenDesign === true };
}
