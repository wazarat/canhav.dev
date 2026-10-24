---
name: canhav-rwa-kit
description: How to build a rwa product on Robinhood Chain or Arbitrum with the CanHav research kit. Use when a project has a CanHav resource pack, when it targets tokenized securities, private credit pools or reserve-backed tokens, or when asked to plan, review or document such a product.
---

# CanHav RWA kit

You are helping a small team build a rwa product on Robinhood
Chain or Arbitrum. The team has chosen one or more product shapes in the
CanHav studio, ticked what the product includes, and is deciding contract
templates step by step. Your job is to work from that record, not from
memory.

## First, load the pack

- If the project's CanHav MCP server is connected, call `get_resource_pack`.
  Read the `readFirst` ids in order and fetch every `rawUrl` into context
  before proposing anything. Read `chain`, `templates` and `features`.
- If there is no MCP connection, read `RESOURCES.md` in the repository. Core
  items are numbered in reading order and the Contract templates section
  carries the decisions.
- Respect the flags on resources and the `availability` on templates.
- Call `get_comparables` on the project's MCP server for how protocols in this
  subsector are built, how they differ and what goes wrong with each design.
  It carries no metrics or dates on purpose; read the linked docs for anything
  current. Read its risks before the security review passes.

## Then, work in this order

1. Read `ARCHITECTURE.md` for the product shape and fill in every blank you
   can from the project record. Do not invent an issuer, a custodian or an
   attester. Counsel decides most of a security token; say what is theirs.
2. Fill `TRANSFER_RULES.md` before any token is issued,
   `RESERVE_ATTESTATION.md` before the first mint and `CREDIT_WATERFALL.md`
   before the first loan. A rule that overrides a holder's exit right is a
   finding.
3. Work the build steps from `get_build_steps` in order and tick a step only
   when the work is written down and you can point to it. Tick it with
   `set_build_steps` right after you finish it, with the file that proves
   it in evidence, rather than at the end of the session. A step that does
   not fit this product is marked notApplicable with the reason. Report the
   run with `report_session`, the plan before you start, updated after each
   step, `awaiting_input` when you need the owner, `done` at the end.
4. Before anything holds value, walk `PRELAUNCH_REVIEW.md` and record a
   verdict with evidence for every pass.

## Contract templates

- Call `get_templates` on the project's MCP server. It returns every
  contract template attached to the project's build steps with its kind,
  license class, chain status on the project's chain, audits, complexity
  and the team's decision, accepted, rejected or undecided. The rest of the
  catalog for the project's subsectors is under `unplaced`.
- Propose a decision for every undecided template and record it with
  `set_template_decisions` only after the team has agreed in the
  conversation. Say why in one sentence. Never accept on the team's behalf
  without that sentence.
- Never fork, copy or vendor a template whose license class is Restricted.
  Integrate it through its deployed contracts or its SDK, or reject it and
  say which permissive or copyleft template takes its place. A copyleft
  template may be forked only when the team has read the license and the
  project's own license is compatible.
- A template marked Not deployed or Unknown on the project's mainnet is not
  a build plan. Work against a fork or a mock, say so in the plan, and keep
  the testnet manifest as the source of truth.
- A template marked Inactive is background reading.
- Where a step's templates disagree with each other, prefer the one a ticked
  feature suggests (`suggestedBy` on `get_templates`), then the audited one,
  then the lower complexity.

## Features

- `get_build_steps` carries a `features` block, what the product includes as
  the team ticked it. A ticked feature lists the steps it gates and ranks
  the templates it suggests first. Change it with `set_features` only after
  the team has said what the product includes. Never untick a feature to
  make the list shorter.

## Never

- Never send a transaction from intent straight to broadcast. Simulate it,
  show the decoded call and the addresses, and wait for the team.
- Never invent an address. Every address comes from the manifest, the
  template's official deployment record or the explorer.
- Never report a review pass as passed without naming where the evidence
  lives.
