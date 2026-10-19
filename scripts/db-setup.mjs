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

// Marketing leads (Pro Services contact form). `kind` still allows "waitlist"
// for rows from the waitlist that ran until sign-up opened. Anonymous,
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

// The solutions a lead picked in the contact form (2026-10-10). Keys from
// STUDIO_PRO_SOLUTIONS in content/studio-pro.ts, null when none were picked.
await sql`
  alter table launchpad.leads add column if not exists solutions text[]
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

// Launch from a project (M19d): the studio project a launch was started
// from. Nullable, cleared if the project is deleted. entity_links cannot
// carry it because its ends are uuids and a launch is keyed by address.
await sql`
  alter table launchpad.launches
    add column if not exists project_id uuid references launchpad.projects(id) on delete set null
`;

// Two chains (M54): the chain a token launched on. Every row from before
// the column is Robinhood Chain testnet, which the default states.
await sql`
  alter table launchpad.launches
    add column if not exists chain_id integer not null default 46630
`;
await sql`
  alter table launchpad.token_designs
    add column if not exists deployed_chain_id integer
`;

await sql`
  create index if not exists launches_project_idx
    on launchpad.launches (project_id)
    where project_id is not null
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

// Agent writes (M39). agent_write_mode is the owner's choice per project:
// off, propose (changes wait for the owner) or direct. agent_rev counts the
// writes that reached a draft from outside the open editor, so an editor
// holding an older copy is refused instead of overwriting them.
await sql`
  alter table launchpad.projects
    add column if not exists agent_write_mode text not null default 'propose'
      check (agent_write_mode in ('off','propose','direct')),
    add column if not exists agent_rev int not null default 0
`;

await sql`
  alter table launchpad.token_designs
    add column if not exists agent_rev int not null default 0
`;

// Every change an agent sent through a project's MCP server, proposals and
// direct writes alike. patch is the validated change, never a whole doc.
// Rows go with their project.
await sql`
  create table if not exists launchpad.agent_changes (
    id uuid primary key default gen_random_uuid(),
    project_id uuid not null references launchpad.projects(id) on delete cascade,
    owner_id text not null,
    target text not null check (target in ('project','token_design')),
    target_id uuid not null,
    kind text not null check (kind in ('fields','build_steps','create','link')),
    patch jsonb not null,
    note text check (note is null or char_length(note) <= 400),
    status text not null check (status in ('proposed','applied','accepted','rejected','withdrawn')),
    created_at timestamptz not null default now(),
    resolved_at timestamptz,
    applied_patch jsonb
  )
`;

// M44. The part of a proposal the owner let through, possibly edited.
await sql`alter table launchpad.agent_changes add column if not exists applied_patch jsonb`;

// M82. An agent may start the linked token design; the row that records it has kind create.
// M89. An agent may link or unlink a launch; the row that records it has kind link.
await sql`alter table launchpad.agent_changes drop constraint if exists agent_changes_kind_check`;
await sql`
  alter table launchpad.agent_changes
    add constraint agent_changes_kind_check check (kind in ('fields','build_steps','create','link'))
`;

// M88. An agent may take back a waiting proposal; the row keeps the history as withdrawn.
await sql`alter table launchpad.agent_changes drop constraint if exists agent_changes_status_check`;
await sql`
  alter table launchpad.agent_changes
    add constraint agent_changes_status_check check (status in ('proposed','applied','accepted','rejected','withdrawn'))
`;

await sql`
  create index if not exists agent_changes_project_idx
    on launchpad.agent_changes (project_id, created_at desc)
`;

// M86. Agent sessions, what an agent is doing on a project right now: a
// state, a title, a message, a plan replaced whole on every report, and an
// external link. One row per run; the newest open row is the live one.
await sql`
  create table if not exists launchpad.agent_sessions (
    id uuid primary key default gen_random_uuid(),
    project_id uuid not null references launchpad.projects(id) on delete cascade,
    owner_id text not null,
    state text not null check (state in ('working','awaiting_input','done','error')),
    title text check (title is null or char_length(title) <= 120),
    message text check (message is null or char_length(message) <= 600),
    plan jsonb not null default '[]'::jsonb,
    external_url text check (external_url is null or char_length(external_url) <= 300),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  )
`;

await sql`
  create index if not exists agent_sessions_project_idx
    on launchpad.agent_sessions (project_id, updated_at desc)
`;

// Teams (M107). A record moved to a Clerk organization carries its id, and
// every member of that organization may open it. Null means personal.
await sql`alter table launchpad.projects add column if not exists org_id text`;
await sql`alter table launchpad.token_designs add column if not exists org_id text`;
await sql`alter table launchpad.launches add column if not exists org_id text`;
await sql`
  create index if not exists projects_org_idx
    on launchpad.projects (org_id, updated_at desc) where org_id is not null
`;
await sql`
  create index if not exists token_designs_org_idx
    on launchpad.token_designs (org_id, updated_at desc) where org_id is not null
`;
await sql`
  create index if not exists launches_org_idx
    on launchpad.launches (org_id, created_at desc) where org_id is not null
`;

