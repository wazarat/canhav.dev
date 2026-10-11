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
  perp_exchange: {
    needsToken: "sometimes",
    summary:
      "A venue earns fees from day one, so a token is a fee share or a governance claim, not a reason to trade there. Add one once there is real fee flow to share or listings and parameters to govern.",
    fits: ["fee_capture", "governance"],
    avoid: ["bootstrap_supply", "fundraising"],
    lock: "Lock the fee recipient, the listing role and the parameter keys behind a timelock before the token claims any of the fee.",
    example:
      "A stock token perps venue routes a fifth of its fees to stakers after three months of live volume and lets them vote on new markets.",
  },
  option_vault: {
    needsToken: "rarely",
    summary:
      "Depositors already hold vault shares and the premium is the yield, so the product works without a token. A token only fits once several vaults share a curator worth governing.",
    fits: ["governance"],
    avoid: ["token_is_product", "bootstrap_supply", "fundraising"],
    lock: "Lock the roll keeper, the strike rule and the fee behind a timelock before any token touches the vault.",
    example:
      "A family of covered call vaults adds a governance token two years in so holders set the strike rule and the fee.",
  },
  delta_neutral_vault: {
    needsToken: "rarely",
    summary:
      "The hedged position is the product and its share is the token depositors need. A separate token would only share the strategist's fee.",
    fits: ["fee_capture"],
    avoid: ["token_is_product", "bootstrap_supply", "economic_security"],
    lock: "Lock the venue keys, the band and the strategist's limits behind a timelock before any fee is shared.",
    example:
      "A basis vault keeps its share token as the only token and routes a performance fee to a treasury the team controls.",
  },
  liquid_staking_token: {
    needsToken: "usually",
    summary:
      "The liquid staking token is the product. A second governance token only makes sense once there are validators, modules or fees to govern.",
    fits: ["token_is_product", "governance", "fee_capture"],
    avoid: ["fundraising"],
    lock: "The receipt token's exchange rate source and the unstake queue are the contract; lock the validator set and the fee behind a timelock.",
    example:
      "A staked version of a launched token streams protocol fees to stakers and is itself the only new token.",
  },
  restaking_service: {
    needsToken: "sometimes",
    summary:
      "A service pays operators and stakers in whatever it earns. A token fits as the reward or the bond asset once the service has fees, and as governance over slashing conditions.",
    fits: ["economic_security", "governance", "fee_capture"],
    avoid: ["fundraising", "bootstrap_supply"],
    lock: "Lock the slashing conditions, the operator set and the reward split behind a timelock before the token is a bond.",
    example:
      "An oracle service pays operators in its own token from fees and lets holders vote on the slashing rule after a year of uptime.",
  },
  liquid_restaking_token: {
    needsToken: "usually",
    summary:
      "The liquid restaking token is the product. Governance over which services it restakes into is the one reason for a second token, and only once there is more than one service.",
    fits: ["token_is_product", "governance"],
    avoid: ["fundraising", "bootstrap_supply"],
    lock: "Lock the service set, the share of each and the exit queue behind a timelock before the token is listed anywhere.",
    example:
      "A restaking vault issues one receipt token and adds nothing else until it restakes into a second service.",
  },
  tokenized_security: {
    needsToken: "rarely",
    summary:
      "The stock or fund token is someone else's and counsel decides most of it. Your token would be a fee or governance claim on the wrapper, which is rarely worth the regulatory question.",
    fits: ["fee_capture"],
    avoid: ["token_is_product", "bootstrap_supply", "fundraising", "economic_security"],
    lock: "Lock the eligibility list maintainer and the freeze role behind a timelock, and keep any fee claim off the security token itself.",
    example:
      "A stock token savings app charges a wrapper fee to a treasury and launches no token of its own.",
  },
  private_credit_pool: {
    needsToken: "sometimes",
    summary:
      "Lenders hold pool shares and the borrower pays the rate, so the pool works without a token. A token fits as the first loss capital or as governance over which underwriters the pool trusts.",
    fits: ["economic_security", "governance"],
    avoid: ["token_is_product", "fundraising"],
    lock: "Lock the underwriter set, the waterfall and the reporting cadence behind a timelock before the token is first loss capital.",
    example:
      "An invoice financing pool stakes its own token as the junior tranche and pays stakers from the spread.",
  },
  asset_backed_token: {
    needsToken: "usually",
    summary:
      "The backed token is the product and it must not be the governance token. Anything that shares the issuer's fee or governs the reserve policy is a separate decision.",
    fits: ["token_is_product"],
    avoid: ["governance", "economic_security", "fundraising"],
    lock: "The mint gate on the attested reserve, the freeze role and the custodian are the contract; lock them behind a timelock and keep governance off the backed token.",
    example:
      "A regional stablecoin issues the backed token only and keeps the issuer as a company, not a DAO.",
  },
  cover_pool: {
    needsToken: "sometimes",
    summary:
      "Capital providers hold pool shares and premiums pay them, so a cover pool works without a token. A token fits as the first loss capital that backs claims or as the vote over which risks the pool writes.",
    fits: ["economic_security", "governance"],
    avoid: ["token_is_product", "fundraising", "bootstrap_supply"],
    lock: "Lock the claim path, the shortfall rule and the premium setter behind a timelock before the token stands as first loss capital.",
    example:
      "A smart contract cover pool stakes its own token as the junior tranche and pays stakers from the premium.",
  },
  governance_stack: {
    needsToken: "usually",
    summary:
      "The voting token is the design. What it governs, who may propose, the quorum, the timelock and which roles stay with a multisig are the product, so the token's distribution has to match the power it carries.",
    fits: ["governance", "fee_capture"],
    avoid: ["token_is_product", "fundraising"],
    lock: "Lock the governor's parameters and the timelock delay behind the timelock itself, and name every role the multisig keeps outside the vote before the token trades.",
    example:
      "A governor and timelock receive a launched token's creator fees and holders vote on where they go.",
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
