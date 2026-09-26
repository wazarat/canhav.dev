/**
 * Read-only proof that the launch form's preflight works against the live
 * factory on Robinhood Chain Testnet without a wallet: simulateContract and
 * estimateContractGas for launchToken from a funded address, the gas pad the
 * form applies (lib/tx.ts GAS_MARGIN_BPS), and a negative case proving the
 * RPC returns decodable revert data for eth_call so a real revert is named
 * before anything is signed. Nothing is sent.
 *
 * Run: node scripts/preflight-launch.mjs
 * FROM=0x… overrides the simulated sender (must hold the launch fee).
 */
import {
  createPublicClient,
  defineChain,
  http,
  keccak256,
  parseAbi,
  stringToBytes,
} from "viem";

const chain = defineChain({
  id: 46630,
  name: "Robinhood Chain Testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.testnet.chain.robinhood.com"] } },
});
const client = createPublicClient({ chain, transport: http() });

// content/launch.ts LAUNCH_CHAIN.factoryAddress (v4). Kept literal so the
// script runs with plain node and no TS loader.
const FACTORY = "0x30Db3A828F65B92434c6aDB27AEeD01850277b08";
// The contracts deployer, which holds testnet ETH.
const FROM = process.env.FROM ?? "0x955fc594dd992Ef7bb7d175b6C9a68Be2b622DEB";
const GAS_MARGIN_BPS = 12_000n;

const abi = parseAbi([
  "struct LaunchParams { string name; string symbol; uint256 totalSupply; string imageURI; string xHandle; string website; bytes32 descriptionHash; bytes32 journeyHash; }",
  "struct VestingParams { uint256 amount; uint64 startTimestamp; uint64 durationSeconds; uint64 cliffSeconds; }",
  "function launchToken(LaunchParams p, VestingParams v, bytes32 userSalt) payable returns (address)",
  "function launchFee() view returns (uint256)",
  "error WrongLaunchFee(uint256 sent, uint256 required)",
  "error EmptyName()",
]);

const block = await client.getBlock();
console.log("latest block", block.number, "gasLimit", block.gasLimit);

const launchFee = await client.readContract({ address: FACTORY, abi, functionName: "launchFee" });
console.log("launchFee", launchFee, "wei");

const salt = `0x${Date.now().toString(16).padStart(64, "0")}`;
const params = (name) => [
  {
    name,
    symbol: "PRE",
    totalSupply: 10n ** 27n,
    imageURI: "https://example.com/preflight.png",
    xHandle: "",
    website: "",
    descriptionHash: keccak256(stringToBytes("preflight")),
    journeyHash: `0x${"0".repeat(64)}`,
  },
  { amount: 0n, startTimestamp: 0n, durationSeconds: 0n, cliffSeconds: 0n },
  salt,
];

const base = { address: FACTORY, abi, functionName: "launchToken", account: FROM };

const { result } = await client.simulateContract({ ...base, args: params("Preflight"), value: launchFee });
const gas = await client.estimateContractGas({ ...base, args: params("Preflight"), value: launchFee });
console.log("simulate ok, predicted token", result);
console.log("estimateGas", gas, "padded", (gas * GAS_MARGIN_BPS) / 10_000n);

let failures = 0;
for (const [label, args, value, expect] of [
  ["wrong fee", params("Preflight"), launchFee + 1n, "WrongLaunchFee"],
  ["empty name", params(""), launchFee, "EmptyName"],
]) {
  try {
    await client.simulateContract({ ...base, args, value });
    console.log(`negative case (${label}) did NOT revert`);
    failures++;
  } catch (e) {
    const r = e.walk?.((x) => x.name === "ContractFunctionRevertedError");
    const got = r?.data?.errorName;
    console.log(`negative case (${label}) decodes as`, got, r?.data?.args ?? "");
    if (got !== expect) failures++;
  }
}
if (failures) {
  console.error(`${failures} negative case(s) did not decode as expected`);
  process.exit(1);
}
console.log("preflight ok");
