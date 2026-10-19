import { z } from "zod";

import { ALERT_KINDS, CHANNEL_KINDS } from "@/lib/alerts/kinds";

/** Inputs for the alerts routes and the MCP shape (M123). Pure. */
export const alertRuleInputSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "An address is 0x and forty hex characters."),
  label: z.string().trim().max(60).optional(),
  kinds: z.array(z.enum(ALERT_KINDS)).min(1).max(ALERT_KINDS.length),
  /** ETH as a decimal string, converted to wei on save. */
  thresholdEth: z.string().trim().regex(/^\d+(\.\d{1,18})?$/, "A number of ETH.").optional(),
});
export type AlertRuleInput = z.infer<typeof alertRuleInputSchema>;

export const alertChannelInputSchema = z.object({
  kind: z.enum(CHANNEL_KINDS),
  /** The email address, "<bot token> <chat id>" for Telegram, the webhook URL for Discord. */
  target: z.string().trim().min(3).max(500),
});
export type AlertChannelInput = z.infer<typeof alertChannelInputSchema>;

export function validateTarget(input: AlertChannelInput): string | null {
  if (input.kind === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.target)) return "An email address.";
  if (input.kind === "telegram" && !/^\d+:[\w-]{30,}\s+-?\d+$/.test(input.target)) return "The bot token, a space, then the chat id.";
  if (input.kind === "discord" && !/^https:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\/\d+\/[\w-]+$/.test(input.target)) return "A Discord webhook URL.";
  return null;
}

export function ethToWei(eth: string): string {
  const [whole, frac = ""] = eth.split(".");
  return (BigInt(whole) * 10n ** 18n + BigInt((frac + "0".repeat(18)).slice(0, 18))).toString();
}

export interface AlertRuleView {
  id: string;
  chainId: number;
  address: string;
  label: string | null;
  kinds: Array<(typeof ALERT_KINDS)[number]>;
  thresholdWei: string | null;
  enabled: boolean;
  createdAt: string;
}

export interface AlertChannelView {
  id: string;
  kind: (typeof CHANNEL_KINDS)[number];
  masked: string;
  enabled: boolean;
  createdAt: string;
}

export interface AlertEventView {
  id: string;
  ruleId: string;
  chainId: number;
  txHash: string;
  kind: (typeof ALERT_KINDS)[number];
  line: string;
  /** Per channel id, whether delivery worked. */
  delivered: Record<string, { ok: boolean; error?: string; at: string }> | null;
  createdAt: string;
}
