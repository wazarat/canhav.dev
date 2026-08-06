# CanHav Docs (maintainers)

Maintainer notes for the Git Sync source of [docs.canhav.com](https://docs.canhav.com). This file is for contributors. Visitors should land on [Welcome to CanHav](general/welcome-to-canhav.md).

If GitBook still publishes this README as a top-level page, set the site homepage to Welcome in Git Sync / `.gitbook.yaml` and republish.

## Structure

| Group | Path | Focus |
|-------|------|--------|
| Getting started | `general/` | Welcome, what CanHav is, glossary, litepaper |
| Projects | `ideation/` | Product and Token tracks, computed outputs, warnings, public pages |
| Token Launch | `token-launch/` | Launchpad, deploy paths, fees, guarantees |
| Accounts | `accounts/` | Clerk (in development) |
| AI and IDE | `ai/` | Export and MCP (in development) |
| Reference | `reference/` | Networks and factory versions |
| Agent Launch | `agent-launch/` | ERC-8004 (not started; pages retained, demoted) |

Sidebar order is defined in [`SUMMARY.md`](SUMMARY.md).

## Product surfaces

1. **Token Launch** on Robinhood Chain Testnet (available now)
2. **Projects** ideation tracks (available now)
3. **Accounts / AI export** (in development)
4. **Foundry scaffold generator** (deferred)
5. **Agent / ERC-8004** (not started)

## Copy rules

- No emojis
- No em dashes (use commas, periods, colons, or hyphens)
- Short pages, one job each
- Status marker on every page: Available now / In development / Deferred / Not started
- Tables for addresses and parameters
- Do not describe in-progress features in the present tense

## Theme

Light theme / white background is a GitBook **Customization** setting. Steps: [`SETUP.md`](SETUP.md).

## GitBook setup

Repo root [`.gitbook.yaml`](../.gitbook.yaml) sets `root: ./docs/`, homepage to Welcome, and sidebar to `SUMMARY.md`.

Full checklist (space, theme, Git Sync, `docs.canhav.com` DNS): see [`SETUP.md`](SETUP.md).
