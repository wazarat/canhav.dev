import { z } from "zod";

/**
 * Automated checks (M121, Studio+). A GitHub Action runs Slither or Aderyn
 * and asks Sourcify about the deployed addresses, then posts one run per
 * tool. Pure: the payload shape, the summary shape per tool, and the
 * mapping from review passes to tools.
 */
export const CHECK_TOOLS = ["slither", "aderyn", "sourcify"] as const;
export type CheckTool = (typeof CHECK_TOOLS)[number];
export type CheckResult = "pass" | "fail" | "error";

export const CHECK_LIMITS = { bytes: 50_000, findings: 20, addresses: 100 } as const;

const severity = z.enum(["high", "medium", "low", "informational"]);

/** Static analysis: counts per severity and the top findings. */
export const analysisSummarySchema = z.object({
  counts: z.object({ high: z.number().int().min(0), medium: z.number().int().min(0), low: z.number().int().min(0), informational: z.number().int().min(0) }),
  findings: z.array(z.object({ title: z.string().max(160), severity, file: z.string().max(200).optional() })).max(CHECK_LIMITS.findings).default([]),
});

/** Source verification per address: full, partial or none. */
export const sourcifySummarySchema = z.object({
  chainId: z.number().int().positive(),
  verified: z.record(z.string().regex(/^0x[0-9a-f]{40}$/), z.enum(["full", "partial", "none"])),
});

export const checkRunSchema = z.object({
  tool: z.enum(CHECK_TOOLS),
  commitSha: z.string().regex(/^[0-9a-f]{7,40}$/).optional(),
  runUrl: z.string().url().max(300).optional(),
  result: z.enum(["pass", "fail", "error"]),
  summary: z.unknown(),
});

export type CheckRunPayload = z.infer<typeof checkRunSchema>;

/** The summary checked against the tool's shape; null when it does not fit. */
export function parseSummary(tool: CheckTool, summary: unknown): Record<string, unknown> | null {
  const parsed = tool === "sourcify" ? sourcifySummarySchema.safeParse(summary) : analysisSummarySchema.safeParse(summary);
  return parsed.success ? (parsed.data as Record<string, unknown>) : null;
}

/** Which tools stand behind which review pass. Only the static analysis pass has an automatic proof today. */
export const PASS_TOOLS: Record<string, readonly CheckTool[]> = {
  "review.static": ["slither", "aderyn"],
};

export interface CheckRunView {
  id: string;
  tool: CheckTool;
  commitSha: string | null;
  runUrl: string | null;
  result: CheckResult;
  summary: Record<string, unknown>;
  createdAt: string;
}

/** The newest run among the tools that stand behind a pass, or null. */
export function latestFor(passId: string, runs: readonly CheckRunView[]): CheckRunView | null {
  const tools = PASS_TOOLS[passId];
  if (!tools) return null;
  return runs.find((r) => tools.includes(r.tool)) ?? null;
}

/** The sourcify summary for an address, when the newest sourcify run names it. */
export function verifiedOn(address: string, runs: readonly CheckRunView[]): "full" | "partial" | "none" | null {
  const run = runs.find((r) => r.tool === "sourcify");
  const map = run?.summary.verified as Record<string, "full" | "partial" | "none"> | undefined;
  return map?.[address.toLowerCase()] ?? null;
}
