import { Card } from "@/components/ui/Card";
import { StatusChip } from "@/components/ui/StatusChip";
import { LAUNCH_STATUS_COPY } from "@/content/launch";

/**
 * The status rail beside the launch form (M76), the Shopify product status
 * card: chain, wallet and token readiness as StatusChips, so the form
 * itself carries no state prose.
 */
export function LaunchStatusCard({
  chainName,
  live,
  connected,
  correctChain,
  tokenReady,
  commitmentProblem,
}: {
  chainName: string;
  live: boolean;
  connected: boolean;
  correctChain: boolean;
  tokenReady: boolean;
  commitmentProblem: string | null;
}) {
  const C = LAUNCH_STATUS_COPY;
  const wallet = !connected
    ? { tone: "warning" as const, text: C.walletNone }
    : !correctChain
      ? { tone: "warning" as const, text: C.walletWrong }
      : { tone: "success" as const, text: C.walletOk };
  const token = !tokenReady
    ? { tone: "neutral" as const, text: C.tokenOpen }
    : commitmentProblem
      ? { tone: "neutral" as const, text: C.commitmentOpen }
      : { tone: "success" as const, text: C.tokenReady };
  const rows: Array<{ label: string; tone: "success" | "warning" | "neutral"; text: string }> = [
    { label: C.chain, tone: live ? "success" : "neutral", text: live ? chainName : C.notLive },
    { label: C.wallet, ...wallet },
    { label: C.token, ...token },
  ];
  return (
    <Card className="p-5">
      <h3 className="font-display text-sm font-semibold text-ink-50">{C.title}</h3>
      <dl className="mt-3 space-y-2">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between gap-3 text-xs">
            <dt className="text-ink-500">{r.label}</dt>
            <dd>
              <StatusChip tone={r.tone}>{r.text}</StatusChip>
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
