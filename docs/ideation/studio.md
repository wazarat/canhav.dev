# Studio

**Available now.** Requires a CanHav [account](../accounts/clerk-accounts.md).

The studio (`/studio`) is where a signed-in account sees everything it owns: its launches, its projects and its token designs. The **Log in or sign up** button in the navigation opens it. Once you are signed in the button reads **Studio**.

On every studio page the navigation carries a breadcrumb after the logo, **Studio / the project or token design you have open**. The name opens a switcher that lists your projects and token designs with the current one marked, plus **New project** and **Studio home**. On the studio home the breadcrumb reads **Studio** alone and the switcher sits on that word. The account menu (wallets, sign out) sits at the right. On a phone the breadcrumb shows only the name.

A command menu opens with Cmd K (Ctrl K elsewhere) or the key hint in the studio header. It creates a project or a token design, goes to a studio page, opens any of your records, and on a project page jumps to a section.

## The studio page

| Section | What it lists |
|---------|---------------|
| Start a project | One card that opens the new project pop up. The studio launches projects; a token design is started from a project (the pop up's last step, or the Overview's link panel) rather than from the home. |
| Launches | A collapsed line, "You have launched N tokens", counting only this account's launches: the ones made while signed in and the ones its verified wallets created on chain. Open it for the three newest, each row opening the token page. With more than three a **View all launches** button opens the full list in a new tab. |
| In progress | Your project drafts and published projects that have not launched, each with its linked token design, its build progress and, when an agent is connected, whether it is working, waiting on you or has proposals for you. |

A project whose token has launched leaves the list and shows under Launches, with a **Launched** chip wherever it appears. Token designs are reached from their project, the switcher and the command menu. Launched records cannot be deleted; the API answers with the reason.

### Starting a project

The new project pop up opens from the **Studio** card, from **New project** in the command menu and in the switcher, and at `/studio/new` as a deep link. It stays on the page you are on. Four short steps, and only the first is required:

| Step | Asks |
|------|------|
| Name | The project name, three characters or more. Enter moves on. |
| Sector | One of the six sectors as a card, or **I have not decided yet**. Optional. |
| Chain | Robinhood testnet (the default) or Arbitrum Sepolia, and a short description of the project. Optional. |
| Logo and token | A logo, and whether you want a native token: **Yes**, **No** or **Not sure**. Yes creates a token design named after the project and links it. Optional. |

Every step says the same thing at the bottom: everything here can be changed later while you ideate and build. **Create project** makes the project and opens it. Nothing is stored until then, so closing the pop up leaves nothing behind.

### The launches page

`/studio/launches` lists every launch of the account, then every project still in progress, with a chain filter (all chains, Robinhood testnet, Arbitrum Sepolia) kept in the URL. It is reached from the studio home and is not linked from the navigation.

### A launch row

| Control | What it does |
|---------|--------------|
| The name | Opens [the token page](../token-launch/token-page.md) |
| Link a project, or Change | Links the launch to one of your projects on the same chain, starts a new project for the token, or unlinks. See [Projects and launches](../token-launch/projects-and-launches.md) |
| Agent prompt | Opens a prompt to paste into an AI IDE so an agent can read the launch over MCP |

A launch appears here when it was made while you were signed in. A launch that reached you only through a token design has no project control of its own; it follows the design's link.

## The project page

A project opens at `/studio/project/<id>`. On a wide screen a sidebar on the left lists the project's five sections, the navigation's logo and breadcrumb line up above the project name in it, and the content fills the rest. On a phone the sidebar folds into a row of tabs. The sections never change with what the project builds; product shapes are labels and filters inside Build. The section in view is kept in the URL (`?tab=build`), so a link lands on the right one and a reload keeps it.

| Section | Holds |
|---------|-------|
| Overview | What the project is in one strip, the agent, how to connect one, the resource pack, the linked token design and the token launch panel |
| Build | Every build step under four milestones, Design, Testnet, Review and Launch |
| Decisions | What you are building, the chain, the contract templates you decided on, the contract architecture, the security declarations and your project files |
| Deployments | Testnet contracts, the tokens linked to the project, the mainnet record |
| Publish | The rest of the public record, the readiness list and the hand off to your agent |

The sidebar also lists **Agent changes** (Overview, scrolled to the agent) and, once published, **Public page**. Under them a **Resources** group lists what the project gets from CanHav, each opening a drawer: the **Resource pack** (tick and untick what the agent is given), the **Contract templates** that fit the chosen shapes (Accept or Reject each) and **Where protocols run** (the testnet and mainnet status of each protocol the shapes rely on, with the recommended path). Reading them is optional; the agent receives every section over MCP and picks what it needs. Decisions and Publish carry a dot while they hold fields the public record still needs. The fields themselves are described in [Product track](product-track.md).

