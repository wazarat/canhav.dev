# Derivatives architecture template

One section per product shape. Fill every blank you can from the project
record. Where a value is unknown, write "undecided" and list what would
decide it. A design document with a blank left blank is a finding.

## Perpetuals venue

- **Counterparty.** A shared pool, a book with a matching engine or a network's book behind your front end, and who loses when traders win.
- **Markets.** One row per market with the feed, the hours, the maximum leverage and the open interest cap.
- **Margin.** The margin asset, the maintenance margin and the liquidation line as numbers.
- **Funding.** The formula with every input named, the cap, and where it is shown before a trade.
- **Price path.** Every hop from the oracle report to the mark, with the staleness bound at each and the sequencer check.
- **Liquidations.** Who may liquidate, the reward, and the test through a price gap.
- **Keepers.** What runs off-chain, how it is monitored and what users can do while it is down.

## Option vault

- **Strategy.** The underlying, the side written or bought and the expiry cycle.
- **Settlement.** Where options are minted and settled and who takes the other side.
- **Strike rule.** The formula that picks the strike, its inputs and who may change it.
- **Rounds.** How deposits join, how withdrawals are requested and settled, and the cap.
- **Premium.** How the premium is found each round and where every fill is recorded.
- **Expiry price.** The settlement source, its bound and the path when it is missing.

## Delta neutral vault

- **Legs.** The long leg, the short leg and the venue each sits on.
- **Band.** How far the legs may drift, who rebalances and what a rebalance costs.
- **NAV.** How shares are priced across both legs and how often requests settle.
- **Funding.** The historical series on the venue and what the vault does in negative weeks.
- **Custody.** The venue account, its key, the signers on a rebalance and the limits.
- **Unwind.** For each venue failure mode, how the long leg is sold and depositors are paid.

## Every shape

- **Chain.** Testnet first, with the mainnet it stands in for and the chain id of each.
- **Templates.** The contract templates accepted on each build step, with the license class and whether it is integrated or forked.
- **Keys.** Every admin function, the key that holds it, how the key is held and the delay before a change applies.
- **Manifest.** The file that records every address, commit, compiler and transaction, on testnet and later on mainnet.
