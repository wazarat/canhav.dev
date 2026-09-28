# CanHav liquidity kit

Files for teams building liquidity products on Robinhood Chain, written by
CanHav to sit beside the protocol documentation rather than replace it.
Everything here is served raw from canhav.com and is safe to copy into a
repository. The credit kit at `/kits/credit/` is its sibling; a curated vault
or an earn feature reached through the Liquidity sector uses both.

## What is here

| File | Use it when |
|------|-------------|
| `SKILL.md` | You want your coding agent to know how this kit fits together. Install it as a skill or paste it into your agent's instructions. |
| `ARCHITECTURE.md` | You are writing the design document for a vault or a pool product. One section per shape, fill in the blanks. |
| `morpho/VAULT_SPECIFICATION.md` | You are about to call the vault factory. One file per vault, asset, roles, gates, adapters, caps, timelocks, fee, cash buffer and redemption terms. |
| `morpho/LIQUIDITY_SCENARIOS.md` | You need to know whether the vault survives a bad week. Six scenarios, each with the test to run and the control to have. |
| `morpho/RELEASE_GATES.md` | You want a release sequence a reviewer can follow. Seven phases with the evidence that lets each one pass, and the documents to keep. |
| `morpho/GATES_AND_ELIGIBILITY.md` | Your vault has a door. Who may deposit, borrow and hold shares, which jurisdictions, who the custodian is and what exit rights a gate never overrides. |
| `uniswap/DEPLOY_TESTNET_46630.md` | You are putting the v2 or v4 stack on testnet yourself, because the protocol has no deployment there. The order, and what to pin at each step. |
| `uniswap/robinhood-testnet-46630.manifest.template.json` | Your config, tests and agent need one source of truth for testnet addresses. Every contract is a null until you deploy it. |
| `uniswap/robinhood-mainnet-4663.manifest.json` | You want the canonical mainnet addresses in one JSON for a fork. Copied from the protocol's record, reference only, never reused on testnet. |
| `uniswap/POOL_PARAMETERS.md` | You are creating a pool. The pool key, the starting price, the first range and the seed amounts as product decisions. |
| `uniswap/HOOK_DESIGN.md` | You are writing a hook. Permissions, the fee schedule, the accounting deltas and the risk categories, before the first line of code. |
| `uniswap/POOL_INVARIANTS.md` | You are writing property tests for a pair, a concentrated pool or a hook. Twelve statements phrased for Foundry. |

## How to use it with a coding agent

1. Add your project's CanHav MCP server. The connect card on the project page
   has the exact command. The `get_resource_pack` tool returns the reading
   list you ticked in the studio, in the order to read it, with URLs an agent
   can fetch directly, and the `environment` block that says what is deployed
   where.
2. Download `RESOURCES.md` and `AGENTS.md` from the Review step and commit
   them. Point your agent at `AGENTS.md` first.
3. Install the protocol's own agent skills. For Morpho that is the
   `morpho-skills` repository, for Uniswap the `uniswap-ai` plugins, and for
   the security pass the Trail of Bits skills. All are in the resource pack
   with their install locations.
4. Keep the protocol's machine-readable docs in context. Morpho publishes
   `llms.txt` and every docs page as raw markdown. Uniswap publishes
   `llms.txt` and `llms-full.txt` and serves every docs page as markdown with
   `.md` appended.
5. For a pool product, deploy the stack on testnet 46630 with the runbook
   and fill the manifest template before anything else. Every address your
   code uses comes from that file.
6. Run the pre-launch review before anything holds value. The passes for the
   liquidity shapes arrive with the next milestone of the kit; until then the
   Morpho review files and the Uniswap security framework are the bar.

## Where things run today

Robinhood Chain testnet is chain 46630 and mainnet is chain 4663. Morpho's
core market contracts have a community deployment on testnet, listed in the
credit kit's manifest, and an official deployment on mainnet. Uniswap has
v2, v3, v4, Permit2 and the Universal Router on mainnet, recorded in the
protocol's own deployment file and copied here, and nothing on testnet, so
a pool team deploys the stack itself and records it in the manifest
template. The project's Reality step and its resource pack state this per
protocol with the date it was last checked.

## Keeping it honest

Nothing in this kit is an endorsement of any protocol, and none of the copy
is taken from a protocol's own documentation. Where a file names a company
or a protocol it is as evidence of a pattern. The mainnet manifest is a copy
of what the protocol publishes, taken on the date the file says. Re-verify
every address before use, and never carry a mainnet address into a testnet
configuration.
