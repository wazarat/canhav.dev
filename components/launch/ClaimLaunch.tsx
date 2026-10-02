"use client";

import Link from "next/link";
import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useAccount, useSignMessage } from "wagmi";

import { Button } from "@/components/ui/Button";
import { AUTH_COPY } from "@/content/auth";

/**
 * Shown on the token page to the connected creator wallet when the launch is
 * not on the viewer's account yet (M57). Adds the wallet to the Clerk user
 * and proves it with one signature, after which the account owns every
 * launch that wallet made. Signed out, it points at sign-in.
 */
export function ClaimLaunch({ creator, onClaimed }: { creator: string; onClaimed: () => void }) {
  const { address } = useAccount();
  const { isLoaded, isSignedIn, user } = useUser();
  const { signMessageAsync } = useSignMessage();
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isLoaded || !address || address.toLowerCase() !== creator) return null;

  if (!isSignedIn)
    return (
      <Button asChild size="sm" variant="outline">
        <Link href={AUTH_COPY.signInPath}>{AUTH_COPY.claimSignIn}</Link>
      </Button>
    );

  async function claim() {
    if (!user || !address) return;
    setWorking(true);
    setError(null);
    try {
      const wallet =
        user.web3Wallets.find((w) => w.web3Wallet.toLowerCase() === address.toLowerCase()) ??
        (await user.createWeb3Wallet({ web3Wallet: address }));
      if (wallet.verification.status !== "verified") {
        // Clerk's wallet proof is a personal_sign of its nonce message, the same for any EVM wallet.
        const prepared = await wallet.prepareVerification({ strategy: "web3_metamask_signature" });
        const message = prepared.verification.message ?? prepared.verification.nonce;
        if (!message) throw new Error(AUTH_COPY.claimFailed);
        const signature = await signMessageAsync({ message });
        await prepared.attemptVerification({ signature });
      }
      onClaimed();
    } catch (e) {
      console.error("claim failed", e);
      setError(AUTH_COPY.claimFailed);
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button size="sm" variant="outline" disabled={working} onClick={() => void claim()}>
        {working ? AUTH_COPY.claiming : AUTH_COPY.claim}
      </Button>
      {error ? <p className="text-xs text-rose-400">{error}</p> : null}
    </div>
  );
}
