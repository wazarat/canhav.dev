# Hook design

Written before the first line of the hook, because the permissions decide
the address and the address is mined before deployment. One file per hook.
Blanks look like `[...]`.

## What it does

- In one sentence. `[...]`
- Which pools it serves. One, or many with different keys. `[...]`
- Why a hook and not a separate contract or an off-chain rule. `[...]`

## Permissions

Tick only the callbacks the hook implements. Each one is a flag bit in the
address, and each one is attack surface.

| Callback | Used | What it does here |
|----------|------|-------------------|
| beforeInitialize | `[ ]` | `[...]` |
| afterInitialize | `[ ]` | `[...]` |
| beforeAddLiquidity | `[ ]` | `[...]` |
| afterAddLiquidity | `[ ]` | `[...]` |
| beforeRemoveLiquidity | `[ ]` | `[...]` |
| afterRemoveLiquidity | `[ ]` | `[...]` |
| beforeSwap | `[ ]` | `[...]` |
| afterSwap | `[ ]` | `[...]` |
| beforeDonate | `[ ]` | `[...]` |
| afterDonate | `[ ]` | `[...]` |
| beforeSwapReturnDelta | `[ ]` | `[...]` |
| afterSwapReturnDelta | `[ ]` | `[...]` |
| afterAddLiquidityReturnDelta | `[ ]` | `[...]` |
| afterRemoveLiquidityReturnDelta | `[ ]` | `[...]` |

- Mined salt. `[...]`
- Address and the bits it carries, checked after deployment. `[...]`

## Fee schedule

Only for a pool with the dynamic fee flag. The mechanism is the
protocol's; the schedule is your product, and nobody prescribes it.

| Condition | Input read | Fee | Bound |
|-----------|------------|-----|-------|
| Normal | `[...]` | `[...]` | `[...]` |
| `[underlying market closed]` | `[market hours source]` | `[...]` | `[...]` |
| `[volatility above a threshold]` | `[...]` | `[...]` | `[...]` |
| `[depth below a threshold]` | `[...]` | `[...]` | `[...]` |

- Maximum fee the hook can ever set, enforced in the contract. `[...]`
- Who can change the schedule, behind what delay, and how a provider sees
  the change coming. `[...]`
- Where each condition's input comes from, and what the hook does when it
  is stale or missing. `[...]`
- How the current fee is shown on the swap screen. `[...]`

A schedule that charges five basis points in normal hours, twenty when the
underlying market is closed, thirty-five when volatility rises and fifty
when depth falls is an example architecture, not a recommendation.

## Custom accounting

Only for a hook that returns deltas.

- Which deltas, on which callbacks, and why. `[...]`
- Where the tokens the hook takes or gives come from and go to. `[...]`
- The test that shows every unlock settles to zero with the hook's deltas
  included. `[test name]`
- What the hook can never do. Take custody outside its declared deltas,
  block a withdrawal, change a fee beyond the bound. `[...]`

## Gating

Only for a hook that restricts who may swap or provide.

- The allowlist, who maintains it and where it lives. `[...]`
- What a party removed from the list can still do. Remove liquidity,
  always. `[...]`

## External dependencies

| Dependency | Read on | Stale or down means |
|------------|---------|---------------------|
| `[oracle, market hours, registry]` | `[callback]` | `[...]` |

## Risk categories

One sentence per category from the protocol's security framework, saying
whether it applies and how it is handled.

- Custom accounting. `[...]`
- Dynamic fees. `[...]`
- Autonomous parameter changes. `[...]`
- External dependencies. `[...]`
- Upgradeability. `[...]`
- Liquidity behaviour. `[...]`
- Reentrancy through the pool manager. `[...]`
- Access to the caller's identity inside a callback. `[...]`

## Tests before a fork

- Every enabled callback exercised on testnet 46630 from a script.
- Adversarial swaps, sandwich and just-in-time liquidity, simulated with
  the results recorded.
- Oracle manipulation on any input the fee reads.
- The permission bits, by calling a disabled callback and expecting a
  revert.
- The invariants in `POOL_INVARIANTS.md` marked for hooks.
