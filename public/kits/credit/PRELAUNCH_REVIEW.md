# Pre-launch review

Twenty-two passes to run before a credit product holds value. Each is a claim
with evidence behind it, so the result of a pass is not a tick but a pointer
to where the evidence lives (a test, a screenshot, a document, a script).
The CanHav studio records a verdict per pass on the Security step, and the
project's MCP server offers a `prelaunch_review` prompt that walks them
against a repository.

Passes 1 to 8 follow the shape of the protocol's own review checkers for earn
and borrow surfaces. Passes 9 and 10 apply to anything with borrowers.
Passes 11 to 15 apply to every shape. Passes 16 to 22 apply to the fixed
income and leveraged yield shapes, each to the shapes named.

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
| 16 | The wrapper passed the conformance suite and reads the underlying accounting (Fixed-rate yield on your asset) | The CI run of the wrapper tests on a fork, and the vault-loss test |
| 17 | Maturity and rollover are disclosed before the first commit (every fixed income and leveraged yield shape) | The commit screen with the date and the exit terms, and the rollover plan with an owner |
| 18 | The fixed rate is shown as fixed to maturity and quoted from a simulation (shapes that buy or sell a half) | A purchase where the simulated quote and the fill match, and the screen with the implied rate on its own line |
| 19 | The fixed half is valued by a deterministic discount feed with a fresh timestamp (shapes that take it as collateral) | The market's oracle address, the collateral parameter template, a test at maturity |
| 20 | Leverage is capped in the contract and the breakeven rate is on the screen (Leveraged fixed-yield loop) | The revert test past the cap, the screen, the rate-shock run of the unwind |
| 21 | The decay to zero and the breakeven rate are disclosed (Yield-token products) | The screens and the breakeven calculation |
| 22 | Cross-protocol invariants are under property tests on a fork (every fixed income and leveraged yield shape) | The table mapping each statement to its test, and the run |

## Recording verdicts

- Pass, with a link to the evidence.
- Fail, with the smallest change that would make it pass.
- Not applicable, with a one-line reason. "We did not get to it" is a Fail.

Re-run the passes after any change that touches value flows. The worst-case
answer in the project record decides how much scrutiny that deserves.
