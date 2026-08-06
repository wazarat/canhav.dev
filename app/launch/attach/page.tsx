import type { Metadata } from "next";

import { AttachDeployFlow } from "@/components/launch/AttachDeployFlow";
import { StatusChip } from "@/components/ui/StatusChip";

// URL-only like the rest of /launch; reached from the token design editor.
export const metadata: Metadata = {
  title: "Attach a deployed token",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AttachPage({
  searchParams,
}: {
  searchParams: Promise<{ design?: string }>;
}) {
  const { design } = await searchParams;
  const designId = design && /^[0-9a-f-]{36}$/.test(design) ? design : null;

  return (
    <div className="container py-14 md:py-20">
      <div className="max-w-2xl">
        <p className="kicker">Launchpad</p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink-50 md:text-5xl">
          Attach a deployed token
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-ink-400">
          Link a contract that already committed your published design&apos;s
          hash on-chain to its design record. Proof of ownership comes from
          the deployer wallet&apos;s signature — not from trust.
        </p>
      </div>
      <div className="mt-10">
        {designId ? (
          <AttachDeployFlow designId={designId} />
        ) : (
          <StatusChip tone="warning" variant="block">
            Missing design id. Open this page from your token design editor
            (&quot;Already deployed? Attach the contract&quot;).
          </StatusChip>
        )}
      </div>
    </div>
  );
}
