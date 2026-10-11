# Staking architecture template

One section per product shape. Fill every blank you can from the project
record. Where a value is unknown, write "undecided" and list what would
decide it. A design document with a blank left blank is a finding.

## Liquid staking token

- **Staked asset.** What is staked and where the yield comes from.
- **Operators.** Who runs the validators or the reward module and under what agreement.
- **Token.** Rebasing or value accruing, the exchange rate source and its cadence.
- **Exit.** The unstake queue, its order and what a holder sees.
- **Rewards.** Where rewards land, the operator share and the key behind the fee.
- **Slashing.** What a slash does to the token and who absorbs it.

## Restaking service

- **Service.** What it verifies, signs or serves, who consumes it and what a wrong answer costs.
- **Core.** The restaking core it registers with and what the core asks of a service on your chain.
- **Operators.** Admission, the bond and the slashing conditions with the evidence a slash needs.
- **Rewards.** The split between stakers and operators, the cadence and the distributing contract.
- **Middleware.** The contract that accepts, checks and pays operator work.

## Liquid restaking token

- **Basket.** The services restaked into, the share of each and who may change it.
- **Token.** The receipt token, its exchange rate across services and its cadence.
- **Queue.** Deposits that wait for allocation, withdrawals that wait for exits, and the date a holder sees.
- **Risk.** Slashing exposure per service as a share of the basket, on the deposit screen.
- **Bridge.** When the token lives on another chain, the gateway and the rate oracle here.

## Every shape

- **Chain.** Testnet first, with the mainnet it stands in for and the chain id of each.
- **Templates.** The contract templates accepted on each build step, with the license class and whether it is integrated or forked.
- **Keys.** Every admin function, the key that holds it, how the key is held and the delay before a change applies.
- **Manifest.** The file that records every address, commit, compiler and transaction, on testnet and later on mainnet.
