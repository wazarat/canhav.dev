# Register an agent

Use the product UI at `/agents` while connected to Base Sepolia.

## What registration means

Registering creates an **ERC-721 agent identity** on the public ERC-8004 Identity Registry. The agent can declare a registration file URI (HTTPS or inline `data:` URI).

CanHav does not custody the agent runtime. The chain holds identity and metadata pointers; your off-chain agent still has to run somewhere else.

## UI flow (current)

1. Connect a wallet on Base Sepolia.
2. Confirm [registry status](registry-addresses.md) (Identity Registry address and Reputation wiring).
3. Submit a registration through the Identity Registry (as exposed by the page).
4. Find the agent under [Recent registrations](browsing-agents.md) once the indexer sees the event.

## Constraints today vs soon

| Today | Soon |
|-------|------|
| Public registry registration as supported by ERC-8004 | Limit registrations to **MCP endpoints** for introspectable capabilities |

See [MCP endpoints](mcp-endpoints.md).

## Related

- [What is ERC-8004](what-is-erc-8004.md)
- [Browsing agents](browsing-agents.md)
- [FAQ](faq.md)
