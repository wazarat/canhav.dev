/**
 * Copy for the unit economics model (M166, Studio+ Viability). Labels,
 * one line explanations and the formulas in words, per family. Pure and
 * import free so scripts/check-economics.mjs can run the model under
 * node. No colons before whitespace, no em dashes.
 */
export const ECONOMICS_COPY = {
  families: {
    lending: "Lending and fixed income",
    vaults: "Vaults and leveraged yield",
    pools: "Pools",
    perps: "Perps and options",
    staking: "Staking and restaking",
    rwa: "RWA and underwriting",
    governance: "Governance",
  },
  scenarios: { low: "Low", base: "Base", high: "High" },
  scenarioHint: "Low halves the base case's scale and trims its rates by a quarter, high doubles the scale and adds a quarter. Each scenario keeps its own inputs once you edit it.",
  governance: "A governance stack has no revenue model of its own. The numbers live with the product it governs.",
  /** The inputs. The scale input is the first of each family. */
  inputs: {
    tvl: { label: "TVL", explain: "Total value deposited at the scale you model." },
    utilizationPct: { label: "Utilization", explain: "The share of deposits borrowed out." },
    borrowRatePct: { label: "Borrow rate", explain: "What borrowers pay per year." },
    reserveFactorPct: { label: "Reserve factor", explain: "The share of interest the protocol keeps, or the spread between the two sides." },
    protocolFeePct: { label: "Curator or protocol fee", explain: "A flat yearly fee on deposits, on top of the reserve factor." },
    strategyYieldPct: { label: "Strategy yield", explain: "What the strategy earns per year before fees." },
    performanceFeePct: { label: "Performance fee", explain: "The share of the yield the vault keeps." },
    managementFeePct: { label: "Management fee", explain: "A flat yearly fee on deposits." },
    leverage: { label: "Leverage", explain: "How many times the deposit is put to work, 1 for none." },
    volumeToTvlPct: { label: "Daily volume to TVL", explain: "Daily trading volume as a share of the pool's liquidity." },
    feeTierPct: { label: "Fee tier", explain: "The swap fee as a share of volume." },
    protocolSharePct: { label: "Protocol share of fees", explain: "The share of swap fees the protocol keeps; the rest goes to liquidity providers." },
    impermanentLossPct: { label: "Impermanent loss", explain: "The yearly loss liquidity providers carry against holding, shown apart as their cost." },
    volume: { label: "Monthly notional volume", explain: "Open interest turned over in a month, or the notional traded." },
    feeRatePct: { label: "Fee rate", explain: "The taker fee as a share of volume." },
    fundingSharePct: { label: "Funding and liquidation share", explain: "What the protocol keeps from funding and liquidations, as a share of volume." },
    insuranceSharePct: { label: "Insurance fund share", explain: "The share of fees set aside for the insurance fund." },
    stakedTvl: { label: "Staked TVL", explain: "Total value staked or restaked at the scale you model." },
    rewardRatePct: { label: "Reward rate", explain: "What the staked value earns per year." },
    commissionPct: { label: "Commission", explain: "The share of rewards the protocol keeps." },
    aum: { label: "Assets or cover under management", explain: "Assets managed, or cover written, at the scale you model." },
    feeRateAumPct: { label: "Fee rate", explain: "The yearly fee on assets under management." },
    premiumRatePct: { label: "Premium rate", explain: "The yearly premium on cover written, 0 when there is none." },
    expectedLossPct: { label: "Expected loss rate", explain: "Yearly losses paid out, as a share of the assets or cover." },
    incentivesMonthly: { label: "Incentives per month", explain: "Token or cash incentives paid to users each month." },
    auditOneOff: { label: "Audit", explain: "The audit cost, paid once." },
    auditMonths: { label: "Audit spread over", explain: "How many months the audit is spread over in the monthly cost." },
    infraMonthly: { label: "Infrastructure per month", explain: "RPC, indexing, hosting and the like." },
    teamMonthly: { label: "Team per month", explain: "Salaries and contractors." },
    oracleKeeperMonthly: { label: "Oracle and keeper per month", explain: "Price feeds, keepers and automation." },
    growthMonthlyPct: { label: "Monthly growth", explain: "How fast the scale grows each month, for the months to break even." },
  },
  groups: { revenue: "Revenue", costs: "Costs", growth: "Growth" },
  units: { usd: "$", pct: "%", ratio: "", months: "months", x: "x" },
  outputs: {
    revenue: "Monthly revenue",
    cost: "Monthly cost",
    breakEven: "Break even",
    revenueLine: (scale: string, label: string) => `At ${scale} ${label}, at the entered inputs.`,
    costLine: (audit: string) => `Fixed each month, the audit spread in at ${audit}.`,
    breakEvenLine: (scale: string, label: string, months: number | null, growth: string) =>
      months === null
        ? `Breaks even at ${scale} ${label}. Growth is zero, so the time is open.`
        : months === 0
          ? `Breaks even at ${scale} ${label}, which the entered scale already covers.`
          : `Breaks even at ${scale} ${label}, ${months} ${months === 1 ? "month" : "months"} away at ${growth} monthly growth.`,
    neverLine: "Revenue per unit of scale is zero at these inputs, so there is no break even.",
    lpCost: (usd: string) => `Liquidity providers carry about ${usd} a month in impermanent loss at these inputs, apart from the protocol's numbers.`,
  },
  /** The formulas in words, for get_unit_economics and the agent. */
  formulas: {
    lending: [
      "Monthly revenue is TVL times utilization times the borrow rate times the reserve factor, divided by twelve, plus TVL times the curator or protocol fee divided by twelve.",
      "Monthly cost is incentives plus the audit spread over its months plus infrastructure plus team plus oracle and keeper costs.",
      "Break even TVL is the monthly cost divided by the revenue one dollar of TVL earns in a month.",
      "Months to break even is the log of break even TVL over the entered TVL, divided by the log of one plus the monthly growth rate.",
    ],
    vaults: [
      "Monthly revenue is TVL times leverage times the strategy yield times the performance fee, divided by twelve, plus TVL times the management fee divided by twelve.",
      "Monthly cost is incentives plus the audit spread over its months plus infrastructure plus team plus oracle and keeper costs.",
      "Break even TVL is the monthly cost divided by the revenue one dollar of TVL earns in a month.",
      "Months to break even is the log of break even TVL over the entered TVL, divided by the log of one plus the monthly growth rate.",
    ],
    pools: [
      "Monthly revenue is TVL times the daily volume to TVL ratio times thirty days times the fee tier times the protocol's share of fees.",
      "Impermanent loss is TVL times the yearly loss rate divided by twelve, the liquidity providers' cost, reported apart.",
      "Monthly cost is incentives plus the audit spread over its months plus infrastructure plus team plus oracle and keeper costs.",
      "Break even TVL is the monthly cost divided by the revenue one dollar of TVL earns in a month.",
    ],
    perps: [
      "Monthly revenue is the monthly notional volume times the fee rate plus the funding and liquidation share, times one minus the insurance fund share.",
      "Monthly cost is incentives plus the audit spread over its months plus infrastructure plus team plus oracle and keeper costs.",
      "Break even volume is the monthly cost divided by the revenue one dollar of volume earns.",
      "Months to break even is the log of break even volume over the entered volume, divided by the log of one plus the monthly growth rate.",
    ],
    staking: [
      "Monthly revenue is staked TVL times the reward rate times the commission, divided by twelve.",
      "Monthly cost is incentives plus the audit spread over its months plus infrastructure plus team plus oracle and keeper costs.",
      "Break even staked TVL is the monthly cost divided by the revenue one dollar of staked TVL earns in a month.",
      "Months to break even is the log of break even TVL over the entered TVL, divided by the log of one plus the monthly growth rate.",
    ],
    rwa: [
      "Monthly revenue is the assets or cover under management times the fee rate plus the premium rate minus the expected loss rate, divided by twelve.",
      "Monthly cost is incentives plus the audit spread over its months plus infrastructure plus team plus oracle and keeper costs.",
      "Break even assets under management is the monthly cost divided by the revenue one dollar under management earns in a month.",
      "Months to break even is the log of break even assets over the entered assets, divided by the log of one plus the monthly growth rate.",
    ],
    governance: ["A governance stack has no revenue model of its own."],
  },
  /** The scale's noun per family, for the sentences. */
  scaleLabel: { lending: "TVL", vaults: "TVL", pools: "TVL", perps: "monthly volume", staking: "staked TVL", rwa: "under management", governance: "" },
  /** Fill from market (M167). */
  market: {
    fill: "Fill from market",
    filling: "Reading the market",
    filled: (n: number) => (n === 1 ? "1 input filled from DefiLlama" : `${n} inputs filled from DefiLlama`),
    nothing: "DefiLlama has no pools for this subsector on the chain yet, so nothing was filled.",
    source: (date: string) => `DefiLlama, read ${date}`,
    hint: "Reads the median base yield and the daily volume to liquidity of the subsector's pools on the mainnet. Fee tiers, reserve factors and costs stay yours.",
  },
  defaultsNote: "Defaults until you edit them. Every number here is a model at the entered inputs, never a forecast.",
  filledBy: { team: (date: string) => `Edited by your team, ${date}`, agent: (date: string) => `Filled by your agent, ${date}` },
  /** The summary card line and the pack prompt line. */
  summary: (scenario: string, scale: string, label: string) => `The ${scenario} case breaks even at ${scale} ${label}.`,
  summaryNever: (scenario: string) => `The ${scenario} case never breaks even at its inputs.`,
  chartSentence: (lines: readonly string[]) => lines.join(", ") + ".",
  chartCase: (scenario: string, scale: string, label: string) => `${scenario} case breaks even at ${scale} ${label}`,
  chartCaseNever: (scenario: string) => `${scenario} case never breaks even`,
  chartAria: "Monthly revenue and monthly cost against the scale, log across, one line per scenario, the cost as a flat line, break even marked where a revenue line crosses it.",
  chartHover: (scenario: string, scale: string, revenue: string, cost: string) => `${scenario} case at ${scale}, revenue ${revenue} a month against cost ${cost}`,
  chartHint: "Hover or focus a break even mark to read its values.",
  revenueLabel: "revenue",
  costLabel: "cost",
} as const;
