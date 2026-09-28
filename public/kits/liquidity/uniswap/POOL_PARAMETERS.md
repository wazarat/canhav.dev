# Pool parameters

One copy per pool. Every value here is a product decision with a reason,
not a default copied from a tutorial. Blanks look like `[...]`. The filled
file is the input to the seed transaction in `DEPLOY_TESTNET_46630.md`.

## Concentrated pool (v4)

### Pool key

| Field | Value | Why |
|-------|-------|-----|
| currency0 | `[address, the lower one]` | `[...]` |
| currency1 | `[address]` | `[...]` |
| fee | `[in hundredths of a basis point, or the dynamic flag]` | `[who trades this pair and what they will pay]` |
| tickSpacing | `[...]` | `[precision of ranges against gas per swap]` |
| hooks | `[zero address, or the mined hook address]` | `[...]` |

Currencies are ordered by address. Native currency is the zero address.
The pool id is the hash of this key; write it down once the pool exists.

### Starting price

| Field | Value | Why |
|-------|-------|-----|
| Reference price of currency1 in currency0 | `[...]` | `[source and date]` |
| sqrtPriceX96 | `[...]` | `[computed from the reference, tool used]` |
| Tick at that price | `[...]` | `[...]` |

### First position

| Field | Value | Why |
|-------|-------|-----|
| tickLower | `[...]` | `[the range you want depth in]` |
| tickUpper | `[...]` | `[...]` |
| liquidity | `[...]` | `[computed with LiquidityAmounts from the amounts below]` |
| amount0Max | `[...]` | `[what you are willing to put in]` |
| amount1Max | `[...]` | `[...]` |
| Recipient of the position | `[a role-model key]` | `[...]` |
| Deadline | `[...]` | `[...]` |

Initialise and mint in one transaction. An initialised pool with no
liquidity can be priced by whoever arrives first.

### Later providers

- Ranges the product suggests, and how it shows a position that has left
  its range. `[...]`
- The divergence loss disclosure, on the screen where the position is
  minted. `[...]`

## Basic pool (v2)

### The pair

| Field | Value | Why |
|-------|-------|-----|
| tokenA | `[...]` | `[...]` |
| tokenB | `[...]` | `[...]` |
| Reference price | `[...]` | `[source and date]` |

### First deposit

| Field | Value | Why |
|-------|-------|-----|
| amountADesired | `[...]` | `[...]` |
| amountBDesired | `[...]` | `[matches the reference price]` |
| amountAMin | `[...]` | `[slippage you accept on the seed]` |
| amountBMin | `[...]` | `[...]` |
| Recipient of the liquidity token | `[a role-model key]` | `[...]` |
| Deadline | `[...]` | `[...]` |

The ratio of the two amounts is the opening price. A deposit at the wrong
ratio hands the difference to the first trader. Always go through the
router. The first thousand units of liquidity are burned forever by the
pair; that is expected.

### Fees

- Swap fee is fixed by the pair at thirty basis points to providers.
- Protocol fee switch. Off, or on with the recipient behind a role-model
  key. `[...]`

## Both

- Slippage bound and deadline the front end uses on swaps. `[...]`
- Quote shown before every send, from the quoter or the router's view.
  `[...]`
- Price impact at which the front end warns. `[...]`
- Events indexed, and where. `[...]`
