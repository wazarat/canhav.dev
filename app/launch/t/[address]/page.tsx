import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { formatEther } from "viem";

import { CurveActions } from "@/components/launch/CurveActions";
import { CurveCard } from "@/components/launch/CurveCard";
import { EscrowActions, type EscrowActionTranche } from "@/components/launch/EscrowActions";
import { EscrowCard } from "@/components/launch/EscrowCard";
import { DesignCommitmentCard } from "@/components/launch/DesignCommitmentCard";
import { JourneyCard } from "@/components/launch/JourneyCard";
import { McpConnectCard } from "@/components/launch/McpConnectCard";
import { MilestoneUpdateComposer } from "@/components/launch/MilestoneUpdateComposer";
import { PoolActions, type PoolActionPool } from "@/components/launch/PoolActions";
import { PoolCard } from "@/components/launch/PoolCard";
import { ProjectCard } from "@/components/launch/ProjectCard";
import { SaleActions, type SaleActionSale } from "@/components/launch/SaleActions";
import { SaleCard } from "@/components/launch/SaleCard";
import { VestingCard, type LiveVesting } from "@/components/launch/VestingCard";
import { StatusChip } from "@/components/ui/StatusChip";
import { launchChain } from "@/content/launch";
import { DEFAULT_PROJECT_CHAIN, type ProjectChain } from "@/lib/chains";
import { formatCount } from "@/lib/format";
import {
  formatSupply,
  getCurve,
  getCurveTrades,
  getEscrows,
  getLaunchPool,
  getRecentPurchases,
  getRecentSwaps,
  getSales,
  findTokenRead,
  getVesting,
  isCurveLaunch,
  type IndexedPurchase,
  type IndexedVesting,
} from "@/lib/indexer";
import { hasCommitment } from "@/lib/journey";
import { getLaunchCommitment, getVerifiedUpdates } from "@/lib/journey-db";
import { getLaunchProjectSummary } from "@/lib/launch-project";
import { publicClientFor } from "@/lib/publicClient";
import { getVerifiedTokenMetadata } from "@/lib/token-metadata-db";

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
async function getLiveVesting(v: IndexedVesting, chain: ProjectChain): Promise<LiveVesting | null> {
  const publicClient = publicClientFor(chain);
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

export const dynamic = "force-dynamic";

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

/** Deduped so generateMetadata and the page share one indexer round trip. */
// The token is looked for on every chain and carries the one it was found on (M54).
const readToken = cache((address: string) => findTokenRead(address));

export async function generateMetadata({
  params,
}: {
  params: Promise<{ address: string }>;
}): Promise<Metadata> {
  const { address } = await params;
  if (!ADDRESS_RE.test(address)) return { title: "Token launch" };
  const read = await readToken(address);
  // An address we cannot resolve still returns 200 so the page can explain
  // itself, so keep those responses out of the index.
  if (read.status !== "ok")
    return { title: "Token launch", robots: { index: false, follow: false } };
  return { title: `${read.value.name} (${read.value.symbol})` };
}

/**
 * The page shell for a launch we cannot show yet. A bare 404 was wrong for
 * both cases it used to cover: the indexer being unreachable, and a launch
 * that landed seconds ago and has not been indexed. Keeping the shell means
 * the nav, the back link and the address survive.
 */
function UnresolvedLaunch({
  address,
  tone,
  message,
}: {
  address: string;
  tone: "warning" | "info";
  message: string;
}) {
  return (
    <div className="container max-w-3xl py-14 md:py-20">
      <Link
        href="/explore"
        className="inline-flex items-center gap-1.5 text-sm text-ink-400 transition-colors hover:text-ink-100"
      >
        <ArrowLeft className="h-4 w-4" /> All launches
      </Link>

      <h1 className="mt-6 font-display text-3xl font-semibold tracking-tight text-ink-50">
        Token launch
      </h1>

      <div className="mt-5 max-w-xl">
        <StatusChip tone={tone} variant="block">
          {message}
        </StatusChip>
      </div>

      <p className="mt-5 break-all font-mono text-xs text-ink-400">{address}</p>

      <div className="mt-5 flex flex-wrap items-center gap-4 text-sm">
        <Link
          href={`/launch/t/${address}`}
          className="text-electric-300 transition-colors hover:text-electric-200"
        >
          Refresh
        </Link>
        <a
          href={`${launchChain().explorerUrl}/address/${address}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-electric-300 transition-colors hover:text-electric-200"
        >
          View on the explorer <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
}

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
  // A malformed address is the only genuine 404 here. Everything else is a
  // state the page can explain.
  if (!ADDRESS_RE.test(address)) notFound();
  const read = await readToken(address);
  if (read.status === "unavailable")
    return (
      <UnresolvedLaunch
        address={address}
        tone="warning"
        message="The launch indexer is unreachable right now, so this token's details cannot be loaded. The token itself is unaffected. Try again shortly or open it on the explorer."
      />
    );
  if (read.status === "empty")
    return (
      <UnresolvedLaunch
        address={address}
        tone="info"
        message="This launch is not indexed yet. A token that just launched takes a moment to appear. Refresh in a few seconds, or open it on the explorer to confirm it is on-chain."
      />
    );
  const token = read.value;
  const chain = token.chain ?? DEFAULT_PROJECT_CHAIN;
  const net = launchChain(chain);

  const committed = hasCommitment(token.journeyHash);
  // The journey document or the design snapshot the launch committed (M48).
  const [commitment, vesting, escrows, sales, curve] = await Promise.all([
    committed ? getLaunchCommitment(token.journeyHash) : null,
    getVesting(token.address, chain),
    getEscrows(token.address, chain),
    getSales(token.address, chain),
    getCurve(token.address, chain),
  ]);
  // A graduated curve's pool belongs to the launcher, so it is found by id;
  // otherwise the creator's own pool (lib/indexer.ts getLaunchPool).
  const ammPool = await getLaunchPool(token, curve, chain);
  const [
    liveVesting,
    updates,
    metadata,
    swapData,
    curveTrades,
    projectSummary,
    ...purchaseLists
  ] = await Promise.all([
      vesting ? getLiveVesting(vesting, chain) : null,
      getVerifiedUpdates(token.address, token.creator, chain),
      // The description text, only when it re-hashes to the on-chain value.
      getVerifiedTokenMetadata(token.descriptionHash, token.creator),
      ammPool ? getRecentSwaps(ammPool.poolId, undefined, chain) : null,
      curve ? getCurveTrades(token.address, undefined, chain) : null,
      // The studio project the token was launched from (M19d), or null.
      getLaunchProjectSummary(token.address),
      ...(sales ?? []).map((s) => getRecentPurchases(s.saleId, undefined, chain)),
    ]);
  const purchases: Record<string, IndexedPurchase[]> = {};
  (sales ?? []).forEach((s, i) => {
    purchases[s.saleId] = (purchaseLists[i] as IndexedPurchase[] | null) ?? [];
  });
  const explorer = net.explorerUrl;

  // Verified milestones from either document gate sales, escrow and updates.
  const milestones = commitment?.milestones ?? null;
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
        href="/explore"
        className="inline-flex items-center gap-1.5 text-sm text-ink-400 transition-colors hover:text-ink-100"
      >
        <ArrowLeft className="h-4 w-4" /> All launches
      </Link>

      <div className="mt-6 flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-ink-700/60 bg-ink-900/80">
          {token.imageURI ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={token.imageURI} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-gradient-brand font-display text-2xl font-semibold">
              {token.name.charAt(0).toUpperCase()}
            </span>
          )}
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
              {isCurveLaunch(token) ? "curve launch" : `template v${token.version}`}
            </span>
            {token.xHandle ? (
              <a
                href={`https://x.com/${token.xHandle}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center rounded-full border border-ink-700/70 bg-ink-900/60 px-2.5 py-0.5 text-xs text-ink-300 transition-colors hover:text-ink-100"
              >
                x.com/{token.xHandle}
              </a>
            ) : null}
            {metadata?.telegram ? (
              <a
                href={`https://t.me/${metadata.telegram}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center rounded-full border border-ink-700/70 bg-ink-900/60 px-2.5 py-0.5 text-xs text-ink-300 transition-colors hover:text-ink-100"
              >
                t.me/{metadata.telegram}
              </a>
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
              <span className="text-ink-500">n/a</span>
            )
          }
        />
        {metadata ? <Row label="Description" value={metadata.description} /> : null}
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
        <Row label="Network" value={net.name} />
      </div>

      {vesting ? (
        <VestingCard chain={chain} vesting={vesting} symbol={token.symbol} live={liveVesting} />
      ) : null}

      {escrows && escrows.length > 0 ? (
        <EscrowCard chain={chain}
          escrows={escrows}
          symbol={token.symbol}
          milestones={milestones}
          nowSeconds={Math.floor(Date.now() / 1000)}
        />
      ) : null}

      {sales && sales.length > 0 ? (
        <SaleCard chain={chain}
          sales={sales}
          purchases={purchases}
          symbol={token.symbol}
          milestones={milestones}
          nowSeconds={Math.floor(Date.now() / 1000)}
        />
      ) : null}

      <SaleActions chain={chain}
        tokenAddress={token.address}
        creator={token.creator}
        journeyHash={token.journeyHash}
        symbol={token.symbol}
        milestones={milestones}
        sales={actionSales}
      />

      {curve ? (
        <CurveCard chain={chain}
          curve={curve}
          symbol={token.symbol}
          trades={curveTrades as Awaited<ReturnType<typeof getCurveTrades>>}
          nowSeconds={Math.floor(Date.now() / 1000)}
        >
          {!curve.graduated ? (
            <CurveActions chain={chain} tokenAddress={token.address} symbol={token.symbol} />
          ) : null}
        </CurveCard>
      ) : null}

      {ammPool ? (
        <PoolCard chain={chain}
          pool={ammPool}
          symbol={token.symbol}
          swapData={swapData as Awaited<ReturnType<typeof getRecentSwaps>>}
          locked={Boolean(curve?.graduated)}
        />
      ) : null}

      {curve && !curve.graduated ? null : (
        // While a curve is live its market is the curve, so the creator is
        // not offered a pool. After graduation the launcher's pool is
        // tradable by everyone, with the liquidity controls hidden.
        <PoolActions chain={chain}
          tokenAddress={token.address}
          creator={token.creator}
          symbol={token.symbol}
          lockedLiquidity={Boolean(curve?.graduated)}
          pool={
            ammPool
              ? ({
                  poolId: ammPool.poolId,
                  protocolFeeBps: ammPool.protocolFeeBps,
                  ethReserve: ammPool.ethReserve,
                  tokenReserve: ammPool.tokenReserve,
                  totalShares: ammPool.totalShares,
                } satisfies PoolActionPool)
              : null
          }
        />
      )}

      <EscrowActions chain={chain}
        tokenAddress={token.address}
        creator={token.creator}
        journeyHash={token.journeyHash}
        symbol={token.symbol}
        milestones={milestones}
        tranches={actionTranches}
      />

      <MilestoneUpdateComposer chain={chain}
        tokenAddress={token.address}
        creator={token.creator}
        milestoneTitles={(milestones ?? []).map((m) => m.title)}
      />

      {commitment?.source === "journey" ? (
        // journeyHash resolves in launchpad.journeys ⇒ the quick-deploy path.
        <>
          <div className="mt-8">
            <StatusChip tone="neutral" variant="block">
              Quick deploy, no design record. This token was launched with a
              journey document only; there is no published token design behind
              it.
            </StatusChip>
          </div>
          <JourneyCard doc={commitment.doc} verified={commitment.verified} updates={updates} />
        </>
      ) : commitment?.source === "design" ? (
        // journeyHash resolves in launchpad.ideation_snapshots ⇒ launched
        // from a published design; the hash commits the design on-chain, and
        // the design's milestones (M48) are the launch's milestones.
        <DesignCommitmentCard commitment={commitment} updates={updates} />
      ) : !committed ? (
        <div className="mt-8">
          <StatusChip tone="neutral" variant="block">
            Launched without a commitment. This token recorded no journey
            document, so there are no milestones to lock supply or schedule
            sale proceeds against.
          </StatusChip>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          <StatusChip tone="neutral" variant="block">
            No design record. The committed hash{" "}
            <span className="break-all font-mono text-[11px]">{token.journeyHash}</span>{" "}
            resolves to neither a journey document nor a published token design
            on this site.
          </StatusChip>
        </div>
      )}

      {projectSummary ? (
        // This route runs without Clerk middleware, so no viewer is ever the
        // owner here; a draft project shows its chips without its name.
        <ProjectCard project={projectSummary.project} isOwner={false} />
      ) : null}

      <McpConnectCard
        target={{ kind: "launch", address: token.address.toLowerCase(), committed, name: token.name }}
        className="mt-8"
      />

      <p className="mt-4 text-xs text-ink-500">
        Token fields are read from the on-chain TokenLaunched event via the
        indexer. The description text and the committed document, a journey
        or a design snapshot, are stored off-chain; each keccak256 hash is
        recomputed on every page load and compared to the hash in the event. The Telegram link is stored with the
        description and is not committed on-chain.
      </p>
    </div>
  );
}
