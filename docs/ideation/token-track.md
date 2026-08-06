# Token track

**In development.** The eight sections below match the studio Token design editor. They are not live as a public product surface yet.

The Token track is a design document for a token you may or may not deploy. Publishing a design does not deploy a contract. Deploying from a published design (when that flow ships) is a separate step that can commit the design hash on-chain.

## Sections

1. [Token rationale](#1-token-rationale)
2. [Supply and allocation](#2-supply-and-allocation)
3. [Vesting and lockups](#3-vesting-and-lockups)
4. [Distribution](#4-distribution)
5. [Market](#5-market)
6. [Governance](#6-governance)
7. [Legal](#7-legal)
8. [Post-launch](#8-post-launch)

Computed panel (float, unlock calendar, warnings) updates as you answer. See [Computed outputs](computed-outputs.md).

---

## 1. Token rationale

### Asked

| Field | Options / notes |
|-------|-----------------|
| Why does this need a token? | Token is the product; bootstrap supply; economic security; governance; fee capture; fundraising; not sure yet |
| Issuance path | Issue and lock (no market yet); points first; straight to market |
| Beyond a database row | Free text: what economic work only a token can do here |

### Computed

None in this section alone. Answers feed warnings.

### Warnings that can fire

| Warning | When |
|---------|------|
| Does this actually need a token? | “Not sure yet,” or free text that looks like a loyalty / points / cashback program |

---

## 2. Supply and allocation

### Asked

| Field | Notes |
|-------|-------|
| Token name, ticker | Ticker uppercase alphanumeric |
| Total supply | Integer token count |
| Supply policy | Fixed or inflationary (with optional inflation note) |
| Allocation split | Team, investors, treasury/ecosystem, public, liquidity, advisors, other (must sum to 100%) |

Note: the CanHav launch contract mints a **fixed** supply at initialize. An inflationary policy in the design would live in your own contracts, not in the factory token.

### Computed

- Treasury / ecosystem percent (held, not circulating in the unlock model)
- Inputs to float and unlock calendar once vesting, distribution, and market are filled

### Warnings

None specific to this section alone. Low float warnings appear after distribution/market answers.

---

## 3. Vesting and lockups

### Asked

For each vested cohort that has allocation (team, investors, advisors):

| Field | Notes |
|-------|-------|
| Cliff | Months |
| Total duration | Months |
| Release type | Linear; cliff then linear; milestone-conditional |
| If a founder leaves early | Unvested to treasury; to remaining team; continues vesting; no policy yet |

If there is no team, investor, or advisor allocation, vesting is skipped.

### Computed

- Unlock calendar cohort schedules
- Team versus investor cliff comparison
- Milestone-conditional schedules are plotted at the latest month and marked uncertain

### Warnings that can fire

| Warning | When |
|---------|------|
| Team cliff shorter than investors | Team cliff months less than investor cliff months while both have allocation |
| Unlocks clustered | Two or more cohorts’ first unlocks land in the same month (after launch) |

---

## 4. Distribution

### Asked

| Field | Notes |
|-------|-------|
| Distribution event | None (creator holds); airdrop; fixed-price sale; auction/batch; LBP |

If the event is a sale (fixed-price, auction, or LBP):

| Field | Notes |
|-------|-------|
| Price, hard cap | ETH |
| Soft cap, per-wallet limit | Optional ETH |
| Access | Allowlist or open |
| Undersubscription plan | Proceed; refund; postpone; no plan yet |

### Computed

- Public allocation enters month-0 float when a distribution event exists (not “none”)

### Warnings that can fire

| Warning | When |
|---------|------|
| Sale with no undersubscription plan | Sale event and undersubscription = no plan yet |
| Float under 5% | Distribution or market at launch exists and computed float is below 5% |

---

## 5. Market

### Asked

| Field | Notes |
|-------|-------|
| Market timing | At launch; later; never |

If at launch:

| Field | Notes |
|-------|-------|
| Liquidity amount | ETH |
| ETH source | Free text |
| LP treatment | Locked (with months); burned; unlocked |
| Anti-sniping | Launch window; early-sell tax; trading delay; none |

### Shown (not asked): platform-fixed facts

- Venue and pairing are fixed: token ⇄ ETH on the launch AMM
- Trading fee: 0.30% to LPs; opt-in protocol fee split 70/30 project/platform, enforced in bytecode
- A locked LP position still accrues trading fees to its owner

See [Fees and economics](../token-launch/fees-and-economics.md).

### Computed

- Liquidity allocation enters month-0 float when market is at launch

### Warnings

Low float (same rule as distribution) when market is at launch.

---

## 6. Governance

### Asked (status declarations)

| Field | Status options |
|-------|----------------|
| Governance mechanism | Already in place; handled by legal/ops; planned before mainnet; not yet |
| Admin key custody | Same |
| Treasury custody | Same |

Framing: most pre-PMF teams have not settled this, and that is fine.

### Shown (not asked): contract guarantees

- Cannot be minted after deployment
- Cannot be paused, frozen, or blacklisted
- Cannot be upgraded: no proxy, no owner
- Source pre-verified: the factory clones a verified implementation

Verify on the explorer: [TokenFactory v4](https://explorer.testnet.chain.robinhood.com/address/0x30Db3A828F65B92434c6aDB27AEeD01850277b08). Full page: [Contract guarantees](../token-launch/contract-guarantees.md).

### Computed / warnings

None from this section.

---

## 7. Legal

### Asked

| Field | Options |
|-------|---------|
| Legal status | Working with counsel; engaging counsel before mainnet; not yet |

Topics typically raised (not stored as separate fields):

- How the token is offered and to whom
- Whether any sale is a securities offering where buyers live
- Tax treatment of allocations, vesting, and treasury sales
- Entity structure holding the treasury and IP

CanHav does not give legal advice. This section records where legal work stands.

### Computed / warnings

None.

---

## 8. Post-launch

All optional.

### Asked

| Field | Notes |
|-------|-------|
| Treasury runway | Months |
| Reporting cadence | Monthly; quarterly; ad hoc; none yet |
| If the price collapses | Free text plan |
| What would make you call this a failure | Free text |

### Computed / warnings

None.

---

## Related

- [Computed outputs](computed-outputs.md)
- [Product track](product-track.md)
- [The three answer types](three-answer-types.md)
