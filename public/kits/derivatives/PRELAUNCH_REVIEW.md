# Derivatives pre-launch review

The review passes the CanHav studio records verdicts for, in the order a
reviewer takes them. A verdict is a claim with evidence behind it, so each
pass names what the evidence is. The two passes every shape shares, static
analysis and key custody, apply here too.

1. **Every price is traced from the feed to the number that moves money.** Evidence is the price path document and a test where a stale report reverts.\n2. **The venue survives a price gap past the liquidation line.** Evidence is the Foundry trace of a one-block jump past the line with the venue solvent after.\n3. **Funding and premium are shown before the user commits.** Evidence is a screenshot of the commit screen with the number on it.\n4. **Expiry settles from a bounded feed and a missing price has a path.** Evidence is the settlement section of the schedule worksheet and the test for the missing case.\n5. **The hedge stays inside the band and the venue's failure has an unwind.** Evidence is the band test and the unwind section of the architecture document.

Record each verdict in the studio with a pointer to where the evidence lives
in the repository, or through `update_project` with the pass id.
