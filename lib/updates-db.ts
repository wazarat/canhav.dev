import "server-only";

import { getDb } from "@/lib/db";
import { DEFAULT_CADENCE, type ProjectUpdate, UPDATE_LIMITS, type UpdateCadence, type UpdateHighlight, highlightSchema, isUpdateCadence, periodOf, toHighlight } from "@/lib/updates";

/** Storage for team updates (M124, the kind is still called weekly). Rows go with their project; the routes check ownership first. */

interface Row {
  id: string;
  week_of: string | Date;
  body: string;
  highlights: string[] | null;
  /** The highlights with milestones (M174), null on older rows. */
  highlight_items?: unknown;
  cadence?: string | null;
  status: "draft" | "published";
  author: string;
  created_at: string | Date;
  updated_at: string | Date;
  published_at: string | Date | null;
}

function isoDate(v: string | Date): string {
  return typeof v === "string" ? v.slice(0, 10) : v.toISOString().slice(0, 10);
}

/** The stored items, or the texts with no milestone on a row from before M174. */
function itemsOf(r: Row): UpdateHighlight[] {
  if (Array.isArray(r.highlight_items)) {
    const out: UpdateHighlight[] = [];
    for (const v of r.highlight_items) {
      const p = highlightSchema.safeParse(v);
      if (p.success) out.push(toHighlight(p.data));
    }
    return out;
  }
  return (r.highlights ?? []).map((text) => ({ text, milestone: null }));
}

function map(r: Row): ProjectUpdate {
  return {
    id: r.id,
    weekOf: isoDate(r.week_of),
    body: r.body,
    highlights: r.highlights ?? [],
    highlightItems: itemsOf(r),
    cadence: isUpdateCadence(r.cadence) ? r.cadence : DEFAULT_CADENCE,
    status: r.status,
    author: r.author,
    createdAt: new Date(r.created_at).toISOString(),
    updatedAt: new Date(r.updated_at).toISOString(),
    publishedAt: r.published_at ? new Date(r.published_at).toISOString() : null,
  };
}

export async function listUpdates(projectId: string, publishedOnly = false): Promise<ProjectUpdate[]> {
  const sql = getDb();
  if (!sql) return [];
  try {
    const rows = publishedOnly
      ? await sql`select * from launchpad.project_updates where project_id = ${projectId} and status = 'published' order by week_of desc limit ${UPDATE_LIMITS.shown}`
      : await sql`select * from launchpad.project_updates where project_id = ${projectId} order by week_of desc limit ${UPDATE_LIMITS.shown}`;
    return (rows as Row[]).map(map);
  } catch (err) {
    console.error("[updates] list failed", err);
    return [];
  }
}

/** Write or replace the week's row; a published row goes back to draft when its body changes. */
export async function upsertUpdate(input: { projectId: string; weekOf?: string; cadence?: UpdateCadence; body: string; highlights?: UpdateHighlight[]; author: string; source?: Record<string, unknown> | null }): Promise<ProjectUpdate | null> {
  const sql = getDb();
  if (!sql) return null;
  const cadence = input.cadence ?? DEFAULT_CADENCE;
  const week = input.weekOf ?? periodOf(cadence);
  const items = input.highlights ?? [];
  try {
    const rows = await sql`
      insert into launchpad.project_updates (project_id, week_of, cadence, body, highlights, highlight_items, status, author, source)
      values (${input.projectId}, ${week}, ${cadence}, ${input.body}, ${items.map((h) => h.text)}, ${JSON.stringify(items)}, 'draft', ${input.author}, ${input.source ? JSON.stringify(input.source) : null})
      on conflict (project_id, week_of) do update
        set body = excluded.body, highlights = excluded.highlights, highlight_items = excluded.highlight_items, cadence = excluded.cadence, author = excluded.author, source = excluded.source,
            status = case when launchpad.project_updates.body = excluded.body then launchpad.project_updates.status else 'draft' end,
            updated_at = now()
      returning *
    `;
    return rows[0] ? map(rows[0] as Row) : null;
  } catch (err) {
    console.error("[updates] upsert failed", err);
    return null;
  }
}

export async function publishUpdate(projectId: string, id: string): Promise<ProjectUpdate | null> {
  const sql = getDb();
  if (!sql) return null;
  try {
    const rows = await sql`
      update launchpad.project_updates set status = 'published', published_at = coalesce(published_at, now()), updated_at = now()
      where id = ${id} and project_id = ${projectId} returning *
    `;
    return rows[0] ? map(rows[0] as Row) : null;
  } catch (err) {
    console.error("[updates] publish failed", err);
    return null;
  }
}

export async function deleteUpdate(projectId: string, id: string): Promise<boolean> {
  const sql = getDb();
  if (!sql) return false;
  try {
    await sql`delete from launchpad.project_updates where id = ${id} and project_id = ${projectId}`;
    return true;
  } catch {
    return false;
  }
}

/** The period's activity for the draft: sessions, changes and check runs since its start. */
export async function weekActivity(projectId: string, since = `${periodOf(DEFAULT_CADENCE)}T00:00:00Z`): Promise<{ sessions: Array<{ title: string | null; message: string | null; at: string }>; changes: Array<{ kind: string; note: string | null; status: string; at: string }>; checks: Array<{ tool: string; result: string; at: string }>; revisions: Array<{ author: string; at: string }> }> {
  const sql = getDb();
  if (!sql) return { sessions: [], changes: [], checks: [], revisions: [] };
  try {
    const [s, c, k, v] = await Promise.all([
      sql`select title, message, updated_at from launchpad.agent_sessions where project_id = ${projectId} and updated_at >= ${since} order by updated_at desc limit 10`,
      sql`select kind, note, status, created_at from launchpad.agent_changes where project_id = ${projectId} and created_at >= ${since} order by created_at desc limit 30`,
      sql`select tool, result, created_at from launchpad.check_runs where project_id = ${projectId} and created_at >= ${since} order by created_at desc limit 10`,
      // The version history (M110), who saved the record in the period (M174).
      sql`select author, created_at from launchpad.draft_revisions where entity_type = 'project' and entity_id = ${projectId} and created_at >= ${since} order by created_at desc limit 20`,
    ]);
    return {
      sessions: (s as Array<{ title: string | null; message: string | null; updated_at: string | Date }>).map((r) => ({ title: r.title, message: r.message, at: new Date(r.updated_at).toISOString() })),
      changes: (c as Array<{ kind: string; note: string | null; status: string; created_at: string | Date }>).map((r) => ({ kind: r.kind, note: r.note, status: r.status, at: new Date(r.created_at).toISOString() })),
      checks: (k as Array<{ tool: string; result: string; created_at: string | Date }>).map((r) => ({ tool: r.tool, result: r.result, at: new Date(r.created_at).toISOString() })),
      revisions: (v as Array<{ author: string; created_at: string | Date }>).map((r) => ({ author: r.author, at: new Date(r.created_at).toISOString() })),
    };
  } catch (err) {
    console.error("[updates] activity failed", err);
    return { sessions: [], changes: [], checks: [], revisions: [] };
  }
}
