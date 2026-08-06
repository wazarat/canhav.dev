# Deploy paths

**Available now** on Robinhood Chain Testnet.

There are two ways to launch a token through `/launch`. Both use TokenFactory v4. They differ in what `journeyHash` means and how the token page labels the launch.

## Quick deploy (no design record)

Use `/launch` without a design id.

1. You fill the launch form (name, ticker, supply, journey, optional vesting).
2. The launch commits a classic **JourneyDoc** hash as `journeyHash` (and stores the journey blob).
3. On `/launch/t/[address]`, when that hash resolves in the journeys table, the page shows:

**Quick deploy, no design record**

That label means this token was launched without a published Projects token design snapshot. There is no ideation design page to attach by default.

## Design deploy

Use `/launch?design=<id>` from a **published** token design (or an equivalent entry point that passes the design id).

1. The form prefills from the design (name, ticker, supply, and team vesting months where applicable).
2. Step 2 becomes a design commitment card instead of a free-form journey editor.
3. The launch commits the design **snapshot hash** as `journeyHash`. The journeys POST for a classic JourneyDoc is skipped.
4. On success, attach-deploy links the on-chain token to the design (server re-verifies via indexer `journeyHash` match).
5. On `/launch/t/[address]`, when that hash resolves in `ideation_snapshots`, the page shows **Design committed on-chain** and links to the design.

Publishing a design does not deploy. Deploying is a separate wallet transaction.

## How journeyHash discriminates the path

| Path | What journeyHash is | Where it resolves |
|------|---------------------|-------------------|
| Quick deploy | Hash of the v1 JourneyDoc | `launchpad.journeys` |
| Design deploy | Content-addressed ideation snapshot hash | `launchpad.ideation_snapshots` |

The table the hash resolves in is the path discriminator. No separate on-chain flag is required.

If the hash resolves in neither table, the token page shows that there is no design record (and no verified journey blob).

## Why the Quick deploy label exists

Readers should not confuse a free-form journey launch with a published, snapshotted token design. The label makes the missing design record visible instead of silent.

## Related

- [Create a token](create-a-token.md)
- [Journey and credibility](journey-and-credibility.md)
- [Public pages](../ideation/public-pages.md)
- [Token track](../ideation/token-track.md)
- [Enforced versus stated](../ideation/enforced-vs-stated.md)
