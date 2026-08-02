# CanHav Launchpad Contracts

Foundry project for the token-launch foundation: a minimal fixed-supply ERC20
deployed as EIP-1167 clones from a deterministic (CREATE2) factory with a
version registry, factory-level pause, and two-step ownership.

> Testnet only. The site's `/launch` page is not wired to these contracts yet.

## Deployments — Robinhood Chain Testnet

| | |
|---|---|
| Chain | Robinhood Chain Testnet (Arbitrum Orbit, blob DA) |
| Chain ID | `46630` |
| RPC | `https://rpc.testnet.chain.robinhood.com` |
| Explorer | https://explorer.testnet.chain.robinhood.com |
| Faucet | https://faucet.testnet.chain.robinhood.com (0.01 ETH + stock tokens / 24h) |
| ArbOS | 61 (`arbOSVersion()` raw 116 − 55 offset) — Cancun confirmed via PUSH0/MCOPY probes |
| **TokenFactory v4** (Solady LibClone) | [`0x30Db3A828F65B92434c6aDB27AEeD01850277b08`](https://explorer.testnet.chain.robinhood.com/address/0x30Db3A828F65B92434c6aDB27AEeD01850277b08) ✅ verified — block 96243249; ABI identical to v3, clones via LibClone (optimized proxy — NOT ERC-1167-byte-identical, predictions must use the factory's own views); owned by the timelock; launchFee 0.0002 ETH |
| TokenFactory v3 (**PAUSED**) | [`0xD6166E156B52eB9B301D56Bd68d5D9c551d7d4c5`](https://explorer.testnet.chain.robinhood.com/address/0xD6166E156B52eB9B301D56Bd68d5D9c551d7d4c5) ✅ verified — block 96208927; paused after v4 migration; its tokens remain live and indexed |
| **MilestoneEscrow** (admin-less singleton) | [`0x90C71DBA8A61Da14CA699f72D311e404094Cf192`](https://explorer.testnet.chain.robinhood.com/address/0x90C71DBA8A61Da14CA699f72D311e404094Cf192) ✅ verified — block 96220433; milestone-dated lockups, no owner/attester/pause |
| **JourneyUpdates** (admin-less singleton) | [`0x31358209375591b1285EaA437c2c9f189c48D073`](https://explorer.testnet.chain.robinhood.com/address/0x31358209375591b1285EaA437c2c9f189c48D073) ✅ verified — block 96220433; content-addressed milestone progress updates |
| **AllocationSale** (admin-less singleton) | [`0x869cE70ff8174802d98D26835ce4040754Ad284A`](https://explorer.testnet.chain.robinhood.com/address/0x869cE70ff8174802d98D26835ce4040754Ad284A) ✅ verified — block 96229564; fixed-price fee-free sales, milestone-dated proceeds lockup, zero platform cut |
| **LaunchAMM** (timelock-owned singleton) | [`0xDd070b1f8e000D27491A3d38543ef0D72C758Df4`](https://explorer.testnet.chain.robinhood.com/address/0xDd070b1f8e000D27491A3d38543ef0D72C758Df4) ✅ verified — block 96235054; token⇄ETH pools, 0.30% LP fee, opt-in protocol fee (default 20 bps, `MAX_PROTOCOL_FEE_BPS = 50` constant) split 70/30 project/platform (`PROJECT_SHARE_BPS = 7000` constant); only knob = default fee, timelocked |
| **FeeSplitter** (timelock-owned) | [`0x9FDFae007b65d4c8F3CCA6AC242E3f141eC9DA18`](https://explorer.testnet.chain.robinhood.com/address/0x9FDFae007b65d4c8F3CCA6AC242E3f141eC9DA18) ✅ verified — block 96235052; platform fee destination (never an EOA), payees timelock-settable, permissionless audited distributions |
| **TimelockController** (factory owner) | [`0x080cCDC07e2a0a5D11e9dDaA873ea68F540109ae`](https://explorer.testnet.chain.robinhood.com/address/0x080cCDC07e2a0a5D11e9dDaA873ea68F540109ae) ✅ verified — minDelay 300s (testnet; anything real gets 24h+); proposer = deployer EOA, executor = open, no admin |
| TokenFactory v2 (**PAUSED**) | [`0x10F33eE0f6a72D7Cc1f41196B4EF80B28C909Bc0`](https://explorer.testnet.chain.robinhood.com/address/0x10F33eE0f6a72D7Cc1f41196B4EF80B28C909Bc0) ✅ verified — block 95922560; paused after v3 migration; its tokens remain live and indexed |
| **LaunchVestingWallet impl** | [`0x97d41F630025f83AdF72f00BaD8dC9B5e01eBEFC`](https://explorer.testnet.chain.robinhood.com/address/0x97d41F630025f83AdF72f00BaD8dC9B5e01eBEFC) ✅ verified — reused by v2 + v3 factories |
| TokenFactory v1 (**PAUSED**) | [`0x1dAaa8294806d216Df36dc07B3803ED26584c909`](https://explorer.testnet.chain.robinhood.com/address/0x1dAaa8294806d216Df36dc07B3803ED26584c909) ✅ verified — paused after v2 migration; its tokens remain live and indexed |
| **LaunchToken impl (v1)** | [`0x3E8c9be8BB486abEc132B0d1C35266b2336b129B`](https://explorer.testnet.chain.robinhood.com/address/0x3E8c9be8BB486abEc132B0d1C35266b2336b129B) ✅ verified — reused by all three factories |
| Fee constants | `MAX_LAUNCH_FEE = 0.05 ether` (hardcoded ceiling — no admin can exceed it); `launchFee` currently `0`; treasury + pauser = deployer EOA |
| Deployer EOA | `0x955fc594dd992Ef7bb7d175b6C9a68Be2b622DEB` (throwaway testnet key in local `.env` only; is timelock proposer, v3 treasury + pause guardian, and still direct owner of paused v1/v2) |
| Compiler | solc 0.8.28, optimizer 200 runs, `via_ir = true`, `evm_version = cancun` |
| First launch (smoke test) | token [`0x9a0dD4f0d0753256CeD122184d7Fb91c11B79Abe`](https://explorer.testnet.chain.robinhood.com/address/0x9a0dD4f0d0753256CeD122184d7Fb91c11B79Abe) ("CanHav First" / CHF1), tx `0x08aec516d847ababe5b6c39496358fa350fd87f02fa49e59eb342899f3bb8fdc` |

Deployment records: `broadcast/{Deploy,DeployV2,DeployV3,DeployEscrow,DeploySale,DeployAMM,DeployV4}.s.sol/46630/run-latest.json` (committed).

Phase-5 validation finding (Solady): `LibClone.cloneDeterministic` deploys
Solady's gas-optimized minimal proxy, **not** the canonical ERC-1167 bytecode —
CREATE2 addresses diverge from OZ `Clones` math for identical salts (pinned by
`testFuzz_LibCloneAddressParityWithOZ`). The UI-critical invariant
(`predictTokenAddress` == deployed address) holds because both sides share
LibClone's math. Blockscout still resolves the optimized proxy's
implementation and token metadata (checked empirically on testnet).

## Layout

```
src/LaunchToken.sol           ERC20Upgradeable + Initializable; fixed supply minted at
                              initialize; implementation locked via _disableInitializers()
src/LaunchVestingWallet.sol   concrete wrapper over abstract VestingWalletCliffUpgradeable;
                              4-arg initializer (beneficiary, start, duration, cliff);
                              inherited cliff-less initializer override-reverts;
                              cliff = 0 degrades to plain linear vesting
src/TokenFactory.sol          Ownable2Step + Pausable; version registry; cloneDeterministic
                              with sender-scoped salts; optional vesting: token + funded
                              vesting wallet in ONE tx (VestingParams.amount > 0); emits
                              TokenLaunched (byte-identical to v1) + VestingCreated with
                              the RESOLVED start (0 sentinel → block.timestamp)
script/Deploy.s.sol           v1 deploy (historical)
script/DeployV2.s.sol         v2 deploy: reuses the existing LaunchToken impl via
                              LAUNCH_TOKEN_IMPL env; deploys vesting impl + factory
test/                         53 tests across three suites: init semantics, prediction,
                              events, salt scoping, pause, ownership, version bumps,
                              vesting schedule math (cliff/linear/full), balance splits,
                              permissionless release, salt-reuse-across-versions
                              regression, fuzz
```

## Setup

Dependencies are **not** committed (`lib/` is gitignored); they're pinned in
`foundry.lock` and restored with:

```sh
forge install
```

Then:

```sh
forge build
forge test
```

Requires Foundry ≥ 1.7 (for `foundry.lock` restore). Deps: OpenZeppelin
contracts + contracts-upgradeable, both pinned to `v5.4.0` — keep the two on the
**same** tag; the upgradeable package resolves `@openzeppelin/contracts/...`
imports through the non-upgradeable install, so version skew breaks compilation.

## Deploying / verifying

Copy `.env.example` → `.env`, fill in the deployer key, then:

```sh
forge script script/Deploy.s.sol --rpc-url robinhood_testnet --broadcast --slow \
  --verify --verifier blockscout \
  --verifier-url https://explorer.testnet.chain.robinhood.com/api
```

Verification must run from the same checkout/config that deployed (solc,
via_ir, optimizer runs, evm_version all baked into the standard JSON).

## Design decisions

- **journeyHash + descriptionHash are separate commitments.** descriptionHash
  commits the short form-field description; journeyHash commits the full
  off-chain journey document (format not final — smoke-test launch used a
  placeholder). Both verifiable independently against the event.
- **Pause lives on the factory, never on tokens.** `pause()` stops new launches;
  everything already launched is untouchable by design.
- **Version registry.** Launches always clone the current version; old versions
  are not launchable but stay in `implementations[v]` for indexers. Bumping the
  implementation changes every predicted address (EIP-1167 bytecode embeds the
  impl address; CREATE2 hashes init code) — frontends must treat the
  `TokenLaunched.token` field as truth, never a stale prediction. Corollary: a
  userSalt used at version N is reusable at N+1.
- **Sender-scoped salts** (`keccak256(abi.encode(msg.sender, userSalt))`) so
  nobody can front-run or squat another creator's predicted address.
- **Admin = Ownable2Step EOA for testnet.** Migrate ownership to a
  `TimelockController` before anything real — publicly verifiable delay on every
  admin action.
- **OZ first, Solady later.** Once the design stops moving, `LibClone` clones
  with immutable args can replace the initializer pattern.
- Do **not** use pump.fun EVM "clones", sniper/bundler repos, or unaudited
  launchpad repos as references. Concentration-at-launch analysis belongs on the
  future metrics list precisely because multi-wallet bundlers exist.

## Vesting design notes (v2)

- **Vesting salt derives from the TOKEN ADDRESS** (`keccak256(abi.encode(token))`),
  not the scoped launch salt. The token address already encodes
  (version, sender, salt), so vesting clone addresses stay collision-free even
  when a userSalt is reused across template versions (an explicitly tested
  guarantee of the version registry).
- `startTimestamp == 0` is resolved to `block.timestamp` in the contract and
  the **resolved** value is emitted — the 0 sentinel never reaches the log.
- `TokenLaunched` is byte-identical between vesting and plain launches; all
  vesting data lives in the separate `VestingCreated` event.
- OZ v5 property: the vesting beneficiary IS the Ownable owner and can transfer
  ownership (sell unvested tokens). Consumers must live-read `owner()` rather
  than trusting the event's beneficiary forever. `release(token)` is
  permissionless and always pays the current owner.

## Roadmap (original 4 items complete)

Done: hidden launch page → factory + testnet deploy → Ponder indexer +
explore/token pages → journeys/storage/wallet → vesting (this).
Remaining ideas: TimelockController over factory admin (Ownable2Step handoff is
ready for it); AMM/liquidity layer (ReentrancyGuard on fund-touching code);
Python tooling; Solady/LibClone swap once the design stops moving.
