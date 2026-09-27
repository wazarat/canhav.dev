# Strategy 4. Tokenised stock credit to yield

The most novel path and the one with the most moving parts. A tokenised
stock is collateral for a loan, the loan is deposited into a vault, the vault
share is wrapped and split, and the halves become fixed or variable credit
products.

## The path

1. A holder of a tokenised stock posts it as collateral in an isolated
   market and borrows a stablecoin.
2. The stablecoin is deposited into a vault and earns a floating rate.
3. The vault share is wrapped and split as in strategy 1.
4. The fixed half is a fixed-rate product; the variable half is a leveraged
   view on the vault's rate. Either can be sold or held.

## What is different about the collateral

- Market hours. The stock's reference market closes. Its price feed does not
  update while it is closed, and the on-chain token trades anyway. Decide
  what the lending market does with a stale-by-design feed overnight and at
  weekends, and what a liquidation looks like at the open after a gap.
- Corporate actions. A split changes the number of tokens per share, a
  dividend changes what a token is worth, and the chain expresses these
  through a display multiplier and an actions API. A lending market that
  reads the raw balance is wrong the morning after a split.
- Transfer rules. Who may hold the token decides who may be a borrower and
  who may be a liquidator. If liquidators cannot receive the token, nobody
  liquidates.
- Low-latency feeds. The chain documents signed, pull-based price data with
  an on-chain verifier for exactly this kind of collateral. Use it, and keep
  the sequencer check.

## What the product must decide

- The liquidation threshold for a collateral that gaps at the open, which is
  lower than for one that trades around the clock.
- Whether the loan proceeds are locked into the vault-and-split path or the
  borrower is free. Locked is a structured product; free is a lending market
  with a suggestion.
- The rate labels. This path carries every one of the nine rates.

## What can go wrong

- The stock gaps down over a weekend by more than the buffer. Liquidations
  at the open do not cover the debt.
- A corporate action is missed and positions are valued on the wrong
  multiplier.
- The vault, the wrapper or the market on the yield side has any of the
  failures from strategies 1 to 3, now sitting on top of a loan.

## Evidence to keep

An asset research file for the stock token with the market hours, the
multiplier handling and the transfer rules filled in, the collateral
parameters for the stock market, everything from strategies 1 to 3 for the
yield side, and the disclosure that names every rate in the chain.
