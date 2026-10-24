import "server-only";

import { getDb } from "@/lib/db";
import { PROSPECT_LIMITS, type Prospect, type ProspectInput, linkedinHandle, xHandle } from "@/lib/prospects";

/**
 * The prospects table (M158). Rows belong to a project and go with it.
 * Reads and writes are per project; the callers hold the session or plan
 * checks.
 */
interface Row {
  id: string;
  name: string;
  email: string | null;
  linkedin: string | null;
  x: string | null;
  contacted: boolean;
  contacted_on: string | Date | null;
  profile: number | null;
}

function fromRow(r: Row): Prospect {
  const day = r.contacted_on ? (r.contacted_on instanceof Date ? r.contacted_on.toISOString().slice(0, 10) : String(r.contacted_on).slice(0, 10)) : undefined;
  return {
    id: r.id,
    name: r.name,
    ...(r.email ? { email: r.email } : {}),
    ...(r.linkedin ? { linkedin: r.linkedin } : {}),
    ...(r.x ? { x: r.x } : {}),
    contacted: r.contacted,
    ...(r.contacted && day ? { contactedOn: day } : {}),
    ...(r.profile === 0 || r.profile === 1 ? { profile: r.profile } : {}),
  };
}

export async function listProspects(projectId: string): Promise<Prospect[]> {
  const sql = getDb();
  if (!sql) return [];
  const rows = (await sql`
    select id, name, email, linkedin, x, contacted, contacted_on, profile
    from launchpad.prospects where project_id = ${projectId} order by created_at asc
  `) as Row[];
  return rows.map(fromRow);
}

/** The same person by id, else by email, X handle or LinkedIn handle, case insensitive. */
function sameAs(input: ProspectInput, stored: Prospect): boolean {
  if (input.id) return input.id === stored.id;
  const e = input.email?.toLowerCase();
  if (e && stored.email?.toLowerCase() === e) return true;
  const x = input.x ? xHandle(input.x)?.toLowerCase() : null;
  if (x && stored.x && xHandle(stored.x)?.toLowerCase() === x) return true;
  const li = input.linkedin ? linkedinHandle(input.linkedin)?.toLowerCase() : null;
  if (li && stored.linkedin && linkedinHandle(stored.linkedin)?.toLowerCase() === li) return true;
  return false;
}

/**
 * Add or update rows. A row with an id, or whose email or handle matches a
 * stored row, updates it; the rest insert. Refused past the per project cap.
 */
export async function upsertProspects(projectId: string, createdBy: string, rows: ProspectInput[]): Promise<{ ok: true; prospects: Prospect[] } | { ok: false; message: string }> {
  const sql = getDb();
  if (!sql) return { ok: false, message: "Storage not configured." };
  const stored = await listProspects(projectId);
  const inserts = rows.filter((r) => !stored.some((s) => sameAs(r, s))).length;
  if (stored.length + inserts > PROSPECT_LIMITS.rows) return { ok: false, message: `At most ${PROSPECT_LIMITS.rows} prospects per project.` };
  for (const r of rows) {
    const hit = stored.find((s) => sameAs(r, s));
    const contactedOn = r.contacted ? (r.contactedOn ?? null) : null;
    if (hit) {
      await sql`
        update launchpad.prospects
        set name = ${r.name}, email = ${r.email ?? null}, linkedin = ${r.linkedin ?? null}, x = ${r.x ?? null},
            contacted = ${r.contacted}, contacted_on = ${contactedOn}, profile = ${r.profile ?? null}, updated_at = now()
        where id = ${hit.id} and project_id = ${projectId}
      `;
    } else {
      await sql`
        insert into launchpad.prospects (project_id, name, email, linkedin, x, contacted, contacted_on, profile, created_by)
        values (${projectId}, ${r.name}, ${r.email ?? null}, ${r.linkedin ?? null}, ${r.x ?? null}, ${r.contacted}, ${contactedOn}, ${r.profile ?? null}, ${createdBy})
      `;
    }
  }
  return { ok: true, prospects: await listProspects(projectId) };
}

export async function deleteProspect(projectId: string, id: string): Promise<boolean> {
  const sql = getDb();
  if (!sql) return false;
  const rows = await sql`delete from launchpad.prospects where id = ${id} and project_id = ${projectId} returning id`;
  return rows.length > 0;
}
