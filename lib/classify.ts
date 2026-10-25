import { kitsForDoc } from "@/content/kits";
import { offeredShapes } from "@/content/kits/copy";
import type { ProjectDoc } from "@/lib/ideation";
import {
  KIT_LIMITS,
  type ProductShape,
  emptyProjectKit,
  impliedShapesFor,
  kitShapes,
  kitsForSectors,
  withImpliedSubsectors,
  withShapeSubsectors,
  withShapes,
} from "@/lib/kits";
import { type Sector, type Subsector, docSectors, subsectorsOf, withSectors } from "@/lib/sectors";

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
