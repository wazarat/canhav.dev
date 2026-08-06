# Glossary

**Available now** as reference. Terms for Token Launch, Projects, and Agent Launch match how CanHav uses them in product and contracts.

## Product

| Term | Meaning |
|------|---------|
| CanHav | Research platform and testnet product suite. Product site: [canhav.com](https://canhav.com). |
| Token Launch | Testnet launchpad on Robinhood Chain Testnet for creating fixed-supply tokens with optional vesting, journeys, sales, and AMM liquidity. Step 1. |
| Projects | Ideation studio with independent Product and Token design tracks, computed outputs, and public pages. Step 2. In development. |
| Agent Launch | Testnet track for registering AI agents as ERC-721 identities on the public ERC-8004 Identity Registry (Base Sepolia). Step 3 / next priority. |
| Journey | Off-chain document describing a token's plan and milestones. Its hash is committed on-chain at launch. |
| Research preview | Content and software that is experimental, testnet-only, and not financial advice. |
| Status declaration | Team-stated status for legal, governance, or security work (already in place, handled by legal/ops, planned before mainnet, not yet). Not enforced by the token contract. |

## Projects

| Term | Meaning |
|------|---------|
| Product track | Ideation document for what you are building (sector, users, architecture, security). |
| Token track | Ideation document for token design (eight sections from rationale through post-launch). |
| Computed outputs | Float, FDV:float, unlock calendar, and warnings derived from token design answers. |
| Clerk | Intended account provider for studio (in development). |

## Token Launch

| Term | Meaning |
|------|---------|
| Robinhood Chain Testnet | Arbitrum Orbit testnet used by CanHav Token Launch. Chain ID `46630`. Not affiliated with Robinhood brokerage distribution. |
| TokenFactory | Contract that deploys token clones (CREATE2 / LibClone). Current live factory is v4. Older factories are paused; their tokens remain indexed. |
| LaunchToken | Fixed-supply ERC20 implementation cloned per launch. No mint after initialize; no owner; not upgradeable. |
| Launch fee | ETH paid to the factory on launch. Hard-capped in bytecode (`MAX_LAUNCH_FEE`); current documented testnet value 0.0002 ETH. |
| userSalt | Creator-chosen salt. Combined with `msg.sender` so predicted addresses cannot be front-run by others. |
| journeyHash | On-chain commitment to the full journey document. |
| descriptionHash | On-chain commitment to the short form description field. |
| Vesting wallet | Clone that locks a percent of supply for a beneficiary with duration and optional cliff. |
| MilestoneEscrow | Admin-less singleton for milestone-dated token lockups. |
| JourneyUpdates | Admin-less singleton that anchors content-addressed progress updates. |
| AllocationSale | Admin-less fixed-price sale contract. Fee-free; proceeds unlock on milestone dates. |
| LaunchAMM | Minimal token/ETH AMM. LP fee plus optional protocol fee routed through FeeSplitter. Per-pool protocol fee frozen at creation. |
| FeeSplitter | Timelock-owned destination for platform fee share; permissionless distributions to configured payees. |
| TimelockController | Owns factory and AMM admin knobs. Admin changes wait out a public delay (300s on testnet). |
| Indexer | Ponder app that indexes launch events for explore and token detail pages. |

## Agent Launch

| Term | Meaning |
|------|---------|
| Base Sepolia | Base L2 testnet. Chain ID `84532`. Home of CanHav Agent Launch. |
| ERC-8004 | Standard for on-chain agent identity and related registries. |
| Identity Registry | Public ERC-721 registry where each agent is a token. CanHav does not own this contract. |
| Reputation Registry | Related ERC-8004 registry. Used for wiring checks; full reputation flows are out of scope for v1. |
| Vanity prefix | Testnet Identity Registry addresses start with `0x8004A818`. Mainnet starts with `0x8004A169`. Mixing them up fails silently unless checked. |
| MCP (Agent Launch) | Model Context Protocol as intended agent capability endpoint for registration gating. |
| MCP (Projects / AI) | Planned CanHav MCP server for reading design documents in an IDE. Separate from Agent Launch MCP. |
| Registration file / URI | Metadata URI attached to an agent identity (URL or inline `data:` URI). |
| Agents indexer | Separate Ponder app for ERC-8004 events (not shared with the launchpad indexer). |
