# Create a token

**Available now** on Robinhood Chain Testnet.

Use the product UI at `/launch` on the CanHav site while connected to Robinhood Chain Testnet. Launches go through **TokenFactory v4**.

## What gets deployed

In one factory call the system:

1. Deploys a fixed-supply **LaunchToken** clone (Solady LibClone / CREATE2-style prediction)
2. Optionally deploys and funds a **vesting wallet** in the same transaction
3. Emits launch events including `journeyHash` and `descriptionHash`

Predicted addresses must use the factory's own views. LibClone bytecode is not byte-identical to classic ERC-1167, so do not reuse OpenZeppelin Clones math off-chain unless it matches the factory.

## Form rules (UI)

| Field | Rules |
|-------|--------|
| Name | Letters, numbers, spaces. Max 32 characters. Required. |
| Ticker | Uppercase letters and numbers. Max 10 characters. Required. |
| Description | Max 256 characters. No links (`http`, `www.`, or bare domain paths). Required. |
| Image | PNG, JPG, WEBP, or GIF. Max 4 MB. Required. |
| X handle | Letters, numbers, underscores. Max 15 characters. A pasted `x.com/` link or `@handle` is reduced to the handle. Optional. |
| Telegram | Letters, numbers, underscores. 5 to 32 characters. A pasted `t.me/` link or `@handle` is reduced to the username. Optional. Not committed on-chain. |
| Website | Full `http(s)` URL. Optional. |
| Developer buy | Optional ETH amount, 0.0001 to 10. Creates and seeds the creator's LaunchAMM pool right after launch. See [Developer buy](#developer-buy). |
| Journey | Off-chain document whose hash is committed on-chain. See [Journey and credibility](journey-and-credibility.md). |

## What is stored where

The `TokenLaunched` event carries the name, ticker, supply, image URL, X handle, website and two hashes. The description **text** and the Telegram handle are stored in CanHav's database before the launch transaction is signed, keyed by `descriptionHash` and the creator address. The token page and the `get_launch` MCP tool show the description only when its recomputed keccak256 equals the hash in the event, so the text is tamper-evident even though it lives off-chain. Telegram has no on-chain hash and is shown as stored. The store is insert-only: the first write for a given hash and creator wins, so a public description cannot be used to overwrite a creator's Telegram link.

## Developer buy

There is no bonding curve, so nothing is bought from a curve. The ETH in the Developer buy field becomes the first liquidity of the creator's own LaunchAMM pool, paired with 80% of the supply from the creator's wallet. The creator holds the resulting liquidity shares and can withdraw them at any time; they are not locked.

After the launch transaction confirms, the form runs three more transactions on LaunchAMM: `createPool` (opted in to the protocol fee), an ERC-20 `approve`, then `addLiquidity` with the ETH. The working label counts the confirmations, one of four to four of four. The opening price is the ETH amount divided by the tokens in the pool, and it is what Explore shows as Price once the indexer sees the deposit.

If a pool step fails or is rejected in the wallet, the token is still live. The success screen says which step stopped and the token page's Trading pool card lets the creator create the pool or add liquidity from there.

## Fees and salts

- **Launch fee:** paid in ETH to the factory. Hard ceiling in bytecode (`MAX_LAUNCH_FEE = 0.05 ether`). Live `launchFee` is set on the timelock-owned factory (see explorer / governance UI).
- **userSalt:** chosen by the creator. Internally scoped as `keccak256(abi.encode(msg.sender, userSalt))` so others cannot squat your predicted address.
- **Version note:** launching always uses the current factory version. A salt used at version N can be reused at N+1 because implementation changes change CREATE2 init code.

## After launch

- Tokens from **paused** factories (v1-v3) remain live and indexed; you just cannot create new ones there.
- Open the token on [Explore](explore-tokens.md) or the explorer.

## Next

[Journey and credibility](journey-and-credibility.md) · [Vesting](vesting.md)
