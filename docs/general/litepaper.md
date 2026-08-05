# Litepaper

Research preview. This document states product thesis and sequencing. It is not a legal whitepaper, not an offering, and not financial advice. All product surfaces described here are **testnet only**.

## Problem

Builders and capital-markets teams need two things that are usually split apart:

1. **Research context** that goes beyond raw on-chain metrics
2. **Credible testnet launches** where commitments (plans, lockups, sales rules) are verifiable on-chain instead of living only in a thread or PDF

Separately, AI agents are starting to act as economic actors. Without a shared identity layer, “which agent is this?” and “what can it actually do?” stay informal.

## Approach

CanHav combines research on [canhav.com](https://canhav.com) with two testnet product tracks:

| Track | Network | Role |
|-------|---------|------|
| Token Launch | Robinhood Chain Testnet (`46630`) | First priority. Factory tokens, journey hashes, vesting, milestone escrow, allocation sales, AMM, timelocked admin. |
| Agent Launch | Base Sepolia (`84532`) | Next priority. Register agents on the public ERC-8004 Identity Registry; move toward MCP-gated, introspectable endpoints. |

Token Launch is where we spend design and engineering attention first. Agent Launch reuses the same product habits (clear chain guards, indexed discovery, testnet-first) but does not block Token Launch.

## Token Launch thesis

A launch should leave a trail that others can check:

- **Fixed supply** minted at initialize; pause stops new launches, not existing tokens
- **Journey and description hashes** commit off-chain narrative to on-chain events
- **Optional vesting** in the same launch transaction
- **Admin-less** escrow, updates, and sales where possible so there is no EOA “attester” to rug progress mechanics
- **Timelocked** factory and AMM knobs so fee and implementation changes are public and delayed
- **Indexed explore** so launches are discoverable without scraping explorers by hand

The design deliberately avoids unaudited “pump clone” patterns. Concentration and bundler risk belong on a future metrics list, not as a product feature.

## Agent Launch thesis

Agents should be identities others can resolve:

- Agents are **ERC-721 tokens** on a public Identity Registry (CanHav owns no registry contracts)
- Registrations should eventually be limited to **MCP endpoints** so declared tools and resources can be checked against reality
- Testnet and mainnet registry addresses differ by a vanity prefix; every CanHav layer refuses the wrong prefix so a silent mainnet mixup cannot happen in product config

Reputation Registry wiring is used for integrity checks. Full reputation product is later.

## Trust model (testnets)

| Guarantee | Reality |
|-----------|---------|
| Testnet only | Contracts and UIs target Robinhood Chain Testnet and Base Sepolia |
| Public delay on admin | Factory and AMM ownership sit behind a TimelockController on Token Launch |
| Admin-less progress rails | MilestoneEscrow, JourneyUpdates, AllocationSale have no owner |
| Indexed, not oracle-trusted | Explore pages read indexed chain events; content hashes verify off-chain blobs |
| Research preview | Site and docs may change; nothing here is audited mainnet software |

## Out of scope (for now)

- Mainnet Token Launch or Agent Launch
- Custodial wallets or fiat onramps
- KYC / exchange listing processes
- Guaranteed token performance or agent economic outcomes
- Replacing full research terminals or agent runtimes

## Sequencing

1. Harden Token Launch on Robinhood Chain Testnet (create, journey, vesting, escrow, sales, AMM, explore).
2. Grow Agent Launch on Base Sepolia (registration UX, MCP constraints, indexed browse).
3. Only after those loops are proven, consider mainnet or broader standards work.

## Related reading

- [Welcome to CanHav](welcome-to-canhav.md)
- [Token Launch overview](../token-launch/overview.md)
- [Agent Launch overview](../agent-launch/overview.md)
- [Glossary](glossary.md)
