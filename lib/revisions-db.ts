import "server-only";

import { getDb } from "@/lib/db";
import { type IdeationDoc, canonicalizeIdeationDoc, hashIdeationDoc } from "@/lib/ideation";
import { REVISION_LIMITS, type RevisionSummary, changedKeys } from "@/lib/revisions";

/**
 * Draft revisions (M110). Every save records a row unless the document is
 * byte identical to the newest row; the table keeps the newest 200 per
 * record. Nothing here throws: a failed record never fails the save.
 */
export type RevisionEntity = "project" | "token_design";

export interface RevisionRow {
  rev: number;
  doc: IdeationDoc;
  doc_hash: string;
  author: string;
  change_id: string | null;
  created_at: string | Date;
}

export async function recordRevision(
  entityType: RevisionEntity,
  entityId: string,
  doc: IdeationDoc,
  author: string,
  changeId: string | null = null,
): Promise<number | null> {
  const sql = getDb();
  if (!sql) return null;
  try {
    const hash = hashIdeationDoc(doc);
    const newest = await sql`
      select rev, doc_hash from launchpad.draft_revisions
      where entity_type = ${entityType} and entity_id = ${entityId}
      order by rev desc limit 1
    `;
    const top = newest[0] as { rev: number; doc_hash: string } | undefined;
    if (top && top.doc_hash === hash) return top.rev;
    const rows = await sql`
      insert into launchpad.draft_revisions (entity_type, entity_id, rev, doc, doc_hash, author, change_id)
      values (${entityType}, ${entityId}, ${(top?.rev ?? 0) + 1}, ${JSON.stringify(doc)}, ${hash}, ${author}, ${changeId})
      on conflict (entity_type, entity_id, rev) do nothing
      returning rev
    `;
    const rev = (rows[0] as { rev: number } | undefined)?.rev ?? null;
    await sql`
      delete from launchpad.draft_revisions
      where entity_type = ${entityType} and entity_id = ${entityId}
        and rev <= (
          select coalesce(max(rev), 0) - ${REVISION_LIMITS.keep} from launchpad.draft_revisions
          where entity_type = ${entityType} and entity_id = ${entityId}
        )
    `;
    return rev;
  } catch (err) {
    console.error("[revisions] record failed", err);
    return null;
  }
}

/** The newest revisions with what each changed against the one before it. */
export async function listRevisions(entityType: RevisionEntity, entityId: string, limit = REVISION_LIMITS.list): Promise<RevisionSummary[]> {
  const sql = getDb();
  if (!sql) return [];
  try {
    const rows = (await sql`
      select rev, doc, author, change_id, created_at from launchpad.draft_revisions
      where entity_type = ${entityType} and entity_id = ${entityId}
      order by rev desc limit ${limit + 1}
    `) as Array<Omit<RevisionRow, "doc_hash">>;
    const out: RevisionSummary[] = [];
    for (let i = 0; i < Math.min(rows.length, limit); i++) {
      const r = rows[i];
      const prev = rows[i + 1];
      out.push({
        rev: r.rev,
        author: r.author,
        changeId: r.change_id,
        createdAt: new Date(r.created_at).toISOString(),
        changed: prev ? changedKeys(prev.doc, r.doc) : [],
      });
    }
    return out;
  } catch (err) {
    console.error("[revisions] list failed", err);
    return [];
  }
}

export async function getRevision(entityType: RevisionEntity, entityId: string, rev: number): Promise<RevisionRow | null> {
  const sql = getDb();
  if (!sql) return null;
  try {
    const rows = await sql`
      select rev, doc, doc_hash, author, change_id, created_at from launchpad.draft_revisions
      where entity_type = ${entityType} and entity_id = ${entityId} and rev = ${rev}
    `;
    return (rows[0] as RevisionRow | undefined) ?? null;
  } catch {
    return null;
  }
}

/** True when two documents are the same bytes once canonicalised. */
export function sameDoc(a: IdeationDoc, b: IdeationDoc): boolean {
  return canonicalizeIdeationDoc(a) === canonicalizeIdeationDoc(b);
}
