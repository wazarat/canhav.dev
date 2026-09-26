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

// Milestone progress updates, content-addressed like journeys: update_hash =
// keccak256 of the canonical JSON bytes, also anchored on-chain via the
// JourneyUpdates contract event.
await sql`
  create table if not exists launchpad.milestone_updates (
    update_hash text primary key check (update_hash ~ '^0x[0-9a-f]{64}$'),
    token_address text not null check (token_address ~ '^0x[0-9a-f]{40}$'),
    milestone_index int not null check (milestone_index between 0 and 4),
    author_address text not null check (author_address ~ '^0x[0-9a-f]{40}$'),
    doc jsonb not null,
    canonical text not null,
    created_at timestamptz not null default now()
  )
`;

await sql`
  create index if not exists milestone_updates_token_idx
    on launchpad.milestone_updates (token_address, milestone_index, created_at)
`;

// ---------------------------------------------------------------------------
// Ideation tracks: mutable drafts owned by a Clerk account (owner_id = the
// Clerk user id, a `user_…` string — no FK, auth lives in Clerk, data lives
// here). slug is assigned at first publish and immutable after (public URL
// contract). verify_wallet is declared by the team (unproven);
// deployed_by_wallet is captured from an actual deploy and corroborated by
// the indexer.

await sql`
  create table if not exists launchpad.projects (
    id uuid primary key default gen_random_uuid(),
    owner_id text not null,
    slug text unique check (slug ~ '^[a-z0-9][a-z0-9-]{2,59}$'),
    status text not null default 'draft' check (status in ('draft','published')),
    draft_doc jsonb not null,
    published_hash text check (published_hash ~ '^0x[0-9a-f]{64}$'),
    verify_wallet text check (verify_wallet ~ '^0x[0-9a-f]{40}$'),
    github_repo text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  )
`;

await sql`
  create index if not exists projects_owner_idx
    on launchpad.projects (owner_id, updated_at desc)
`;

await sql`
  create index if not exists projects_published_idx
    on launchpad.projects (updated_at desc) where status = 'published'
`;

await sql`
  create table if not exists launchpad.token_designs (
    id uuid primary key default gen_random_uuid(),
    owner_id text not null,
    slug text unique check (slug ~ '^[a-z0-9][a-z0-9-]{2,59}$'),
    status text not null default 'draft' check (status in ('draft','published')),
    draft_doc jsonb not null,
    published_hash text check (published_hash ~ '^0x[0-9a-f]{64}$'),
    verify_wallet text check (verify_wallet ~ '^0x[0-9a-f]{40}$'),
    deployed_token_address text unique check (deployed_token_address ~ '^0x[0-9a-f]{40}$'),
    deployed_by_wallet text check (deployed_by_wallet ~ '^0x[0-9a-f]{40}$'),
    deployed_snapshot_hash text check (deployed_snapshot_hash ~ '^0x[0-9a-f]{64}$'),
    deployed_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  )
`;

await sql`
  create index if not exists token_designs_owner_idx
    on launchpad.token_designs (owner_id, updated_at desc)
`;

await sql`
  create index if not exists token_designs_published_idx
    on launchpad.token_designs (updated_at desc) where status = 'published'
`;

// Publish snapshots, content-addressed like journeys: snapshot_hash =
// keccak256 of the canonical JSON bytes. Docs embed kind + slug +
// publishVersion, so a hash is globally unique across entity types and
// versions. Insert-only — a deployed token may have committed a snapshot
// hash on-chain forever, so rows are never deleted, even on unpublish.
await sql`
  create table if not exists launchpad.ideation_snapshots (
    snapshot_hash text primary key check (snapshot_hash ~ '^0x[0-9a-f]{64}$'),
    entity_type text not null check (entity_type in ('project','token_design')),
    entity_id uuid not null,
    version int not null check (version >= 1),
    doc jsonb not null,
    canonical text not null,
    created_at timestamptz not null default now(),
    unique (entity_type, entity_id, version)
  )
`;

