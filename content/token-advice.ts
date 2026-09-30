import type { RationaleWhy } from "@/lib/ideation";
import type { ProductShape } from "@/lib/kits";

/**
 * Shape-aware token advice (M47), advisory only. For every product shape,
 * whether a token fits, which reasons for one hold up, which to avoid, what
 * a token for that shape should lock, and one example. Shown on the
 * Rationale step of a design linked to a project, merged over the
 * project's shapes, and behind the rationale_shape_mismatch warning. The
 * launch transaction never reads any of this. Type-only imports, so this
 * file adds no runtime edge into lib/ideation. No colons, no em dashes.
 */

export type NeedsToken = "usually" | "sometimes" | "rarely";

export interface ShapeTokenAdvice {
  needsToken: NeedsToken;
  /** One or two sentences on whether a token fits this shape. */
  summary: string;
  fits: readonly RationaleWhy[];
  avoid: readonly RationaleWhy[];
  /** One line on what a token for this shape locks or commits to. */
  lock: string;
  example: string;
}

export const RATIONALE_SHORT: Record<RationaleWhy, string> = {
  token_is_product: "Token is the product",
  bootstrap_supply: "Bootstrap a supply side",
  economic_security: "Economic security",
  governance: "Governance",
  fee_capture: "Fee capture",
  fundraising: "Fundraising",
  not_sure: "Not sure yet",
};

