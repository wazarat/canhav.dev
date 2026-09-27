# Standardized yield wrapper checklist

Run this before a market is opened on any wrapper, whether you wrote the
wrapper or picked one of the common ones. Every line ends in a piece of
evidence that lives in your repository. A line with no evidence is not done.

The wrapper is the contract that turns a yield-bearing asset into a
standard interface the protocol can split into a fixed half and a variable
half. Its one number that matters is the exchange rate, the value of one
wrapped unit in the asset. Everything downstream, the halves, the pool, the
collateral feed, reads that number.

## 1. Choose the wrapper

- [ ] The asset's yield source is written down in one sentence, with the
      contract that pays it. `[...]`
- [ ] If the asset is an ERC-4626 vault share, the common wrapper for vault
      shares is used rather than a custom one, and the adapter it needs is
      listed. Evidence, the wrapper contract name and the adapter address.
- [ ] If the asset rebases, charges a fee on transfer, or pays rewards in a
      second token, the wrapper handles each case and a test shows it.
- [ ] If the asset has fewer than 18 decimals, the decimals wrapper is in the
      path and the test suite runs with the real decimals.
- [ ] The asset has passed the token integration checklist from the resource
      pack and its asset research file is filled in.

## 2. Exchange rate

- [ ] The exchange rate is read from the underlying accounting, never from a
      price on a pool.
- [ ] The rate is monotone in normal operation and the test suite has a case
      where the underlying vault takes a loss and the rate falls in the same
      block.
- [ ] previewDeposit and previewRedeem match deposit and redeem within one
      unit of rounding, rounding in the wrapper's favour. Evidence, the
      conformance test output.
- [ ] A donation to the wrapper or the vault before the first deposit cannot
      inflate the first depositor's share. Evidence, the test.
- [ ] The rate cannot be moved by a flash loan within one transaction.
      Evidence, the test or a written argument with the call graph.

## 3. Conformance

- [ ] The protocol's wrapper test suite runs in CI against a fork of mainnet
      4663 and passes. Evidence, the CI link.
- [ ] Every function of the standard interface is implemented, including the
      reward hooks even if they return empty arrays.
- [ ] getTokensIn and getTokensOut list every asset a user can deposit or
      receive, and no others.

## 4. Roles and upgrades

- [ ] Who can pause, upgrade or change an adapter is written in the role
      model with the key that holds it. A single wallet is a finding.
- [ ] Upgrade paths, if any, sit behind a timelock and the delay is stated.
- [ ] The emergency path is written down. What a user can still do when the
      wrapper is paused.

## 5. Ready for a market

- [ ] The wrapper address on mainnet 4663 is in the asset registry with a
      link back to the vault and the underlying asset.
- [ ] The market parameter worksheet for this wrapper is filled in.
- [ ] The rate labels the product will show for this wrapper are listed in
      the rate transparency file.
