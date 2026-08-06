# Product track

**Available now.** The sections below match the studio Project editor.

The Product track is a design document for what you are building. A product with no token is a legitimate published outcome.

Editor steps: Basics, Architecture, Security, Reality, Review.

---

## Sector, what it does, users and payers, why this chain, current stage

### Asked

| Field | Notes |
|-------|-------|
| Project name | Required |
| Sector | Credit and lending; liquidity infrastructure; underwriting and risk; RWA infrastructure; oracles and data; perps and derivatives; agentic trading; stablecoin and payments; portfolio and vaults; DEX and market structure; other (with free text) |
| What it does | One paragraph |
| Users and payers | Who the user is, and who pays (often not the same answer) |
| Why this chain specifically | Free text |
| Current stage | Idea; design doc; prototype; testnet contracts deployed; live elsewhere |

### Computed / warnings

None in this step.

---

## Contract architecture and external dependencies

### Asked

| Field | Notes |
|-------|-------|
| What contracts exist | “None yet” is an honest answer |
| External dependencies | Protocols your contracts call (for example Uniswap, Morpho, Chainlink) |
| Oracles | Free text |
| Upgradeability | Immutable; upgradeable proxy; partially upgradeable; undecided |

### Computed / warnings

None.

---

## Admin functions

### Asked

| Field | Notes |
|-------|-------|
| Admin functions and why they exist | Free text. Explain every privileged path and why it is needed. |

### Computed / warnings

None.

---

## Worst-case bug impact and security status declarations

### Asked

| Field | Notes |
|-------|-------|
| Worst-case bug impact | Lose user funds; lock funds; misprice; nothing serious |

Security status declarations (same four statuses as elsewhere: already in place; handled by legal/ops; planned before mainnet; not yet):

| Declaration | Covers |
|-------------|--------|
| Audit | External review status |
| Bug bounty | Program status |
| Monitoring | Ops monitoring |
| Incident response | IR readiness |
| Key custody | How keys are held |

Copy pressure scales with the worst-case answer. That is framing only, not validation.

On the public page, “not yet” on high blast-radius answers reads as a live risk the team chose to publish.

---

## Reality

Before publish, the editor requires an explicit acknowledgement:

> Robinhood Chain does not provide distribution to Robinhood brokerage customers. Deploying here puts your app in front of nobody by default. CanHav is an independent project with no affiliation with Robinhood Markets, Inc. Listing here is not a channel to its users either.

### Asked

| Field | Notes |
|-------|-------|
| Myth acknowledgement | Required checkbox |
| Where will your first hundred users come from? | Free text |

Optional verify signals (wallet, GitHub repo, testnet contract addresses) attach for public credibility checks scoped to the **project**, not to a linked token. Each signal is omitted silently if it fails to load. See [Public pages](public-pages.md).

---

## Review and publish

Publishing snapshots the document and assigns a public slug under `/p/...`. Linking to a token design is optional. See [The two ideation tracks](two-tracks.md).

---

## Related

- [Token track](token-track.md)
- [The two ideation tracks](two-tracks.md)
- [The three answer types](three-answer-types.md)
- [Enforced versus stated](enforced-vs-stated.md)
- [Public pages](public-pages.md)
