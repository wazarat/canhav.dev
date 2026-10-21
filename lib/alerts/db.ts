import "server-only";

import { ALERT_LIMITS, TEST_KIND } from "@/lib/alerts/kinds";
import type { AlertChannelView, AlertEventView, AlertRuleView, AlertStatusView } from "@/lib/alerts/schema";
import { getDb } from "@/lib/db";

/**
 * Storage for alert rules, channels and events (M123, M128). Every call is
 * scoped to a project the caller already owns (the routes and the MCP
 * server check ownership through getProject first).
 */

type RuleRow = { id: string; chain_id: number; address: string; label: string | null; kinds: AlertRuleView["kinds"]; threshold_wei: string | null; decimals: number | null; source: string | null; enabled: boolean; created_at: string | Date };
type ChannelRow = { id: string; kind: AlertChannelView["kind"]; masked: string; enabled: boolean; created_at: string | Date };
type EventRow = { id: string; rule_id: string | null; chain_id: number; tx_hash: string; kind: AlertEventView["kind"]; summary: { line?: string }; delivered: AlertEventView["delivered"]; created_at: string | Date };

export async function listAlerts(projectId: string): Promise<{ rules: AlertRuleView[]; channels: AlertChannelView[]; events: AlertEventView[]; watch: boolean; status: AlertStatusView }> {
  const sql = getDb();
  const empty = { rules: [], channels: [], events: [], watch: false, status: { workerAt: null, stale: false, chains: [] } };
  if (!sql) return empty;
  try {
    const [rules, channels, events, watch, cursors] = await Promise.all([
      sql`select id, chain_id, address, label, kinds, threshold_wei, decimals, source, enabled, created_at from launchpad.alert_rules where project_id = ${projectId} order by created_at`,
      sql`select id, kind, masked, enabled, created_at from launchpad.alert_channels where project_id = ${projectId} order by created_at`,
      sql`select id, rule_id, chain_id, tx_hash, kind, summary, delivered, created_at from launchpad.alert_events where project_id = ${projectId} order by created_at desc limit ${ALERT_LIMITS.eventsShown}`,
      sql`select 1 from launchpad.alert_watch where project_id = ${projectId}`,
      sql`select chain_id, last_block, checked_at from launchpad.alert_cursors`,
    ]);
    return {
      rules: (rules as RuleRow[]).map((r) => ({
        id: r.id, chainId: Number(r.chain_id), address: r.address, label: r.label, kinds: r.kinds, thresholdWei: r.threshold_wei, decimals: r.decimals ?? 18, source: r.source === "watch" ? "watch" : "manual", enabled: r.enabled, createdAt: new Date(r.created_at).toISOString(),
      })),
      channels: (channels as ChannelRow[]).map((c) => ({ id: c.id, kind: c.kind, masked: c.masked, enabled: c.enabled, createdAt: new Date(c.created_at).toISOString() })),
      events: (events as EventRow[]).map((e) => ({
        id: e.id, ruleId: e.rule_id, chainId: Number(e.chain_id), txHash: e.tx_hash, kind: e.kind, line: e.summary?.line ?? "", delivered: e.delivered, createdAt: new Date(e.created_at).toISOString(),
      })),
      watch: watch.length > 0,
      status: statusFromCursors(cursors as Array<{ chain_id: number; last_block: string; checked_at: string | Date | null }>),
    };
  } catch (err) {
    console.error("[alerts] list failed", err);
    return empty;
  }
}

function statusFromCursors(rows: Array<{ chain_id: number; last_block: string; checked_at: string | Date | null }>): AlertStatusView {
  const chains = rows.map((c) => ({ chainId: Number(c.chain_id), lastBlock: String(c.last_block), checkedAt: c.checked_at ? new Date(c.checked_at).toISOString() : null }));
  const newest = chains.reduce<number>((max, c) => (c.checkedAt ? Math.max(max, new Date(c.checkedAt).getTime()) : max), 0);
  return { workerAt: newest ? new Date(newest).toISOString() : null, stale: newest > 0 && Date.now() - newest > ALERT_LIMITS.heartbeatStaleMs, chains };
}

export type AlertWrite = { ok: true; id: string } | { ok: false; message: string };

