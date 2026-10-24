import { neon } from "@neondatabase/serverless";

/**
 * The host to slug lookup the middleware runs (M127). Edge safe: the neon
 * HTTP driver and a module cache of sixty seconds, so a page view costs
 * one query a minute per host at most. Only published projects answer.
 */
const TTL_MS = 60_000;
const cache = new Map<string, { slug: string | null; at: number }>();

export const OWN_HOSTS = new Set(["canhav.com", "www.canhav.com", "meet.canhav.com", "docs.canhav.com", "localhost", "127.0.0.1"]);

/** True for the hosts the app serves itself, previews included. */
export function isOwnHost(host: string): boolean {
  const h = host.split(":")[0].toLowerCase(); // copy-ok, a port separator
  return OWN_HOSTS.has(h) || h.endsWith(".vercel.app") || h.endsWith(".localhost") || h.endsWith(".canhav.com");
}

export async function slugForHost(host: string): Promise<string | null> {
  const h = host.split(":")[0].toLowerCase(); // copy-ok, a port separator
  const hit = cache.get(h);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.slug;
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  let slug: string | null = null;
  try {
    const sql = neon(url);
    // The host serves only while the project's team is on Studio+ (M134), read
    // from the subscription mirror; the dev override skips the join.
    const forced = process.env.STUDIO_PLUS_DEV_FORCE === "1" && process.env.VERCEL_ENV !== "production";
    const rows = (forced
      ? await sql`select slug from launchpad.projects where custom_domain = ${h} and status = 'published' and visibility = 'public' limit 1`
      : await sql`select p.slug from launchpad.projects p
          join launchpad.subscriptions s on s.org_id = p.org_id and s.plan = 'studio_plus'
            and (s.status = 'active' or (s.status = 'past_due' and s.period_end > now()))
          where p.custom_domain = ${h} and p.status = 'published' and p.visibility = 'public' limit 1`) as Array<{ slug: string | null }>;
    slug = rows[0]?.slug ?? null;
  } catch {
    slug = null;
  }
  cache.set(h, { slug, at: Date.now() });
  return slug;
}
