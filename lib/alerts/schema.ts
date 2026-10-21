import { z } from "zod";

import { ALERT_KINDS, type AlertEventKind, CHANNEL_KINDS } from "@/lib/alerts/kinds";

/** Inputs for the alerts routes and the MCP shape (M123, M128). Pure. */
export const alertRuleInputSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "An address is 0x and forty hex characters."),
  label: z.string().trim().max(60).optional(),
  kinds: z.array(z.enum(ALERT_KINDS)).min(1).max(ALERT_KINDS.length),
  /** Whole tokens as a decimal string, converted to base units with the token's decimals on save. */
  thresholdEth: z.string().trim().regex(/^\d+(\.\d{1,18})?$/, "A number of tokens.").optional(),
});
export type AlertRuleInput = z.infer<typeof alertRuleInputSchema>;

export const alertChannelInputSchema = z.object({
  kind: z.enum(CHANNEL_KINDS),
  /** The email address, "<bot token> <chat id>" for Telegram, the webhook URL for Discord. */
  target: z.string().trim().min(3).max(500),
});
export type AlertChannelInput = z.infer<typeof alertChannelInputSchema>;

/** The Watch switch (M128). */
export const watchInputSchema = z.object({ enabled: z.boolean() });

export function validateTarget(input: AlertChannelInput): string | null {
  if (input.kind === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.target)) return "An email address.";
  if (input.kind === "telegram" && !/^\d+:[\w-]{30,}\s+-?\d+$/.test(input.target)) return "The bot token, a space, then the chat id.";
  if (input.kind === "discord" && !/^https:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\/\d+\/[\w-]+$/.test(input.target)) return "A Discord webhook URL.";
  return null;
}

/** Whole units as a decimal string to base units with the given decimals. */
export function toBaseUnits(amount: string, decimals: number): string {
  const [whole, frac = ""] = amount.split(".");
  return (BigInt(whole) * 10n ** BigInt(decimals) + BigInt((frac + "0".repeat(decimals)).slice(0, decimals) || "0")).toString();
}

/** Base units back to a short whole unit string for the rule rows. */
export function formatBaseUnits(units: string, decimals: number): string {
  const v = BigInt(units);
  const whole = v / 10n ** BigInt(decimals);
  const n = Number(whole);
  return Number.isFinite(n) ? n.toLocaleString("en-US") : whole.toString();
}

export interface AlertRuleView {
  id: string;
  chainId: number;
  address: string;
  label: string | null;
  kinds: Array<(typeof ALERT_KINDS)[number]>;
  thresholdWei: string | null;
  decimals: number;
  /** manual from the per address form, watch from the Watch switch (M128). */
  source: "manual" | "watch";
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
  /** Null on a test alert (M128). */
  ruleId: string | null;
  chainId: number;
  /** "test:<id>" on a test alert. */
  txHash: string;
  kind: AlertEventKind;
  line: string;
  /** Per channel id, whether delivery worked. */
  delivered: Record<string, { ok: boolean; error?: string; at: string }> | null;
  createdAt: string;
}

/** The worker's heartbeat per chain, read from alert_cursors.checked_at (M128). */
export interface AlertStatusView {
  /** The newest check across chains, null before the worker has ever run. */
  workerAt: string | null;
  /** True when the newest check is older than the heartbeat limit. */
  stale: boolean;
  chains: Array<{ chainId: number; lastBlock: string; checkedAt: string | null }>;
}

export interface AlertsView {
  rules: AlertRuleView[];
  channels: AlertChannelView[];
  events: AlertEventView[];
  /** The Watch switch (M128). */
  watch: boolean;
  status: AlertStatusView;
  /** Whether the platform Telegram bot is configured, so Connect Telegram can show. */
  telegram: { available: boolean };
  /** Whether ALERTS_SECRET is set, so channels can be stored. */
  configured: boolean;
}
