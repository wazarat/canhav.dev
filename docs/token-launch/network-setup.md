# Network setup

**Available now.**

Connect a wallet to **Robinhood Chain Testnet** before using Token Launch.

## Chain parameters

| Parameter | Value |
|-----------|-------|
| Name | Robinhood Chain Testnet |
| Chain ID | `46630` |
| RPC | `https://rpc.testnet.chain.robinhood.com` |
| Explorer | [explorer.testnet.chain.robinhood.com](https://explorer.testnet.chain.robinhood.com) |
| Faucet | [faucet.testnet.chain.robinhood.com](https://faucet.testnet.chain.robinhood.com) (0.01 ETH + stock tokens / 24h) |

## Wallet requirements

You need a wallet that can **add a custom EVM chain**. Most browser extension wallets that support EIP-6963 and custom networks work.

### Unsupported in the CanHav picker

These wallets appear via EIP-6963 but cannot reach chain `46630`. The UI shows them disabled with a reason:

| Wallet | Reason |
|--------|--------|
| Keplr | Cannot add custom EVM testnets |
| HashPack | Hedera-only |

## Checklist

1. Install a supported wallet.
2. Add Robinhood Chain Testnet using the table above (or let the site prompt you).
3. Request faucet funds.
4. Confirm the wallet shows chain ID `46630` before launching.

## Next

[Create a token](create-a-token.md)
