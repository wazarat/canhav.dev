import { KIT_CATALOG } from "@/content/kits/catalog";
import { FEATURE_CATALOG, featuresFor } from "@/content/kits/features";
import { TEMPLATE_CATALOG, templateById } from "@/content/templates";
import type { ProjectChain } from "@/lib/chains";
import {
  BOARD_LANES,
  type BoardCard,
  type BoardLane,
  type FeatureItem,
  type KitIdea,
  KIT_LIMITS,
  type ProductShape,
  type ProjectKit,
  SHAPE_SUBSECTORS,
  type ShapeId,
  hasFeature,
  isProductShape,
  ownShapeOf,
  resourceOnChain,
  toggleFeature,
} from "@/lib/kits";
import { templatesForShapes } from "@/lib/templates";

/**
 * The shape boards (M176), a Linear style board per shape with three lanes:
 * Core (part of the product), Exploring (being ideated) and Later (a
 * feature to add and test later). Cards are our catalog features, the
 * resources and contract templates the team picks, and its own lines
 * (kit.ideas). A feature in Core is ticked in kit.features, so it adds the
 * build steps it gates; moving it out unticks it. Exploring and Later add
 * nothing to the build. A feature tick is project wide, so a feature placed
 * on two shapes moves on both.
 */

export type BoardKind = "feature" | "resource" | "template" | "own";

export interface BoardItem {
  /** Stable key: the ref, or "own:<text>" for an own line. */
  key: string;
  kind: BoardKind;
  /** The catalog id, or the line itself for an own item. */
  id: string;
  title: string;
  detail: string;
  lane: BoardLane;
  href?: string;
}

const RESOURCE_BY_ID = new Map(KIT_CATALOG.map((r) => [r.id, r] as const));
const FEATURE_BY_ID = new Map<string, FeatureItem>(Object.values(FEATURE_CATALOG).flatMap((l) => (l ?? []).map((f) => [f.id, f] as const)));

export function featureById(id: string): FeatureItem | undefined {
  return FEATURE_BY_ID.get(id);
}

/** The shape a feature id belongs to, "<shape>.f.<slug>". */
export function featureShape(id: string): ProductShape | null {
  const s = id.slice(0, id.indexOf(".f."));
  return isProductShape(s) ? s : null;
}

function refOf(kind: Exclude<BoardKind, "own">, id: string): string {
  return `${kind}:${id}`;
}

function parseRef(ref: string): { kind: Exclude<BoardKind, "own">; id: string } | null {
  const i = ref.indexOf(":"); // copy-ok, the ref separator
  const kind = ref.slice(0, i);
  if (kind !== "feature" && kind !== "resource" && kind !== "template") return null;
  return { kind, id: ref.slice(i + 1) };
}

/** A card as the board shows it, or null when its catalog entry is gone. */
function itemOf(kind: Exclude<BoardKind, "own">, id: string, lane: BoardLane): BoardItem | null {
  if (kind === "feature") {
    const f = FEATURE_BY_ID.get(id);
    return f ? { key: refOf(kind, id), kind, id, title: f.title, detail: f.detail, lane } : null;
  }
  if (kind === "resource") {
    const r = RESOURCE_BY_ID.get(id);
    return r ? { key: refOf(kind, id), kind, id, title: r.title, detail: r.why ?? "", lane, href: r.href } : null;
  }
  const t = templateById(id);
  return t ? { key: refOf(kind, id), kind, id: t.id, title: t.name, detail: t.description, lane } : null;
}

/** A feature's lane: Core while it is ticked, else where its card sits (a Core card that lost its tick reads Exploring). */
function featureLane(kit: Pick<ProjectKit, "features">, card: BoardCard | undefined, id: string): BoardLane | null {
  if (hasFeature(kit, id)) return "core";
  if (!card) return null;
  return card.lane === "core" ? "exploring" : card.lane;
}

/** The three lanes of one shape, each in the order placed. */
export function boardFor(kit: ProjectKit, shape: ShapeId): Record<BoardLane, BoardItem[]> {
  const out: Record<BoardLane, BoardItem[]> = { core: [], exploring: [], later: [] };
  const cards = (kit.board ?? []).filter((c) => c.shape === shape);
  const seen = new Set<string>();
  for (const c of cards) {
    const ref = parseRef(c.ref);
    if (!ref) continue;
    const lane = ref.kind === "feature" ? featureLane(kit, c, ref.id) : c.lane;
    const item = lane ? itemOf(ref.kind, ref.id, lane) : null;
    if (!item) continue;
    seen.add(item.key);
    out[item.lane].push(item);
  }
  // Our shape's ticked features with no card read as Core, so boards from before M176 show what was ticked.
  if (isProductShape(shape))
    for (const f of featuresFor([shape])) {
      if (!hasFeature(kit, f.id) || seen.has(refOf("feature", f.id))) continue;
      out.core.push({ key: refOf("feature", f.id), kind: "feature", id: f.id, title: f.title, detail: f.detail, lane: "core" });
    }
  for (const i of kit.ideas ?? []) {
    if (i.shape !== shape) continue;
    out[i.lane ?? "exploring"].push({ key: `own:${i.text}`, kind: "own", id: i.text, title: i.text, detail: "", lane: i.lane ?? "exploring" });
  }
  return out;
}

