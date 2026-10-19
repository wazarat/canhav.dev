import { DRAFT_KIND_FEATURES, type DraftKind, isDraftKind } from "@/lib/draft/limits";

/**
 * Agent-first drafting (M117). A Draft click queues a request on the
 * project; the connected IDE agent reads it first on its next call and
 * writes the field; the server draft is the fallback. Both the queue and
 * who drafted a field live on the draft and never publish. Pure.
 */
export interface DraftRequest {
  kind: DraftKind;
  body?: Record<string, unknown>;
  requestedAt: string;
  requestedBy: string;
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
  competitors: "competitors",
  brand: "brand",
  onepager: "investorPack",
  deck: "investorPack",
  grants: "investorPack",
  weekly: null,
};

/** How the agent answers a request: the field on update_project, or the tool for kinds that write elsewhere. */
export function draftWriteHint(kind: DraftKind): string {
  const field = DRAFT_KIND_FIELDS[kind];
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
    if (!isDraftKind(o.kind) || seen.has(o.kind)) continue;
    const at = typeof o.requestedAt === "string" && !Number.isNaN(Date.parse(o.requestedAt)) ? o.requestedAt : new Date().toISOString();
    seen.add(o.kind);
    out.push({
      kind: o.kind,
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

/** Queue a request for a kind, replacing an older one of the same kind. */
export function withRequest(doc: { draftRequests?: DraftRequest[] }, kind: DraftKind, body: Record<string, unknown> | undefined, by: string): DraftRequest[] {
  const rest = (doc.draftRequests ?? []).filter((r) => r.kind !== kind);
  const next: DraftRequest = { kind, ...(body && Object.keys(body).length ? { body } : {}), requestedAt: new Date().toISOString(), requestedBy: by };
  return [...rest, next].slice(-DRAFT_REQUEST_LIMITS.open);
}

export function withoutRequest(doc: { draftRequests?: DraftRequest[] }, kind: DraftKind): DraftRequest[] | undefined {
  const rest = (doc.draftRequests ?? []).filter((r) => r.kind !== kind);
  return rest.length ? rest : undefined;
}

/** The kinds a patch of these field names answers. */
export function kindsForFields(fields: readonly string[]): DraftKind[] {
  const out: DraftKind[] = [];
  for (const [kind, field] of Object.entries(DRAFT_KIND_FIELDS) as Array<[DraftKind, string | null]>) if (field && fields.includes(field)) out.push(kind);
  return out;
}

export function withDrafted(doc: { drafted?: Drafted }, kind: DraftKind, by: DraftedMark["by"]): Drafted {
  return { ...(doc.drafted ?? {}), [kind]: { by, at: new Date().toISOString() } };
}

/** The Studio+ feature a request's kind belongs to. */
export function requestFeature(kind: DraftKind) {
  return DRAFT_KIND_FEATURES[kind];
}
