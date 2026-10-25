import { kitsForDoc } from "@/content/kits";
import { checklistFor } from "@/content/kits/checklists";
import { offeredShapes } from "@/content/kits/copy";
import { projectChainOf } from "@/lib/chains";
import type { ProjectDoc } from "@/lib/ideation";
import {
  KIT_LIMITS,
  type ProductShape,
  type ProjectKit,
  emptyProjectKit,
  impliedShapesFor,
  kitShapes,
  kitsForSectors,
  withImpliedSubsectors,
  withShapeSubsectors,
  withShapes,
  withoutShape,
} from "@/lib/kits";
import { lentSubsectors, reachableTemplateIds } from "@/lib/template-reach";
import { SECTOR_SUBSECTORS, type Sector, type Subsector, docSectors, subsectorsOf, withSectors } from "@/lib/sectors";

/**
 * What a project is classed as, sectors, subsectors and product shapes, and
 * the fields that follow when one of them changes. The editor calls these on
 * a click and an accepted agent change calls them on apply (M51), so both
 * follow the same cascade. Pure, each returns the field patch to merge.
 */

/**
 * The kit fields that follow a change of sectors or subsectors. Shapes no
 * longer offered are dropped and `kits` tracks what the sectors open,
 * keeping a kit that already exists when they open nothing.
 */
function kitAfter(
  doc: ProjectDoc,
  sectors: readonly Sector[],
  subsectors: readonly Subsector[],
): Pick<ProjectDoc, "kit"> | Record<string, never> {
  const kit = doc.kit;
  if (!kit) return {};
  const offered = offeredShapes(subsectors);
  const keep = kitShapes(kit).filter((s) => offered.includes(s));
  const kits = kitsForSectors(sectors, subsectors);
  const next = { ...kit, ...withShapes(keep), kits: kits.length ? kits : kit.kits };
  return { kit: { ...next, id: next.kits[0] } };
}

export function sectorsChange(doc: ProjectDoc, picked: readonly Sector[]): Partial<ProjectDoc> {
  const next = withSectors(picked);
  const own = new Set(subsectorsOf(next.sectors));
  const nextSubs = (doc.subsectors ?? []).filter((s) => own.has(s));
  return {
    ...next,
    ...(doc.subsectors ? { subsectors: nextSubs } : {}),
    ...kitAfter(doc, next.sectors, nextSubs),
  };
}

export function subsectorsChange(doc: ProjectDoc, picked: readonly Subsector[]): Partial<ProjectDoc> {
  const sectors = docSectors(doc);
  const held = doc.subsectors ?? [];
  const implied = withImpliedSubsectors(
    picked,
    sectors,
    picked.filter((s) => !held.includes(s)),
  );
  const after = kitAfter(doc, sectors, implied);
  // A subsector that offers exactly one shape picks it, so nobody is asked twice.
  const auto = impliedShapesFor(implied);
  const held2 = after.kit ? kitShapes(after.kit) : [];
  if (!auto.some((s) => !held2.includes(s))) return { subsectors: implied, ...after };
  const kits = kitsForSectors(sectors, implied);
  const base = after.kit ?? doc.kit ?? emptyProjectKit(kits.length ? kits : kitsForDoc(doc));
  const nextKits = kits.length ? kits : base.kits;
  return {
    subsectors: implied,
    kit: { ...base, ...withShapes([...held2, ...auto]), kits: nextKits, id: nextKits[0] },
  };
}

export function shapesChange(doc: ProjectDoc, picked: readonly ProductShape[], cap: number = KIT_LIMITS.shapes.maxPlus): Partial<ProjectDoc> {
  const sectors = docSectors(doc);
  const subsectors = doc.subsectors ?? [];
  // At most the plan's cap of our shapes, less the ones the team made (M131, M176); the first picks win.
  const kept = picked.slice(0, Math.max(0, cap - (doc.kit?.ownShapes?.length ?? 0)));
  const nextSubs = withShapeSubsectors(subsectors, kept, sectors);
  const kits = kitsForSectors(sectors, nextSubs);
  const base = doc.kit ?? emptyProjectKit(kitsForDoc(doc));
  const nextKits = kits.length ? kits : base.kits;
  return {
    ...(nextSubs.length !== subsectors.length ? { subsectors: nextSubs } : {}),
    kit: { ...base, ...withShapes(kept), kits: nextKits, id: nextKits[0] },
  };
}

/**
 * What a classification change took away (M185), cleaned up after it: the
 * modules it dropped lose their board entries and added steps, and every
 * step no remaining module holds loses its tick, evidence and not
 * applicable reason. Features of a dropped module and decisions on templates
 * the project can no longer reach go too. Returns the cleaned kit and what
 * went, for the confirm line.
 */