export interface LibraryGroup {
  kind: Exclude<BoardKind, "own">;
  /** The shape the entries come from, for features and templates. */
  from?: ProductShape;
  items: Array<{ id: string; title: string; detail: string }>;
}

/**
 * What can still be placed on a shape's board: its features, the resources
 * that apply to it and its contract templates. An own shape (M176) offers
 * every shape's features and templates, the shape it was copied from first.
 */
export function libraryFor(kit: ProjectKit, shape: ShapeId, chain: ProjectChain): LibraryGroup[] {
  const placed = new Set(Object.values(boardFor(kit, shape)).flat().map((i) => i.key));
  const free = <T extends { id: string }>(kind: Exclude<BoardKind, "own">, list: readonly T[]) => list.filter((x) => !placed.has(refOf(kind, x.id)));
  const own = ownShapeOf(kit, shape);
  const sources: ProductShape[] = isProductShape(shape)
    ? [shape]
    : [...(own?.basedOn ? [own.basedOn] : []), ...(Object.keys(FEATURE_CATALOG) as ProductShape[]).filter((s) => s !== own?.basedOn)];
  const groups: LibraryGroup[] = [];
  for (const s of sources) {
    const items = free("feature", featuresFor([s])).map((f) => ({ id: f.id, title: f.title, detail: f.detail }));
    if (items.length) groups.push({ kind: "feature", from: s, items });
  }
  const resourceShapes = isProductShape(shape) ? [shape] : own?.basedOn ? [own.basedOn] : null;
  // A resource for every shape may still be narrowed to subsectors, so it applies only under the shape's own.
  const subs = new Set(resourceShapes?.flatMap((s) => SHAPE_SUBSECTORS[s]) ?? []);
  // The same rule as the pack: the project's research kits and chain, then the shape (or its subsectors for an all-shapes resource).
  const applies = (r: (typeof KIT_CATALOG)[number]) =>
    (!r.kits || r.kits.some((k) => kit.kits.includes(k))) &&
    resourceOnChain(r, chain) &&
    (!resourceShapes ||
      (r.shapes === "all" ? !r.subsectors || r.subsectors.some((x) => subs.has(x)) : resourceShapes.some((s) => (r.shapes as readonly ProductShape[]).includes(s))));
  const resources = KIT_CATALOG.filter(applies);
  const freeResources = free("resource", resources).map((r) => ({ id: r.id, title: r.title, detail: r.why ?? "" }));
  if (freeResources.length) groups.push({ kind: "resource", items: freeResources });
  const templates = resourceShapes ? templatesForShapes(TEMPLATE_CATALOG, resourceShapes, chain) : [...TEMPLATE_CATALOG];
  const freeTemplates = free("template", templates).map((t) => ({ id: t.id, title: t.name, detail: t.description }));
  if (freeTemplates.length) groups.push({ kind: "template", items: freeTemplates });
  return groups;
}

/**
 * Place a catalog card on a lane, or move it (M176). A feature moved into
 * Core is ticked, moved out is unticked, so its steps follow.
 */
export function placeCard(kit: Pick<ProjectKit, "board" | "features">, shape: ShapeId, kind: Exclude<BoardKind, "own">, id: string, lane: BoardLane): Pick<ProjectKit, "board" | "features"> {
  const ref = refOf(kind, id);
  const rest = (kit.board ?? []).filter((c) => !(c.shape === shape && c.ref === ref));
  const board = [...rest, { shape, ref, lane }].slice(-KIT_LIMITS.board.max);
  const features = kind === "feature" ? toggleFeature(kit, id, lane === "core").features : kit.features;
  return { board, features };
}

/** Take a catalog card off a shape's board (M176). A feature is unticked with it. */
export function removeCard(kit: Pick<ProjectKit, "board" | "features">, shape: ShapeId, kind: Exclude<BoardKind, "own">, id: string): Pick<ProjectKit, "board" | "features"> {
  const ref = refOf(kind, id);
  const board = (kit.board ?? []).filter((c) => !(c.shape === shape && c.ref === ref));
  const features = kind === "feature" ? toggleFeature(kit, id, false).features : kit.features;
  return { board: board.length ? board : undefined, features };
}

/** Add an own line on a lane, or move one (M176). Exploring is stored as no lane. */
export function placeIdea(kit: Pick<ProjectKit, "ideas">, shape: ShapeId, text: string, lane: BoardLane): Pick<ProjectKit, "ideas"> {
  const clean = text.trim().slice(0, KIT_LIMITS.ideas.textMax);
  if (!clean) return { ideas: kit.ideas };
  const existing = kit.ideas ?? [];
  const found = existing.find((i) => i.shape === shape && i.text === clean);
  const line: KitIdea = { ...(found ?? { shape, text: clean }), ...(lane === "exploring" ? {} : { lane }) };
  if (lane === "exploring") delete line.lane;
  const next = found ? existing.map((i) => (i === found ? line : i)) : [...existing, line];
  return { ideas: next.slice(0, KIT_LIMITS.ideas.max) };
}

/** Remove an own line (M176). */
export function removeIdea(kit: Pick<ProjectKit, "ideas">, shape: ShapeId, text: string): Pick<ProjectKit, "ideas"> {
  const next = (kit.ideas ?? []).filter((i) => !(i.shape === shape && i.text === text));
  return { ideas: next.length ? next : undefined };
}

export function isBoardLane(v: unknown): v is BoardLane {
  return typeof v === "string" && (BOARD_LANES as readonly string[]).includes(v);
}
