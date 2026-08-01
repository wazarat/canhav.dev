import "server-only";

import { neon } from "@neondatabase/serverless";

/**
 * Neon client for the launchpad. The database is shared with another project —
 * everything launchpad-related lives in the `launchpad` schema (created by
 * `node --env-file=.env.local scripts/db-setup.mjs`), and no query in this app
 * may touch any other schema.
 */
export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  return neon(url);
}
