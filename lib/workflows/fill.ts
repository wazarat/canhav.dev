import { WORKFLOW_TEMPLATES, type WorkflowName, isWorkflowName } from "@/lib/workflows/templates";

export { isWorkflowName, type WorkflowName };

/** The path a workflow lands at in the team's repository. */
export function workflowPath(name: WorkflowName): string {
  return `.github/workflows/canhav-${name}.yml`;
}

/**
 * A template with the project's values in place of the repository
 * variables (M144): the chain id as a literal and this deployment's origin
 * as the CanHav address. The secret stays a secret reference. Pure.
 */
export function fillWorkflow(name: WorkflowName, values: { chainId: number; origin: string }): string {
  return WORKFLOW_TEMPLATES[name]
    .replaceAll("${{ vars.CANHAV_CHAIN_ID }}", `"${values.chainId}"`)
    .replaceAll("${{ vars.CANHAV_URL || 'https://www.canhav.com' }}", `"${values.origin}"`);
}
