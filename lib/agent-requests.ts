/**
 * Requests for the connected agent that are not drafts (M151). The owner
 * clicks a control in the studio, the request is stored on the draft, the
 * agent reads it first on get_project_status and in AGENTS.md, and the
 * write that answers it clears it. Free tier, unlike the draft requests
 * in lib/draft/requests.ts, which this module mirrors. Pure.
 *
 * Kinds: `deployer`, the agent makes the throwaway deployer key on the
 * person's machine and records its address (F8); `step`, the agent works
 * one build step, `target` being the step group's key (F10, M152);
 * `assets`, the agent fills the assets the idea depends on from the code
 * (M162), cleared by an update_project write of assets.
 */
export const AGENT_REQUEST_KINDS = ["deployer", "step", "assets"] as const;
export type AgentRequestKind = (typeof AGENT_REQUEST_KINDS)[number];

export interface AgentRequest {
  kind: AgentRequestKind;
  /** The step group key for a step request; absent for the deployer. */
  target?: string;
  requestedAt: string;
  requestedBy: "owner";
}

export const AGENT_REQUEST_LIMITS = { open: 10 } as const;

export function isAgentRequestKind(v: unknown): v is AgentRequestKind {
  return typeof v === "string" && (AGENT_REQUEST_KINDS as readonly string[]).includes(v);
}

/** The key two requests are the same under. */
export function agentRequestKey(kind: AgentRequestKind, target?: string): string {
  return target ? `${kind}:${target}` : kind;
}

export function normalizeAgentRequests(raw: unknown): AgentRequest[] | null {
  if (!Array.isArray(raw)) return null;
  const out: AgentRequest[] = [];
  const seen = new Set<string>();
  for (const r of raw) {
    if (!r || typeof r !== "object") continue;
    const o = r as Record<string, unknown>;
    if (!isAgentRequestKind(o.kind)) continue;
    const target = typeof o.target === "string" && o.target.trim() ? o.target.trim().slice(0, 120) : undefined;
    if (o.kind === "step" && !target) continue;
    const key = agentRequestKey(o.kind, target);
    if (seen.has(key)) continue;
    seen.add(key);
    const at = typeof o.requestedAt === "string" && !Number.isNaN(Date.parse(o.requestedAt)) ? o.requestedAt : new Date().toISOString();
    out.push({ kind: o.kind, ...(target ? { target } : {}), requestedAt: at, requestedBy: "owner" });
    if (out.length >= AGENT_REQUEST_LIMITS.open) break;
  }
  return out.length ? out : null;
}

/** The open requests, oldest first. */
export function openAgentRequests(doc: { agentRequests?: AgentRequest[] }): AgentRequest[] {
  return [...(doc.agentRequests ?? [])].sort((a, b) => a.requestedAt.localeCompare(b.requestedAt));
}

export function findAgentRequest(doc: { agentRequests?: AgentRequest[] }, kind: AgentRequestKind, target?: string): AgentRequest | undefined {
  const key = agentRequestKey(kind, target);
  return (doc.agentRequests ?? []).find((r) => agentRequestKey(r.kind, r.target) === key);
}

/** True when another request cannot be queued (the cap). */
export function agentRequestsFull(doc: { agentRequests?: AgentRequest[] }): boolean {
  return (doc.agentRequests ?? []).length >= AGENT_REQUEST_LIMITS.open;
}

/** Queue a request, replacing an older one with the same key. Returns the stored list unchanged at the cap. */
export function withAgentRequest(doc: { agentRequests?: AgentRequest[] }, kind: AgentRequestKind, target?: string): AgentRequest[] {
  const key = agentRequestKey(kind, target);
  const cur = doc.agentRequests ?? [];
  const rest = cur.filter((r) => agentRequestKey(r.kind, r.target) !== key);
  if (rest.length >= AGENT_REQUEST_LIMITS.open) return cur;
  return [...rest, { kind, ...(target ? { target } : {}), requestedAt: new Date().toISOString(), requestedBy: "owner" }];
}

/** Drop the request for a kind and target, or every request of the kind without a target. Undefined when none is left. */
export function withoutAgentRequest(doc: { agentRequests?: AgentRequest[] }, kind: AgentRequestKind, target?: string): AgentRequest[] | undefined {
  const rest = (doc.agentRequests ?? []).filter((r) => (target ? agentRequestKey(r.kind, r.target) !== agentRequestKey(kind, target) : r.kind !== kind));
  return rest.length ? rest : undefined;
}

/** Drop every step request whose target is in the given set. */
export function withoutStepRequests(doc: { agentRequests?: AgentRequest[] }, targets: ReadonlySet<string>): AgentRequest[] | undefined {
  const rest = (doc.agentRequests ?? []).filter((r) => !(r.kind === "step" && r.target && targets.has(r.target)));
  return rest.length ? rest : undefined;
}

/** What the agent does to answer a request, as get_project_status and AGENTS.md say it. */
export function agentRequestHowTo(kind: AgentRequestKind, envFile = ".env"): string {
  if (kind === "deployer")
    return (
      `Make a throwaway deployer key on this machine (cast wallet new, or viem's generatePrivateKey), write it to ${envFile} as DEPLOYER_PRIVATE_KEY=0x..., ` +
      `check the file is ignored by git (git check-ignore ${envFile}), record its address with update_project deployer, and never print the key. Recording the address clears this request.`
    );
  if (kind === "assets")
    return "Read the contracts in this repository and record the tokens they touch with update_project assets, each with a symbol, a role (collateral, borrow, quote, underlying or reward) and the address where you know it. Writing assets clears this request.";
  return "Work the step in this repository, add the file, test or address as evidence and tick it with set_build_steps, and name it in report_session's plan. Ticking it clears this request.";
}
