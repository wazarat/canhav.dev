/** Version history limits and labels (M110). Pure. */
export const REVISION_LIMITS = {
  /** Rows kept per record; older ones are trimmed after each insert. */
  keep: 200,
  /** Rows a list returns. */
  list: 50,
} as const;

/** What a revision row reads as, without its document. */
export interface RevisionSummary {
  rev: number;
  /** owner, agent, member:<userId> or restore:<rev>. */
  author: string;
  changeId: string | null;
  createdAt: string;
  /** Top level fields that differ from the revision before it. */
  changed: string[];
}

/** The top level keys whose JSON differs between two documents. */
export function changedKeys(before: unknown, after: unknown): string[] {
  const a = (before && typeof before === "object" ? before : {}) as Record<string, unknown>;
  const b = (after && typeof after === "object" ? after : {}) as Record<string, unknown>;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  const out: string[] = [];
  for (const k of keys) if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) out.push(k);
  return out.sort();
}

/** The author label a row carries, from who saved. */
export function revisionAuthor(kind: "owner" | "agent" | "restore", detail?: string | number): string {
  if (kind === "owner") return detail ? `member:${detail}` : "owner";
  if (kind === "restore") return `restore:${detail}`;
  return "agent";
}
