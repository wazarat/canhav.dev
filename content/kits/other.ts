import type { ShapeOption } from "@/content/kits/copy";

/** The two Other shapes (M68), one per subsector. No em dashes, no colons in UI strings. */
export const OTHER_SHAPE_OPTIONS: ReadonlyArray<ShapeOption> = [
  {
    value: "cover_pool",
    label: "Cover pool",
    blurb:
      "Capital providers fund a pool that pays out when a defined event happens. You " +
      "write the policy terms, pick who decides a claim, set the tranches and the " +
      "premium, and say what happens when the pool is short.",
    examples: [
      "Smart contract cover for protocols on your chain with claims settled by a bonded assertion",
      "Parametric crop or flight cover sold through a partner app with a fixed payout rule",
      "A first-loss pool that backs a lending product and earns a share of its fees",
    ],
  },
  {
    value: "governance_stack",
    label: "Token governance",
    blurb:
      "Holders vote and a treasury or a set of contracts does what the vote says. You " +
      "choose the voting token, the proposal and quorum rules, the timelock, and which " +
      "roles stay with a multisig.",
    examples: [
      "A governor and timelock that receive creator fees and let holders direct them",
      "A multisig with scoped roles so a small team spends within limits holders set",
      "Off-chain votes executed on-chain through a module once the result is final",
    ],
  },
];
