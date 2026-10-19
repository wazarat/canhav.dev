# Studio+

**Available now.** Studio+ is the paid tier of the studio. It belongs to a team (a Clerk organization), so everyone on the team shares it.

## Price

| Plan | Price |
|------|-------|
| Monthly | $39.99 a month |
| Yearly | $29.99 a month, billed yearly |
| Seats | 3 included, each additional seat $9.99 a month, up to 5 members per team on the current Clerk plan |

Payment is by card in USD through Clerk Billing and Stripe. Tax is not added and refunds are not automatic; write to us for either. Billing is not available in Brazil, India, Malaysia, Mexico, Singapore or Thailand.

## Upgrading

1. Sign in and open [canhav.com/studio/plus](https://canhav.com/studio/plus).
2. Make a team if you have none, or pick one from the account menu in the studio. The plan belongs to the active team.
3. Pick monthly or yearly and pay. The studio then reads **Studio+** everywhere for the team, and the welcome page offers to move your personal projects to it.

Seats are counted by Clerk. Three members and pending invitations fit in the plan; inviting a fourth adds a seat, prorated for the rest of the period. Members and billing live on the Team page (account menu, Team).

## What Studio+ adds

The features ship one by one and are listed on the pricing page, with Soon on the ones still to come. Each one is gated by the plan in the studio, in the API and on the project's MCP server; a free account sees a short description and the upgrade link in its place.

- Business Model Canvas, ICP and Competitor landscape on the Business model tab, Brand identity on the Brand tab
- Private projects (unlisted publish with a share link), version history and project keys
- GitHub sync, automated checks, monitoring and alerts (a worker watches your contracts and sends to email, Telegram or Discord, see [Alerts](../token-launch/alerts.md)), token analytics (holders, traders, daily volume and new wallets over 90 days on Deployments and over `get_analytics`)
- Investor and grant pack (a one pager, a deck and grant answers for three programme styles, drafted on Claude Sonnet 5.5, exported as markdown and printed to PDF), updates (a post for the public page drafted from the period's activity, daily, every other day, weekly or only when asked, published from the Overview), tester kit (invite links with steps and per step feedback, no accounts, no keys held), custom domain (a host you own serving the public page, DNS records shown in the studio)
- Partner perks and priority help

Drafting is agent first: your own IDE agent writes every Studio+ field, and CanHav's server draft is the fallback for a team with no agent connected, within a monthly allowance.

### Drafting

A Draft button queues a request on the project. A connected agent sees open requests first on `get_project_status` (and in AGENTS.md), writes the field through `update_project`, and that clears the request; the field then reads "Drafted by your agent" with the time. Claude Code lists one slash command per kind (`draft_canvas`, `draft_icp`, `draft_competitors`, and the later kinds), and Or ask your agent gives the same prompt to paste into another editor.

With agent writes off, or from Draft with CanHav now, CanHav drafts on its side: the project record (the same markdown the export produces), a short kit summary and the fields named for that draft go to Anthropic's API, on Claude Haiku 5.5 for the canvas, the profiles, the competitor line, the brand kit and the weekly update, and on Claude Sonnet 5.5 for the investor pack. Nothing from your repository and no keys are sent. The answer lands in the draft as an edit you can change, the field reads "Drafted by CanHav", and a team has 60 server drafts a month across every kind; the button shows what is left. A draft that is refused, cut off or malformed fails plainly and counts against nothing.

## Partner perks and priority help

The pricing page lists partners CanHav routes to for audits, KYC, simulation and monitoring, and RPC, with the referral terms once agreed (until then the row says so and the contact form carries the request), and a booking link for the monthly office hour. Replies within one working day for Studio+ teams.

## Cancelling and downgrading

Cancel from the Team page. The plan runs to the end of the paid period, then the team reads Studio again. Records stay where they are; a private project beyond the free allowance stays private and cannot be republished until it is made public, and the Studio+ sections of a project stay stored but closed until the team is back on the plan.

## What stays free

Everything documented before Studio+: projects, token designs, publishing, launching, the shared MCP server and the project servers, exports, and one private project.

## Related

- [Accounts and teams](clerk-accounts.md)
- [Studio](../ideation/studio.md)
