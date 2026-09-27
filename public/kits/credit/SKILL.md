---
name: canhav-credit-kit
description: How to build a credit product on Robinhood Chain with the CanHav research kit. Use when a project has a CanHav resource pack, when it targets lending, fixed income or leveraged yield on Robinhood Chain, or when asked to plan, review or document such a product.
---

# CanHav credit kit

You are helping a small team build a credit product on Robinhood Chain. The
team has already chosen a product shape in the CanHav studio and ticked a
reading list. Your job is to work from that list, not from memory.

## First, load the pack

- If the project's CanHav MCP server is connected, call `get_resource_pack`.
  Read the `readFirst` ids in order. For each resource with a `rawUrl`, fetch
  it and load it into context before proposing anything.
- If there is no MCP connection, read `RESOURCES.md` in the repository. Core
  items are numbered in reading order.
- Respect the flags. `mainnet_only` means there is no testnet deployment.
  `not_on_robinhood` means background reading only, the protocol cannot be
  integrated on this chain. `unofficial` means a community artifact to verify
  before trusting. `testnet_only` means do not carry it to mainnet.

## Then, work in this order

1. Read `ARCHITECTURE.md` for the product shape and fill in every blank you
   can from the project record. Do not invent parameters. Where a value is
   unknown, write "undecided" and list what would decide it.
2. Read `ROLE_MODEL.md` and write down who holds each role and which key.
   A single wallet holding an admin role is a finding, not a default.
3. Read `RISK_FRAMEWORK.md`. Every cap, threshold and oracle choice gets a
   one-paragraph justification that names its inputs.
4. For each asset the product touches, produce a
   `COLLATERAL_ASSET_RESEARCH.md` entry and a registry entry in
   `ASSET_REGISTRY.json` that points back to what the asset is built on.
   The token integration checklist in the pack runs before an asset is
   approved for anything.
5. For a fixed income or leveraged yield shape, run
   `pendle/SY_WRAPPER_CHECKLIST.md` before any market is opened, fill
   `pendle/MARKET_PARAMETERS.md` per market and
   `pendle/PT_COLLATERAL_PARAMETERS.md` per lending market that accepts the
   fixed half. Read the matching note in `strategies/`.
6. Turn `INVARIANTS.md` and, across any seam, `CROSS_PROTOCOL_INVARIANTS.md`
   into tests. Property tests over line coverage, on a fork of mainnet 4663.
7. Before any deposit of real value, run the review passes from the pack
   (the Morpho review files and checkers, the Trail of Bits workflow) and
   record the evidence for each pass.

## Rules that do not bend

- Every state-changing call follows simulate, explain, confirm, execute.
  No agent-generated transaction goes from intent straight to broadcast.
- Never show one number called "yield" or "APY". Name which rate it is and
  where it comes from, using the labels in `RATE_TRANSPARENCY.md`. Native
  yield, incentives and fees are separate lines. A fixed rate is fixed to
  maturity and for nobody who exits early; the variable half reaches zero
  at maturity.
- Addresses come from the manifests and the chain master file in this kit,
  read on a fork, never from memory. The Pendle manifest is unverified on
  testnet and says so on its second line.
- The worst-case answer in the project record is the review bar. Changes
  touching value flows get scrutiny proportional to it.
- Where the pack says a deployment is unofficial or missing, say so in the
  plan and prefer a local fork of mainnet for integration work.
