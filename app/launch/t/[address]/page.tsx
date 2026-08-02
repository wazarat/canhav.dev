import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { formatEther } from "viem";

import { EscrowActions, type EscrowActionTranche } from "@/components/launch/EscrowActions";
import { EscrowCard } from "@/components/launch/EscrowCard";
import { JourneyCard, type VerifiedUpdate } from "@/components/launch/JourneyCard";
import { MilestoneUpdateComposer } from "@/components/launch/MilestoneUpdateComposer";
import { SaleActions, type SaleActionSale } from "@/components/launch/SaleActions";
import { SaleCard } from "@/components/launch/SaleCard";
import { VestingCard, type LiveVesting } from "@/components/launch/VestingCard";
import { LAUNCH_CHAIN } from "@/content/launch";
import { getDb } from "@/lib/db";
import { formatCount } from "@/lib/format";
import {
  formatSupply,
  getEscrows,
  getMilestoneUpdates,
  getRecentPurchases,
  getSales,
  getToken,
  getVesting,
  type IndexedPurchase,
  type IndexedVesting,
} from "@/lib/indexer";
import {
  hashJourney,
  hashMilestoneUpdate,
  type JourneyDoc,
  type MilestoneUpdateDoc,
} from "@/lib/journey";
import { publicClient } from "@/lib/publicClient";

