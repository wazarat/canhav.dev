# Fees and economics

**Available now** on Robinhood Chain Testnet. Values below are verifiable on-chain. Prefer reading live contract state for the current `launchFee` and `defaultProtocolFeeBps`; this page records the design and the last documented calibration.

## Zero supply take

CanHav takes **0% of token supply**. Enforcement is the absence of a mint function after initialize on the launch token, not a soft policy. See [Contract guarantees](contract-guarantees.md).

Allocation sales take **0% platform cut** of sale proceeds (fee-free sales contract).

## Fee switches

| Switch | Where | Current documented value | Hard cap | Who can change | Delay |
|--------|-------|--------------------------|----------|----------------|-------|
| Launch fee (`launchFee`) | TokenFactory | **0.0002 ETH** (calibrated on v4) | `MAX_LAUNCH_FEE = 0.05 ether` | Factory owner = Timelock | Timelock `minDelay` (**300 seconds** on testnet) |
| Default protocol fee for new opted-in pools (`defaultProtocolFeeBps`) | LaunchAMM | **20 bps** default | `MAX_PROTOCOL_FEE_BPS = 50` | AMM owner = Timelock | Same timelock delay |
| LP trading fee | LaunchAMM | **30 bps (0.30%)** to LPs | Fixed in bytecode for the pool design | Not an admin switch | N/A |
| Protocol fee split | LaunchAMM | **70% project / 30% platform** (`PROJECT_SHARE_BPS = 7000`) | Fixed constant | Not an admin switch | N/A |
| Allocation sale platform cut | AllocationSale | **0** | N/A (no cut) | N/A | N/A |

Factory pause stops new launches. It is an emergency control, not a fee switch. Unpause waits on the timelock. See [Governance](governance.md).

## Existing pools are frozen at creation rate

When you create a pool and opt into the protocol fee, the pool stores its `protocolFeeBps` at creation time. Changing `defaultProtocolFeeBps` later does **not** rewrite existing pools. New pools pick up the new default; old pools keep the rate they were created with.

Verify in [`LaunchAMM`](https://explorer.testnet.chain.robinhood.com/address/0xDd070b1f8e000D27491A3d38543ef0D72C758Df4): createPool freezes fee; `setDefaultProtocolFeeBps` is owner-only (timelock).

## Fee destination

Platform protocol fees route to [FeeSplitter](https://explorer.testnet.chain.robinhood.com/address/0x9FDFae007b65d4c8F3CCA6AC242E3f141eC9DA18), never to an EOA as the platform sink. Payee changes are timelocked.

## Timelock

| Item | Value |
|------|-------|
| Address | [`0x080cCDC07e2a0a5D11e9dDaA873ea68F540109ae`](https://explorer.testnet.chain.robinhood.com/address/0x080cCDC07e2a0a5D11e9dDaA873ea68F540109ae) |
| minDelay (testnet) | **300 seconds** |
| Owns | TokenFactory v4 admin surfaces, LaunchAMM admin surfaces, FeeSplitter payee config |
| Production note | Anything closer to production should use 24h+ |

## How to verify independently

1. Open each address on the [explorer](https://explorer.testnet.chain.robinhood.com).
2. Read `launchFee` and `MAX_LAUNCH_FEE` on the factory.
3. Read `defaultProtocolFeeBps`, `MAX_PROTOCOL_FEE_BPS`, and `PROJECT_SHARE_BPS` on the AMM.
4. Read `minDelay` on the TimelockController.
5. For a live pool, inspect its stored `protocolFeeBps` and confirm it does not change when the default changes.

Product UI: `/launch/governance` surfaces economic terms while you build on testnet.

## Related

- [Contract guarantees](contract-guarantees.md)
- [AMM and fees](amm-and-fees.md) (shorter overview)
- [Governance](governance.md)
- [Contract addresses](contract-addresses.md)
