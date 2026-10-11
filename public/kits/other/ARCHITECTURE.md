# Cover and governance architecture template

One section per product shape. Fill every blank you can from the project
record. Where a value is unknown, write "undecided" and list what would
decide it. A design document with a blank left blank is a finding.

## Cover pool

- **Policy.** The covered event, the exclusions and the term of a policy.
- **Capital.** Who funds the pool, the senior and junior split, the premium share of each and the lock-up against open policies.
- **Premium.** How a premium is set, who may change it and the delay.
- **Payout.** The formula a buyer can check, and the limit per policy and per event.
- **Claims.** Who decides a claim, the bond, the dispute window and the escalation.
- **Shortfall.** The order tranches absorb a loss and whether payouts are pro rata or queued.
- **Exposure.** The largest single policy, the most one event may take and the correlated risks.

## Token governance

- **Voting token.** The token that votes, whether it carries checkpoints or is wrapped, and how votes are counted.
- **Rules.** Proposal threshold, voting delay, voting period and quorum.
- **Treasury.** The contract that holds the funds, the timelock delay and every source that pays in.
- **Execution.** Queue, delay, execute and cancel, and who may call each.
- **Kept roles.** Each power the vote does not hold, its signers, its limit and its sunset.
- **Emergency.** The pause and the veto, who holds them and when they expire.

## Every shape

- **Chain.** Testnet first, with the mainnet it stands in for and the chain id of each.
- **Templates.** The contract templates accepted on each build step, with the license class and whether it is integrated or forked.
- **Keys.** Every admin function, the key that holds it, how the key is held and the delay before a change applies.
- **Manifest.** The file that records every address, commit, compiler and transaction, on testnet and later on mainnet.
