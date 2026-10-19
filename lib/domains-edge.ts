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
    const rows = (await sql`select slug from launchpad.projects where custom_domain = ${h} and status = 'published' and visibility = 'public' limit 1`) as Array<{ slug: string | null }>;
    slug = rows[0]?.slug ?? null;
  } catch {
    slug = null;
  }
  cache.set(h, { slug, at: Date.now() });
  return slug;
}
