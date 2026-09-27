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
   `COLLATERAL_ASSET_RESEARCH.md` entry. The token integration checklist in
   the pack runs before an asset is approved for anything.
5. Turn `INVARIANTS.md` into tests. Property tests over line coverage.
6. Before any deposit of real value, run the review passes from the pack
   (the Morpho review files and checkers, the Trail of Bits workflow) and
   record the evidence for each pass.

## Rules that do not bend

- Every state-changing call follows simulate, explain, confirm, execute.
  No agent-generated transaction goes from intent straight to broadcast.
- Never show one number called "yield" or "APY". Name which rate it is and
  where it comes from. Native yield, incentives and fees are separate lines.
- The worst-case answer in the project record is the review bar. Changes
  touching value flows get scrutiny proportional to it.
- Where the pack says a deployment is unofficial or missing, say so in the
  plan and prefer a local fork of mainnet for integration work.
