"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
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

  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  // Close the dropdown on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!isConnected) {
    const fallback = connectors.find((c) => c.id === "injected");

    return (
      <div className="flex flex-col items-end gap-1.5">
        <div ref={menuRef} className="relative">
          <Button
            size="sm"
            disabled={isPending || noWalletDetected}
            onClick={() => {
              if (discovered.length > 0) {
                setOpen((v) => !v);
              } else if (fallback) {
                connect({ connector: fallback });
              }
            }}
          >
            {isPending ? "Connecting…" : "Connect wallet"}
            {discovered.length > 0 && !isPending ? (
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
            ) : null}
          </Button>

          {open ? (
            <div className="glass-strong absolute right-0 top-full z-20 mt-2 w-56 overflow-hidden rounded-xl border border-ink-700/70 py-1 shadow-xl">
              {discovered.map((connector) => (
                <button
                  key={connector.uid}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    connect({ connector });
                  }}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-ink-100 transition-colors hover:bg-ink-800/70"
                >
                  {connector.icon ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={connector.icon} alt="" className="h-5 w-5 rounded" />
                  ) : (
                    <span className="h-5 w-5 rounded bg-ink-700" />
                  )}
                  {connector.name}
                </button>
              ))}
            </div>
          ) : null}
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
