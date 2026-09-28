# Deploy the stack on testnet 46630

Uniswap has no deployment on Robinhood Chain testnet. A pool product deploys
what it needs there itself and records every address in
`robinhood-testnet-46630.manifest.template.json`, which becomes the only
source of addresses for the code, the tests, the front end and the agent.
Never copy an address from the mainnet manifest into it.

## Before you start

- A funded deployer key. The faucet is at faucet.testnet.chain.robinhood.com
  and the public RPC is rate limited, so plan a managed endpoint for
  scripts that loop.
- Foundry or Hardhat set up per the chain's deploy guide, with Blockscout
  verification working on one throwaway contract first.
- The protocol's contracts monorepo checked out at a pinned commit, or the
  individual repositories at pinned commits. Write the commit hashes into
  the manifest before deploying anything.
- The compiler version and settings each repository expects. v2 core uses an
  old compiler; v4 needs a recent one with the intermediate representation
  enabled. Record both.

## Order for a basic pool (v2)

1. Wrapped native token. Deploy a WETH9 or reuse the chain's published one,
   read from the chain master file in the credit kit. Record it.
2. Factory. Deploy `UniswapV2Factory` with the fee setter set to a key from
   the role model, not the deployer. Record the address, the transaction and
   the runtime code hash.
3. Router. Deploy `UniswapV2Router02` with the factory and the wrapped
   native. Record it.
4. Test tokens. Deploy two mock tokens with realistic decimals and, if the
   product will touch them, the transfer behaviour of the real assets. Never
   reuse mock addresses anywhere else.
5. Pair and seed. Create the pair through the factory and add the first
   liquidity through the router at the ratio from `POOL_PARAMETERS.md`.
   Record the pair address and the seed transaction.
6. Exercise. Swap exact input, swap exact output, remove liquidity, on
   testnet, from a script, and keep the transaction hashes.

## Order for a concentrated pool (v4)

1. Wrapped native token, as above, if the product needs it. v4 pools can
   hold native currency directly.
2. Pool manager. Deploy `PoolManager` with the protocol fee owner set to a
   role-model key. Record it.
3. Position manager. Deploy with the pool manager, Permit2 and the
   descriptor it needs. Record it.
4. Quoter and state view. Deploy `V4Quoter` and `StateView` against the pool
   manager. Record both.
5. Permit2. Deploy at its canonical address with the published bytecode and
   salt if the chain allows it, otherwise deploy it plainly and record the
   difference.
6. Universal Router. Deploy with the addresses above. Record it.
7. Test tokens, as above.
8. Pool and first position. Initialise the pool and mint the first position
   in one transaction through the position manager, from the values in
   `POOL_PARAMETERS.md`. Record the pool id, the position id and the
   transaction.
9. Exercise. Quote, swap single hop, increase and decrease liquidity,
   collect fees, on testnet, from a script.

## Adding a hook

1. Fill `HOOK_DESIGN.md`. Permissions decide the address, so they come
   first.
2. Mine the salt with `HookMiner` for the permission bits you declared and
   the deployer that will use it. Record the salt.
3. Deploy the hook with CREATE2 at that salt. Confirm the address carries the
   bits. Record the address, the salt, the commit and the transaction.
4. Initialise a pool whose key names the hook, with its first liquidity, in
   one transaction. Record the pool id.
5. Exercise every callback the hook enables, on testnet, from a script, and
   keep the hashes. A callback that never ran on testnet is untested.

## What to pin and record, for every contract

- Chain id 46630 and the deployer address.
- Source repository and commit hash.
- Compiler version and settings.
- Runtime code hash, read from the chain after deployment.
- Deployment transaction and the explorer link.
- Blockscout verification status.
- The date.

## Verification

- Every address in the manifest has a verified source on the explorer.
- A script reads the manifest and calls one view on every contract.
- The pool's first liquidity was added in the same transaction that
  initialised it.
- No address in the testnet manifest appears in the mainnet manifest.

## When the protocol deploys to testnet

If an official deployment on 46630 appears in the protocol's records, add
it to the manifest as a second entry with provenance official, keep your
own fixture until every test passes against the official one, then retire
the fixture. Never mix the two in one configuration.