### The header

Across from the project's name, on every section:

| Control | What it does |
|---------|--------------|
| Agent line | Connect agent, Agent connected, Agent working or Waiting on you, from the connected agent's last report |
| GitHub sync (Deployments) | Studio+. A workflow in the repository posts deployed addresses from Foundry broadcast files and ticks steps named in commits, see [GitHub sync](../ai/github-sync.md); Deployments shows the last sync as a line |
| Project keys (Deployments) | Studio+. Keys with read or write scope that stand in for a browser sign in on the project's MCP server and its draft export, for cloud agents and CI. Shown once, revocable, see [Markdown export and MCP](../ai/export-and-mcp.md#project-keys) |
| History | The version history pop up. Every save of the draft, by you, a teammate or your agent, newest first with what changed, and Restore on each (Studio+). The published versions are listed for everyone |
| Move to team | On a personal project, for the account that made it, while a Studio+ team is active. Moves the project, its linked design and its launches to the team, see [Accounts](../accounts/clerk-accounts.md) |
| Link a token (Token launch once one is linked) | Jumps to the Token launch panel on Overview |
| Name check | Under the project name on Publish, in the new project pop up and on the launch form, a plain line when a coin of that name or ticker is listed on CoinGecko or DexScreener. A warning only, nothing blocks |
| Agent prompt | Opens the guide for connecting an agent to this project |
| Published | The public link, once published. An unpublished record carries no chip; it is a draft |
| Publish, Republish, Unpublish | Publishes a snapshot to `/p/<slug>`. While the record still has open fields, Publish opens a pop up naming each one with a button into the section that holds it |

Edits save on their own a moment after you stop typing, and the save state (Saving, Saved, or not saved with a retry) shows above the section you are editing. If an agent writes to the draft while the page is open and nothing here is unsaved, the page takes the new draft; with unsaved typing it pauses saving and asks for a reload instead.

### Overview

| Block | What it shows |
|-------|---------------|
| The strip | The short description, the product shapes, the chain, the stage, the build progress and the deployer key's state, No deployer key, Deployer not funded, or Deployer funded on the chains it holds ETH on. The deployer chip opens Deployments. The **Build x of y** chip opens Build progress, done of total per milestone with a bar, an Open button into each, the open steps and a prompt that hands them to your agent. The **Summary** button opens what your agent says is built and being built |
| Summary | Two short lists written by the agent over MCP (`set_summary`) and kept current as work lands, Built and Being built, with the date. Tick the points you do not agree with, say what you want instead, and copy the prompt into your IDE; the agent checks each point against the repository and fixes the code or the summary. Without a summary the pop up offers the prompt that asks for one. The summary stays on the draft and is never published |
| Resource pack | One line with how many core resources your agent holds, and **Read** opens the same drawer as the sidebar's Resource pack, where you can tick and untick what the agent is given. The pack itself lives with the agent, through `get_resource_pack`, `RESOURCES.md` and `AGENTS.md` |
| Agent session | What the connected agent says it is doing: its state, a title, a message, its plan as a checklist and when it last reported |
| How agents write | Propose changes (the default), Write directly, or Off |
| Waiting for you | Proposals the agent made, each with the current value beside the agent's, with **Accept all** and **Reject all**. A proposal that builds on earlier ones is accepted after them |
| Earlier changes | The history of what agents proposed, wrote, and what you decided |
| Read this project from your agent | The add command and the prompt to paste |
| Linked token design | Link, create and link, or unlink a token design |
| Token launch | The launches linked to this project, each with an Agent prompt and Unlink, a picker for your unlinked launches on the same chain, a field to link one by address, short form or page link, and a link to launch a token from the project |

### Build

Build lists every step of every chosen shape as one list under four milestones. **Now** shows the next three open steps; **All steps** shows the milestones in full, and the sidebar's Design, Testnet, Review and Launch items open one milestone at a time (`?tab=build&milestone=testnet`). With more than one shape a shape filter narrows the list.

| On a step | What it does |
|-----------|--------------|
| Status | Todo, Done, Partial (a step shared between shapes ticked for some of them) or Not applicable. Done ticks the step for every shape that carries it. Not applicable asks for a reason, leaves the step out of the count and shows it struck through; Applies again brings it back |
| Shape labels | Which chosen shapes the step belongs to |
| Read | The two or three resources that help with this step |
| Evidence | One line, a file, a test name, an address or a commit, stored with the step and shown in the exports |
| Template | The first contract template that fits the step, with **Using** and **Not using**. The rest sit behind **+N more** with their full cards. A decision travels to every step that lists the template and to Decisions |
| Remove | Takes the step out of the list. Removed catalog steps sit under **Removed steps** and can be restored with their tick |