export function cleanupAfter(before: ProjectDoc, after: ProjectDoc): { kit: ProjectKit | undefined; modules: ProductShape[]; done: number; templates: number } {
  const was = kitShapes(before.kit);
  const kept = new Set(kitShapes(after.kit));
  const modules = was.filter((s) => !kept.has(s));
  let kit = after.kit;
  if (!kit || !modules.length) return { kit, modules, done: 0, templates: 0 };
  for (const s of modules) kit = { ...kit, ...withoutShape(kit, s) };
  const keep = new Set<string>([
    ...checklistFor(kitShapes(kit)).map((i) => i.id),
    ...(kit.ownShapes ?? []).flatMap((o) => o.steps),
    ...(kit.customSteps ?? []).map((c) => c.id),
  ]);
  const gone = new Set<string>([
    ...checklistFor(modules).map((i) => i.id),
    ...(before.kit?.customSteps ?? []).map((c) => c.id),
  ].filter((id) => !keep.has(id)));
  const drop = <T,>(rec: Record<string, T> | undefined) => {
    if (!rec) return rec;
    const out = Object.fromEntries(Object.entries(rec).filter(([k]) => !gone.has(k)));
    return Object.keys(out).length ? out : undefined;
  };
  const done = [...gone].filter((id) => before.kit?.checklist?.[id]).length;
  const reach = reachableTemplateIds(kitShapes(kit), projectChainOf(after), {}, lentSubsectors(after));
  const decided = Object.entries(kit.templates ?? {});
  const leftTemplates = decided.filter(([id]) => reach.has(id));
  const features = (kit.features ?? []).filter((f) => !modules.some((s) => f.startsWith(`${s}.`)));
  kit = {
    ...kit,
    checklist: drop(kit.checklist) as ProjectKit["checklist"],
    evidence: drop(kit.evidence),
    notApplicable: drop(kit.notApplicable),
    features: features.length ? features : undefined,
    templates: leftTemplates.length ? Object.fromEntries(leftTemplates) : undefined,
  };
  return { kit, modules, done, templates: decided.length - leftTemplates.length };
}

/** The sector's own extras, its note and the team's own subsectors under it, dropped with it (M185). */
function withoutSectorExtras(doc: ProjectDoc, sector: Sector): Pick<ProjectDoc, "sectorNotes" | "customSubsectors"> {
  const { [sector]: _n, ...notes } = doc.sectorNotes ?? {};
  const own = (doc.customSubsectors ?? []).filter((c) => c.sector !== sector);
  return { sectorNotes: Object.keys(notes).length ? notes : undefined, customSubsectors: own.length ? own : undefined };
}

/** Delete a sector (M185): it, its subsectors, the modules only they offer and everything those modules hold. */
export function sectorRemoval(doc: ProjectDoc, sector: Sector): { patch: Partial<ProjectDoc>; subsectors: Subsector[]; modules: ProductShape[]; done: number; templates: number } {
  const after: ProjectDoc = { ...doc, ...sectorsChange(doc, docSectors(doc).filter((s) => s !== sector)), ...withoutSectorExtras(doc, sector) };
  const clean = cleanupAfter(doc, after);
  const subsectors = (doc.subsectors ?? []).filter((s) => !(after.subsectors ?? []).includes(s));
  return {
    patch: {
      sectors: after.sectors,
      sector: after.sector,
      subsectors: after.subsectors,
      sectorNotes: after.sectorNotes,
      customSubsectors: after.customSubsectors,
      ...(sector === "other" ? { sectorOther: "" } : {}),
      ...(clean.kit ? { kit: clean.kit } : {}),
    },
    subsectors,
    ...clean,
  };
}

/**
 * Save one sector from the add or edit pop-up (M185): the sector, its
 * subsectors, the modules picked under them and its note, in the editor's
 * cascade order, then the cleanup for anything an edit took away. The
 * other sectors' picks stay as they are.
 */
export function sectorSave(
  doc: ProjectDoc,
  input: { sector: Sector; subsectors: readonly Subsector[]; shapes: readonly ProductShape[]; note: string; other?: string },
  cap: number = KIT_LIMITS.shapes.maxPlus,
): { patch: Partial<ProjectDoc>; modules: ProductShape[]; done: number; templates: number } {
  const { sector } = input;
  const sectors = docSectors(doc);
  let next: ProjectDoc = sectors.includes(sector) ? doc : { ...doc, ...sectorsChange(doc, [...sectors, sector]) };
  const mine = new Set(SECTOR_SUBSECTORS[sector] ?? []);
  const others = (next.subsectors ?? []).filter((s) => !mine.has(s));
  next = { ...next, ...subsectorsChange(next, [...others, ...input.subsectors]) };
  // Modules offered under this sector's picks are the pop-up's to decide; the rest stay.
  const offeredHere = new Set(offeredShapes(input.subsectors));
  const offeredBefore = new Set(offeredShapes((doc.subsectors ?? []).filter((s) => mine.has(s))));
  const keepOthers = kitShapes(next.kit).filter((s) => !offeredHere.has(s) && !offeredBefore.has(s));
  next = { ...next, ...shapesChange(next, [...keepOthers, ...input.shapes.filter((s) => offeredHere.has(s))], cap) };
  const notes = { ...(doc.sectorNotes ?? {}) };
  if (input.note.trim()) notes[sector] = input.note.trim();
  else delete notes[sector];
  next = { ...next, sectorNotes: Object.keys(notes).length ? notes : undefined, ...(input.other !== undefined ? { sectorOther: input.other } : {}) };
  const clean = cleanupAfter(doc, next);
  return {
    patch: {
      sectors: next.sectors,
      sector: next.sector,
      subsectors: next.subsectors,
      sectorNotes: next.sectorNotes,
      ...(input.other !== undefined ? { sectorOther: input.other } : {}),
      ...(clean.kit ? { kit: clean.kit } : {}),
    },
    ...clean,
  };
}
