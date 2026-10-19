import "server-only";

import { ALERT_LIMITS } from "@/lib/alerts/kinds";
import type { AlertChannelView, AlertEventView, AlertRuleView } from "@/lib/alerts/schema";
import { getDb } from "@/lib/db";

/**
 * Storage for alert rules, channels and events (M123). Every call is
 * scoped to a project the caller already owns (the routes and the MCP
 * server check ownership through getProject first).
 */

export async function listAlerts(projectId: string): Promise<{ rules: AlertRuleView[]; channels: AlertChannelView[]; events: AlertEventView[] }> {
  const sql = getDb();
  if (!sql) return { rules: [], channels: [], events: [] };
  try {
    const [rules, channels, events] = await Promise.all([
      sql`select id, chain_id, address, label, kinds, threshold_wei, enabled, created_at from launchpad.alert_rules where project_id = ${projectId} order by created_at`,
      sql`select id, kind, masked, enabled, created_at from launchpad.alert_channels where project_id = ${projectId} order by created_at`,
      sql`select id, rule_id, chain_id, tx_hash, kind, summary, delivered, created_at from launchpad.alert_events where project_id = ${projectId} order by created_at desc limit ${ALERT_LIMITS.eventsShown}`,
    ]);
    return {
      rules: (rules as Array<{ id: string; chain_id: number; address: string; label: string | null; kinds: AlertRuleView["kinds"]; threshold_wei: string | null; enabled: boolean; created_at: string | Date }>).map((r) => ({
        id: r.id, chainId: Number(r.chain_id), address: r.address, label: r.label, kinds: r.kinds, thresholdWei: r.threshold_wei, enabled: r.enabled, createdAt: new Date(r.created_at).toISOString(),
      })),
      channels: (channels as Array<{ id: string; kind: AlertChannelView["kind"]; masked: string; enabled: boolean; created_at: string | Date }>).map((c) => ({
        id: c.id, kind: c.kind, masked: c.masked, enabled: c.enabled, createdAt: new Date(c.created_at).toISOString(),
      })),
      events: (events as Array<{ id: string; rule_id: string; chain_id: number; tx_hash: string; kind: AlertEventView["kind"]; summary: { line?: string }; delivered: AlertEventView["delivered"]; created_at: string | Date }>).map((e) => ({
        id: e.id, ruleId: e.rule_id, chainId: Number(e.chain_id), txHash: e.tx_hash, kind: e.kind, line: e.summary?.line ?? "", delivered: e.delivered, createdAt: new Date(e.created_at).toISOString(),
      })),
    };
  } catch (err) {
    console.error("[alerts] list failed", err);
    return { rules: [], channels: [], events: [] };
  }
}

export type AlertWrite = { ok: true; id: string } | { ok: false; message: string };

export async function createAlertRule(input: { projectId: string; chainId: number; address: string; label: string | null; kinds: string[]; thresholdWei: string | null; createdBy: string }): Promise<AlertWrite> {
  const sql = getDb();
  if (!sql) return { ok: false, message: "No database." };
  try {
    const count = (await sql`select count(*)::int as n from launchpad.alert_rules where project_id = ${input.projectId}`) as Array<{ n: number }>;
    if ((count[0]?.n ?? 0) >= ALERT_LIMITS.rulesPerProject) return { ok: false, message: `Up to ${ALERT_LIMITS.rulesPerProject} rules per project.` };
    const rows = (await sql`
      insert into launchpad.alert_rules (project_id, chain_id, address, label, kinds, threshold_wei, created_by)
      values (${input.projectId}, ${input.chainId}, ${input.address.toLowerCase()}, ${input.label}, ${input.kinds}, ${input.thresholdWei}, ${input.createdBy})
      on conflict (project_id, chain_id, address) do update set label = excluded.label, kinds = excluded.kinds, threshold_wei = excluded.threshold_wei, enabled = true
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

export async function createAlertChannel(input: { projectId: string; kind: string; configEnc: string; masked: string; createdBy: string }): Promise<AlertWrite> {
  const sql = getDb();
  if (!sql) return { ok: false, message: "No database." };
  try {
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
