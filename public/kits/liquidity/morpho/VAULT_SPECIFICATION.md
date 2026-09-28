# Vault specification

One file per vault, filled in before the factory is called and kept current
after. It is the document a depositor, a curator and a reviewer all read to
learn what the vault is allowed to do. Blanks look like `[...]`. Copy the
file as `vaults/[address].md` once the vault exists.

## Identity

- Name and symbol of the share. `[...]`
- Asset. Token, address on testnet and mainnet, decimals, research file.
  `[...]`
- Chain. Testnet 46630 during development, mainnet 4663 in production.
- Factory and vault version. `[...]`
- Owner of this document and the date it was last reviewed. `[...]`

## Roles and keys

| Role | Holder | Key | Threshold | Can |
|------|--------|-----|-----------|-----|
| Owner | `[...]` | `[Safe address]` | `[m of n]` | Change roles, registry, timelocks |
| Curator | `[...]` | `[...]` | `[...]` | Set caps and adapters, queue changes |
| Allocator | `[...]` | `[...]` | `[...]` | Move assets inside the caps |
| Sentinel | `[...]` | `[...]` | `[...]` | Reduce exposure, pause deposits |

No role on a single wallet. The credit kit's `ROLE_MODEL.md` explains each
role; this table records who holds it here.

## Gates

| Gate | Active | Checks | Record lives at |
|------|--------|--------|-----------------|
| Deposit | `[yes/no]` | `[...]` | `[...]` |
| Withdrawal | `[yes/no]` | `[...]` | `[...]` |
| Share transfer | `[yes/no]` | `[...]` | `[...]` |
| Share receipt | `[yes/no]` | `[...]` | `[...]` |

A vault with any gate active also has `GATES_AND_ELIGIBILITY.md`.

## Adapters and caps

| Adapter | Target | Absolute cap | Relative cap | Shock assumed | Observed depth and date |
|---------|--------|--------------|--------------|---------------|-------------------------|
| `[...]` | `[market id or vault]` | `[...]` | `[...]` | `[...]` | `[...]` |

Every cap has a written shock assumption and a depth observation with a
date. A cap without one is a finding.

## Timelocks

| Action | Delay | Who can queue | Who can execute | What a depositor can do meanwhile |
|--------|-------|---------------|-----------------|-----------------------------------|
| Add adapter | `[...]` | Curator | Curator | Withdraw |
| Raise a cap | `[...]` | Curator | Curator | Withdraw |
| Change fee | `[...]` | Owner | Owner | Withdraw |
| Change a gate | `[...]` | Owner | Owner | `[...]` |

## Fee

- Type. Management, performance, both, or none. `[...]`
- Rate and ceiling. `[...]`
- Recipient and the key behind it. `[...]`
- Shown to depositors where. `[...]`

## Liquidity

- Cash buffer kept idle for withdrawals. `[...]`
- Rule that refills it. `[...]`
- Liquidity adapter, if any, and its cap. `[...]`
- Public allocator. Enabled or not, which markets may pull, fee, flow caps.
  `[...]`
- Withdrawal terms. Atomic, queued, or in kind, and the disclosure. `[...]`

## First deposit

- Dead deposit amount and the burn address. `[...]`
- Transaction hash on testnet and on mainnet. `[...]`
- Proof that the share price cannot be inflated against the first real
  depositor. `[test name]`

## Monitoring

- What is watched. Utilisation and rate jumps, position health buckets,
  liquidation backlog, available loan-asset liquidity, cap and role
  changes, oracle age and pause, sequencer status, bridge inventory.
- Who is paged and how fast. `[...]`
- Reconciliation. API-derived views checked against direct contract reads,
  how often. `[...]`

## Wind-down

- The unwind plan, tested on a fork. `[link]`
- Order of withdrawal across adapters. `[...]`
- Illiquid assets. What happens to a market that cannot return capital.
  `[...]`
