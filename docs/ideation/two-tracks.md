# The two ideation tracks

**Available now.** Studio, draft editors, public project/token pages, explore tabs, and optional linking are live on the product site (testnet / URL-only studio).

CanHav Projects has two tracks: **Product** and **Token**. They are independent by design.

## Independence

- You can start from either end.
- Neither track gates the other.
- You can optionally **link** a product to a token design (or leave them unlinked).
- A **product with no token** is a legitimate outcome.
- A **token designed but never deployed** is also a legitimate outcome.

The point is to make the design document honest before anyone confuses a plan with a live market.

## How linking works

Linking is optional and owned by you in studio.

1. Open a project or token design editor. The link panel lists entities you own.
2. Create a link only when you own both sides. v1 linking is **one-to-one** (one project to one token design).
3. After you link, each public page shows a cross-card to the other entity (`/p/...` ↔ `/t/...`).
4. Credibility signals stay scoped to the entity they belong to. Linking does **not** copy project verify signals onto the token page, or float/unlock metrics onto the project page.

Unlinking (when available in studio) removes the cross-reference. It does not delete either document.

See [Public pages](public-pages.md).

## Product track

Captures what you are building: sector, what it does, users and payers, why this chain, stage, contract architecture, worst-case bug impact, and security status declarations.

See [Product track](product-track.md).

## Token track

Eight sections: token rationale, supply and allocation, vesting and lockups, distribution, market, governance, legal, and post-launch. The platform computes float, unlock calendars, and warnings from those answers.

See [Token track](token-track.md), [Computed outputs](computed-outputs.md), and [Warnings](warnings.md).

## Three answer types

Both tracks use the same answer model: decisions you make, outputs the platform computes, and status declarations for work that may live elsewhere. See [The three answer types](three-answer-types.md).

## Studio and publish

You draft in studio (`/studio`), publish snapshots to public pages (`/p/...` for projects, `/t/...` for token designs), and optionally attach a deployed token address to a published design. Explore includes tabs for tokens, projects, and designs. Details: [Public pages](public-pages.md) and [Deploy paths](../token-launch/deploy-paths.md).

Studio editing requires an account ([Clerk](../accounts/clerk-accounts.md), in development for production keys). Reading published pages does not.
