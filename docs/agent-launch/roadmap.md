# Agent Launch roadmap

**Step 3 / next priority** after Token Launch and Projects.

Sequencing relative to the rest of CanHav:

1. **Step 1:** [Token Launch](../token-launch/overview.md) on Robinhood Chain Testnet (available now)
2. **Step 2:** [Projects](../ideation/two-tracks.md) ideation tracks (in development)
3. **Step 3 / next priority:** Agent Launch hardening on Base Sepolia
4. **Later:** Mainnet agent identity only after testnet loops prove out

## Live today

| Capability | Status |
|------------|--------|
| Identity Registry status + Reputation wiring check | Live on `/agents` |
| Wallet connect on Base Sepolia | Live |
| Indexed recent registrations | Live (separate agents indexer) |
| Testnet vanity-prefix guards | Live across site, verify script, indexer |

## Planned

| Capability | Intent |
|------------|--------|
| MCP-only registration gate | Limit new registrations to introspectable MCP endpoints |
| Richer registration UX | Clearer URI / endpoint validation and error states |
| Reputation product | Beyond wiring checks, if ERC-8004 reputation flows mature |
| Mainnet | Explicit cutover with separate addresses; never silent mixup |

## Explicitly not promised

- Custody of agent runtimes
- Guaranteed economic outcomes for agents
- Jumping ahead of Token Launch or Projects in product priority

## Related

- [MCP endpoints](mcp-endpoints.md)
- [Overview](overview.md)
- [Litepaper](../general/litepaper.md)
