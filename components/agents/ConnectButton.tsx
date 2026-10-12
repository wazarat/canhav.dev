"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useConnect, useDisconnect } from "wagmi";

import { Button } from "@/components/ui/Button";
import { Menu, MenuItem } from "@/components/ui/Menu";
import { StatusChip } from "@/components/ui/StatusChip";
import { AGENT_CHAIN, AGENTS_UNSUPPORTED_WALLETS } from "@/content/agents";

import { useAgentChain } from "./useAgentChain";

function shortAddress(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

/** /agents copy of the launch ConnectButton — separate wallet layers per
 *  track by design (each subtree has its own single-chain wagmi config). */
export function ConnectButton() {
  const { connect, connectors, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  const { isConnected, address, onCorrectChain, ensureChain, switchError } = useAgentChain();

  // EIP-6963-discovered wallets carry their rdns as id (e.g. "io.metamask");
  // the config's generic fallback connector keeps id "injected". Discovery is
  // client-only, so gate the no-wallet hint behind an effect to avoid a
  // hydration mismatch on first paint.
  const discovered = connectors.filter((c) => c.id !== "injected");
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const noWalletDetected =
    mounted &&
    discovered.length === 0 &&
    typeof window !== "undefined" &&
    typeof (window as { ethereum?: unknown }).ethereum === "undefined";

  if (!isConnected) {
    const fallback = connectors.find((c) => c.id === "injected");

    return (
      <div className="flex flex-col items-end gap-1.5">
        <Menu
          trigger={({ open, toggle }) => (
            <Button
              size="sm"
              disabled={isPending || noWalletDetected}
              aria-expanded={discovered.length > 0 ? open : undefined}
              onClick={() => {
                if (discovered.length > 0) toggle();
                else if (fallback) connect({ connector: fallback });
              }}
            >
              {isPending ? "Connecting…" : "Connect wallet"}
              {discovered.length > 0 && !isPending ? (
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
              ) : null}
            </Button>
          )}
        >
          {discovered.map((connector) => {
            const unsupported = AGENTS_UNSUPPORTED_WALLETS[connector.id];
            return (
              <MenuItem
                key={connector.uid}
                disabled={!!unsupported}
                onSelect={() => connect({ connector })}
              >
                {connector.icon ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={connector.icon} alt="" className={`h-5 w-5 rounded ${unsupported ? "opacity-40" : ""}`} />
                ) : (
                  <span className="h-5 w-5 rounded bg-ink-700" />
                )}
                <span className="min-w-0">
                  <span className={`block ${unsupported ? "text-ink-500" : ""}`}>{connector.name}</span>
                  {unsupported ? <span className="block text-xs text-ink-500">{unsupported}</span> : null}
                </span>
              </MenuItem>
            );
          })}
        </Menu>

        {isPending ? (
          <p className="text-xs text-ink-500">
            Check your wallet. The popup may open behind this window.
          </p>
        ) : noWalletDetected ? (
          <StatusChip variant="block" tone="warning" className="max-w-xs">
            No wallet extension detected. Install MetaMask or Rabby to register.
          </StatusChip>
        ) : error ? (
          <p className="max-w-xs truncate text-xs text-rose-400" title={error.message}>
            {error.message.split("\n")[0].slice(0, 120)}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {onCorrectChain ? <StatusChip tone="success">{AGENT_CHAIN.name}</StatusChip> : null}
        <span className="rounded-lg border border-ink-700/60 bg-ink-900 px-3 py-1.5 font-mono text-xs text-ink-200">
          {address ? shortAddress(address) : ""}
        </span>
        <Button size="sm" variant="ghost" onClick={() => disconnect()}>
          Disconnect
        </Button>
      </div>
      {!onCorrectChain ? (
        <StatusChip tone="warning" variant="block" onClick={() => void ensureChain()} className="max-w-xs">
          Wrong network. Switch to {AGENT_CHAIN.name}
        </StatusChip>
      ) : null}
      {switchError ? (
        <p className="max-w-sm text-right text-xs text-rose-400">{switchError}</p>
      ) : null}
    </div>
  );
}
