"use client";

import { useConnect, useDisconnect } from "wagmi";

import { Button } from "@/components/ui/Button";
import { LAUNCH_CHAIN } from "@/content/launch";

import { useLaunchChain } from "./useLaunchChain";

function shortAddress(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function ConnectButton() {
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { isConnected, address, onCorrectChain, ensureChain } = useLaunchChain();

  if (!isConnected) {
    const injectedConnector = connectors[0];
    return (
      <Button
        size="sm"
        disabled={!injectedConnector || isPending}
        onClick={() => injectedConnector && connect({ connector: injectedConnector })}
      >
        {isPending ? "Connecting…" : "Connect wallet"}
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {!onCorrectChain ? (
        <button
          type="button"
          onClick={() => void ensureChain()}
          className="inline-flex items-center rounded-full border border-amber-500/50 bg-amber-500/10 px-3 py-1 text-xs text-amber-300 transition-colors hover:bg-amber-500/20"
        >
          Wrong network — switch to {LAUNCH_CHAIN.name}
        </button>
      ) : (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          {LAUNCH_CHAIN.name}
        </span>
      )}
      <span className="rounded-full border border-ink-700/70 bg-ink-900/60 px-3 py-1 font-mono text-xs text-ink-200">
        {address ? shortAddress(address) : ""}
      </span>
      <button
        type="button"
        onClick={() => disconnect()}
        className="text-xs text-ink-500 transition-colors hover:text-ink-200"
      >
        Disconnect
      </button>
    </div>
  );
}
