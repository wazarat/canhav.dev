import { BUILD_COPY } from "@/content/build";

/** What the derived Launch rows read from the record. */
export interface LaunchFacts {
  /** The deployer key holds ETH on the project's chain (M103). */
  deployerFunded: boolean;
  published: boolean;
  hasTestnetContracts: boolean;
  hasToken: boolean;
  hasMainnet: boolean;
}

/** The Launch milestone's rows, derived from the record; the Build tab and the rail (M173) read them. */
export function launchRows(facts: LaunchFacts) {
  const L = BUILD_COPY.launchRows;
  return [
    { key: "fund", ...L.fund, done: facts.deployerFunded },
    { key: "testnet", ...L.testnet, done: facts.hasTestnetContracts },
    { key: "token", ...L.token, done: facts.hasToken },
    { key: "publish", ...L.publish, done: facts.published },
  ];
}
