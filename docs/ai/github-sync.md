# GitHub sync

**Studio+.** A workflow in your repository sends deployed contract addresses and ticked build steps to the project on every push and pull request, so nothing is retyped.

## Setup

1. On the project page, Deployments, make a **write** project key (see [Project keys](export-and-mcp.md#project-keys)) and store it in the repository as the secret `CANHAV_PROJECT_KEY`.
2. Set the repository variable `CANHAV_CHAIN_ID` to the project's chain, `46630` for Robinhood Chain testnet or `421614` for Arbitrum Sepolia.
3. Copy `.github-templates/canhav-sync.yml` from the CanHav repository to `.github/workflows/canhav-sync.yml`.

## What it sends

- Every `CREATE` in `broadcast/<Script>.s.sol/<chainId>/run-latest.json` as a contract with the contract name as its label. Contracts merge into the Testnet contracts list by address; a known address keeps its row and gains the label when it had none.
- Every line `canhav: <stepId>` in the commit message or the pull request body ticks that build step with the commit as evidence. Step ids are the ones `get_build_steps` lists.

Writes ride the project's agent write mode: in propose mode they wait under Agent changes, in direct mode they land at once. Deployments shows the last sync as a line (commit, date, counts, whether it is waiting). Broadcasts for another chain are refused with a chain mismatch; the workflow logs the answer.

## Related

- [Markdown export and MCP](export-and-mcp.md)
- [Studio+](../accounts/studio-plus.md)
