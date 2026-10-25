/**
 * The agent line's colour (M174, the owner's call): the one status that
 * carries colour beside error text. Live is an agent connected or working,
 * waiting is a session waiting on the owner, off is no agent yet.
 */
export type AgentTone = "live" | "waiting" | "off";

export const AGENT_TONE_CLASS: Record<AgentTone, string> = {
  live: "text-emerald-400 light:text-emerald-700",
  waiting: "text-amber-400 light:text-amber-700",
  off: "text-rose-400 light:text-rose-600",
};
