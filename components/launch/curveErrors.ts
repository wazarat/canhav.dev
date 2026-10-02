import { describeTxError } from "@/lib/tx";

/**
 * CurveLauncher custom errors in plain language, shared by the launch form
 * and the token page's curve actions. Names match contracts/src/
 * CurveLauncher.sol; an unknown name falls through to a generic line that
 * still shows the name.
 */
export const KNOWN_CURVE_ERRORS: Record<string, string> = {
  WrongValue:
    "The transaction sent the wrong amount of ETH. The launch fee may have changed since the page loaded; reload so it re-reads from the launcher, then retry.",
  EnforcedPause:
    "The launcher is paused right now. Buys and launches wait; sells still work. Try again later.",
  EmptyName: "The token name is empty.",
  EmptySymbol: "The ticker is empty.",
  SupplyOutOfRange: "The total supply is outside the launcher's range of 1 million to 1 trillion tokens.",
  DevBuyExceedsCap: "The developer buy is above the launcher's cap. Lower it.",
  UnknownCurve: "This token has no curve on the launcher.",
  CurveGraduated: "This curve has graduated. Trade in the pool instead.",
  ZeroAmount: "The amount was zero, or too small to buy a single unit.",
  SlippageExceeded: "The price moved past your slippage floor. Retry or raise the slippage.",
  InsufficientReserve: "The curve cannot pay that much out. Sell a smaller amount.",
  RefundFailed: "The launcher could not refund the ETH beyond the threshold to this wallet.",
  EthTransferFailed: "The launcher could not send ETH to this wallet.",
  SafeERC20FailedOperation: "The token transfer failed. Check the approval and balance.",
};

export const REJECTED_COPY = "The wallet rejected the request. Nothing was sent.";

export function walletInternalCopy(detail: string): string {
  return `Your wallet could not prepare the transaction. ${detail.replace(/\.$/, "")}. Retry, and if it repeats update the wallet extension.`;
}

/**
 * Map a failed write to copy. `what` names the action for the generic revert
 * line ("the launch", "the buy"); `needs` says what the wallet lacked ETH for,
 * `chainName` where to fund it.
 */
export function friendlyCurveError(err: unknown, what: string, needs: string, chainName: string): string {
  const d = describeTxError(err);
  switch (d.kind) {
    case "revert": {
      if (d.errorName && KNOWN_CURVE_ERRORS[d.errorName]) return KNOWN_CURVE_ERRORS[d.errorName];
      const reason = d.errorName ?? d.reason;
      return reason ? `The launcher rejected ${what} (${reason}).` : `The launcher rejected ${what}.`;
    }
    case "rejected":
      return REJECTED_COPY;
    case "insufficientFunds":
      return `Not enough ETH in this wallet to cover ${needs} plus gas. Fund it on ${chainName} and retry.`;
    case "walletInternal":
      return walletInternalCopy(d.detail);
    case "other":
      return d.detail;
  }
}
