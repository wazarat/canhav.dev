# CanHav credit kit

Files for teams building credit products on Robinhood Chain, written by CanHav
to sit beside the protocol documentation rather than replace it. Everything
here is served raw from canhav.com and is safe to copy into a repository.

## What is here

| File | Use it when |
|------|-------------|
| `SKILL.md` | You want your coding agent to know how this kit fits together. Install it as a skill or paste it into your agent's instructions. |
| `ARCHITECTURE.md` | You are writing the design document for a product. One section per product shape, fill in the blanks. |
| `RISK_FRAMEWORK.md` | You have to choose numbers, caps, thresholds, oracles, and want a repeatable way to justify them. |
| `ROLE_MODEL.md` | More than one person or key can change something. Decide who can do what before the first deposit. |
| `INVARIANTS.md` | You are writing property tests. The statements that must always hold for vaults and markets, phrased for Foundry and Medusa. |
| `morpho/COLLATERAL_ASSET_RESEARCH.md` | You are deciding whether an asset may be collateral, a loan asset or a vault asset. One file per asset. |
| `morpho/robinhood-testnet-46630.manifest.json` | You need the community deployment of the core market contracts on testnet. Unofficial, verified, no oracle and no market included. |

## How to use it with a coding agent

1. Add your project's CanHav MCP server. The connect card on the project page
   has the exact command. The `get_resource_pack` tool returns the reading
   list you ticked in the studio, in the order to read it, with URLs an agent
   can fetch directly.
2. Download `RESOURCES.md` and `AGENTS.md` from the Review step and commit
   them. Point your agent at `AGENTS.md` first.
3. Install the protocol's own agent skills. For Morpho that is the
   `morpho-skills` repository. For the security pass, the Trail of Bits
   skills. Both are in the resource pack with their install locations.
4. Keep the protocol's machine-readable docs in context. Morpho publishes
   `llms.txt` and `llms-full.txt`, and every docs page as raw markdown.
5. Run the pre-launch review before anything holds value. The Morpho review
   files and the checkers in the pack are the bar.

## Where things run today

Robinhood Chain testnet is chain 46630 and mainnet is chain 4663. Morpho's
core market contracts have a community deployment on testnet, listed in the
manifest here, and an official deployment on mainnet. The recommended path is
testnet with mocks for anything missing, then a local fork of mainnet against
the real contracts, then mainnet staging behind strict caps. The project's
resource pack states this per protocol with the date it was last checked.

## Keeping it honest

Nothing in this kit is an endorsement of any protocol, and none of the copy is
taken from a protocol's own documentation. Where a file names a company or a
protocol it is as evidence of a pattern. Addresses in the manifest were
verified on the testnet explorer on the date the manifest says and should be
re-verified before use.
