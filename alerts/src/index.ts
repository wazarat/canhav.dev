/**
 * The alerts worker (M123). Every minute per chain it reads the logs of
 * every address an enabled rule names since the chain's cursor, decodes
 * the events the rules ask for, writes one alert_events row per rule and
 * log (the unique key makes a replay harmless) and delivers to the
 * project's channels. Rules and channels are reloaded every five minutes.
 * One small Fly machine; see fly.toml and the README.
 */
import { neon } from "@neondatabase/serverless";
import { http, createPublicClient } from "viem";

import { deliver } from "./deliver.js";
import { ALERT_CHAINS, ALERT_LIMITS, type AlertRuleShape, type ChannelKind, decodeAlert, explorerTx } from "./kinds.js";
import { decryptSecret } from "./secrets.js";

const DATABASE_URL = process.env.DATABASE_URL;
const ALERTS_SECRET = process.env.ALERTS_SECRET;
if (!DATABASE_URL || !ALERTS_SECRET) {
  console.error("DATABASE_URL and ALERTS_SECRET are required");
  process.exit(1);
}
const sql = neon(DATABASE_URL);
const env = { resendKey: process.env.RESEND_API_KEY, from: process.env.ALERTS_FROM_EMAIL };

interface RuleRow extends AlertRuleShape {
  projectId: string;
  projectName: string;
}
interface ChannelRow {
  id: string;
  projectId: string;
  kind: ChannelKind;
  configEnc: string;
}

let rules: RuleRow[] = [];
let channels: ChannelRow[] = [];
let loadedAt = 0;

async function reload() {
  if (Date.now() - loadedAt < ALERT_LIMITS.rulesReloadMs) return;
  const r = (await sql`
    select r.id, r.project_id, r.chain_id, r.address, r.label, r.kinds, r.threshold_wei, p.draft_doc->>'name' as name
    from launchpad.alert_rules r join launchpad.projects p on p.id = r.project_id
    where r.enabled
  `) as Array<{ id: string; project_id: string; chain_id: number; address: string; label: string | null; kinds: AlertRuleShape["kinds"]; threshold_wei: string | null; name: string | null }>;
  rules = r.map((x) => ({ id: x.id, projectId: x.project_id, projectName: x.name ?? "", chainId: Number(x.chain_id), address: x.address, label: x.label, kinds: x.kinds, thresholdWei: x.threshold_wei }));
  const c = (await sql`select id, project_id, kind, config_enc from launchpad.alert_channels where enabled`) as Array<{ id: string; project_id: string; kind: ChannelKind; config_enc: string }>;
  channels = c.map((x) => ({ id: x.id, projectId: x.project_id, kind: x.kind, configEnc: x.config_enc }));
  loadedAt = Date.now();
  console.log(`[alerts] ${rules.length} rules, ${channels.length} channels`);
}

async function cursorFor(chainId: number, head: bigint): Promise<bigint> {
  const rows = (await sql`select last_block from launchpad.alert_cursors where chain_id = ${chainId}`) as Array<{ last_block: string }>;
  if (rows[0]) return BigInt(rows[0].last_block);
  // A new chain starts at the head: nothing from before the worker ran is alerted.
  await sql`insert into launchpad.alert_cursors (chain_id, last_block) values (${chainId}, ${head.toString()}) on conflict do nothing`;
  return head;
}

async function pollChain(chain: (typeof ALERT_CHAINS)[number]) {
  const mine = rules.filter((r) => r.chainId === chain.chainId);
  if (mine.length === 0) return;
  const client = createPublicClient({ transport: http(chain.rpcUrl, { timeout: 20_000 }) });
  const head = await client.getBlockNumber();
  const last = await cursorFor(chain.chainId, head);
  if (head <= last) return;
  const from = last + 1n;
  const to = head - from >= BigInt(ALERT_LIMITS.blocksPerPoll) ? from + BigInt(ALERT_LIMITS.blocksPerPoll) - 1n : head;
  const addresses = Array.from(new Set(mine.map((r) => r.address.toLowerCase() as `0x${string}`)));
  const watchGraduation = mine.some((r) => r.kinds.includes("graduation"));
  const logs = await client.getLogs({ address: watchGraduation ? [...addresses, chain.curveAddress] : addresses, fromBlock: from, toBlock: to });
  let fired = 0;
  for (const log of logs) {
    for (const rule of mine) {
      const decoded = decodeAlert(rule, log, rule.label ?? rule.projectName);
      if (!decoded || log.transactionHash === null || log.logIndex === null) continue;
      const inserted = (await sql`
        insert into launchpad.alert_events (rule_id, project_id, chain_id, tx_hash, log_index, block_number, kind, summary)
        values (${rule.id}, ${rule.projectId}, ${chain.chainId}, ${log.transactionHash}, ${log.logIndex}, ${log.blockNumber?.toString() ?? null}, ${decoded.kind}, ${JSON.stringify({ line: decoded.line, ...decoded.facts })})
        on conflict do nothing returning id
      `) as Array<{ id: string }>;
      if (!inserted[0]) continue;
      fired++;
      const text = `${decoded.line}\n${explorerTx(chain.chainId, log.transactionHash)}`;
      const subject = `CanHav alert for ${rule.projectName || rule.address}`;
      const delivered: Record<string, { ok: boolean; error?: string; at: string }> = {};
      for (const ch of channels.filter((c) => c.projectId === rule.projectId)) {
        let target: string;
        try {
          target = decryptSecret(ch.configEnc, ALERTS_SECRET!);
        } catch {
          delivered[ch.id] = { ok: false, error: "could not decrypt the channel", at: new Date().toISOString() };
          continue;
        }
        const result = await deliver(ch.kind, target, subject, text, env);
        delivered[ch.id] = { ...result, at: new Date().toISOString() };
      }
      await sql`update launchpad.alert_events set delivered = ${JSON.stringify(delivered)} where id = ${inserted[0].id}`;
    }
  }
  await sql`update launchpad.alert_cursors set last_block = ${to.toString()}, updated_at = now() where chain_id = ${chain.chainId}`;
  if (fired) console.log(`[alerts] ${chain.name} blocks ${from} to ${to}, ${fired} alerts`);
}

async function tick() {
  try {
    await reload();
  } catch (err) {
    console.error("[alerts] reload failed", (err as Error).message);
    return;
  }
  for (const chain of ALERT_CHAINS) {
    try {
      await pollChain(chain);
    } catch (err) {
      // A rate limited or slow RPC is retried next minute from the same cursor.
      console.error(`[alerts] ${chain.name} poll failed`, (err as Error).message);
    }
  }
}

console.log("[alerts] worker up");
void tick();
setInterval(() => void tick(), ALERT_LIMITS.pollMs);
