import type { DeployerFunding } from "@/components/build/useDeployerBalances";
import { BUILD_COPY } from "@/content/build";
import type { DeployerView } from "@/lib/deployer";

/** Whether the deployer key is funded, in words and a tone (M103); Overview and the rail (M173) read it. */
export function deployerState(deployer: DeployerView | null, funding: DeployerFunding): { label: string; tone: "neutral" | "success" | "warning" } {
  const C = BUILD_COPY.deployments.deployer;
  if (!deployer) return { label: C.chipNone, tone: "neutral" };
  if (funding.balances === null) return { label: funding.loading ? C.chipChecking : C.chipEmpty, tone: "neutral" };
  const names = deployer.chains.filter((c) => funding.fundedOn(c.chain)).map((c) => c.name);
  return names.length ? { label: C.chipFunded(names), tone: "success" } : { label: C.chipEmpty, tone: "warning" };
}
