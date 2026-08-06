# Litepaper

**Research preview.** Token Launch and Projects are available now on testnet. Accounts and AI/IDE export are in development. Agent / ERC-8004 is not started. This document states product thesis and sequencing. It is not a legal whitepaper, not an offering, and not financial advice. All product surfaces described here are **testnet only**.

## Problem

Builders and capital-markets teams need two things that are usually split apart:

1. **Research context** that goes beyond raw on-chain metrics
2. **Credible testnet launches** where commitments (plans, lockups, sales rules) are verifiable on-chain instead of living only in a thread or PDF

Separately, teams need a place to design a product and a token as honest documents before they deploy.

## Affiliation

CanHav has no affiliation with Robinhood. Robinhood Chain does not distribute apps or tokens to Robinhood brokerage customers. See [Welcome](welcome-to-canhav.md).

## Approach

CanHav combines research on [canhav.com](https://canhav.com) with testnet product surfaces:

| Track | Network | Role | Status |
|-------|---------|------|--------|
| Token Launch | Robinhood Chain Testnet (`46630`) | Factory tokens, journey hashes, vesting, milestone escrow, allocation sales, AMM, timelocked admin, hosted indexer. | Available now |
| Projects | Same product site | Independent Product and Token design tracks, computed tokenomics, optional link, public pages, design deploy. | Available now |
| Accounts / AI export | Same product site | Clerk accounts; markdown export and MCP for designs. | In development |
| Foundry scaffold generator | N/A | Generate a Foundry project from a design. | Deferred |
| Agent / ERC-8004 | Base Sepolia (`84532`) | Agent identity track. | Not started |

Token Launch and Projects do not gate each other. A product with no token is legitimate. A token design that is never deployed is legitimate.

## Token Launch thesis

A launch should leave a trail that others can check:

- **Fixed supply** minted at initialize; pause stops new launches, not existing tokens
- **Journey and description hashes** commit off-chain narrative to on-chain events (including design snapshot hashes on the design-deploy path)
- **Optional vesting** in the same launch transaction
- **Admin-less** escrow, updates, and sales where possible so there is no EOA “attester” to rug progress mechanics
- **Timelocked** factory and AMM knobs so fee and implementation changes are public and delayed
- **Indexed explore** so launches are discoverable without scraping explorers by hand

The design deliberately avoids unaudited “pump clone” patterns. Concentration and bundler risk belong on a future metrics list, not as a product feature.

## Projects thesis

A team should be able to design either end first:

- A **product** with no token is a legitimate outcome
- A **token design** that is never deployed is also legitimate
- Neither track gates the other; they can optionally link
- The platform asks decisions, computes float and unlock calendars, and records status declarations for legal, governance, and security without pretending those are finished
- Readers can tell **enforced on-chain** facts from **stated by team** commitments

Details: [The two ideation tracks](../ideation/two-tracks.md).

## Trust model (testnets)

| Guarantee | Reality |
|-----------|---------|
| Testnet only | Contracts and UIs target Robinhood Chain Testnet |
| Public delay on admin | Factory and AMM ownership sit behind a TimelockController on Token Launch |
| Admin-less progress rails | MilestoneEscrow, JourneyUpdates, AllocationSale have no owner |
| Indexed, not oracle-trusted | Explore pages read indexed chain events; content hashes verify off-chain blobs |
| Research preview | Site and docs may change; nothing here is audited mainnet software |

## Out of scope (for now)

- Mainnet Token Launch or Projects
- Agent / ERC-8004 product track
- Custodial wallets or fiat onramps
- KYC / exchange listing processes
- Guaranteed token performance
- Pricing or paid tiers (everything described here is free)
- Foundry scaffold generator (deferred)

## Sequencing

1. Token Launch on Robinhood Chain Testnet (available now).
2. Projects ideation, public pages, and design deploy (available now).
3. Clerk accounts and AI/IDE export (in development).
4. Only after those loops are proven, consider mainnet. Agent / ERC-8004 remains not started.

## Related reading

- [Welcome to CanHav](welcome-to-canhav.md)
- [What CanHav is](what-canhav-is.md)
- [Token Launch overview](../token-launch/overview.md)
- [The two ideation tracks](../ideation/two-tracks.md)
- [Glossary](glossary.md)
