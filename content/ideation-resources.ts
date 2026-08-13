import type {
  AntiSniping,
  DistributionEvent,
  FounderLeavesPolicy,
  IssuancePath,
  LpTreatment,
  RationaleWhy,
  ReleaseType,
  SupplyPolicy,
  UndersubscriptionPlan,
  Upgradeability,
} from "@/lib/ideation";
import type { DeployabilityCode, DeployabilityTier } from "@/lib/tokenDesign";

/**
 * Contextual resources for the ideation tracks: per-option teaching cards,
 * per-field intros, and deployability notes. Everything here is data; the one
 * renderer is components/ideation/OptionResourceCard.tsx. Adding a resource
 * is an edit to this file only, no component changes.
 *
 * Copy rules: no em dashes; worked examples start with "Worked example: "
 * (the WarningResourceCard precedent); protocol names are cited as evidence,
 * never as endorsements.
 */

export interface DeployabilityNote {
  tier: DeployabilityTier;
  text: string;
  /** Editor-only nudge: the closest choice that deploys through CanHav as-is. */
  fix?: string;
}

export interface OptionResource {
  title?: string;
  body: string;
  example?: string;
  links?: Array<{ label: string; href: string }>;
  /** Present when choosing this option has a deployability consequence. */
  deployability?: DeployabilityNote;
}

// ---------------------------------------------------------------------------
// Deployability copy, keyed by the codes lib/tokenDesign.ts emits. Audited
// against contracts/src (factory, token, vesting wallet, sale, escrow, AMM).

export const DEPLOYABILITY_TIER_LABELS: Record<DeployabilityTier, string> = {
  canhav: "Deployable through CanHav",
  custom: "Not deployable through CanHav as designed",
  stated: "Recorded in the design, not enforced on-chain",
};

