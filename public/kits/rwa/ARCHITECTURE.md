# RWA architecture template

One section per product shape. Fill every blank you can from the project
record. Where a value is unknown, write "undecided" and list what would
decide it. A design document with a blank left blank is a finding.

## Stock and fund tokens

- **Issuer.** Who stands behind the token and whether you issue or build on another issuer's token.
- **Standard.** The token standard and its transfer rules.
- **Eligibility.** Who may hold, the identity check and who maintains the list.
- **Corporate actions.** What a split, a dividend and a halt do in the token.
- **Pricing.** The feed, its bound and what happens when the market is closed.
- **Issuer powers.** Freeze, forced transfer and recall, with the key behind each.

## Private credit pool

- **Borrowers.** Who may borrow and who underwrites.
- **Tranches.** Senior, junior and first loss with the waterfall.
- **Terms.** Tenor, rate, collateral and the reporting cadence.
- **Pool.** The async vault base, the queue and the value source.
- **Default.** The default path, who pursues recovery and how it flows back.

## Reserve-backed token

- **Reserve.** What backs the token, where it is held and the custodian.
- **Attestation.** Who attests, how often and what a stale attestation stops.
- **Mint gate.** How minting reads the attestation.
- **Transfer rules.** Allowlist, blocklist, freeze and who decides.
- **Redemption.** The path, its timing and where it is published.
- **Chains.** If the token moves between chains, the pool or bridge and the rate limits.

## Every shape

- **Chain.** Testnet first, with the mainnet it stands in for and the chain id of each.
- **Templates.** The contract templates accepted on each build step, with the license class and whether it is integrated or forked.
- **Keys.** Every admin function, the key that holds it, how the key is held and the delay before a change applies.
- **Manifest.** The file that records every address, commit, compiler and transaction, on testnet and later on mainnet.
