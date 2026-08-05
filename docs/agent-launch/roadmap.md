# Agent Launch roadmap

Sequencing relative to the rest of CanHav:

1. **Now / near term:** [Token Launch](../token-launch/overview.md) on Robinhood Chain Testnet
2. **Next:** Agent Launch hardening on Base Sepolia
3. **Later:** Mainnet agent identity only after testnet loops prove out

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
- Replacing Token Launch priority

## Related

- [MCP endpoints](mcp-endpoints.md)
- [Overview](overview.md)
- [Litepaper](../general/litepaper.md)