export const DEPLOYABILITY_COPY: Record<DeployabilityCode, DeployabilityNote> = {
  // -- deployable through CanHav, with a separate contract or transaction ----
  sale_second_tx: {
    tier: "canhav",
    text:
      "Fixed-price sales run through CanHav's sale contract in a separate " +
      "transaction after launch: list the allocation, set price and window, " +
      "and proceeds lock into dated tranches.",
  },
  pool_second_tx: {
    tier: "canhav",
    text:
      "A launch market is created through CanHav's AMM in two post-launch " +
      "transactions: create the pool, then add the ETH and token liquidity.",
  },
  escrow_release: {
    tier: "canhav",
    text:
      "Milestone-conditional release maps to CanHav's MilestoneEscrow in a " +
      "separate post-launch transaction. Unlocks are enforced by date; " +
      "completing the milestone itself is a public commitment, not an " +
      "on-chain condition.",
  },
  cliff_then_linear_start: {
    tier: "canhav",
    text:
      "A cliff-then-linear curve is a vesting wallet with a delayed start. " +
      "The factory contract supports a start date, but the launch form does " +
      "not expose one yet, so deploying this exact curve today means calling " +
      "the factory directly.",
  },
  airdrop_manual: {
    tier: "canhav",
    text:
      "There is no dedicated airdrop contract. An airdrop executes as plain " +
      "token transfers from the creator's wallet: workable, but with no " +
      "claim flow and no sybil protection.",
  },

  // -- not deployable through CanHav as designed -----------------------------
  inflationary_supply: {
    tier: "custom",
    text:
      "The CanHav factory deploys fixed-supply tokens only: the entire " +
      "supply is minted once at launch and no mint function exists. An " +
      "inflationary token requires a custom contract outside CanHav.",
    fix:
      'To deploy through CanHav, pick "Fixed" and describe any future ' +
      "emissions as a stated policy for your own contracts.",
  },
  distribution_auction: {
    tier: "custom",
    text:
      "No auction contract exists on CanHav. Batch or Dutch auctions " +
      "require a custom contract or an external protocol.",
    fix:
      'To deploy through CanHav, pick "Fixed-price sale" or "No ' +
      'distribution".',
  },
  distribution_lbp: {
    tier: "custom",
    text:
      "No LBP contract exists on CanHav. Liquidity bootstrapping pools " +
      "require weighted-pool infrastructure from an external protocol.",
    fix:
      'To deploy through CanHav, pick "Fixed-price sale" or "No ' +
      'distribution".',
  },
  sale_soft_cap: {
    tier: "custom",
    text:
      "The CanHav sale contract has no soft cap and no refund path, so a " +
      "minimum-raise threshold cannot unwind on-chain. Enforcing one " +
      "requires a custom sale contract.",
    fix: "To deploy through CanHav, leave the soft cap at 0.",
  },
  sale_allowlist: {
    tier: "custom",
    text:
      "The CanHav sale contract is open to any buyer; no allowlist exists. " +
      "Gating buyers requires a custom sale contract.",
    fix:
      'To deploy through CanHav, pick "Open" and use the per-wallet limit ' +
      "as the fairness control.",
  },
  sale_refund: {
    tier: "custom",
    text:
      "The CanHav sale contract has no refund path: payments are exact and " +
      "final. Refunding an undersubscribed sale requires a custom contract " +
      "or an off-chain, trust-based process.",
    fix:
      'To deploy through CanHav, pick "Proceed anyway" and publish what a ' +
      "partial raise does to the plan.",
  },
  anti_sniping: {
    tier: "custom",
    text:
      "The CanHav AMM has no launch window, early-sell tax, or trading " +
      "delay. Any anti-sniping mechanism requires custom market contracts.",
    fix:
      'To deploy through CanHav, pick "None" and size the liquidity ' +
      "assuming bots arrive first.",
  },
  lp_locked: {
    tier: "custom",
    text:
      "LP positions in the CanHav AMM can be withdrawn at any time and " +
      "shares cannot be transferred to a locker. A dated LP lock requires " +
      "custom infrastructure outside CanHav.",
    fix:
      'To deploy through CanHav, pick "Unlocked" and make not removing the ' +
      "position a published commitment.",
  },
  lp_burned: {
    tier: "custom",
    text:
      "LP positions in the CanHav AMM are internal shares that cannot be " +
      "transferred or burned. The honest CanHav equivalent is declaring the " +
      "position unlocked and simply never removing it.",
    fix:
      'To deploy through CanHav, pick "Unlocked" and make not removing the ' +
      "position a published commitment.",
  },
  points_first: {
    tier: "custom",
    text:
      "CanHav has no non-transferable token variant. A points phase runs as " +
      "an off-chain ledger, or a custom soulbound contract, until conversion.",
    fix:
      'To deploy through CanHav, pick "Straight to market" or "Issue and ' +
      'lock, no market yet"; run any points phase off-chain first.',
  },
  name_not_deployable: {
    tier: "custom",
    text:
      "This token name cannot deploy through the launch form as written: 32 " +
      "characters max, letters, numbers, and spaces only. Shorten it, or " +
      "expect the on-chain name to differ from the design.",
  },

  // -- recorded and shown, never enforced ------------------------------------
  allocations_stated: {
    tier: "stated",
    text:
      "The allocation split is recorded in the design and shown on the " +
      "public page. On-chain, the factory sends the entire supply to the " +
      "creator, minus the one optional vesting slice. Only vesting " +
      "parameters are enforced.",
  },
  multi_cohort_vesting: {
    tier: "stated",
    text:
      "Only one vesting schedule exists on-chain, and its beneficiary is " +
      "the deployer. Investor and advisor vesting is a published " +
      "commitment, not a contract.",
  },
  founder_clawback: {
    tier: "stated",
    text:
      "No clawback exists on-chain. The vesting wallet keeps vesting " +
      "regardless of who leaves, and its owner can transfer the unvested " +
      "position. Returning unvested tokens is a commitment, not a mechanism.",
  },
  sale_postpone: {
    tier: "stated",
    text:
      "A created sale cannot be cancelled or rescheduled; postponing is a " +
      "decision that must happen before the sale transaction. As a plan it " +
      "is a commitment, not a mechanism.",
  },
};

