import { z } from "zod";

import { chainInfo, type ProjectChain } from "@/lib/chains";
import type { ProjectDoc } from "@/lib/ideation";
import { testnetContractRows } from "@/lib/ideation";

/**
 * GitHub sync (M120, Studio+). The Action in .github-templates posts the
 * deployed contracts from Foundry broadcast files and the build steps named
 * in commits; this module checks the payload and turns it into the two
 * patches the agent write path takes. Pure.
 */
const address = z.string().regex(/^0x[0-9a-f]{40}$/);

export const SYNC_LIMITS = { contracts: 100, steps: 60, bytes: 50_000 } as const;

export const githubSyncSchema = z.object({
  commit: z.object({ sha: z.string().regex(/^[0-9a-f]{7,40}$/), url: z.string().url().max(300), message: z.string().max(400).optional() }),
  pr: z.object({ number: z.number().int().positive(), url: z.string().url().max(300), title: z.string().max(200).optional() }).nullable().optional(),
  broadcasts: z
    .array(
      z.object({
        script: z.string().max(120),
        chainId: z.number().int().positive(),
        contracts: z.array(z.object({ name: z.string().max(60), address })).max(SYNC_LIMITS.contracts),
      }),
    )
    .max(20)
    .default([]),
  steps: z.array(z.object({ id: z.string().min(1).max(120), evidence: z.string().max(200).optional() })).max(SYNC_LIMITS.steps).default([]),
});

export type GithubSyncPayload = z.infer<typeof githubSyncSchema>;

export interface GithubSync {
  sha: string;
  url: string;
  at: string;
  contracts: number;
  steps: number;
  /** proposed when the project's write mode queued the changes for the owner. */
  outcome: "applied" | "proposed" | "nothing";
}

/** The contracts the payload adds or relabels on the project's chain, merged by address. */
export function mergedContracts(doc: ProjectDoc, payload: GithubSyncPayload, chain: ProjectChain): Array<{ address: string; label?: string }> | null {
  const chainId = chainInfo(chain).chainId;
  const incoming = payload.broadcasts.filter((b) => b.chainId === chainId).flatMap((b) => b.contracts);
  if (incoming.length === 0) return null;
  const rows = testnetContractRows(doc);
  const byAddress = new Map(rows.map((r) => [r.address, r] as const));
  let changed = false;
  for (const c of incoming) {
    const label = c.name.trim().slice(0, 60);
    const cur = byAddress.get(c.address);
    if (!cur) {
      byAddress.set(c.address, label ? { address: c.address, label } : { address: c.address });
      changed = true;
    } else if (label && !cur.label) {
      byAddress.set(c.address, { address: c.address, label });
      changed = true;
    }
  }
  if (!changed) return null;
  return [...byAddress.values()].slice(0, SYNC_LIMITS.contracts);
}

/** The build steps patch: every named step done, the commit as evidence. */
export function stepsPatch(payload: GithubSyncPayload): { done: string[]; evidence: Array<{ id: string; text: string }> } | null {
  if (payload.steps.length === 0) return null;
  const ids = [...new Set(payload.steps.map((s) => s.id))];
  const text = (s: { evidence?: string }) => (s.evidence?.trim() || `Commit ${payload.commit.sha.slice(0, 7)}, ${payload.commit.url}`).slice(0, 200);
  return { done: ids, evidence: ids.map((id) => ({ id, text: text(payload.steps.find((s) => s.id === id) ?? {}) })) };
}

export function syncNote(payload: GithubSyncPayload): string {
  const pr = payload.pr ? ` (PR ${payload.pr.number})` : "";
  return `GitHub Action, commit ${payload.commit.sha.slice(0, 7)}${pr}. ${payload.commit.url}`.slice(0, 400);
}

export function normalizeGithubSync(raw: unknown): GithubSync | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.sha !== "string" || typeof o.url !== "string" || typeof o.at !== "string") return null;
  const outcome = o.outcome === "proposed" || o.outcome === "nothing" ? o.outcome : "applied";
  return { sha: o.sha.slice(0, 40), url: o.url.slice(0, 300), at: o.at, contracts: Number(o.contracts) || 0, steps: Number(o.steps) || 0, outcome };
}
