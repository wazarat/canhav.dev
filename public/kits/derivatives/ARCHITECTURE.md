# Derivatives architecture template

One section per product shape. Fill every blank you can from the project
record. Where a value is unknown, write "undecided" and list what would
decide it. A design document with a blank left blank is a finding.

## Perpetuals venue\n\n- **Counterparty.** A shared pool, a book with a matching engine or a network's book behind your front end, and who loses when traders win.\n- **Markets.** One row per market with the feed, the hours, the maximum leverage and the open interest cap.\n- **Margin.** The margin asset, the maintenance margin and the liquidation line as numbers.\n- **Funding.** The formula with every input named, the cap, and where it is shown before a trade.\n- **Price path.** Every hop from the oracle report to the mark, with the staleness bound at each and the sequencer check.\n- **Liquidations.** Who may liquidate, the reward, and the test through a price gap.\n- **Keepers.** What runs off-chain, how it is monitored and what users can do while it is down.\n\n## Option vault\n\n- **Strategy.** The underlying, the side written or bought and the expiry cycle.\n- **Settlement.** Where options are minted and settled and who takes the other side.\n- **Strike rule.** The formula that picks the strike, its inputs and who may change it.\n- **Rounds.** How deposits join, how withdrawals are requested and settled, and the cap.\n- **Premium.** How the premium is found each round and where every fill is recorded.\n- **Expiry price.** The settlement source, its bound and the path when it is missing.\n\n## Delta neutral vault\n\n- **Legs.** The long leg, the short leg and the venue each sits on.\n- **Band.** How far the legs may drift, who rebalances and what a rebalance costs.\n- **NAV.** How shares are priced across both legs and how often requests settle.\n- **Funding.** The historical series on the venue and what the vault does in negative weeks.\n- **Custody.** The venue account, its key, the signers on a rebalance and the limits.\n- **Unwind.** For each venue failure mode, how the long leg is sold and depositors are paid.

## Every shape

- **Chain.** Testnet first, with the mainnet it stands in for and the chain id of each.
- **Templates.** The contract templates accepted on each build step, with the license class and whether it is integrated or forked.
- **Keys.** Every admin function, the key that holds it, how the key is held and the delay before a change applies.
- **Manifest.** The file that records every address, commit, compiler and transaction, on testnet and later on mainnet.
