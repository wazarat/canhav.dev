/**
 * Idempotent launchpad DB setup. The Neon database is shared with another
 * project, so everything lives in a dedicated `launchpad` schema — this script
 * never touches `public` or any other schema.
 *
 * Run: node --env-file=.env.local scripts/db-setup.mjs
 */
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set. Run: npx vercel env pull .env.local --environment=preview");
  process.exit(1);
}

const sql = neon(url);

const before = await sql`
  select current_database() as db,
    (select count(*)::int from information_schema.tables where table_schema = 'public') as public_tables
`;
console.log(`Connected to ${before[0].db} (public schema has ${before[0].public_tables} tables — untouched)`);

await sql`create schema if not exists launchpad`;

// Journey documents, content-addressed: journey_hash = keccak256 of the
// canonical JSON bytes. The hash is the primary key, so re-publishing the
// identical document is a no-op and nothing is ever overwritten.
await sql`
  create table if not exists launchpad.journeys (
    journey_hash text primary key check (journey_hash ~ '^0x[0-9a-f]{64}$'),
    creator_address text not null check (creator_address ~ '^0x[0-9a-f]{40}$'),
    doc jsonb not null,
    canonical text not null,
    created_at timestamptz not null default now()
  )
`;

await sql`
  create index if not exists journeys_creator_idx
    on launchpad.journeys (creator_address, created_at desc)
`;

const tables = await sql`
  select table_name from information_schema.tables where table_schema = 'launchpad' order by 1
`;
console.log("launchpad schema ready. Tables:", tables.map((t) => t.table_name).join(", "));
