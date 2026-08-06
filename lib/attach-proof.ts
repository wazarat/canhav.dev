import type { Hex } from "viem";

/**
 * SIWE-style ownership proof for attaching a deployed token to a design
 * record — our own code, no library. The wallet that deployed the token
 * signs a short message; the server verifies the signature against the
 * INDEXED creator address (never a client-supplied signer), so a session
 * can only attach a contract whose deployer wallet it controls.
 *
 * Required only for stale/manual attaches: the auto-attach that fires
 * seconds after a design-prefilled deploy is already backed by the deploy
 * transaction itself (see the attach-deploy route for the freshness rule).
 */

/** Signature validity window, seconds. */
export const ATTACH_PROOF_MAX_AGE_S = 600;

/** Single source of the signed text — imported by both signer and verifier. */
export function buildAttachMessage(tokenAddress: string, designId: string, ts: number): string {
  return `CanHav attach ${tokenAddress.toLowerCase()} to ${designId} ts=${ts}`;
}

export interface AttachProof {
  signature: Hex;
  /** Unix seconds at signing time, echoed into the message. */
  signedAt: number;
}

/**
 * Server-side verification. `expectedSigner` must be the indexer's
 * token.creator. Uses publicClient.verifyMessage so EIP-1271 smart-wallet
 * signatures verify too. Returns null when valid, else the problem.
 */
export async function verifyAttachProof(
  publicClient: {
    verifyMessage: (args: {
      address: `0x${string}`;
      message: string;
      signature: Hex;
    }) => Promise<boolean>;
  },
  args: {
    tokenAddress: string;
    designId: string;
    expectedSigner: string;
    proof: AttachProof;
  },
): Promise<string | null> {
  const { tokenAddress, designId, expectedSigner, proof } = args;
  if (!Number.isInteger(proof.signedAt)) return "Invalid signature timestamp.";
  const age = Math.abs(Math.floor(Date.now() / 1000) - proof.signedAt);
  if (age > ATTACH_PROOF_MAX_AGE_S)
    return "Signature expired — sign again and submit within 10 minutes.";
  try {
    const valid = await publicClient.verifyMessage({
      address: expectedSigner as `0x${string}`,
      message: buildAttachMessage(tokenAddress, designId, proof.signedAt),
      signature: proof.signature,
    });
    return valid ? null : "Signature does not match the wallet that deployed this token.";
  } catch {
    return "Signature verification failed.";
  }
}
