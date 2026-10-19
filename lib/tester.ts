import { z } from "zod";

/**
 * Tester kit (M125, Studio+), feedback first. An invite link carries the
 * steps testers walk through on the testnet; the public page shows the
 * faucet, the contracts and a short form per step. CanHav holds no keys
 * and pays no gas; the faucet hot wallet is a later milestone. Pure.
 */
export const TESTER_LIMITS = {
  invitesPerProject: 5,
  steps: { max: 8, each: 200 },
  label: { max: 60 },
  note: { max: 1000 },
  maxUses: { default: 50, max: 500 },
  days: { default: 30, max: 90 },
  feedbackShown: 50,
} as const;

export const inviteInputSchema = z.object({
  label: z.string().trim().min(1).max(TESTER_LIMITS.label.max),
  steps: z.array(z.string().trim().min(1).max(TESTER_LIMITS.steps.each)).min(1).max(TESTER_LIMITS.steps.max),
  maxUses: z.number().int().min(1).max(TESTER_LIMITS.maxUses.max).optional(),
  days: z.number().int().min(1).max(TESTER_LIMITS.days.max).optional(),
});
export type InviteInput = z.infer<typeof inviteInputSchema>;

export const feedbackInputSchema = z.object({
  stepIndex: z.number().int().min(0).max(TESTER_LIMITS.steps.max - 1),
  rating: z.number().int().min(1).max(5),
  note: z.string().trim().max(TESTER_LIMITS.note.max).default(""),
  wallet: z.string().trim().regex(/^0x[a-fA-F0-9]{40}$/).optional().or(z.literal("")),
  /** Honeypot, humans never see it. */
  website: z.string().max(200).default(""),
});

export interface TesterInvite {
  token: string;
  label: string;
  steps: string[];
  maxUses: number;
  uses: number;
  expiresAt: string;
  createdAt: string;
  revokedAt: string | null;
  feedbackCount: number;
  averageRating: number | null;
}

export interface TesterFeedback {
  id: string;
  inviteToken: string;
  inviteLabel: string;
  wallet: string | null;
  stepIndex: number;
  rating: number;
  note: string;
  createdAt: string;
}

export type InviteState = "open" | "revoked" | "expired" | "full";

export function inviteState(i: Pick<TesterInvite, "revokedAt" | "expiresAt" | "uses" | "maxUses">, now = Date.now()): InviteState {
  if (i.revokedAt) return "revoked";
  if (Date.parse(i.expiresAt) < now) return "expired";
  if (i.uses >= i.maxUses) return "full";
  return "open";
}

export function testerPath(token: string): string {
  return `/test/${token}`;
}
