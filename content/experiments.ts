import type { EconomicsFamily } from "@/lib/economics";

/**
 * Starting experiments per product family (M170), each a filled in test
 * the team edits. CanHav's voice, no dates, no metrics beyond the pass
 * bar. The family is the unit economics family (M166), so a curated
 * vault and an option vault share the vault tests.
 */
export interface ExperimentTemplate {
  key: string;
  title: string;
  hypothesis: string;
  test: string;
  metric: string;
  passBar: string;
  killCriterion: string;
  /** Days from today to the deadline when the experiment is made from the template. */
  days: number;
}

export const EXPERIMENT_TEMPLATES: Record<EconomicsFamily, readonly ExperimentTemplate[]> = {
  lending: [
    { key: "borrow_demand", title: "Borrow demand on testnet", hypothesis: "Holders of the collateral asset will open a loan against it when the rate is close to the market's", test: "One market with mock collateral on the testnet, ten testers through the tester kit, each asked to deposit collateral and borrow", metric: "Testers who open a loan", passBar: "7 of 10 testers open a loan and read the rate as fair", killCriterion: "Fewer than 3 open a loan, or most say the collateral is not what they hold", days: 14 },
    { key: "liquidation_tolerance", title: "Liquidation terms people accept", hypothesis: "Borrowers accept the liquidation threshold once it is shown as a price move, not a ratio", test: "Two versions of the borrow screen, one with the ratio and one with the price move that triggers liquidation, shown to the same testers", metric: "Testers who say they understand when they get liquidated", passBar: "8 of 10 explain the trigger back in their own words", killCriterion: "Fewer than 5 can, on either version", days: 10 },
    { key: "fixed_rate_pull", title: "Fixed rate over floating", hypothesis: "Depositors prefer a fixed rate for a term over a floating rate on the same asset", test: "Offer both on the testnet to the same testers with the same mock asset and ask them to pick once", metric: "Share picking the fixed term", passBar: "6 of 10 pick the fixed term and say why", killCriterion: "Fewer than 3 pick it", days: 14 },
  ],
  vaults: [
    { key: "deposit_withdraw", title: "Deposit and withdraw on testnet", hypothesis: "The target holder will deposit into a curated vault and withdraw without help", test: "One vault with mock collateral on the testnet, ten testers through the tester kit, each asked to deposit and withdraw", metric: "Testers who complete a deposit and a withdrawal", passBar: "8 of 10 complete both", killCriterion: "Fewer than 3 complete both, or the notes say the steps are unclear", days: 14 },
    { key: "fee_tolerance", title: "The fee people accept", hypothesis: "Depositors accept the performance fee when the strategy is explained in one paragraph", test: "Show the fee and the one paragraph strategy to testers before the deposit step and ask whether they would deposit real money", metric: "Testers who say yes to the fee", passBar: "7 of 10 say yes", killCriterion: "Fewer than 4 say yes, or most name the fee as the reason", days: 10 },
    { key: "curator_trust", title: "Trust in the curator", hypothesis: "Depositors care who curates the vault more than which protocol it sits on", test: "Two vault pages that differ only in who is named as curator, shown to the same testers", metric: "Which page testers would deposit into", passBar: "The named curator wins 7 of 10 picks", killCriterion: "Testers pick at random or say the curator does not matter", days: 10 },
  ],
  pools: [
    { key: "lp_willingness", title: "Liquidity providers show up", hypothesis: "Holders of both assets will provide liquidity to the pool at the fee tier", test: "One pool with mock assets on the testnet, ten testers asked to add liquidity and remove it", metric: "Testers who add liquidity", passBar: "7 of 10 add liquidity and 5 say they would with real money", killCriterion: "Fewer than 3 add liquidity", days: 14 },
    { key: "swap_route", title: "Swaps route through the pool", hypothesis: "Traders will swap through the pool when its price is within a few basis points of the market", test: "Ten testers asked to swap a small amount and compare the quote with what they would get elsewhere", metric: "Testers who complete a swap and call the quote fair", passBar: "8 of 10 complete the swap and 6 call it fair", killCriterion: "Fewer than 4 complete it", days: 10 },
  ],
  perps: [
    { key: "open_close", title: "Open and close a position", hypothesis: "Traders can open, adjust and close a leveraged position without a guide", test: "A testnet market with mock margin, ten testers through the tester kit, each asked to open, adjust and close", metric: "Testers who close a position they opened", passBar: "8 of 10 close their position", killCriterion: "Fewer than 4 close it, or the notes say margin is confusing", days: 14 },
    { key: "funding_clarity", title: "Funding is understood", hypothesis: "Traders understand funding payments before they hold a position overnight", test: "Show the funding line to testers and ask what they would pay or receive over a day", metric: "Testers who estimate the funding within a reasonable range", passBar: "7 of 10 estimate it", killCriterion: "Fewer than 4 can", days: 10 },
  ],
  staking: [
    { key: "stake_unstake", title: "Stake and unstake", hypothesis: "Holders will stake and accept the unstaking delay once it is shown up front", test: "Ten testers asked to stake a mock asset, read the delay and unstake", metric: "Testers who stake and say the delay is acceptable", passBar: "7 of 10 stake and accept the delay", killCriterion: "Fewer than 4 accept the delay", days: 14 },
    { key: "receipt_use", title: "The receipt token has a use", hypothesis: "Stakers will use the receipt token somewhere else rather than hold it", test: "Ask testers who staked what they would do with the receipt token and offer one integration on the testnet", metric: "Testers who use the receipt token in the integration", passBar: "5 of 10 use it", killCriterion: "Fewer than 2 use it, or most would just hold", days: 14 },
  ],
  rwa: [
    { key: "mint_redeem", title: "Mint and redeem", hypothesis: "The target holder will mint the token against the asset and redeem it without help", test: "A testnet mint and redeem flow with mock reserves, ten testers through the tester kit", metric: "Testers who mint and redeem", passBar: "8 of 10 complete both", killCriterion: "Fewer than 3 complete both", days: 14 },
    { key: "disclosure_read", title: "Disclosures are read", hypothesis: "Holders read the reserve and risk disclosure before they mint", test: "Place the disclosure before the mint step and ask one question about it afterwards", metric: "Testers who answer the question", passBar: "7 of 10 answer it", killCriterion: "Fewer than 4 answer it", days: 10 },
    { key: "cover_demand", title: "Demand for cover", hypothesis: "Protocol users will buy cover at the quoted premium", test: "Quote cover on one named protocol to ten users of it and ask them to buy on the testnet", metric: "Users who buy cover", passBar: "5 of 10 buy", killCriterion: "Fewer than 2 buy, or most call the premium too high", days: 14 },
  ],
  governance: [
    { key: "proposal_turnout", title: "Holders vote", hypothesis: "Token holders will vote on a proposal that changes a real parameter", test: "One proposal on the testnet with a real parameter change, every tester holding tokens asked to vote", metric: "Holders who vote", passBar: "6 of 10 holders vote", killCriterion: "Fewer than 3 vote", days: 14 },
    { key: "delegation", title: "Holders delegate", hypothesis: "Holders who will not vote themselves will delegate to someone named", test: "Offer delegation to three named delegates on the testnet", metric: "Holders who delegate", passBar: "5 of 10 delegate", killCriterion: "Fewer than 2 delegate", days: 14 },
  ],
};