/** A rule from the per address form. The limit counts manual rules only; the Watch switch's rules are bounded by the recorded contracts. */
export async function createAlertRule(input: { projectId: string; chainId: number; address: string; label: string | null; kinds: string[]; thresholdWei: string | null; decimals: number; createdBy: string }): Promise<AlertWrite> {
  const sql = getDb();
  if (!sql) return { ok: false, message: "No database." };
  try {
    const count = (await sql`select count(*)::int as n from launchpad.alert_rules where project_id = ${input.projectId} and source = 'manual'`) as Array<{ n: number }>;
    if ((count[0]?.n ?? 0) >= ALERT_LIMITS.rulesPerProject) return { ok: false, message: `Up to ${ALERT_LIMITS.rulesPerProject} rules per project.` };
    const rows = (await sql`
      insert into launchpad.alert_rules (project_id, chain_id, address, label, kinds, threshold_wei, decimals, source, created_by)
      values (${input.projectId}, ${input.chainId}, ${input.address.toLowerCase()}, ${input.label}, ${input.kinds}, ${input.thresholdWei}, ${input.decimals}, 'manual', ${input.createdBy})
      on conflict (project_id, chain_id, address) do update set label = excluded.label, kinds = excluded.kinds, threshold_wei = excluded.threshold_wei, decimals = excluded.decimals, source = 'manual', enabled = true
      returning id
    `) as Array<{ id: string }>;
    return { ok: true, id: rows[0].id };
  } catch (err) {
    console.error("[alerts] rule failed", err);
    return { ok: false, message: "Could not save the rule." };
  }
}