export const SHAPE_TOKEN_ADVICE: Record<ProductShape, ShapeTokenAdvice> = {
  curated_vault: {
    needsToken: "sometimes",
    summary:
      "A curated vault earns from its fee and its depositors already hold vault shares, so it works without a token. A token fits once there is real fee flow to share or real caps and roles to govern.",
    fits: ["fee_capture", "governance"],
    avoid: ["fundraising", "bootstrap_supply"],
    lock: "Lock the fee recipient and the curator and guardian roles behind a timelock before the token claims any of the fee.",
    example:
      "A stablecoin vault with a 10 percent performance fee routes that fee to stakers after six months of live volume.",
  },
  embedded_earn: {
    needsToken: "rarely",
    summary:
      "Earn inside your app is a feature on top of vaults someone else runs. Users want the rate, not a token, and a token is a second product to explain. Skip it until the feature has its own fee flow.",
    fits: ["fee_capture"],
    avoid: ["token_is_product", "bootstrap_supply", "economic_security"],
    lock: "Lock the cut your app keeps on the way in or out, and the vault list it routes to, before a token claims a share of it.",
    example:
      "A neobank earn tab keeps 50 basis points of yield and shares half with holders after a year of deposits.",
  },
  collateral_loans: {
    needsToken: "sometimes",
    summary:
      "A lending market earns a spread and a liquidation flow, and its risk parameters are worth governing. A token fits for fee capture or governance, and as a slashable backstop once bad debt is a real risk.",
    fits: ["fee_capture", "governance", "economic_security"],
    avoid: ["token_is_product"],
    lock: "Lock the liquidation line, the price feed and the rate model behind a timelock, and write down who can add a market.",
    example:
      "Stakers backstop bad debt on a margin market and are slashed first, then earn a share of the liquidation fee.",
  },
  fixed_rate_yield: {
    needsToken: "rarely",
    summary:
      "The yield split already produces two tradeable tokens, the fixed half and the variable half, from the asset you hold. A third token has little to do until the market earns fees worth sharing.",
    fits: ["fee_capture"],
    avoid: ["token_is_product", "fundraising", "economic_security"],
    lock: "Lock the swap fee, the treasury share of the yield market and the maturity list before a token claims any of it.",
    example:
      "A market on a tokenised treasury fund charges a swap fee and routes a slice to stakers once volume is real.",
  },
  embedded_fixed_rate: {
    needsToken: "rarely",
    summary:
      "A fixed rate inside your app is a savings feature bought from an existing market. Users want the rate on day one, and a token would sit beside a product that already works without it.",
    fits: ["fee_capture"],
    avoid: ["token_is_product", "bootstrap_supply", "economic_security"],
    lock: "Lock the spread your app keeps between the market rate and the rate it shows, and the markets it buys from.",
    example:
      "A wallet quotes 90 day deposits, keeps 30 basis points of the fixed rate and pays it to holders only after the second maturity.",
  },
  pt_backed_borrowing: {
    needsToken: "sometimes",
    summary:
      "A market that lends against fixed rate positions earns a spread and carries price feed risk into maturity. A token fits for fee capture or governance, and as a slashable backstop against bad debt.",
    fits: ["fee_capture", "governance", "economic_security"],
    avoid: ["token_is_product"],
    lock: "Lock the price feed that converges to par, the loan to value line and the maturity cutoff behind a timelock.",
    example:
      "Stakers underwrite bad debt on a fixed rate collateral market and earn the liquidation fee in return.",
  },
  leveraged_fixed_yield: {
    needsToken: "rarely",
    summary:
      "A loop product lives on the spread between the fixed rate and the borrow rate. A token cannot widen that spread, and a token paid to loopers is bootstrapping in disguise. Charge for the tool instead.",
    fits: ["fee_capture"],
    avoid: ["bootstrap_supply", "token_is_product", "economic_security"],
    lock: "Lock the cap on turns, the unwind path and the fee the tool charges on each loop.",
    example:
      "A one click loop charges 10 basis points per turn and shares the fee with stakers once the strategy has run through a maturity.",
  },
  yield_token_exposure: {
    needsToken: "rarely",
    summary:
      "Products on the variable half are trades with a maturity date and a decay curve. A token would be a second speculative asset beside the first. The structuring fee is the only steady flow.",
    fits: ["fee_capture"],
    avoid: ["token_is_product", "bootstrap_supply", "economic_security", "fundraising"],
    lock: "Lock the structuring fee and the list of yield markets the product may buy.",
    example:
      "A rate speculation desk charges a fee on each note and directs it to stakers after a year of live notes.",
  },
  liquidity_allocator: {
    needsToken: "sometimes",
    summary:
      "An allocator earns a fee on the depth it provides, and its caps and routes are real parameters to govern. A token fits for fee capture and governance, and for paying early depositors while the vault fills.",
    fits: ["fee_capture", "governance", "bootstrap_supply"],
    avoid: ["token_is_product", "fundraising"],
    lock: "Lock the caps per market, the allocator role and the fee recipient behind a timelock before a token claims a share.",
    example:
      "A stablecoin allocator pays early depositors in its token for six months, then moves the emission budget to a fee share.",
  },
  permissioned_vault: {
    needsToken: "rarely",
    summary:
      "Allowlisted depositors and a custodian behind the collateral leave little for a public token to do, and a widely held token adds regulatory surface to a product built to limit it. Governance over the allowlist and the gate is the one honest case.",
    fits: ["governance"],
    avoid: ["bootstrap_supply", "fundraising", "token_is_product"],
    lock: "Lock the gate maintainer role, the allowlist process and the exit rights, and keep any token inside the same allowlist.",
    example:
      "A fund's clients hold a non transferable governance token that sets the collateral list, with no public market.",
  },
  basic_amm_pool: {
    needsToken: "sometimes",
    summary:
      "A pool is a market, often the first market for your own token. A token fits when providers need paying to show up early, or when there is fee flow to share once volume is real.",
    fits: ["bootstrap_supply", "fee_capture"],
    avoid: ["economic_security", "governance"],
    lock: "Lock the founding LP position or its time lock, and the fee share, so early providers know the depth stays.",
    example:
      "A pair for a partner token pays providers in the launch token for three months, with the founding position locked for a year.",
  },
  concentrated_liquidity_pool: {
    needsToken: "sometimes",
    summary:
      "A concentrated pool rewards providers who manage ranges well. A token fits when providers need paying to seed depth around the price, or when fees are worth sharing. A token for its own sake adds a second price to manage.",
    fits: ["bootstrap_supply", "fee_capture"],
    avoid: ["economic_security"],
    lock: "Lock the range the founding position covers, the fee tier and the owner of the first position.",
    example:
      "A stablecoin pair pays range providers within a cent of par for a quarter, funded from the treasury allocation.",
  },
  hook_pool: {
    needsToken: "sometimes",
    summary:
      "A hook is a contract of your own, so it can route a slice of every swap to a treasury or to stakers, gate trading or move fees. That gives a token real work for fee capture and governance over the hook's parameters.",
    fits: ["fee_capture", "governance"],
    avoid: ["fundraising"],
    lock: "Lock the hook's fee parameters and the address that can change them behind a timelock, and publish what the hook can and cannot do.",
    example:
      "A pool sends 10 percent of every swap fee to stakers of the launch token through its hook, with the split set by a vote.",
  },
};

export const TOKEN_ADVICE_COPY = {
  title: (joinedLabels: string) => `Advice for ${joinedLabels}`,
  needsToken: {
    usually: "A token usually fits this product.",
    sometimes: "A token sometimes fits this product.",
    rarely: "A token rarely fits this product.",
  } as const,
  fits: "Reasons that fit",
  avoid: "Reasons to avoid",
  lock: "What to lock",
  example: "For example",
  merged:
    "Merged across the shapes this project builds. A reason counts as fitting when it fits any of them.",
  mismatch: "The reason picked below is one to avoid for every shape this project builds.",
  none: "None",
} as const;
