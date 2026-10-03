"use client";

import Link from "next/link";
import { useState } from "react";
import { useReverification, useUser } from "@clerk/nextjs";
import { isClerkAPIResponseError, isReverificationCancelledError } from "@clerk/nextjs/errors";
import { useAccount, useSignMessage } from "wagmi";

import { Button } from "@/components/ui/Button";
import { AUTH_COPY } from "@/content/auth";

/**
 * Shown on the token page to the connected creator wallet when the launch is
 * not on the viewer's account yet (M57). Adds the wallet to the Clerk user
 * and proves it with one signature, after which the account owns every
 * launch that wallet made. Signed out, it points at sign-in.
 */

/** Why the claim failed, in words the owner can act on. Clerk's own message when the cause is not a known one. */
function claimError(e: unknown): string {
  if (isReverificationCancelledError(e)) return AUTH_COPY.claimCancelled;
  if (isClerkAPIResponseError(e)) {
    const first = e.errors[0];
    if (first?.code === "form_identifier_exists") return AUTH_COPY.claimWalletTaken;
    if (e.status === 403 || first?.code === "feature_not_enabled" || first?.code === "strategy_for_user_invalid")
      return AUTH_COPY.claimWalletsOff;
    if (first?.longMessage || first?.message) return first.longMessage ?? first.message;
  }
  // The wallet's own refusal, for example a rejected signature.
  if (e instanceof Error && /reject|denied/i.test(e.message)) return AUTH_COPY.claimCancelled;
  return AUTH_COPY.claimFailed;
}

export function ClaimLaunch({ creator, onClaimed }: { creator: string; onClaimed: () => void }) {
  const { address } = useAccount();
  const { isLoaded, isSignedIn, user } = useUser();
  const { signMessageAsync } = useSignMessage();
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Adding a wallet is a sensitive change. Clerk asks the account to confirm
  // itself again when the session is not fresh, and this shows that prompt.
  const addWallet = useReverification((web3Wallet: string) => user!.createWeb3Wallet({ web3Wallet }));

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
        (await addWallet(address));
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
      setError(claimError(e));
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
