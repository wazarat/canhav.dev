# Staking pre-launch review

The review passes the CanHav studio records verdicts for, in the order a
reviewer takes them. A verdict is a claim with evidence behind it, so each
pass names what the evidence is. The two passes every shape shares, static
analysis and key custody, apply here too.

1. **The exchange rate has one source and only a slash can lower it.** Evidence is the rate contract and the property test that fails on any other decrease.\n2. **A holder can see when they get out.** Evidence is the queue screen with a place and a date, and the test that serves the queue in order.\n3. **What is slashed and who absorbs it is written where the user commits.** Evidence is the deposit or operator screen and the slash path in the contracts.

Record each verdict in the studio with a pointer to where the evidence lives
in the repository, or through `update_project` with the pass id.
