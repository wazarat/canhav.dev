# Cover and governance pre-launch review

The review passes the CanHav studio records verdicts for, in the order a
reviewer takes them. A verdict is a claim with evidence behind it, so each
pass names what the evidence is. The two passes every shape shares, static
analysis and key custody, apply here too.

1. **A claim travels from filing to payout as the written path says.** Evidence is the claims path worksheet beside the tests for a filed, a disputed and a rejected claim.
2. **The shortfall rule holds under a claim larger than the pool.** Evidence is the Foundry trace of a claim beyond the pool's capital and the buyer screen that showed the limit.
3. **A proposal passes, queues and executes only as the rules say.** Evidence is the governance parameters worksheet beside the test trace with a failed quorum and a cancelled proposal.
4. **Nothing moves the treasury except the timelock.** Evidence is the invariant test over every spend path and the list of scoped roles the vote set.
5. **Every power outside the vote or the claim path is named, keyed and disclosed.** Evidence is the role model with a key, a limit and a sunset per power, and the holder or buyer screen that shows them.

Record each verdict in the studio with a pointer to where the evidence lives
in the repository, or through `update_project` with the pass id.