const vestingWalletAbi = [
  {
    type: "function",
    name: "releasable",
    stateMutability: "view",
    inputs: [{ name: "token", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "released",
    stateMutability: "view",
    inputs: [{ name: "token", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "owner",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
] as const;

/** Live vesting progress straight from the chain; null when the RPC fails. */
async function getLiveVesting(v: IndexedVesting): Promise<LiveVesting | null> {
  try {
    const wallet = v.walletAddress as `0x${string}`;
    const token = v.tokenAddress as `0x${string}`;
    const [releasable, released, owner] = await Promise.all([
      publicClient.readContract({
        address: wallet, abi: vestingWalletAbi, functionName: "releasable", args: [token],
      }),
      publicClient.readContract({
        address: wallet, abi: vestingWalletAbi, functionName: "released", args: [token],
      }),
      publicClient.readContract({
        address: wallet, abi: vestingWalletAbi, functionName: "owner",
      }),
    ]);
    return { releasable, released, owner };
  } catch {
    return null;
  }
}

/** Fetch the stored journey doc and verify it against the on-chain hash. */
async function getVerifiedJourney(
  journeyHash: string,
): Promise<{ doc: JourneyDoc; verified: boolean } | null> {
  const db = getDb();
  if (!db) return null;
  try {
    const rows = await db`
      select doc from launchpad.journeys where journey_hash = ${journeyHash.toLowerCase()}
    `;
    if (rows.length === 0) return null;
    const doc = rows[0].doc as JourneyDoc;
    return { doc, verified: hashJourney(doc).toLowerCase() === journeyHash.toLowerCase() };
  } catch {
    return null;
  }
}

/**
 * Resolve on-chain update anchors to verified update threads per milestone:
 * keep only anchors authored by the token's creator whose stored body's
 * recomputed hash matches the anchor.
 */
async function getVerifiedUpdates(
  tokenAddress: string,
  creator: string,
): Promise<Record<number, VerifiedUpdate[]>> {
  const anchors = await getMilestoneUpdates(tokenAddress);
  const db = getDb();
  if (!anchors || anchors.length === 0 || !db) return {};

  const fromCreator = anchors.filter(
    (a) => a.author.toLowerCase() === creator.toLowerCase(),
  );
  if (fromCreator.length === 0) return {};

  try {
    const hashes = fromCreator.map((a) => a.updateHash.toLowerCase());
    const rows = await db`
      select update_hash, doc from launchpad.milestone_updates
      where update_hash = any(${hashes})
    `;
    const docs = new Map(rows.map((r) => [r.update_hash as string, r.doc as MilestoneUpdateDoc]));

    const grouped: Record<number, VerifiedUpdate[]> = {};
    for (const a of fromCreator) {
      const doc = docs.get(a.updateHash.toLowerCase());
      if (!doc) continue;
      if (hashMilestoneUpdate(doc).toLowerCase() !== a.updateHash.toLowerCase()) continue;
      (grouped[a.milestoneIndex] ??= []).push({
        body: doc.body,
        postedAt: Number(a.blockTimestamp),
        txHash: a.txHash,
      });
    }
    return grouped;
  } catch {
    return {};
  }
}

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

  const [journey, vesting, escrows, sales] = await Promise.all([
    getVerifiedJourney(token.journeyHash),
    getVesting(token.address),
    getEscrows(token.address),
    getSales(token.address),
  ]);
  const [liveVesting, updates, ...purchaseLists] = await Promise.all([
    vesting ? getLiveVesting(vesting) : null,
    getVerifiedUpdates(token.address, token.creator),
    ...(sales ?? []).map((s) => getRecentPurchases(s.saleId)),
  ]);
  const purchases: Record<string, IndexedPurchase[]> = {};
  (sales ?? []).forEach((s, i) => {
    purchases[s.saleId] = (purchaseLists[i] as IndexedPurchase[] | null) ?? [];
  });
  const explorer = LAUNCH_CHAIN.explorerUrl;

  const milestones = journey?.verified ? journey.doc.milestones : null;
  const actionTranches: EscrowActionTranche[] = (escrows ?? []).flatMap((e) =>
    e.tranches.map((t) => ({
      escrowId: e.escrowId,
      trancheIndex: t.trancheIndex,
      milestoneIndex: t.milestoneIndex,
      amount: t.amount,
      unlockTime: t.unlockTime,
      claimed: t.claimed,
    })),
  );
  const actionSales: SaleActionSale[] = (sales ?? []).map((s) => ({
    saleId: s.saleId,
    price: s.price,
    allocation: s.allocation,
    sold: s.sold,
    startTime: s.startTime,
    endTime: s.endTime,
    unsoldReclaimed: s.unsoldReclaimed,
    tranches: s.tranches.map((t) => ({
      trancheIndex: t.trancheIndex,
      unlockTime: t.unlockTime,
      claimed: t.claimed,
    })),
  }));

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
        {token.launchFee !== null ? (
          <Row
            label="Launch fee"
            value={
              token.launchFee === "0"
                ? "Free"
                : `${formatEther(BigInt(token.launchFee))} ETH`
            }
          />
        ) : null}
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

      {vesting ? (
        <VestingCard vesting={vesting} symbol={token.symbol} live={liveVesting} />
      ) : null}

      {escrows && escrows.length > 0 ? (
        <EscrowCard
          escrows={escrows}
          symbol={token.symbol}
          milestones={milestones}
          nowSeconds={Math.floor(Date.now() / 1000)}
        />
      ) : null}

      {sales && sales.length > 0 ? (
        <SaleCard
          sales={sales}
          purchases={purchases}
          symbol={token.symbol}
          milestones={milestones}
          nowSeconds={Math.floor(Date.now() / 1000)}
        />
      ) : null}

      <SaleActions
        tokenAddress={token.address}
        creator={token.creator}
        journeyHash={token.journeyHash}
        symbol={token.symbol}
        milestones={milestones}
        sales={actionSales}
      />

      <EscrowActions
        tokenAddress={token.address}
        creator={token.creator}
        journeyHash={token.journeyHash}
        symbol={token.symbol}
        milestones={milestones}
        tranches={actionTranches}
      />

      <MilestoneUpdateComposer
        tokenAddress={token.address}
        creator={token.creator}
        milestoneTitles={(milestones ?? []).map((m) => m.title)}
      />

      {journey ? (
        <JourneyCard doc={journey.doc} verified={journey.verified} updates={updates} />
      ) : (
        <div className="mt-8 rounded-2xl border border-ink-800/70 bg-ink-950/40 p-6">
          <p className="text-sm text-ink-400">
            No journey document found for hash{" "}
            <span className="break-all font-mono text-xs">{token.journeyHash}</span> — this
            token was launched without publishing its journey to this site.
          </p>
        </div>
      )}

      <p className="mt-4 text-xs text-ink-500">
        Token fields are read from the on-chain TokenLaunched event via the
        indexer. The journey document is stored off-chain; its keccak256 hash is
        recomputed on every page load and compared to the hash in the event.
      </p>
    </div>
  );
}