// Private projects (M109): a published project may be private, off the
// listings and open only to its team and to anyone with the share link,
// whose token is minted at the first private publish. Slugs are names, so
// the token is what makes the link unguessable.
await sql`
  alter table launchpad.projects
    add column if not exists visibility text not null default 'public'
      check (visibility in ('public','private')),
    add column if not exists share_token text unique
`;

// Draft revisions (M110): one row per draft save, by the owner, a teammate
// or an agent, trimmed to the newest 200 per record. Recorded for every
// account; reading and restoring is Studio+.
await sql`
  create table if not exists launchpad.draft_revisions (
    id bigserial primary key,
    entity_type text not null check (entity_type in ('project','token_design')),
    entity_id uuid not null,
    rev int not null,
    doc jsonb not null,
    doc_hash text not null,
    author text not null,
    change_id uuid,
    created_at timestamptz not null default now(),
    unique (entity_type, entity_id, rev)
  )
`;
// M116: edits within five minutes merge into the newest row, which keeps its
// first created_at and carries the time of the last merge.
await sql`alter table launchpad.draft_revisions add column if not exists updated_at timestamptz`;

await sql`
  create index if not exists draft_revisions_entity_idx
    on launchpad.draft_revisions (entity_type, entity_id, rev desc)
`;

// Project keys (M111): chk_ bearer keys with read or write scope that stand
// in for OAuth on a project's MCP server and its draft export, for cloud
// agents and CI. Only the sha256 of a key is stored; the prefix is for
// display. Rows go with their project.
await sql`
  create table if not exists launchpad.project_keys (
    id uuid primary key default gen_random_uuid(),
    project_id uuid not null references launchpad.projects(id) on delete cascade,
    name text not null check (char_length(name) between 1 and 60),
    scope text not null check (scope in ('read','write')),
    key_hash text not null unique,
    prefix text not null,
    created_by text not null,
    created_at timestamptz not null default now(),
    last_used_at timestamptz,
    revoked_at timestamptz
  )
`;
await sql`
  create index if not exists project_keys_project_idx
    on launchpad.project_keys (project_id, created_at desc)
`;

// Draft runs (M112): one row per server side draft, the monthly allowance
// ledger per team (org_id is the allowance key, the account id under the
// dev override).
await sql`
  create table if not exists launchpad.draft_runs (
    id uuid primary key default gen_random_uuid(),
    org_id text not null,
    project_id uuid references launchpad.projects(id) on delete set null,
    kind text not null,
    input_tokens int not null,
    output_tokens int not null,
    created_at timestamptz not null default now()
  )
`;
await sql`
  create index if not exists draft_runs_org_month_idx
    on launchpad.draft_runs (org_id, created_at desc)
`;

// Competitor snapshots (M115): the DefiLlama protocols of one category on
// one chain, taken monthly by the cron (or inline on a cold miss), shared
// by every project in that subsector.
await sql`
  create table if not exists launchpad.competitor_snapshots (
    id uuid primary key default gen_random_uuid(),
    category text not null,
    chain text not null,
    month date not null,
    rows jsonb not null,
    fetched_at timestamptz not null default now(),
    unique (category, chain, month)
  )
`;

// Check runs (M121): one row per tool run the checks workflow posts, so
// Review reads as proof. Rows go with their project.
await sql`
  create table if not exists launchpad.check_runs (
    id uuid primary key default gen_random_uuid(),
    project_id uuid not null references launchpad.projects(id) on delete cascade,
    tool text not null check (tool in ('slither','aderyn','sourcify')),
    commit_sha text,
    run_url text,
    summary jsonb not null,
    result text not null check (result in ('pass','fail','error')),
    created_at timestamptz not null default now()
  )
`;
await sql`
  create index if not exists check_runs_project_idx
    on launchpad.check_runs (project_id, tool, created_at desc)
`;

// Studio+ subscriptions (M108). A mirror of what Clerk Billing reports over
// webhooks, one row per paying organization, so the app and the MCP servers
// know the plan without a Clerk call. raw keeps the last event for
// reconciliation.
await sql`
  create table if not exists launchpad.subscriptions (
    org_id text primary key,
    plan text not null,
    status text not null,
    seats int,
    period_end timestamptz,
    raw jsonb not null,
    updated_at timestamptz not null default now()
  )
`;

const tables = await sql`
  select table_name from information_schema.tables where table_schema = 'launchpad' order by 1
`;
console.log("launchpad schema ready. Tables:", tables.map((t) => t.table_name).join(", "));
