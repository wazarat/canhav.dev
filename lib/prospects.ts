import { z } from "zod";

/**
 * Prospects (M158, F14): the real people a team means to contact for a
 * project, beside the drafted ideal customer profiles. They live in their
 * own table, never on the draft document, so they stay out of version
 * history, publishing, exports, the drafting context and every public
 * tool; the project MCP server reads and writes them only on a signed in
 * session. Pure, client safe.
 */
export interface Prospect {
  id: string;
  name: string;
  email?: string;
  linkedin?: string;
  x?: string;
  contacted: boolean;
  /** YYYY-MM-DD, only when contacted. */
  contactedOn?: string;
  /** The ideal customer profile the person fits, 0 or 1. */
  profile?: 0 | 1;
}

export const PROSPECT_LIMITS = { rows: 100, name: { min: 1, max: 80 }, contact: { max: 200 }, upsert: { max: 20 } } as const;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LINKEDIN_URL = /^https?:\/\/(www\.)?linkedin\.com\/(in|company)\/[A-Za-z0-9_%.-]+\/?(\?.*)?$/i;
const LINKEDIN_HANDLE = /^[A-Za-z0-9_.-]{3,100}$/;
const X_URL = /^https?:\/\/(www\.)?(x|twitter)\.com\/[A-Za-z0-9_]{1,15}\/?(\?.*)?$/i;
const X_HANDLE = /^@?[A-Za-z0-9_]{1,15}$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** A LinkedIn URL or handle as the handle. */
export function linkedinHandle(v: string): string | null {
  const t = v.trim();
  if (!t) return null;
  const m = t.match(/linkedin\.com\/(?:in|company)\/([A-Za-z0-9_%.-]+)/i);
  if (m) return m[1];
  return LINKEDIN_HANDLE.test(t) ? t : null;
}

/** An X URL or handle as the bare handle. */
export function xHandle(v: string): string | null {
  const t = v.trim();
  if (!t) return null;
  const m = t.match(/(?:x|twitter)\.com\/([A-Za-z0-9_]{1,15})/i);
  if (m) return m[1];
  return X_HANDLE.test(t) ? t.replace(/^@/, "") : null;
}

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal("").transform(() => undefined));

/** One row as sent by the studio or an agent; `id` names a stored row to update. */
export const prospectInputSchema = z
  .strictObject({
    id: z.string().uuid().optional(),
    name: z.string().trim().min(PROSPECT_LIMITS.name.min).max(PROSPECT_LIMITS.name.max),
    email: optionalText(PROSPECT_LIMITS.contact.max).refine((v) => v === undefined || EMAIL.test(v), "email must look like an address"),
    linkedin: optionalText(PROSPECT_LIMITS.contact.max).refine((v) => v === undefined || LINKEDIN_URL.test(v) || LINKEDIN_HANDLE.test(v), "linkedin must be a linkedin.com URL or a handle"),
    x: optionalText(PROSPECT_LIMITS.contact.max).refine((v) => v === undefined || X_URL.test(v) || X_HANDLE.test(v), "x must be an x.com or twitter.com URL or a handle"),
    contacted: z.boolean().default(false),
    contactedOn: optionalText(10).refine((v) => v === undefined || (DAY.test(v) && !Number.isNaN(Date.parse(v))), "contactedOn must be a date as YYYY-MM-DD"),
    profile: z.union([z.literal(0), z.literal(1)]).optional(),
  })
  .refine((v) => v.contacted || v.contactedOn === undefined, { message: "contactedOn needs contacted true", path: ["contactedOn"] });

export type ProspectInput = z.infer<typeof prospectInputSchema>;

/** What an agent sends with set_prospects: rows to add or update, never a delete. */
export const prospectsPatchSchema = z.strictObject({ upsert: z.array(prospectInputSchema).min(1).max(PROSPECT_LIMITS.upsert.max) });
export type ProspectsPatch = z.infer<typeof prospectsPatchSchema>;

/** The links a row's contact cells open. */
export function contactHrefs(p: Pick<Prospect, "email" | "linkedin" | "x">): { email?: string; linkedin?: string; x?: string } {
  const li = p.linkedin ? linkedinHandle(p.linkedin) : null;
  const xh = p.x ? xHandle(p.x) : null;
  return {
    ...(p.email ? { email: `mailto:${p.email}` } : {}),
    ...(li ? { linkedin: p.linkedin && /^https?:/i.test(p.linkedin) ? p.linkedin : `https://www.linkedin.com/in/${li}` } : {}),
    ...(xh ? { x: `https://x.com/${xh}` } : {}),
  };
}

/** Today as YYYY-MM-DD in the viewer's zone, the default when Contacted turns on. */
export function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** A prospects change as one readable line for the agent feed (M158): one person per line. */
export function prospectsSummary(patch: unknown): string {
  const parsed = prospectsPatchSchema.safeParse(patch);
  if (!parsed.success) return "";
  return parsed.data.upsert
    .map((p) => {
      const contact = [p.email, p.linkedin ? linkedinHandle(p.linkedin) : null, p.x ? `@${xHandle(p.x) ?? p.x}` : null].filter(Boolean).join(", ");
      const state = p.contacted ? `contacted${p.contactedOn ? ` on ${p.contactedOn}` : ""}` : "not contacted";
      const who = p.profile === undefined ? "" : `, profile ${p.profile + 1}`;
      return `${p.name}${contact ? `, ${contact}` : ""}, ${state}${who}${p.id ? " (update)" : ""}`;
    })
    .join("\n");
}
