"use client";

import { useEffect, useState } from "react";
import { useConnect, useDisconnect } from "wagmi";

import { Button } from "@/components/ui/Button";
import { LAUNCH_CHAIN } from "@/content/launch";

import { useLaunchChain } from "./useLaunchChain";

function shortAddress(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function ConnectButton() {
  const { connect, connectors, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  const { isConnected, address, onCorrectChain, ensureChain } = useLaunchChain();

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
        <div className="flex flex-wrap items-center justify-end gap-2">
          {discovered.length > 0 ? (
            discovered.map((connector) => (
              <Button
                key={connector.uid}
                size="sm"
                disabled={isPending}
                onClick={() => connect({ connector })}
              >
                {connector.icon ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={connector.icon} alt="" className="h-4 w-4 rounded" />
                ) : null}
                {isPending ? "Connecting…" : `Connect ${connector.name}`}
              </Button>
            ))
          ) : (
            <Button
              size="sm"
              disabled={!fallback || isPending || noWalletDetected}
              onClick={() => fallback && connect({ connector: fallback })}
            >
              {isPending ? "Connecting…" : "Connect wallet"}
            </Button>
          )}
        </div>

        {isPending ? (
          <p className="text-xs text-ink-500">
            Check your wallet — the popup may open behind this window.
          </p>
        ) : noWalletDetected ? (
          <p className="text-xs text-amber-300/90">
            No wallet extension detected — install MetaMask or Rabby to launch.
          </p>
        ) : error ? (
          <p className="max-w-xs truncate text-xs text-rose-400" title={error.message}>
            {error.message.split("\n")[0].slice(0, 120)}
          </p>
        ) : null}
      </div>
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
