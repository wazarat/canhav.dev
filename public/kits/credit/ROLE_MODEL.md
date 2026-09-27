# Role model

Who can change what, and what stands between them and user funds. Decide
this before the first deposit. Every role below is an identity with a key;
"the team" is not an answer.

## Roles

| Role | Can | Cannot | Held by |
|------|-----|--------|---------|
| Owner | Change the rules of the vault or product, assign other roles, set the timelock | Move user funds directly | `[Safe, threshold, signers]` |
| Curator | Set risk limits, caps, list or delist markets and adapters (subject to the timelock) | Bypass the timelock, change the fee recipient | `[...]` |
| Allocator | Move capital between already listed markets inside the caps | Exceed a cap, list a market | `[...]` or an automation key with a spending policy |
| Risk manager | Propose parameter changes with a written justification | Execute them alone | `[...]` |
| Sentinel or guardian | Pause, revoke a queued change, force a deallocation | Change parameters, take fees | `[...]` |
| Fee manager | Set the fee within a stated ceiling, change the fee recipient (timelocked) | Anything else | `[...]` |
| Automation bot | Rebalance, reallocate, post monitoring | Hold more authority than an allocator | `[key, host, who can rotate it]` |

## Rules

- No role sits on a single externally owned wallet in production. Multisig
  for humans, a scoped key with a policy for bots.
- Timelocked changes are announced where depositors can see them, and the
  timelock is long enough for a depositor to exit.
- The sentinel exists to be fast, so it holds the smallest possible power.
- Every role assignment is written in the design document with the date and
  the signer set. Rotations are logged.

## Policy engine

Some rules can be enforced rather than promised. A transaction guard on the
Safe that holds a role can reject a call that would breach a policy such as

- no allocation above `[x]%` of assets to one market
- no listing of an asset that has not passed the integration checklist
- no fee increase without the timelock
- emergency withdrawal always allowed

Write down which rules are enforced in code and which are procedure. The
CanHav project page separates enforced from stated for a reason.