// ---------------------------------------------------------------------------
// Per-option resources, keyed by field then option value. `satisfies` keeps
// option values honest against the lib unions.

export const FIELD_RESOURCES = {
  "token.rationale.why": {
    token_is_product: {
      body:
        "The strongest rationale: the token is literally the thing users buy " +
        "or hold. Stablecoins (MakerDAO's DAI), liquid staking tokens " +
        "(Lido's stETH), and vault or receipt shares all work this way. " +
        "Sectors where this fits naturally: stablecoins and payments, " +
        "portfolio and vaults, RWA infrastructure.",
      example:
        "Worked example: Lido issues stETH as the product itself. Nobody " +
        "asks why stETH exists; holding it is the point. If your token " +
        "passes that test, this is your rationale.",
    },
    bootstrap_supply: {
      body:
        "Pay a supply side into existence before demand revenue arrives. " +
        "DePIN networks took this path: Helium paid hotspot operators in " +
        "HNT, Filecoin paid storage providers, Hivemapper paid drivers. It " +
        "works when supply is measurable and useful; it fails when " +
        "emissions outrun real demand.",
      example:
        "Worked example: Helium's early HNT emissions built radio coverage " +
        "years before paying customers existed. The token bridged that gap. " +
        "The risk shows in every fork that paid emissions for supply nobody " +
        "wanted.",
    },
    economic_security: {
      body:
        "The token is staked and can be slashed to secure something: " +
        "validators, oracles, restaking. Ethereum staking, Chainlink " +
        "staking, and EigenLayer restaking use the pattern. It requires " +
        "real slashing conditions; stake that cannot be lost secures " +
        "nothing. The CanHav launch token has no staking or slashing hooks, " +
        "so that layer is your own contracts.",
      example:
        "Worked example: an oracle network where operators bond tokens and " +
        "are slashed for bad data. The bond does economic work: it makes " +
        "lying expensive.",
    },
    governance: {
      body:
        "A real rationale only when there is something real to govern: " +
        "parameters, a treasury, upgrades. Uniswap's UNI and Compound's " +
        "COMP govern live protocols with real fee flows. Governance tokens " +
        "over nothing were the emptiest pattern of the last cycle. Note the " +
        "CanHav launch token ships with no vote, delegation, or snapshot " +
        "hooks; on-chain governance means your own Governor-style contracts.",
      example:
        "Worked example: COMP holders set collateral factors that move real " +
        "risk. Compare a governance token whose only vote is over its own " +
        "emissions.",
    },
    fee_capture: {
      body:
        "Direct existing fees to token holders or stakers. Curve's veCRV " +
        "and GMX staking capture real volume. The order matters: fees " +
        "first, token second. Capturing fees that do not exist yet is " +
        "bootstrapping in disguise. This option also draws the most " +
        "securities-law attention; weigh the Legal step accordingly.",
      example:
        "Worked example: GMX stakers earn a share of trading fees from real " +
        "volume. The Uniswap fee switch stayed dormant for years partly for " +
        "regulatory reasons; capture plans meet legal reality quickly.",
    },
    fundraising: {
      body:
        "Selling tokens to fund development. Ethereum's 2014 sale is the " +
        "legitimate archetype; the 2017 to 2018 ICO wave is the cautionary " +
        "one. This rationale carries the most regulatory surface of any " +
        "option here; pair it honestly with the Legal step.",
      example:
        "Worked example: Ethereum sold ETH in 2014 to fund the protocol " +
        "that gives ETH meaning. The difference from a 2017 ICO: the " +
        "token's utility was the network itself, not a promise stapled to " +
        "a whitepaper.",
    },
    not_sure: {
      body:
        "An honest answer, and the right moment for the cheapest advice in " +
        "crypto: most products do not need a token. Blur, EigenLayer, and " +
        "Hyperliquid all ran points programs for long stretches instead of " +
        "launching early. Build first; a token can always come later, and " +
        "can never be un-launched.",
      example:
        "Worked example: Hyperliquid ran on points for years before HYPE " +
        "existed. Deferring cost nothing and let the eventual launch price " +
        "real usage.",
    },
  } satisfies Partial<Record<RationaleWhy, OptionResource>>,

  "token.rationale.path": {
    issue_and_lock: {
      body:
        "Issue now, keep tokens out of circulation until the product earns " +
        "a market. dYdX and StarkNet ran long gaps between issuance and " +
        "trading. It buys time but stores up unlock pressure; the computed " +
        "calendar shows exactly where.",
      example:
        "Worked example: StarkNet issued STRK long before trading opened. " +
        "When unlocks began, the multi-year overhang was visible to every " +
        "buyer. Locked is not the same as neutral.",
    },
    points_first: {
      body:
        "Run a non-transferable points ledger first, convert later. Blur, " +
        "EigenLayer, and Hyperliquid made this the standard path: usage " +
        "accrues points, the token arrives when there is something to price.",
      example:
        "Worked example: Blur's seasons ran on points with no token price " +
        "to defend. Conversion happened once, into a live market. The " +
        "entire points phase lived off-chain.",
      deployability: DEPLOYABILITY_COPY.points_first,
    },
    straight_to_market: {
      body:
        "Deploy and list on day one. This is the CanHav-native path: " +
        "factory launch, then a pool. Price discovery is immediate, and so " +
        "are sell pressure and the obligation to fund liquidity. Honest for " +
        "fair launches; brutal for products not ready to be priced daily.",
      example:
        "Worked example: pool 10% of supply against ETH at launch and the " +
        "chart is public from minute one. Everything in the Market step " +
        "becomes live immediately.",
    },
  } satisfies Partial<Record<IssuancePath, OptionResource>>,

  "token.supply.policy": {
    fixed: {
      body:
        "One mint at deployment, never again. This is what the CanHav " +
        "factory deploys: the total above is written into the contract and " +
        "enforced forever. Most serious launches since 2020 are fixed " +
        "supply with vesting, not inflation.",
      example:
        "Worked example: 1B fixed supply. Every allocation and unlock below " +
        "is a fraction of a number that cannot move, so readers can price " +
        "dilution exactly.",
    },
    inflationary: {
      body:
        "Ongoing issuance funds rewards or security: Ethereum pays " +
        "validators, Cosmos chains pay stakers. It requires a mint " +
        "function and a policy for who mints, how much, and when. That is " +
        "exactly the machinery the CanHav factory does not ship.",
      example:
        "Worked example: a network paying 5% annual issuance to stakers " +
        "needs a minter role and governance over it. Describe the schedule " +
        "honestly in the note below; deploying it means custom contracts.",
      deployability: DEPLOYABILITY_COPY.inflationary_supply,
    },
  } satisfies Partial<Record<SupplyPolicy, OptionResource>>,

  "token.vesting.release": {
    linear: {
      body:
        "Standard vesting: at the cliff, the accrued fraction releases at " +
        "once, then equal monthly releases through the duration. This is " +
        "exactly what the CanHav vesting wallet enforces on-chain " +
        "(OpenZeppelin's cliff wallet with catch-up).",
      example:
        "Worked example: 24-month vest with a 6-month cliff. At month 6 a " +
        "quarter releases at once, then 1/24 of the total monthly. The " +
        "cliff catch-up is the industry default.",
    },
    milestone_conditional: {
      body:
        "Release tied to shipping, not just time. On CanHav this maps to " +
        "the MilestoneEscrow contract: tranches labeled by milestone, " +
        "enforced by date. The date is the enforceable part; hitting the " +
        "milestone is a public commitment.",
      example:
        "Worked example: three tranches tied to testnet, audit, and " +
        "mainnet, each with a date. If a milestone slips, the date still " +
        "governs. Attestation-gated release contracts do not exist here yet.",
      deployability: DEPLOYABILITY_COPY.escrow_release,
    },
    cliff_then_linear: {
      body:
        "Nothing at the cliff, then the full amount spread evenly over the " +
        "months after it. Slightly stricter than standard linear because no " +
        "accrued fraction catches up at the cliff.",
      example:
        "Worked example: 24-month vest with a 6-month cliff releases " +
        "nothing at month 6, then 1/18 of the total monthly. Standard " +
        "linear would release a quarter at the cliff instead.",
      deployability: DEPLOYABILITY_COPY.cliff_then_linear_start,
    },
  } satisfies Partial<Record<ReleaseType, OptionResource>>,

  "token.vesting.founderLeaves": {
    returns_to_treasury: {
      body:
        "The standard investor-friendly answer: unvested tokens return to " +
        "the treasury if a founder walks. Enforcement is off-chain " +
        "paperwork and the cap table, not the vesting wallet.",
      example:
        "Worked example: a founder leaves at month 8 of 36; their unvested " +
        "tokens return to treasury by agreement. The contract itself would " +
        "have kept paying them.",
      deployability: DEPLOYABILITY_COPY.founder_clawback,
    },
    returns_to_team: {
      body:
        "Unvested tokens redistribute to the remaining team. Same " +
        "enforcement reality as return-to-treasury: recorded here, executed " +
        "by agreement, not by the contract.",
      deployability: DEPLOYABILITY_COPY.founder_clawback,
    },
    continues_vesting: {
      body:
        "The departed founder keeps vesting on schedule. This is also what " +
        "the contract actually does by default: the vesting wallet pays its " +
        "owner regardless of employment. Declaring it is at least honest " +
        "about the mechanism.",
      example:
        "Worked example: a founder leaves at month 8; their wallet keeps " +
        "releasing through month 36. Every reader can see the sell pressure " +
        "that implies.",
    },
    no_policy: {
      body:
        "Publishable, but this is the question every diligence conversation " +
        "asks first. Deciding after a departure means deciding under duress.",
      example:
        "Worked example: two co-founders split in year one with no policy. " +
        "The negotiation happens angry, in public, with tokens moving. The " +
        "best time to decide was before publishing this design.",
    },
  } satisfies Partial<Record<FounderLeavesPolicy, OptionResource>>,

  "token.distribution.event": {
    none: {
      body:
        "No distribution event: the creator holds the whole supply, which " +
        "is the default state of a factory launch. Honest for pre-product " +
        "designs. Note that it defers distribution rather than solving it; " +
        "a token nobody holds does no economic work.",
      example:
        "Worked example: launch with no sale and no airdrop. Float is " +
        "whatever vests plus anything placed in a pool; the Market step " +
        "decides whether a price exists at all.",
    },
    airdrop: {
      body:
        "Free distribution to earn users or reward past ones. Uniswap's " +
        "400 UNI set the template; Arbitrum's ARB scaled it. The sybil " +
        "problem is unsolved: farms harvest most announced airdrops.",
      example:
        "Worked example: Uniswap's 2020 airdrop rewarded genuine use " +
        "because the snapshot predated the announcement. Criteria announced " +
        "in advance get farmed.",
      deployability: DEPLOYABILITY_COPY.airdrop_manual,
    },
    fixed_price_sale: {
      body:
        "Sell part of the supply at a set price inside a time window. This " +
        "is the sale CanHav supports on-chain: fixed price, hard window, " +
        "optional per-wallet cap, and proceeds locked into milestone-dated " +
        "tranches. Ethereum's 2014 sale is the archetype.",
      example:
        "Worked example: 10% of supply at a fixed ETH price over 7 days, " +
        "capped per wallet. Proceeds release in dated tranches tied to your " +
        "milestones, visible to every buyer before they commit.",
      deployability: DEPLOYABILITY_COPY.sale_second_tx,
    },
    auction: {
      body:
        "Let bidders find the price. Gnosis-style batch auctions and Dutch " +
        "auctions give better price discovery than a fixed price at the " +
        "cost of complexity.",
      example:
        "Worked example: a batch auction where all bids clear at one " +
        "price. Fairer than first-come fixed-price, but the machinery is a " +
        "custom or external contract.",
      deployability: DEPLOYABILITY_COPY.distribution_auction,
    },
    lbp: {
      body:
        "A liquidity bootstrapping pool starts the price high and lets it " +
        "decay, punishing snipers and rewarding patience. Balancer LBPs, " +
        "like Perpetual Protocol's 2020 launch, proved the pattern.",
      example:
        "Worked example: Perpetual Protocol's LBP let a decaying price " +
        "shake out bots and find a clearing level over days. All of it ran " +
        "on Balancer, an external protocol.",
      deployability: DEPLOYABILITY_COPY.distribution_lbp,
    },
  } satisfies Partial<Record<DistributionEvent, OptionResource>>,

  "token.distribution.access": {
    allowlist: {
      body:
        "Restrict buyers to a vetted list, usually for legal or community " +
        "reasons.",
      deployability: DEPLOYABILITY_COPY.sale_allowlist,
    },
    open: {
      body:
        "Anyone can buy. This is how the CanHav sale contract works; the " +
        "only on-chain limiter is the per-wallet cap.",
    },
  } satisfies Partial<Record<"allowlist" | "open", OptionResource>>,

  "token.distribution.undersubscription": {
    proceed: {
      body:
        "Take what was raised and continue. This is also the on-chain " +
        "default: raised ETH stays claimable in tranches and unsold tokens " +
        "return to you. Publish what a partial raise does to the plan.",
      example:
        "Worked example: a sale targeting 1,000 ETH raises 180. Proceeding " +
        "means the same roadmap on 18% of the budget; say which milestones " +
        "survive.",
    },
    refund: {
      body:
        "Make buyers whole if the target misses. Cleanest for trust, and " +
        "the reason serious sales publish a minimum raise.",
      deployability: DEPLOYABILITY_COPY.sale_refund,
    },
    postpone: {
      body:
        "Wait and re-run when conditions improve. Decide before creating " +
        "the sale: once created, the window is fixed.",
      deployability: DEPLOYABILITY_COPY.sale_postpone,
    },
    no_plan: {
      body:
        "The worst default: an undersubscribed sale that improvises in " +
        "public. Default outcomes are half-funded treasuries, accidental " +
        "low-float launches, or quiet cancellations that burn trust.",
    },
  } satisfies Partial<Record<UndersubscriptionPlan, OptionResource>>,

  "token.market.lp": {
    locked: {
      body:
        "Locking LP promises buyers the liquidity cannot be pulled for a " +
        "set period. Standard on chains where LP is a transferable token " +
        "sent to a locker.",
      deployability: DEPLOYABILITY_COPY.lp_locked,
    },
    burned: {
      body:
        "Burning LP makes liquidity permanent, the memecoin standard on " +
        "chains where LP positions are tokens.",
      deployability: DEPLOYABILITY_COPY.lp_burned,
    },
    unlocked: {
      body:
        "You keep the ability to withdraw liquidity at any time. This is " +
        "the CanHav AMM default; readers will price the trust assumption, " +
        "and declaring it plainly beats pretending otherwise.",
    },
  } satisfies Partial<Record<LpTreatment, OptionResource>>,

  "token.market.antiSniping": {
    window: {
      body:
        "A launch window gates the first minutes of trading: capped buys, " +
        "gradual opening, or allowlisted early access.",
      deployability: DEPLOYABILITY_COPY.anti_sniping,
    },
    tax: {
      body:
        "An early-sell tax punishes flippers in the first hours or days. " +
        "It requires transfer hooks on the token or market; the CanHav " +
        "token has none.",
      deployability: DEPLOYABILITY_COPY.anti_sniping,
    },
    delay: {
      body:
        "A trading delay separates deployment from tradability. The " +
        "practical CanHav equivalent is simply creating the pool later; an " +
        "enforced delay needs custom contracts.",
      deployability: DEPLOYABILITY_COPY.anti_sniping,
    },
    none: {
      body:
        "No anti-sniping mechanism, which is the honest CanHav default. " +
        "Assume bots are first through the door on any pool with real " +
        "interest and design the liquidity accordingly.",
    },
  } satisfies Partial<Record<AntiSniping, OptionResource>>,

  "project.architecture.upgradeability": {
    immutable: {
      body:
        "No upgrade path, no owner: what is deployed runs forever. Uniswap " +
        "v2 and v3 core shipped this way. The strongest trust story and " +
        "the least forgiving of bugs; pair it with real audits.",
      example:
        "Worked example: Uniswap v2 core has run unchanged since 2020. " +
        "Funds stayed safe because the code was right, not because anyone " +
        "could fix it.",
    },
    upgradeable_proxy: {
      body:
        "Logic can be replaced behind a proxy. Aave and Compound run this " +
        "way, behind timelocks and multisigs. The question readers ask is " +
        "not whether it upgrades but who holds the key and what delays them.",
      example:
        "Worked example: a proxy owned by a 3-of-5 Safe behind a 48-hour " +
        "timelock. The delay is the security: users can exit before a " +
        "malicious upgrade lands.",
    },
    partially: {
      body:
        "Immutable core, upgradeable periphery. Uniswap's immutable core " +
        "with replaceable routers, and Morpho's design, follow the split. " +
        "It concentrates trust where it is cheapest to verify.",
      example:
        "Worked example: the vault holding funds is immutable; the router " +
        "that feeds it can be replaced. A bad router upgrade can break UX " +
        "but cannot take custody.",
    },
    undecided: {
      body:
        "Fine at the idea stage, and honest. It must resolve before an " +
        "audit: auditors price upgradeability as attack surface, and users " +
        "price it as trust.",
    },
  } satisfies Partial<Record<Upgradeability, OptionResource>>,
} as const;

