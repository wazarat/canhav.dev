# CanHav Launchpad Contracts

> **Nothing is deployed.** This is scaffolding for a future testnet launchpad on
> Robinhood Chain testnet. The deploy script exists but has never been run, and
> the site's `/launch` page is not wired to any of this.

Foundry project for the token-launch foundation: a minimal fixed-supply ERC20
deployed as EIP-1167 clones from a deterministic (CREATE2) factory.

## Layout

```
src/LaunchToken.sol    ERC20Upgradeable + Initializable; fixed supply minted at
                       initialize; implementation locked via _disableInitializers()
src/TokenFactory.sol   cloneDeterministic with sender-scoped salts; initializes the
                       clone in the same tx; emits TokenLaunched with all metadata
                       (image / X / website live in the event, not token storage —
                       the future indexer reads the log)
script/Deploy.s.sol    deploys the factory (which deploys its own implementation);
                       parameterized by .env — NOT run yet
test/                  11 tests: init semantics, double/direct-init reverts,
                       address prediction, metadata event, salt scoping, fuzz
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

## Eventual deployment (not yet)

Copy `.env.example` → `.env`, fill in the Robinhood testnet values, then:

```sh
forge script script/Deploy.s.sol --rpc-url robinhood_testnet --broadcast
```

Before the first deploy, confirm Robinhood testnet's ArbOS version supports
Cancun; if not, set `evm_version = "shanghai"` in `foundry.toml`.

## Design decisions

- **OZ first, Solady later.** Logic is built against readable, documented
  OpenZeppelin code. Once the design stops moving, `LibClone` clones with
  immutable args can replace the initializer pattern (cheaper, and removes the
  initializer-front-running class entirely).
- **Initializer route** because clones have no constructor; the implementation
  is locked in its constructor, and the factory initializes each clone in the
  same transaction it deploys it (init-and-lock).
- **Sender-scoped salts** (`keccak256(abi.encode(msg.sender, userSalt))`) so
  nobody can front-run or squat another creator's predicted address.
- **No admin surface yet.** When one is added (fees, pausing), it goes behind
  `Ownable2Step` owned by a `TimelockController` — publicly verifiable delay on
  every admin action.
- Do **not** use pump.fun EVM "clones", sniper/bundler repos, or unaudited
  launchpad repos as references. Concentration-at-launch analysis belongs on the
  future metrics list precisely because multi-wallet bundlers exist.

## Roadmap (deliberately not built yet)

- Vesting: `VestingWallet` clones per launch (note: base OZ VestingWallet has no
  cliff — `VestingWalletCliff` is separate)
- Allowlists / claims: `MerkleProof` + `@openzeppelin/merkle-tree` JS companion
- `TimelockController` over factory admin
- AMM / liquidity layer (add `ReentrancyGuard` on anything touching funds)
- Indexer for `TokenLaunched` events; Python tooling
- Frontend wiring (`predictTokenAddress` enables optimistic UI)
