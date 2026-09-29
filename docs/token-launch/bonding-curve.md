# Bonding curve

**Available now** on Robinhood Chain Testnet.

Every launch made through `/launch` since September 29, 2026 goes through the **CurveLauncher**. The launcher mints the whole supply to itself, sells most of it along a bonding curve, and when enough ETH has been raised it seeds a LaunchAMM pool and keeps the pool shares forever. Nothing here is a fee switch. Every number below is an immutable set when the launcher was deployed, readable on the contract.

## The curve

The curve is a constant product with virtual reserves, the same shape the large launchpads use. At launch the launcher records a virtual ETH reserve `x0` and a virtual token reserve `y0`. A buy moves ETH into `x` and tokens out of `y` so that `x * y` never decreases; a sell does the reverse. The price at any moment is `x / y`.

| Parameter | Value on testnet | Where it comes from |
|-----------|------------------|---------------------|
| Graduation threshold | 0.1 ETH of real ETH raised | `graduationEth` |
| Sold on the curve | 80% of the supply | `curveShareBps = 8000` |
| Reserved for the pool | 20% of the supply | the rest |
| Virtual ETH reserve `x0` | 0.0333 ETH | `virtualEthReserve`, derived as `threshold * 2000 / 6000` |
| Virtual token reserve `y0` | 1,066,666,666.67 tokens for a 1 billion supply | `curveSupply * (x0 + threshold) / threshold`, per launch |
| Snipe tax window | the first 60 seconds after launch | `snipeWindowSeconds` |
| Snipe tax | 20% of every buy inside the window | `snipeTaxBps = 2000` |
| Developer buy cap | 0.005 ETH | `maxDevBuy`, 5% of the threshold |

`x0` is derived from the threshold and the curve share so that the curve's end price equals the pool's opening price. With these numbers a 1 billion supply opens at about 3.1e-11 ETH per token and graduates at 5e-10, a 16x move across the curve.

Supply is per launch. A launch from a published design keeps that document's total because the number sits inside the committed snapshot hash. The launcher scales the token side of the curve; the ETH side is the same for every launch, so every curve raises the same 0.1 ETH and seeds the same pool ETH.

## The launch window and the snipe tax

For the first 60 seconds after launch every buy pays a 20% tax. The tax is taken off the ETH before it prices the buy, so a taxed buy gets fewer tokens, and the taxed ETH is held aside in a pot rather than entering the reserve. At graduation the pot is added to the ETH that seeds the pool. Early snipers fund locked liquidity for everyone.

The window is measured in seconds, not blocks. On Arbitrum Nitro chains `block.number` reports the parent chain's block, so a block-based window would not measure this chain's time. Sells are never taxed.

The developer's own first buy, made inside the launch transaction, is exempt from the tax. It is provably the first buy because the token did not exist before that transaction, and it is capped at 0.005 ETH so it can never graduate the curve on its own.

## Graduation

When the real ETH raised reaches 0.1 ETH the launcher graduates the curve in the same transaction as the buy that reached it. Any ETH beyond the threshold is refunded to the buyer. The launcher then

1. creates a LaunchAMM pool for the token with the protocol fee opted out,
2. adds the raised ETH plus the tax pot and the reserved 20% of the supply as the first liquidity, and
3. keeps the liquidity shares.

The pool's opening price equals the curve's end price, plus a premium of the tax pot divided by the threshold. That premium is the tax becoming liquidity, not a bug.

After graduation `buy` and `sell` on the launcher revert with `CurveGraduated`. Trading continues in the pool, which the token page and Explore show in place of the curve.

## Locked liquidity

LaunchAMM shares cannot be transferred or burned, and the launcher has no code path that calls `removeLiquidity`. So the shares the launcher holds are locked forever. The 0.30% LP fee on every swap compounds into those locked reserves. The pool opts out of the protocol fee because the AMM keys accrued fees by account, which would pool every developer's share in one bucket.

## Fees and admin

| Item | Detail |
|------|--------|
| Launch fee | `launchFee` on the launcher, 0.0002 ETH, capped by `MAX_LAUNCH_FEE = 0.05 ether`, settable only through the timelock |
| Trade fee on the curve | none |
| Owner | the [TimelockController](governance.md) |
| Pause | stops new launches and buys; sells always work |
| Withdraw | moves only accrued launch fees to the treasury, never curve ETH |

## What the site shows

The launch form shows the opening price for your developer buy before you sign. The token page shows the curve with its price, the ETH raised against the threshold, the tax window countdown, the tax held, the recent trades and a buy and sell form, then the locked pool once the curve has graduated. Explore shows an "On the curve" chip with the progress or a "Graduated" chip, and prices from the curve until a pool exists.

## How to verify

1. Open the launcher on the [explorer](https://explorer.testnet.chain.robinhood.com/address/0xb2e1F2df7775d17CE70c8CE7586c7bb01bD10981) and read `graduationEth`, `curveShareBps`, `virtualEthReserve`, `snipeWindowSeconds`, `snipeTaxBps` and `maxDevBuy`.
2. Read `curve(token)` for any curve launch. `virtualEth` minus `virtualEthReserve` is the ETH raised.
3. After graduation, read `pool(poolId)` on LaunchAMM and confirm `creator` is the launcher and `protocolFeeBps` is 0, then `sharesOf(poolId, launcher)`.
4. Ask an agent. `get_curve_status` returns the same numbers.

## Related

- [Create a token](create-a-token.md)
- [AMM and fees](amm-and-fees.md)
- [Fees and economics](fees-and-economics.md)
- [Contract guarantees](contract-guarantees.md)
- [Contract addresses](contract-addresses.md)
