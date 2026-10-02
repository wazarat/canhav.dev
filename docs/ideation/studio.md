# Studio

**Available now.** Requires a CanHav [account](../accounts/clerk-accounts.md).

The studio (`/studio`) is where a signed-in account sees everything it owns: its launches, its projects and its token designs. The **Log in or sign up** button in the navigation opens it, and once you are signed in the button reads **Studio**.

## The studio page

| Section | What it lists |
|---------|---------------|
| Launches | The tokens recorded to your account, on either chain, plus tokens deployed from your token designs. Each row opens the token page. |
| Start something new | Cards that create a blank project or a blank token design. |
| Token designs | Your token design drafts and published designs. |
| Projects | Your project drafts and published projects, each with its linked token design and launched token when it has them. |

### A launch row

| Control | What it does |
|---------|--------------|
| The name | Opens [the token page](../token-launch/token-page.md) |
| Link a project, or Change | Links the launch to one of your projects on the same chain, starts a new project for the token, or unlinks. See [Projects and launches](../token-launch/projects-and-launches.md) |
| Agent prompt | Opens a prompt to paste into an AI IDE so an agent can read the launch over MCP |

A launch appears here when it was made while you were signed in. A launch that reached you only through a token design has no project control of its own; it follows the design's link.

## The project editor

A project opens at `/studio/project/<id>`. Its steps are Basics, Architecture, Security, Reality, one step per product shape, and Review. The fields are described in [Product track](product-track.md).

Across from the project's name:

| Button | What it does |
|--------|--------------|
| Link a token (Token launch once one is linked) | Jumps to the Token launch panel |
| Agent prompt | Opens the guide for connecting an agent to this project |
| Publish, Republish, Unpublish | Publishes a snapshot to `/p/<slug>` |

Further down the page, on every step:

| Panel | What it does |
|-------|--------------|
| Agent changes | How agents may write to this project (Propose changes, Write directly, or Off), proposals waiting for you, and the history. A proposal is decided line by line: untick a line to leave it out, or edit a value before you accept it |
| Linked token design | Link, create and link, or unlink a token design |
| Token launch | The launches linked to this project, each with an Agent prompt and Unlink, a picker for your unlinked launches on the same chain, and a link to launch a token from the project |
| Read this project from your agent | The connect card for the project's MCP server |

Other things worth knowing:

- **Chain.** A project builds on Robinhood testnet or Arbitrum Sepolia, chosen in Basics. It is fixed once a token is linked to the project.
- **Project files.** In the Architecture step you can add references to your own files (a spec, a repository path, a document link). They are never published. They appear in the draft exports and to an agent on the project's server.
- **Build steps.** Each product shape has its own step with a checklist. You can add your own steps and remove ones that do not apply.
- **Exports.** The Review step offers `RESOURCES.md` and `AGENTS.md` built from the draft, once the project has a product shape.

## The token design editor

A token design opens at `/studio/token/<id>`. Its sections are described in [Token track](token-track.md). A published design can be launched from `/launch?design=<id>`, which commits the design on-chain. See [Deploy paths](../token-launch/deploy-paths.md).

## Agents in the studio

Every project has its own MCP server, and every launch has a ready prompt. See [Markdown export and MCP](../ai/export-and-mcp.md) for the tools, the write modes, and what an agent can never do (publish, link, or change a locked chain).

## Related

- [The two ideation tracks](two-tracks.md)
- [Public pages](public-pages.md)
- [Projects and launches](../token-launch/projects-and-launches.md)
