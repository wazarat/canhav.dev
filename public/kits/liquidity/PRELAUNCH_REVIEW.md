# Pre-launch review

Twenty-eight passes to run before a liquidity product holds value. Each is a
claim with evidence behind it, so the result of a pass is not a tick but a
pointer to where the evidence lives (a test, a screenshot, a document, a
script). The CanHav studio records a verdict per pass on the Security step,
and the project's MCP server offers a `prelaunch_review` prompt that walks
them against a repository. Each pass names the shapes it applies to.

Passes 1 to 13 are shared with the credit kit and apply to the vault shapes
(Curated vault, Earn inside your app, Liquidity allocator, Permissioned
vault). Passes 14 to 19 are the vault operations passes for Liquidity
allocator and Permissioned vault. Passes 20 to 28 are the pool passes; 12
and 13 apply to pools as well.

| # | Pass | Shapes | What counts as evidence |
|---|------|--------|-------------------------|
| 1 | Wording matches what the contracts do | vault shapes | A glossary diff against the protocol docs |
| 2 | The protocol and the curator are named where the user decides | vault shapes | A screenshot of the commit screen |
| 3 | Risks are disclosed before the first commit | vault shapes | The disclosure copy and the gate that shows it |
| 4 | Every rate is named, sourced and dated | vault shapes | A screenshot per surface with each line labelled |
| 5 | Asset and share conversions are shown and bounded | vault shapes | Preview versus execution test, slippage bound in the transaction layer |
| 6 | Displayed numbers reproduce from on-chain state | vault shapes | A script that recomputes them from contract reads |
| 7 | Irreversible actions are clear and confirmed | vault shapes | The confirmation flow, simulate then explain then confirm then execute |
| 8 | Positions, history and exits are findable | vault shapes | A walkthrough from sign-in to exit without support |
| 9 | Every asset passed the token integration checklist | vault shapes | One research file per asset with the checklist result |
| 10 | Invariants are under property tests | vault shapes | The table mapping each credit kit invariant to its test |
| 11 | The deployment target matches what is actually deployed | vault shapes | The manifest, the verified addresses and the date |
| 12 | Static analysis and standard conformance ran clean | every shape | Tool output and the written justification for anything left open |
| 13 | No admin role sits on a single wallet | every shape | The role table with signer sets and timelocks |
| 14 | The dead deposit was made on the empty vault | allocator, permissioned | The transaction in the specification and the inflation test |
| 15 | Every gate has written exit rights the contract enforces | permissioned | The eligibility file and a test per right |
| 16 | The unwind and the emergency procedures were rehearsed on a fork | allocator, permissioned | The runs and the order of withdrawal |
| 17 | A lender run was simulated while borrowers kept their loans | allocator, permissioned | The scenario file with numbers and the deposit-screen disclosure |
| 18 | Allocator parameters, fee budget and failure handling are written down and tested | allocator | The specification and a test that forces a failed reallocation |
| 19 | Every release gate has signed evidence | allocator, permissioned | The seven phases with owners and dates, the address registry |
| 20 | The pool was initialised and seeded in one transaction | pools | The transaction and the parameters worksheet |
| 21 | Every address comes from the testnet manifest with provenance | pools | The manifest and a script that calls a view on every contract |
| 22 | The hook's address carries exactly the permissions it implements | hooks | The design file and the permission test |
| 23 | The fee schedule is bounded, tested at every condition and shown on the swap screen | hooks | The schedule, the tests and the screen |
| 24 | Every delta the hook returns reconciles and takes no custody | hooks | The settle-to-zero test and the design file |
| 25 | Sandwich, just-in-time liquidity and oracle manipulation were simulated | pools | The fork runs with results |
| 26 | The pool invariants are under property tests | pools | The mapping table and the run, re-run with the hook attached |
| 27 | The deployment target matches what the team actually deployed | pools | The manifest and the explorer verification links |
| 28 | Divergence loss and the fee tier are disclosed where a provider commits | pools | The screen where liquidity is added |

## How to run it

1. Call `get_prelaunch_review` on the project's MCP server, or open the
   Security step in the studio, for the passes that apply to your shapes.
2. For each pass, find the evidence in the repository. Pass only when you can
   point at it. Fail when the check is not met. Not applicable with a one
   line reason.
3. Record the verdict in the studio. The exports carry it, and the next
   reviewer starts from it.
4. A Fail is not a launch blocker by itself; an open pass with no evidence
   is.