export async function deleteAlertRule(projectId: string, ruleId: string): Promise<boolean> {
  const sql = getDb();
  if (!sql) return false;
  try {
    await sql`delete from launchpad.alert_rules where id = ${ruleId} and project_id = ${projectId}`;
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// The Watch switch (M128)

export interface WatchRule {
  address: string;
  label: string | null;
  kinds: string[];
  thresholdWei: string | null;
  decimals: number;
}

export async function getWatch(projectId: string): Promise<boolean> {
  const sql = getDb();
  if (!sql) return false;
  try {
    const rows = await sql`select 1 from launchpad.alert_watch where project_id = ${projectId}`;
    return rows.length > 0;
  } catch {
    return false;
  }
}

export async function setWatchRow(projectId: string, enabled: boolean, createdBy: string): Promise<boolean> {
  const sql = getDb();
  if (!sql) return false;
  try {
    if (enabled) await sql`insert into launchpad.alert_watch (project_id, created_by) values (${projectId}, ${createdBy}) on conflict do nothing`;
    else await sql`delete from launchpad.alert_watch where project_id = ${projectId}`;
    return true;
  } catch (err) {
    console.error("[alerts] watch failed", err);
    return false;
  }
}

/**
 * Make the project's watch rules match the desired list: new addresses are
 * inserted, existing watch rules take the new label and kinds, a manual rule
 * for the same address is left alone, and watch rules for addresses no
 * longer recorded are deleted.
 */
export async function syncWatchRules(projectId: string, chainId: number, desired: WatchRule[], createdBy: string): Promise<boolean> {
  const sql = getDb();
  if (!sql) return false;
  try {
    const addresses = desired.map((d) => d.address.toLowerCase());
    if (addresses.length) {
      await sql`
        insert into launchpad.alert_rules (project_id, chain_id, address, label, kinds, threshold_wei, decimals, source, created_by)
        select ${projectId}, ${chainId}, a, l, string_to_array(k, ','), nullif(t, '')::numeric, d, 'watch', ${createdBy}
        from unnest(${addresses}::text[], ${desired.map((d) => d.label ?? "")}::text[], ${desired.map((d) => d.kinds.join(","))}::text[], ${desired.map((d) => d.thresholdWei ?? "")}::text[], ${desired.map((d) => d.decimals)}::int[]) as x(a, l, k, t, d)
        on conflict (project_id, chain_id, address) do update
          set label = nullif(excluded.label, ''), kinds = excluded.kinds, threshold_wei = excluded.threshold_wei, decimals = excluded.decimals, enabled = true
          where launchpad.alert_rules.source = 'watch'
      `;
      await sql`update launchpad.alert_rules set label = null where project_id = ${projectId} and source = 'watch' and label = ''`;
    }
    await sql`delete from launchpad.alert_rules where project_id = ${projectId} and source = 'watch' and not (address = any(${addresses}::text[]))`;
    return true;
  } catch (err) {
    console.error("[alerts] watch sync failed", err);
    return false;
  }
}

export async function deleteWatchRules(projectId: string): Promise<boolean> {
  const sql = getDb();
  if (!sql) return false;
  try {
    await sql`delete from launchpad.alert_rules where project_id = ${projectId} and source = 'watch'`;
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Channels

/** Adds a channel; a second one with the same kind and masked target answers the existing id. */
export async function createAlertChannel(input: { projectId: string; kind: string; configEnc: string; masked: string; createdBy: string }): Promise<AlertWrite> {
  const sql = getDb();
  if (!sql) return { ok: false, message: "No database." };
  try {
    const existing = (await sql`select id from launchpad.alert_channels where project_id = ${input.projectId} and kind = ${input.kind} and masked = ${input.masked}`) as Array<{ id: string }>;
    if (existing[0]) return { ok: true, id: existing[0].id };
    const count = (await sql`select count(*)::int as n from launchpad.alert_channels where project_id = ${input.projectId}`) as Array<{ n: number }>;
    if ((count[0]?.n ?? 0) >= ALERT_LIMITS.channelsPerProject) return { ok: false, message: `Up to ${ALERT_LIMITS.channelsPerProject} channels per project.` };
    const rows = (await sql`
      insert into launchpad.alert_channels (project_id, kind, config_enc, masked, created_by)
      values (${input.projectId}, ${input.kind}, ${input.configEnc}, ${input.masked}, ${input.createdBy})
      returning id
    `) as Array<{ id: string }>;
    return { ok: true, id: rows[0].id };
  } catch (err) {
    console.error("[alerts] channel failed", err);
    return { ok: false, message: "Could not save the channel." };
  }
}

export async function deleteAlertChannel(projectId: string, channelId: string): Promise<boolean> {
  const sql = getDb();
  if (!sql) return false;
  try {
    await sql`delete from launchpad.alert_channels where id = ${channelId} and project_id = ${projectId}`;
    return true;
  } catch {
    return false;
  }
}

export async function countChannels(projectId: string): Promise<number> {
  const sql = getDb();
  if (!sql) return 0;
  try {
    const rows = (await sql`select count(*)::int as n from launchpad.alert_channels where project_id = ${projectId}`) as Array<{ n: number }>;
    return rows[0]?.n ?? 0;
  } catch {
    return 0;
  }
}

/** The enabled channels with their sealed targets, for the test alert (M128). */
export async function listChannelsWithSecrets(projectId: string): Promise<Array<{ id: string; kind: AlertChannelView["kind"]; configEnc: string }>> {
  const sql = getDb();
  if (!sql) return [];
  try {
    const rows = (await sql`select id, kind, config_enc from launchpad.alert_channels where project_id = ${projectId} and enabled order by created_at`) as Array<{ id: string; kind: AlertChannelView["kind"]; config_enc: string }>;
    return rows.map((r) => ({ id: r.id, kind: r.kind, configEnc: r.config_enc }));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Test alerts (M128)

export async function lastTestAt(projectId: string): Promise<number> {
  const sql = getDb();
  if (!sql) return 0;
  try {
    const rows = (await sql`select max(created_at) as at from launchpad.alert_events where project_id = ${projectId} and kind = ${TEST_KIND}`) as Array<{ at: string | Date | null }>;
    return rows[0]?.at ? new Date(rows[0].at).getTime() : 0;
  } catch {
    return 0;
  }
}

export async function recordTestEvent(projectId: string, chainId: number, line: string, delivered: AlertEventView["delivered"]): Promise<string | null> {
  const sql = getDb();
  if (!sql) return null;
  try {
    const rows = (await sql`
      insert into launchpad.alert_events (rule_id, project_id, chain_id, tx_hash, log_index, kind, summary, delivered)
      values (null, ${projectId}, ${chainId}, ${`test:${crypto.randomUUID()}`}, 0, ${TEST_KIND}, ${JSON.stringify({ line })}, ${JSON.stringify(delivered)})
      returning id
    `) as Array<{ id: string }>;
    return rows[0]?.id ?? null;
  } catch (err) {
    console.error("[alerts] test event failed", err);
    return null;
  }
}
