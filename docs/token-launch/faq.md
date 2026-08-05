# Token Launch FAQ

## Why does my wallet show as disabled?

Keplr and HashPack cannot reach Robinhood Chain Testnet (`46630`). Use a wallet that can add custom EVM chains. See [Network setup](network-setup.md).

## I launched on an older factory. Is my token dead?

No. v1-v3 factories are **paused for new launches** only. Existing tokens remain live and indexed. New launches should use **v4**.

## Predicted token address does not match what I calculated offline

Use the factory's own prediction views. v4 uses Solady LibClone, which is not byte-identical to classic ERC-1167 / OpenZeppelin Clones init code.

## Launch fails with insufficient funds

You need testnet ETH for gas plus the current launch fee. Use the [faucet](https://faucet.testnet.chain.robinhood.com).

## Explore page is empty or errors

The launch indexer may be offline or catching up. Check the explorer for your tx, then retry explore. See [Explore tokens](explore-tokens.md).

## Can CanHav pause my token?

No. Factory pause stops new launches. It does not pause already deployed tokens.

## Is this mainnet?

No. Token Launch is Robinhood Chain **Testnet** only.

## Where is Agent Launch documented?

See [Agent Launch overview](../agent-launch/overview.md). That track is next after Token Launch, on Base Sepolia / ERC-8004.
