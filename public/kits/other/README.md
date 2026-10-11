# CanHav cover and governance kit

Files for teams building cover pools and token governance on Robinhood
Chain or Arbitrum, written by CanHav to sit beside the protocol
documentation rather than replace it. Everything here is served raw from
canhav.com and is safe to copy into a repository. The product shapes in this
kit rely on no single protocol; the contract templates on each build step
say what runs on each chain, and the catalog at `/studio/templates` lists
them all.

## What is here

| File | Use it when |
|------|-------------|
| `SKILL.md` | You want your coding agent to know how this kit fits together and how to decide templates with you. |
| `ARCHITECTURE.md` | You are writing the design document for a cover pool or a token governance stack. |
| `POLICY_TERMS.md` | You are writing the covered event, the exclusions, the premium rule, the payout formula and the limit. |
| `CLAIMS_PATH.md` | You are deciding who decides a claim, the bond, the dispute window and what happens when the pool is short. |
| `GOVERNANCE_PARAMETERS.md` | You are setting the voting token, threshold, delay, period, quorum, timelock, kept roles and emergency powers. |
| `PRELAUNCH_REVIEW.md` | You want the review passes a reviewer walks before anything holds value. |

## How to use it with a coding agent

1. Add your project's CanHav MCP server. The connect card on the project page
   has the exact command. `get_resource_pack` returns the reading list you
   ticked in the studio with the `templates` and `features` blocks,
   `get_build_steps` the steps, `get_templates` the contract templates per
   step with your decisions.
2. Install `SKILL.md` as a skill or paste it into your agent's instructions.
   It tells the agent to load the pack first, to decide templates only with
   you, and never to fork a restricted license.
3. Read `ARCHITECTURE.md` for the shape and fill it. Fill `POLICY_TERMS.md`
   and `CLAIMS_PATH.md` before a policy is sold, and
   `GOVERNANCE_PARAMETERS.md` before the voting token trades.
4. Keep the testnet manifest as the one source of truth for addresses. The
   code reads that file and nothing else.

## Templates and where they run

Every build step in the studio lists the contract templates that fit it with
the mainnet status on your project's chain. Accept what you will build on or
integrate, reject what you will not, and the decision travels into
`RESOURCES.md`, `AGENTS.md` and the MCP tools. A template marked Unknown or
Not deployed on your mainnet is a design reference, not a build plan, until
you have confirmed it on the explorer.
