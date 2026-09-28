---
name: canhav-liquidity-kit
description: How to build a liquidity product on Robinhood Chain with the CanHav research kit. Use when a project has a CanHav resource pack, when it targets vaults, allocators, permissioned vaults or pools on Robinhood Chain, or when asked to plan, review or document such a product.
---

# CanHav liquidity kit

You are helping a small team build a liquidity product on Robinhood Chain.
The team has already chosen one or more product shapes in the CanHav studio
and ticked a reading list. Your job is to work from that list, not from
memory.

## First, load the pack

- If the project's CanHav MCP server is connected, call `get_resource_pack`.
  Read the `readFirst` ids in order. For each resource with a `rawUrl`, fetch
  it and load it into context before proposing anything. Read the
  `environment` block and repeat what it says about testnet 46630 in your
  plan.
- If there is no MCP connection, read `RESOURCES.md` in the repository. Core
  items are numbered in reading order.
- Respect the flags. `mainnet_only` means there is no testnet deployment.
  `self_deploy` means the team deploys those contracts on testnet itself and
  records them in the manifest. `unofficial` means a community artifact to
  verify before trusting. `testnet_only` means do not carry it to mainnet.
  `not_on_robinhood` means background reading only.

## Then, work in this order

1. Read `ARCHITECTURE.md` for the product shape and fill in every blank you
   can from the project record. Do not invent parameters. Where a value is
   unknown, write "undecided" and list what would decide it.
2. For a vault shape, fill `morpho/VAULT_SPECIFICATION.md` before the
   factory is called, walk `morpho/LIQUIDITY_SCENARIOS.md` on a fork, and
   keep `morpho/RELEASE_GATES.md` as the sequence. For a permissioned vault,
   fill `morpho/GATES_AND_ELIGIBILITY.md` first; a gate without written exit
   rights is a finding. The credit kit's role model, risk framework and asset
   research files apply to every vault and are in the pack.
3. For a pool shape, follow `uniswap/DEPLOY_TESTNET_46630.md` and fill
   `uniswap/robinhood-testnet-46630.manifest.template.json` as you go. Every
   address in the code, the tests and the front end is read from that file.
   The mainnet manifest is for a fork and for nothing else.
4. Fill `uniswap/POOL_PARAMETERS.md` per pool and, for a hook,
   `uniswap/HOOK_DESIGN.md` before writing the hook. Initialise a pool and
   add its first liquidity in one transaction.
5. Turn `uniswap/POOL_INVARIANTS.md` and, for a vault, the credit kit's
   `INVARIANTS.md` into property tests. Property tests over line coverage, on
   testnet for the self-deployed stack and on a fork of mainnet 4663 for the
   canonical one.
6. Before any deposit of real value, run the review passes from the pack and
   record the evidence for each. For a hook, the protocol's security
   framework and the security foundations skill are mandatory.

## Rules that do not bend

- Every state-changing call follows simulate, explain, confirm, execute.
  No agent-generated transaction goes from intent straight to broadcast.
- Addresses come from the manifests in this kit, read on the target chain,
  never from memory. A mainnet address in a testnet config is a bug, not a
  shortcut.
- A hook's address is mined for its permission bits and the salt is
  recorded. Never deploy a hook to an arbitrary address.
- Never show one number called "yield" or "APY" for a vault, and never show
  a pool's fee income without the divergence it was earned against. Name
  the rate and its source, using the labels in the credit kit's
  `RATE_TRANSPARENCY.md`.
- The worst-case answer in the project record is the review bar. Changes
  touching value flows get scrutiny proportional to it.
- Where the pack says a deployment is unofficial or missing, say so in the
  plan and prefer a local fork of mainnet for integration work against the
  canonical contracts.