Under Review the pre-launch review passes sit as rows with a verdict each, Pass, Fail or Not applicable. Under Launch four rows are derived from the record, the deployer key funded on the project's chain, testnet contracts recorded, token linked and project published, each opening the section that settles it. **What this product includes** folds out per shape: a ticked feature adds the steps it gates and ranks the templates it suggests first. **Add a step** adds your own under a shape, ticked and counted like the rest, up to forty per project.

Build steps never block publishing. An agent connected to the project's server ticks, adds, removes and restores them through the same proposal flow as every other change, and reads the milestone of each step as `milestone` on `get_build_steps`.

### Decisions

The choices with a reason behind them, each editable in place: what you are building (sectors, subsectors, product shapes, the starting point), the chain (fixed once a token is linked to the project), the contract templates decided on Build with the agent's note where an agent decided one, the contracts, external dependencies, oracles, admin functions and upgradeability, the worst case a bug could cause and the five security declarations, and your project files (a spec, a repository path, a document link, never published, visible to your agent).

A **Customers** section holds who you sell to and the persona table (moved here from Publish) and, with Studio+, **Ideal customers**, one or two profiles with the wallets, channels and protocols they use, drafted from the personas and the protocols in your subsector on DefiLlama. With Studio+, a **Competitors** section lists the protocols in your subsector on your chain from DefiLlama (refreshed monthly, with TVL, chains and age), a positioning map you sit on with pins and two axes, and the one line on how you differ, drafted against the landscape. With Studio+, a **Brand** section holds the kit, palette (four swatches with a contrast line each, or picked from the logo), display and body fonts, tone words and a tagline, drafted or filled by hand, with the X header, link card and avatar as SVG downloads and brand.json on the export; the public page uses the palette and the link preview image carries it. With Studio+, a **Business model** section sits under Customers: the nine blocks of a Business Model Canvas, drafted from the record (Draft the canvas, Redraft on each block, or the prompt for your own agent) and edited in place. The sidebar lists the Decisions sections and scrolls to each.

### Deployments

One card for the project's chain. It opens with the **Deployer key**, a throwaway key your agent deploys from on both testnets. **Create a deployer key** makes it in your browser and shows it once as the line to paste into `packages/contracts/.env` (`DEPLOYER_PRIVATE_KEY=0x…`); CanHav never sees or stores the key, only its address. You can also record an address your agent made itself. With an address recorded, each testnet shows the balance, **Fund from the faucet** and the explorer link; **Replace the key** clears the address. The balances are read again every thirty seconds while the page is open and whenever you come back to the tab, so the Overview chip and the Launch row turn green on their own once the faucet has paid. Then the testnet contracts as label and address rows, each with an explorer link, the address book link and the team wallet; the tokens launched from or linked to the project with their token page and explorer links; and the mainnet record, the contracts, the companion template, the Pons pairing and the external trading pair. See [Projects and launches](../token-launch/projects-and-launches.md).

### Publish

The fields of the public record that no other section holds: name, logo, what it does, who you sell to and the personas, who pays, why this chain, the stage, where the first hundred users come from, the GitHub repo, the website and, on a Robinhood project, the distribution acknowledgement. Above the readiness list, **Who can see it** chooses Public or Private for the next publish (see [Public pages](public-pages.md), free accounts keep one private project). Under them the readiness list summarises the record and names what is still missing, with an **Open Decisions** button where the field lives there. Once everything checks out, publish from the header; a private project shows a Private chip there and a **Copy share link** button. The hand off block offers `RESOURCES.md` and `AGENTS.md` built from the draft, the link to launch a token from the project and the prompt that makes an agent load the resource pack.

Publishing snapshots the document and assigns a public slug under `/p/...`. See [Public pages](public-pages.md).

## The token design editor

A token design opens at `/studio/token/<id>`. Its sections are described in [Token track](token-track.md). A published design can be launched from `/launch?design=<id>`, which commits the design on-chain. See [Deploy paths](../token-launch/deploy-paths.md).

## Agents in the studio

Every project has its own MCP server, and every launch has a ready prompt. See [Markdown export and MCP](../ai/export-and-mcp.md) for the tools, the write modes, and what an agent can never do (publish, link a token design, or change a locked chain).

## Related

- [The two ideation tracks](two-tracks.md)
- [Product track](product-track.md)
- [Public pages](public-pages.md)
- [Projects and launches](../token-launch/projects-and-launches.md)
