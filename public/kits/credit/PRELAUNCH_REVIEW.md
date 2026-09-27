# Pre-launch review

Fifteen passes to run before a credit product holds value. Each is a claim
with evidence behind it, so the result of a pass is not a tick but a pointer
to where the evidence lives (a test, a screenshot, a document, a script).
The CanHav studio records a verdict per pass on the Security step, and the
project's MCP server offers a `prelaunch_review` prompt that walks them
against a repository.

Passes 1 to 8 follow the shape of the protocol's own review checkers for earn
and borrow surfaces. Passes 9 and 10 apply to anything with borrowers.
Passes 11 to 15 apply to every shape.

| # | Pass | What counts as evidence |
|---|------|-------------------------|
| 1 | Wording matches what the contracts do | A glossary diff against the protocol docs |
| 2 | The protocol and the curator are named where the user decides | A screenshot of the commit screen |
| 3 | Risks are disclosed before the first commit | The disclosure copy and the gate that shows it |
| 4 | Every rate is named, sourced and dated | A screenshot per surface with each line labelled |
| 5 | Asset and share conversions are shown and bounded (vault-side shapes) | Preview versus execution test, slippage bound in the transaction layer |
| 6 | Displayed numbers reproduce from on-chain state | A script that recomputes them from contract reads |
| 7 | Irreversible actions are clear and confirmed | The confirmation flow, simulate then explain then confirm then execute |
| 8 | Positions, history and exits are findable | A walkthrough from sign-in to exit without support |
| 9 | Position health and liquidation are surfaced before they bite (borrow-side shapes) | The health screen, the warning path, the liquidation copy |
| 10 | Stale or missing prices fail safe (borrow-side shapes) | A test that forces a stale price and a sequencer outage |
| 11 | Every asset passed the token integration checklist | One research file per asset with the checklist result |
| 12 | Static analysis and standard conformance ran clean | Tool output and the written justification for anything left open |
| 13 | Invariants are under property tests | The table mapping each invariant to its test |
| 14 | No admin role sits on a single wallet | The role table with signer sets and timelocks |
| 15 | The deployment target matches what is actually deployed | The manifest used, and the date its addresses were re-verified |

## Recording verdicts

- Pass, with a link to the evidence.
- Fail, with the smallest change that would make it pass.
- Not applicable, with a one-line reason. "We did not get to it" is a Fail.

Re-run the passes after any change that touches value flows. The worst-case
answer in the project record decides how much scrutiny that deserves.
