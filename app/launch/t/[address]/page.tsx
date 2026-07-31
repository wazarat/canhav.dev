import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";

import { LAUNCH_CHAIN } from "@/content/launch";
import { formatCount } from "@/lib/format";
import { formatSupply, getToken } from "@/lib/indexer";

export const metadata: Metadata = {
  title: "Token",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function Row({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-ink-800/70 py-3 last:border-b-0">
      <span className="text-xs text-ink-500">{label}</span>
      <span className={`min-w-0 break-all text-sm text-ink-200 ${mono ? "font-mono text-xs" : ""}`}>
        {value}
      </span>
    </div>
  );
}

export default async function TokenPage({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = await params;
  const token = await getToken(address);
  if (!token) notFound();

  const explorer = LAUNCH_CHAIN.explorerUrl;

  return (
    <div className="container max-w-3xl py-14 md:py-20">
      <Link
        href="/launch/explore"
        className="inline-flex items-center gap-1.5 text-sm text-ink-400 transition-colors hover:text-ink-100"
      >
        <ArrowLeft className="h-4 w-4" /> All tokens
      </Link>

      <div className="mt-6 flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-ink-700/60 bg-ink-900/80">
          <span className="text-gradient-brand font-display text-2xl font-semibold">
            {token.name.charAt(0).toUpperCase()}
          </span>
        </div>
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-50">
            {token.name}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-electric-500/40 bg-electric-500/10 px-2.5 py-0.5 font-mono text-xs text-electric-300">
              ${token.symbol}
            </span>
            <span className="inline-flex items-center rounded-full border border-ink-700/70 bg-ink-900/60 px-2.5 py-0.5 text-xs text-ink-300">
              template v{token.version}
            </span>
            {token.xHandle ? (
              <span className="inline-flex items-center rounded-full border border-ink-700/70 bg-ink-900/60 px-2.5 py-0.5 text-xs text-ink-300">
                x.com/{token.xHandle}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="card-surface glow-ring mt-8 rounded-2xl border border-ink-700/70 p-6">
        <Row
          label="Token address"
          mono
          value={
            <a
              href={`${explorer}/address/${token.address}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-electric-300 hover:text-electric-200"
            >
              {token.address} <ExternalLink className="h-3 w-3 shrink-0" />
            </a>
          }
        />
        <Row
          label="Creator"
          mono
          value={
            <a
              href={`${explorer}/address/${token.creator}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-electric-300 hover:text-electric-200"
            >
              {token.creator} <ExternalLink className="h-3 w-3 shrink-0" />
            </a>
          }
        />
        <Row label="Total supply" value={`${formatCount(formatSupply(token.totalSupply))} ${token.symbol}`} />
        <Row
          label="Website"
          value={
            token.website ? (
              <a
                href={token.website}
                target="_blank"
                rel="noreferrer"
                className="text-electric-300 hover:text-electric-200"
              >
                {token.website}
              </a>
            ) : (
              <span className="text-ink-500">—</span>
            )
          }
        />
        <Row label="Description hash" mono value={token.descriptionHash} />
        <Row label="Journey hash" mono value={token.journeyHash} />
        <Row label="Salt" mono value={token.salt} />
        <Row
          label="Launch transaction"
          mono
          value={
            <a
              href={`${explorer}/tx/${token.txHash}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-electric-300 hover:text-electric-200"
            >
              {token.txHash} <ExternalLink className="h-3 w-3 shrink-0" />
            </a>
          }
        />
        <Row label="Block" value={token.blockNumber} />
        <Row label="Network" value={LAUNCH_CHAIN.name} />
      </div>

      <p className="mt-4 text-xs text-ink-500">
        All fields are read from the on-chain TokenLaunched event via the local
        indexer — nothing on this page comes from a form.
      </p>
    </div>
  );
}
