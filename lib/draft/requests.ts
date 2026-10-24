import { DRAFT_KIND_FEATURES, type DraftKind, isDraftKind } from "@/lib/draft/limits";

/**
 * Agent-first drafting (M117). A Draft click queues a request on the
 * project; the connected IDE agent reads it first on its next call and
 * writes the field; the server draft is the fallback. Both the queue and
 * who drafted a field live on the draft and never publish. Pure.
 */
export interface DraftRequest {
  kind: DraftKind;
  /** The part of the field this request is about (M141), the canvas block for canvas_block. Requests are keyed by kind and target. */
  target?: string;
  body?: Record<string, unknown>;
  requestedAt: string;
  requestedBy: string;
}

/** The key two requests are the same under. */
export function requestKey(kind: DraftKind, target?: string): string {
  return target ? `${kind}:${target}` : kind;
}

export interface DraftedMark {
  by: "agent" | "canhav";
  at: string;
}

export type Drafted = Partial<Record<DraftKind, DraftedMark>>;

export const DRAFT_REQUEST_LIMITS = { open: 10 } as const;

/** The record field each kind writes, as update_project names it. Null for kinds that write elsewhere. */
export const DRAFT_KIND_FIELDS: Record<DraftKind, string | null> = {
  canvas: "canvas",
  canvas_block: "canvas",
  icp: "icp",
  value_canvas: "valueCanvas",
  competitors: "competitors",
  brand: "brand",
  onepager: "investorPack",
  deck: "investorPack",
  grants: "investorPack",
  weekly: null,
};

/** How the agent answers a request: the field on update_project, or the tool for kinds that write elsewhere. A canvas block request names its block (M141). */
export function draftWriteHint(kind: DraftKind, target?: string): string {
  const field = DRAFT_KIND_FIELDS[kind];
  if (kind === "canvas_block" && target) return `Write the ${target} block of the canvas field through update_project; that clears this request.`;
  if (kind === "value_canvas") return `Write valueCanvas.${target ?? "0"} (the six areas for profile ${Number(target ?? 0) + 1}) through update_project; that clears this request.`;
  if (kind === "onepager" || kind === "deck" || kind === "grants") return `Write investorPack.${kind === "onepager" ? "onepager" : kind} through update_project; that clears this request.`;
  return field ? `Write the ${field} field through update_project; that clears this request.` : "Write it with set_weekly_update; that clears this request.";
}

/** The MCP prompt a kind maps to, listed as a slash command by Claude Code. */
export function draftPromptName(kind: DraftKind): string {
  const base = kind === "canvas_block" ? "canvas" : kind === "onepager" || kind === "deck" || kind === "grants" ? "pack" : kind;
  return `draft_${base}`;
}

export function normalizeDraftRequests(raw: unknown): DraftRequest[] | null {
  if (!Array.isArray(raw)) return null;
  const out: DraftRequest[] = [];
  const seen = new Set<string>();
  for (const r of raw) {
    if (!r || typeof r !== "object") continue;
    const o = r as Record<string, unknown>;
    if (!isDraftKind(o.kind)) continue;
    const target = typeof o.target === "string" && o.target.trim() ? o.target.trim().slice(0, 40) : undefined;
    const key = requestKey(o.kind, target);
    if (seen.has(key)) continue;
    const at = typeof o.requestedAt === "string" && !Number.isNaN(Date.parse(o.requestedAt)) ? o.requestedAt : new Date().toISOString();
    seen.add(key);
    out.push({
      kind: o.kind,
      ...(target ? { target } : {}),
      ...(o.body && typeof o.body === "object" && !Array.isArray(o.body) ? { body: o.body as Record<string, unknown> } : {}),
      requestedAt: at,
      requestedBy: typeof o.requestedBy === "string" ? o.requestedBy.slice(0, 80) : "owner",
    });
    if (out.length >= DRAFT_REQUEST_LIMITS.open) break;
  }
  return out.length ? out : null;
}

export function normalizeDrafted(raw: unknown): Drafted | null {
  if (!raw || typeof raw !== "object") return null;
  const out: Drafted = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!isDraftKind(k) || !v || typeof v !== "object") continue;
    const m = v as { by?: unknown; at?: unknown };
    if (m.by !== "agent" && m.by !== "canhav") continue;
    out[k] = { by: m.by, at: typeof m.at === "string" && !Number.isNaN(Date.parse(m.at)) ? m.at : new Date().toISOString() };
  }
  return Object.keys(out).length ? out : null;
}

/** The open requests, oldest first. */
export function openRequests(doc: { draftRequests?: DraftRequest[] }): DraftRequest[] {
  return [...(doc.draftRequests ?? [])].sort((a, b) => a.requestedAt.localeCompare(b.requestedAt));
}

/** Queue a request for a kind and target, replacing an older one with the same key (M141). */
export function withRequest(doc: { draftRequests?: DraftRequest[] }, kind: DraftKind, body: Record<string, unknown> | undefined, by: string, target?: string): DraftRequest[] {
  const key = requestKey(kind, target);
  const rest = (doc.draftRequests ?? []).filter((r) => requestKey(r.kind, r.target) !== key);
  const next: DraftRequest = { kind, ...(target ? { target } : {}), ...(body && Object.keys(body).length ? { body } : {}), requestedAt: new Date().toISOString(), requestedBy: by };
  return [...rest, next].slice(-DRAFT_REQUEST_LIMITS.open);
}

/** The open request for a kind and target, if any. */
export function findRequest(doc: { draftRequests?: DraftRequest[] }, kind: DraftKind, target?: string): DraftRequest | undefined {
  const key = requestKey(kind, target);
  return (doc.draftRequests ?? []).find((r) => requestKey(r.kind, r.target) === key);
}

/**
 * Drop the request for a kind and target. Without a target every request
 * of the kind goes, so writing the whole canvas clears every block request.
 */
export function withoutRequest(doc: { draftRequests?: DraftRequest[] }, kind: DraftKind, target?: string): DraftRequest[] | undefined {
  const rest = (doc.draftRequests ?? []).filter((r) => (target ? requestKey(r.kind, r.target) !== requestKey(kind, target) : r.kind !== kind));
  return rest.length ? rest : undefined;
}

/**
 * The kinds a patch answers (M141). A canvas write answers the canvas and
 * every canvas block; an investorPack write answers only the parts it
 * carries, so a deck alone leaves the one pager request open.
 */
export function kindsForPatch(patch: Record<string, unknown>): DraftKind[] {
  const out: DraftKind[] = [];
  const has = (k: string) => patch[k] !== undefined;
  if (has("canvas")) out.push("canvas", "canvas_block");
  if (has("icp")) out.push("icp");
  if (has("valueCanvas")) out.push("value_canvas");
  if (has("competitors")) out.push("competitors");
  if (has("brand")) out.push("brand");
  const pack = patch.investorPack;
  if (pack && typeof pack === "object") {
    const p = pack as Record<string, unknown>;
    if (p.onepager !== undefined) out.push("onepager");
    if (p.deck !== undefined) out.push("deck");
    if (p.grants !== undefined) out.push("grants");
  } else if (pack === null) out.push("onepager", "deck", "grants");
  return out;
}

export function withDrafted(doc: { drafted?: Drafted }, kind: DraftKind, by: DraftedMark["by"]): Drafted {
  return { ...(doc.drafted ?? {}), [kind]: { by, at: new Date().toISOString() } };
}

/** The Studio+ feature a request's kind belongs to. */
export function requestFeature(kind: DraftKind) {
  return DRAFT_KIND_FEATURES[kind];
}
