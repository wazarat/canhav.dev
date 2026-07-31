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
| **TokenFactory** | [`0x1dAaa8294806d216Df36dc07B3803ED26584c909`](https://explorer.testnet.chain.robinhood.com/address/0x1dAaa8294806d216Df36dc07B3803ED26584c909) ✅ verified |
| **LaunchToken impl (v1)** | [`0x3E8c9be8BB486abEc132B0d1C35266b2336b129B`](https://explorer.testnet.chain.robinhood.com/address/0x3E8c9be8BB486abEc132B0d1C35266b2336b129B) ✅ verified |
| Owner (EOA) | `0x955fc594dd992Ef7bb7d175b6C9a68Be2b622DEB` (throwaway testnet deployer — key in local `.env` only; controls pause/setImplementation; migrate to TimelockController before anything real) |
| Compiler | solc 0.8.28, optimizer 200 runs, `via_ir = true`, `evm_version = cancun` |
| First launch (smoke test) | token [`0x9a0dD4f0d0753256CeD122184d7Fb91c11B79Abe`](https://explorer.testnet.chain.robinhood.com/address/0x9a0dD4f0d0753256CeD122184d7Fb91c11B79Abe) ("CanHav First" / CHF1), tx `0x08aec516d847ababe5b6c39496358fa350fd87f02fa49e59eb342899f3bb8fdc` |

Deployment record: `broadcast/Deploy.s.sol/46630/run-latest.json` (committed).

## Layout

```
src/LaunchToken.sol    ERC20Upgradeable + Initializable; fixed supply minted at
                       initialize; implementation locked via _disableInitializers()
src/TokenFactory.sol   Ownable2Step + Pausable; version registry
                       (currentVersion / implementations mapping); cloneDeterministic
                       with sender-scoped salts; initializes the clone in the same tx;
                       emits TokenLaunched with all metadata (image / X / website /
                       descriptionHash / journeyHash / version live in the event, not
                       token storage — the indexer reads the log)
script/Deploy.s.sol    deploys LaunchToken impl, then TokenFactory(impl) — impl
                       registered as version 1, owner = broadcast EOA
test/                  22 tests: init semantics, double/direct-init reverts, address
                       prediction, metadata event, salt scoping, pause gating,
                       onlyOwner reverts, two-step ownership, version-bump behavior
                       (old-clone survival, prediction changes, salt reuse), fuzz
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

## Roadmap (decisions locked, not built)

- **Metadata/storage/UI/wallet**: Cloudflare R2 (content-addressed keys =
  keccak256 of bytes, so imageURI/journeyHash commitments are checkable),
  Postgres on Neon, journey doc = canonicalized JSON hashed client-side,
  viem + wagmi with a hard `chainId === 46630` guard in one shared wallet
  wrapper.
- ~~**Indexer**~~ **Done** — see `../indexer/` (Ponder → `token` /
  `implementation` tables, GraphQL on :42069, one-command replay) and the
  hidden site pages `/launch/explore` + `/launch/t/[address]`.
- **Vesting**: one thin wrapper `LaunchVestingWallet is
  VestingWalletCliffUpgradeable` (concrete initializer over the abstract OZ
  base; cliff = 0 degrades to no-cliff). Launch token + vesting clone in one tx,
  emit schedule params, indexer surfaces them. OZ v5 note: beneficiary is the
  Ownable owner and can transfer ownership — accepted, documented.
- TimelockController over factory admin; AMM/liquidity layer (ReentrancyGuard
  on fund-touching code); Python tooling.