// Type-agnostic link rows (a future Agents track adds a type, not a table).
// The ordering check gives every pair one canonical row. Today's one-to-one
// cardinality is enforced by the two partial unique indexes below — relaxing
// to one-to-many later is `drop index`, not a migration.
await sql`
  create table if not exists launchpad.entity_links (
    id uuid primary key default gen_random_uuid(),
    a_type text not null,
    a_id uuid not null,
    b_type text not null,
    b_id uuid not null,
    created_by text not null,
    created_at timestamptz not null default now(),
    check (a_type < b_type or (a_type = b_type and a_id < b_id)),
    unique (a_type, a_id, b_type, b_id)
  )
`;

await sql`
  create unique index if not exists links_one_token_per_project
    on launchpad.entity_links (a_id) where a_type = 'project' and b_type = 'token_design'
`;

await sql`
  create unique index if not exists links_one_project_per_token
    on launchpad.entity_links (b_id) where a_type = 'project' and b_type = 'token_design'
`;

// Marketing leads (For Teams contact form + waitlist). Anonymous,
// insert-only, one table discriminated by `kind`. No IP address on purpose
// (no consent/retention story for it); user_agent is kept, coarse, for
// spotting bot bursts. Repeat contacts from one email are legitimate, so
// there is no unique constraint on email.
await sql`
  create table if not exists launchpad.leads (
    id uuid primary key default gen_random_uuid(),
    kind text not null check (kind in ('contact','waitlist')),
    full_name text check (char_length(full_name) between 1 and 120),
    email text not null check (email = lower(email) and char_length(email) <= 254),
    lead_type text check (lead_type in ('individual','team')),
    comments text check (char_length(comments) <= 2000),
    source_page text check (char_length(source_page) <= 64),
    user_agent text check (char_length(user_agent) <= 512),
    created_at timestamptz not null default now(),
    check (kind <> 'contact' or (full_name is not null and lead_type is not null))
  )
`;

await sql`
  create index if not exists leads_created_idx
    on launchpad.leads (created_at desc)
`;

// Owner columns were uuid when the tables were first created (Supabase-era
// scaffolding, never used); Clerk ids are `user_…` strings. Idempotent — a
// text→text alter is a no-op rewrite of zero rows.
await sql`
  alter table launchpad.projects alter column owner_id type text using owner_id::text
`;
await sql`
  alter table launchpad.token_designs alter column owner_id type text using owner_id::text
`;
await sql`
  alter table launchpad.entity_links alter column created_by type text using created_by::text
`;

// Quick-launch ownership: links a deployed token to the Clerk account that
// was signed in at launch time, so the MCP get_my_launches tool can list
// launches that have no design record. creator_address is always the indexed
// TokenLaunched creator (server-verified), never a client value.
await sql`
  create table if not exists launchpad.launches (
    token_address text primary key check (token_address = lower(token_address)),
    owner_id text not null,
    creator_address text not null check (creator_address = lower(creator_address)),
    tx_hash text check (tx_hash is null or char_length(tx_hash) = 66),
    created_at timestamptz not null default now()
  )
`;

await sql`
  create index if not exists launches_owner_idx
    on launchpad.launches (owner_id, created_at desc)
`;

// Launch metadata the chain only carries as a hash. description is the exact
// string whose keccak256 is the on-chain descriptionHash, stored before the
// launch tx like journeys are. telegram is not committed on-chain and is
// shown best-effort. Insert-only: first write wins, so knowing a public
// description cannot be used to overwrite a creator's Telegram link. The
// length limits mirror LAUNCH_FORM in content/launch.ts (256, 5 to 32).
await sql`
  create table if not exists launchpad.token_metadata (
    description_hash text not null check (description_hash ~ '^0x[0-9a-f]{64}$'),
    creator_address text not null check (creator_address ~ '^0x[0-9a-f]{40}$'),
    description text not null check (char_length(description) between 1 and 256),
    telegram text check (telegram is null or telegram ~ '^[A-Za-z0-9_]{5,32}$'),
    created_at timestamptz not null default now(),
    primary key (description_hash, creator_address)
  )
`;

await sql`
  create index if not exists token_metadata_creator_idx
    on launchpad.token_metadata (creator_address, created_at desc)
`;

const tables = await sql`
  select table_name from information_schema.tables where table_schema = 'launchpad' order by 1
`;
console.log("launchpad schema ready. Tables:", tables.map((t) => t.table_name).join(", "));
