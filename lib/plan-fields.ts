import { STUDIO_PLUS_COPY } from "@/content/studio-plus";
import type { ProjectDoc } from "@/lib/ideation";
import type { PlusFeature } from "@/lib/plan-shared";

/**
 * The record fields that belong to Studio+ (M134). Pure and client safe,
 * read by the agent write path, the studio autosave, publish, the public
 * readers, the exports and the MCP tools, so one list decides what a free
 * team cannot write, read back, publish or serve.
 */
export const PLUS_DOC_FIELDS = {
  canvas: "bmc",
  icp: "icp",
  valueCanvas: "icp",
  competitors: "competitors",
  brand: "brand",
  investorPack: "investor_pack",
  updateCadence: "weekly_update",
} as const satisfies Partial<Record<keyof ProjectDoc, PlusFeature>>;

export type PlusDocField = keyof typeof PLUS_DOC_FIELDS;

const PLUS_KEYS = Object.keys(PLUS_DOC_FIELDS) as PlusDocField[];
/** The draft bookkeeping of the paid drafts, stripped with them. */
const PLUS_SIDE_KEYS = ["draftRequests", "drafted", "briefs"] as const;

export function isPlusDocField(key: string): key is PlusDocField {
  return (PLUS_KEYS as readonly string[]).includes(key);
}

/** The Studio+ fields a patch touches, in field order. */
export function plusFieldsIn(patch: object): PlusDocField[] {
  const keys = new Set(Object.keys(patch).filter((k) => (patch as Record<string, unknown>)[k] !== undefined));
  return PLUS_KEYS.filter((k) => keys.has(k));
}

/** The document without its Studio+ fields and the draft bookkeeping that goes with them. */
export function stripPlusFields<T extends Partial<ProjectDoc>>(doc: T): T {
  const out = { ...doc } as unknown as Record<string, unknown>;
  for (const k of [...PLUS_KEYS, ...PLUS_SIDE_KEYS]) delete out[k];
  return out as unknown as T;
}

/**
 * An incoming draft with the stored Studio+ fields put back (M134), for a
 * save from a team that is not on the plan: the editor hides those
 * sections, so a save must never delete what an earlier plan wrote.
 */
export function keepStoredPlusFields(incoming: ProjectDoc, held: ProjectDoc): ProjectDoc {
  const out = stripPlusFields(incoming) as unknown as Record<string, unknown>;
  for (const k of [...PLUS_KEYS, ...PLUS_SIDE_KEYS]) {
    const v = (held as unknown as Record<string, unknown>)[k];
    if (v !== undefined) out[k] = v;
  }
  return out as unknown as ProjectDoc;
}

/** The sentence refusing a patch that touches Studio+ fields on a team without the plan, or null. */
export function plusFieldProblem(patch: object, plus: boolean): string | null {
  if (plus) return null;
  const fields = plusFieldsIn(patch);
  return fields.length ? STUDIO_PLUS_COPY.gate.fields(fields) : null;
}
