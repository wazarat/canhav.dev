# CanHav Docs

Source for [docs.canhav.com](https://docs.canhav.com), published with GitBook.

## Structure

| Group | Path | Focus |
|-------|------|--------|
| General | `general/` | Welcome, glossary, litepaper |
| Token Launch | `token-launch/` | Robinhood Chain Testnet launchpad |
| Agent Launch | `agent-launch/` | ERC-8004 on Base Sepolia |

Sidebar order is defined in [`SUMMARY.md`](SUMMARY.md).

## Product strategy

1. **Token Launch** on Robinhood Chain Testnet first
2. **Agent Launch** on ERC-8004 / Base Sepolia next

## Copy rules

- No emojis
- No em dashes (use commas, periods, colons, or hyphens)
- Short pages, one job each
- Tables for addresses and parameters

## GitBook setup

Repo root [`.gitbook.yaml`](../.gitbook.yaml) sets `root: ./docs/`, homepage to Welcome, and sidebar to `SUMMARY.md`.

Full checklist (space, theme, Git Sync, `docs.canhav.com` DNS): see [`SETUP.md`](SETUP.md).
