/**
 * The alerts worker (M123, simplified in M128). Every minute it reloads the
 * enabled rules and channels (so a change in the studio is live within a
 * minute), then per chain reads the logs of every address a rule names
 * since the chain's cursor, decodes the events the rules ask for, writes one
 * alert_events row per rule and log (the unique key makes a replay
 * harmless) and delivers to the project's channels. Every poll stamps
 * checked_at on the chain's cursor, which the studio reads as the heartbeat.
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
const env = { resendKey: process.env.RESEND_API_KEY, from: process.env.ALERTS_FROM_EMAIL, telegramToken: process.env.TELEGRAM_BOT_TOKEN };

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

async function reload() {
  const r = (await sql`
    select r.id, r.project_id, r.chain_id, r.address, r.label, r.kinds, r.threshold_wei, r.decimals, p.draft_doc->>'name' as name
    from launchpad.alert_rules r join launchpad.projects p on p.id = r.project_id
    where r.enabled
  `) as Array<{ id: string; project_id: string; chain_id: number; address: string; label: string | null; kinds: AlertRuleShape["kinds"]; threshold_wei: string | null; decimals: number | null; name: string | null }>;
  const next = r.map((x) => ({ id: x.id, projectId: x.project_id, projectName: x.name ?? "", chainId: Number(x.chain_id), address: x.address, label: x.label, kinds: x.kinds, thresholdWei: x.threshold_wei, decimals: x.decimals ?? 18 }));
  const c = (await sql`select id, project_id, kind, config_enc from launchpad.alert_channels where enabled`) as Array<{ id: string; project_id: string; kind: ChannelKind; config_enc: string }>;
  const nextChannels = c.map((x) => ({ id: x.id, projectId: x.project_id, kind: x.kind, configEnc: x.config_enc }));
  if (next.length !== rules.length || nextChannels.length !== channels.length) console.log(`[alerts] ${next.length} rules, ${nextChannels.length} channels`);
  rules = next;
  channels = nextChannels;
}

/** The chain's cursor, created at the head the first time the chain is seen. */
async function cursorFor(chainId: number, head: bigint): Promise<bigint> {
  const rows = (await sql`select last_block from launchpad.alert_cursors where chain_id = ${chainId}`) as Array<{ last_block: string }>;
  if (rows[0]) return BigInt(rows[0].last_block);
  await sql`insert into launchpad.alert_cursors (chain_id, last_block, checked_at) values (${chainId}, ${head.toString()}, now()) on conflict do nothing`;
  return head;
}

async function pollChain(chain: (typeof ALERT_CHAINS)[number]) {
  const mine = rules.filter((r) => r.chainId === chain.chainId);
  const client = createPublicClient({ transport: http(chain.rpcUrl, { timeout: 20_000 }) });
  const head = await client.getBlockNumber();
  const last = await cursorFor(chain.chainId, head);
  if (mine.length === 0) {
    // Nothing to watch: the cursor follows the head so a rule added later
    // starts from now instead of replaying the idle stretch.
    await sql`update launchpad.alert_cursors set last_block = ${head.toString()}, checked_at = now(), updated_at = now() where chain_id = ${chain.chainId}`;
    return;
  }
  if (head <= last) {
    await sql`update launchpad.alert_cursors set checked_at = now() where chain_id = ${chain.chainId}`;
    return;
  }
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
  await sql`update launchpad.alert_cursors set last_block = ${to.toString()}, checked_at = now(), updated_at = now() where chain_id = ${chain.chainId}`;
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