export type ResourceFieldKey = keyof typeof FIELD_RESOURCES;

// ---------------------------------------------------------------------------
// Field-level intros: one resource per field, shown before or under the
// question rather than per option.

export const FIELD_INTROS = {
  "token.rationale.beyondDatabaseRow": {
    title: 'What "a database row" means',
    body:
      "A database row is any balance your own backend could track: points, " +
      "credits, referral balances, cashback, an internal ledger. If a " +
      "Postgres table plus a Stripe account delivers the same feature, the " +
      "token is overhead. A token earns its place when it does work a " +
      "private ledger cannot: stake that can be slashed, collateral posted " +
      "permissionlessly, an asset third parties can build on without asking " +
      "you.",
    example:
      'Worked example: "users earn tokens for referrals" is a points ' +
      'column. "LPs stake the token to underwrite risk and get slashed on ' +
      'bad debt" cannot be a database row; the token is doing economic ' +
      "work a ledger entry cannot.",
  },
  "token.market.when": {
    title: 'What "a market exists at launch" means',
    body:
      "A market at launch means anyone can buy or sell at a public price on " +
      "day one; on CanHav, that is an AMM pool funded with your ETH and " +
      "tokens. Three things start immediately: price discovery (a chart " +
      "everyone sees), sell pressure (every unlocked token can hit the " +
      'pool), and a funding obligation (the ETH side comes from somewhere). ' +
      '"Later" and "never" pair naturally with issue-and-lock or ' +
      "points-first paths.",
    example:
      "Worked example: seed a pool with 5 ETH against 10% of supply and " +
      "that ratio is the market price from block one. A 0.5 ETH sell moves " +
      "it. Thin liquidity means violent charts.",
  },
  "token.governance.mechanism": {
    title: "Governance mechanism",
    body:
      "How decisions get made: token voting (Governor-style, as Uniswap and " +
      "Compound run), a multisig with a published mandate, or founders " +
      "deciding until decentralization is earned. Multisig-first with a " +
      "stated path is more honest than governance theater. The CanHav " +
      "launch token has no vote or delegation hooks, so token voting means " +
      "your own contracts.",
    example:
      'Worked example: "a 3-of-5 Safe decides, minutes published, Governor ' +
      'planned after audit" reads better to a sophisticated audience than ' +
      "a paper DAO with no quorum.",
  },
  "token.governance.adminKeys": {
    title: "Admin key custody",
    body:
      "Who holds the keys that can change things, and what stands between " +
      "them and user funds. The norms: a Safe multisig rather than a " +
      "single wallet, timelocks on privileged calls, named signer sets. A " +
      "single founder wallet is the classic red flag.",
    example:
      'Worked example: "admin functions sit behind a 3-of-5 Safe with a ' +
      '24-hour timelock; signers are named" is a complete answer. "The ' +
      'deployer wallet" is a finding.',
  },
  "token.governance.treasuryCustody": {
    title: "Treasury custody",
    body:
      "Where the treasury sits and who can move it. Safe multisigs are the " +
      "floor; streamed payouts and on-chain DAO custody, as Uniswap's " +
      "treasury runs, are the mature end. Same-wallet-as-deployer is the " +
      "answer readers fear.",
    example:
      'Worked example: "treasury in a 4-of-7 Safe, contributor pay ' +
      'streamed monthly" tells a reader exactly what a failure requires. ' +
      '"In the team wallet" also tells them.',
  },
  "token.postLaunch.runwayMonths": {
    title: "Treasury runway",
    body:
      "How long the project operates without new money. Denominate runway " +
      "in stables or fiat, never your own token: a treasury of your own " +
      "token shrinks exactly when you need it most.",
    example:
      'Worked example: "18 months in USDC" survives a drawdown. "18 months ' +
      'if the token holds a dollar" is not runway, it is leverage.',
  },
  "token.postLaunch.reporting": {
    title: "Reporting cadence",
    body:
      "Whether holders hear from you on a schedule. Lido and MakerDAO " +
      "normalized monthly and quarterly transparency reports. Ad hoc means " +
      "silence in bad months, and readers know it.",
  },
  "token.postLaunch.priceCollapsePlan": {
    title: "If the price collapses",
    body:
      "Assume a 90% drawdown, because most tokens see one. A real plan is " +
      "operational: what gets cut, what ships anyway, what you say " +
      "publicly. Panic buybacks are the classic anti-pattern; they spend " +
      "the treasury defending a chart.",
    example:
      'Worked example: "we cut marketing, ship the roadmap, keep 12 months ' +
      'of stables untouched" is a plan. "We will support the price" is how ' +
      "treasuries die.",
  },
  "token.postLaunch.failureCriteria": {
    title: "Failure criteria",
    body:
      "Pre-registered kill criteria: the observable outcome that makes you " +
      "stop, wind down, or return funds. Deciding now, in public, is the " +
      "credible version. Fei Protocol's orderly wind-down showed what an " +
      "adult ending looks like.",
    example:
      'Worked example: "if fees do not cover infrastructure by month 18, ' +
      'we sunset and return the treasury pro rata." Painful to write, and ' +
      "the strongest trust signal on this page.",
  },
  "token.distribution.softCap": {
    title: "Soft cap",
    body:
      "A soft cap is a minimum raise below which the sale unwinds and " +
      "buyers are made whole. It only means something if refunds can " +
      "actually happen.",
    deployability: DEPLOYABILITY_COPY.sale_soft_cap,
  },
} as const satisfies Record<string, OptionResource>;

export type ResourceIntroKey = keyof typeof FIELD_INTROS;
