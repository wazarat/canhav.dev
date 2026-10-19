# Alerts

Studio+ teams can have CanHav watch their contracts and tell them within a
minute when something happens on chain. The rules and channels live on the
project page under **Deployments**, in the **Alerts** section.

## What can be watched

A rule names one address on the project's chain, a name for it, and the
kinds to alert on:

- **Ownership change**, the `OwnershipTransferred` event any Ownable
  contract emits.
- **Pause and unpause**, the `Paused` and `Unpaused` events.
- **Large transfer**, an ERC-20 `Transfer` at or above a threshold you set
  in whole tokens.
- **Curve graduation**, the launcher's `Graduated` event for that token.

Up to ten rules per project. The addresses offered are the project's tokens
and its recorded testnet contracts; any other address on the chain can be
typed in.

## Where alerts go

Up to five channels per project: an email address, a Telegram bot (the
token from BotFather and the chat id it writes to) or a Discord webhook.
Bot tokens and webhooks are encrypted before they are stored and the studio
shows only a masked form; the worker decrypts them at delivery. Every event
is recorded on the project whether or not a channel exists, with what was
delivered where, and the last ten show in the section and on
`get_alerts` over the project's MCP server.

## How it runs

A small worker polls both testnets every minute from the point it first
saw a rule for that chain, so nothing from before then is alerted, and
reads at most two thousand blocks a poll, catching up a window a minute
after a pause. Public RPCs can rate limit; a failed poll is retried from
the same place next minute, so nothing is skipped.

## Related

- [Studio+](../accounts/studio-plus.md)
- [Governance](governance.md), the timelock behind every admin change on
  the platform's own contracts
