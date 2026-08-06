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
| Name | Letters, numbers, spaces. Max 32 characters. |
| Ticker | Uppercase letters and numbers. Max 10 characters. |
| Description | Max 256 characters. No links (`http`, `www.`, or bare domain paths). |
| Image | PNG, JPG, WEBP, or GIF. Max 4 MB. Optional if blob upload is unavailable. |
| X handle | Letters, numbers, underscores. Max 15 characters. Optional. |
| Website | Full `http(s)` URL. Optional. |
| Journey | Off-chain document whose hash is committed on-chain. See [Journey and credibility](journey-and-credibility.md). |

## Fees and salts

- **Launch fee:** paid in ETH to the factory. Hard ceiling in bytecode (`MAX_LAUNCH_FEE = 0.05 ether`). Live `launchFee` is set on the timelock-owned factory (see explorer / governance UI).
- **userSalt:** chosen by the creator. Internally scoped as `keccak256(abi.encode(msg.sender, userSalt))` so others cannot squat your predicted address.
- **Version note:** launching always uses the current factory version. A salt used at version N can be reused at N+1 because implementation changes change CREATE2 init code.

## After launch

- Tokens from **paused** factories (v1-v3) remain live and indexed; you just cannot create new ones there.
- Open the token on [Explore](explore-tokens.md) or the explorer.

## Next

[Journey and credibility](journey-and-credibility.md) · [Vesting](vesting.md)
