# Journey and credibility

A **journey** is the off-chain plan for a token: milestones, narrative, and updates over time. At launch, CanHav commits hashes on-chain so anyone can verify that a published document matches what was launched.

## Two commitments

| Hash | Commits to |
|------|------------|
| `descriptionHash` | Short description from the launch form |
| `journeyHash` | Full journey document stored off-chain |

They are independent. Changing one document does not rewrite the other hash. Verification is: hash the published bytes and compare to the event.

## Why it matters

Launch pages often make claims that never appear on-chain. Binding a journey hash at factory time means:

- The launch event is the source of truth for “what was promised at t0”
- Later [journey updates](journey-updates.md) can add content-addressed progress without rewriting the original commitment
- Explorers and indexers can surface the hashes even if hosting moves

## Format notes

Journey document format may evolve. Smoke-test launches have used placeholders. Treat the **hash in the event** as the contract with the chain; treat the hosted file as the human-readable payload that must match.

## Related

- [Create a token](create-a-token.md)
- [Journey updates](journey-updates.md)
- [Milestone escrow](milestone-escrow.md)
