import {
  BaseError,
  ContractFunctionRevertedError,
  InternalRpcError,
  UserRejectedRequestError,
  type Abi,
  type Address,
  type ContractFunctionArgs,
  type ContractFunctionName,
  type Hash,
} from "viem";
import type { useWriteContract } from "wagmi";

/**
 * Wallet writes with the gas figured out on our own RPC first.
 *
 * With `gas` left undefined, viem hands `eth_sendTransaction` to the wallet
 * without a gas limit and the wallet estimates it itself. MetaMask does that by
 * fetching the latest block from whatever RPC the user configured for the
 * chain, and when that fetch returns null it throws from inside the extension
 * ("Cannot destructure property 'gasLimit'"). viem then reports the -32603 as
 * a contract revert with no data. Simulating and estimating here, on the
 * transport in lib/wagmi.ts, means real reverts are decoded before anything is
 * signed and the wallet receives a dapp-suggested gas limit it does not need
 * to compute.
 */

/**
 * 120%. Nitro folds the L1 data fee into the gas estimate, and that component
 * drifts with the parent chain between estimate and inclusion. Execution gas
 * for these calls is deterministic, so 20% covers the drift. Unused gas is
 * refunded, so the pad only raises the wallet's displayed maximum.
 */
export const GAS_MARGIN_BPS = 12_000n;

export type WriteFn = ReturnType<typeof useWriteContract>["writeContractAsync"];

/** The subset of a viem public client the helper needs. */
export interface GasClient {
  simulateContract(args: never): Promise<unknown>;
  estimateContractGas(args: never): Promise<bigint>;
}

export type TxParams<
  abi extends Abi | readonly unknown[],
  fn extends ContractFunctionName<abi, "nonpayable" | "payable">,
> = {
  abi: abi;
  address: Address;
  functionName: fn;
  args: ContractFunctionArgs<abi, "nonpayable" | "payable", fn>;
  value?: bigint;
};

/** A revert decoded by our own simulateContract, before any wallet prompt. */
export class SimulatedRevertError extends Error {
  constructor(
    readonly errorName: string | undefined,
    readonly reason: string | undefined,
    override readonly cause: unknown,
  ) {
    super(reason ?? errorName ?? "Simulation reverted.");
    this.name = "SimulatedRevertError";
  }
}

function decodedRevert(err: unknown): ContractFunctionRevertedError | null {
  if (!(err instanceof BaseError)) return null;
  const revert = err.walk((e) => e instanceof ContractFunctionRevertedError);
  if (revert instanceof ContractFunctionRevertedError && revert.data?.errorName) return revert;
  return null;
}

/**
 * Simulate only. Throws SimulatedRevertError on a decoded revert. Transport
 * failures are swallowed so the write path can surface them with the wallet.
 */
export async function preflightWrite<
  abi extends Abi | readonly unknown[],
  fn extends ContractFunctionName<abi, "nonpayable" | "payable">,
>(publicClient: GasClient, account: Address, params: TxParams<abi, fn>): Promise<void> {
  try {
    await publicClient.simulateContract({ ...params, account } as never);
  } catch (err) {
    const revert = decodedRevert(err);
    if (revert) throw new SimulatedRevertError(revert.data?.errorName, revert.reason, err);
    console.warn("preflight simulation could not run", err);
  }
}

/**
 * simulate + estimate on our transport, then write with an explicit gas
 * limit. Falls back to a gas-less write when estimation fails for a reason
 * other than a revert.
 */
export async function writeWithGas<
  abi extends Abi | readonly unknown[],
  fn extends ContractFunctionName<abi, "nonpayable" | "payable">,
>(
  publicClient: GasClient,
  account: Address,
  write: WriteFn,
  params: TxParams<abi, fn>,
  opts: { marginBps?: bigint } = {},
): Promise<Hash> {
  const call = { ...params, account } as never;
  const [sim, est] = await Promise.allSettled([
    publicClient.simulateContract(call),
    publicClient.estimateContractGas(call),
  ]);
  if (sim.status === "rejected") {
    const revert = decodedRevert(sim.reason);
    if (revert) throw new SimulatedRevertError(revert.data?.errorName, revert.reason, sim.reason);
    console.warn("simulation could not run, sending without it", sim.reason);
  }
  let gas: bigint | undefined;
  if (est.status === "fulfilled") {
    gas = (est.value * (opts.marginBps ?? GAS_MARGIN_BPS)) / 10_000n;
  } else {
    console.warn("gas estimate failed, letting the wallet estimate", est.reason);
  }
  return write({ ...params, ...(gas !== undefined ? { gas } : {}) } as never);
}

export type TxErrorKind =
  | { kind: "revert"; errorName?: string; reason?: string; simulated: boolean }
  | { kind: "rejected" }
  | { kind: "walletInternal"; detail: string }
  | { kind: "insufficientFunds" }
  | { kind: "other"; detail: string };

function firstLine(s: string, max: number): string {
  return s.split("\n")[0].trim().slice(0, max);
}

/**
 * Classify a failed write once; each component maps kinds to its own copy.
 * The rule that matters: a ContractFunctionRevertedError with no decoded data
 * is never called a revert. viem produces one for any -32603 from the wallet,
 * and by the time a write runs our own simulation has already decoded any
 * real revert.
 */
export function describeTxError(err: unknown): TxErrorKind {
  if (err instanceof SimulatedRevertError)
    return { kind: "revert", errorName: err.errorName, reason: err.reason, simulated: true };
  if (err instanceof BaseError) {
    if (err.walk((e) => e instanceof UserRejectedRequestError)) return { kind: "rejected" };
    const revert = err.walk((e) => e instanceof ContractFunctionRevertedError);
    if (revert instanceof ContractFunctionRevertedError) {
      if (revert.data?.errorName)
        return {
          kind: "revert",
          errorName: revert.data.errorName,
          reason: revert.reason,
          simulated: false,
        };
      const detail = firstLine(revert.reason ?? revert.shortMessage, 160);
      if (/execution reverted/i.test(detail))
        return { kind: "revert", reason: detail, simulated: false };
      return { kind: "walletInternal", detail };
    }
    const internal = err.walk((e) => e instanceof InternalRpcError);
    if (internal instanceof BaseError)
      return { kind: "walletInternal", detail: firstLine(internal.shortMessage, 160) };
    const msg = err.shortMessage.toLowerCase();
    if (msg.includes("user rejected") || msg.includes("denied")) return { kind: "rejected" };
    if (msg.includes("insufficient funds") || msg.includes("exceeds the balance"))
      return { kind: "insufficientFunds" };
    return { kind: "other", detail: firstLine(err.shortMessage, 200) };
  }
  return {
    kind: "other",
    detail: err instanceof Error ? firstLine(err.message, 220) : "Something went wrong.",
  };
}
