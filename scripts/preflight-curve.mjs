/**
 * Read-only proof that the launch form's preflight works against the live
 * CurveLauncher on Robinhood Chain Testnet without a wallet, and that the
 * constants the site ships in content/launch.ts LAUNCH_CURVE match the
 * deployed immutables. simulateContract and estimateContractGas for launch
 * from a funded address with and without a developer buy, the gas pad the
 * form applies (lib/tx.ts GAS_MARGIN_BPS), quoteLaunch, and negative cases
 * proving the RPC returns decodable revert data. Nothing is sent.
 *
 * Run: node scripts/preflight-curve.mjs
 * FROM=0x… overrides the simulated sender (must hold the fee plus the buy).
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

// content/launch.ts LAUNCH_CHAIN.curveAddress and LAUNCH_CURVE, kept literal
// so the script runs with plain node and no TS loader. If either side moves,
// this script is what says so.
const LAUNCHER = "0xb2e1F2df7775d17CE70c8CE7586c7bb01bD10981";
const EXPECTED = {
  graduationEth: 100_000_000_000_000_000n,
  snipeWindowSeconds: 60n,
  snipeTaxBps: 2000,
  curveShareBps: 8000,
  virtualEthReserve: 33_333_333_333_333_333n,
  maxDevBuy: 5_000_000_000_000_000n,
};
const FROM = process.env.FROM ?? "0x955fc594dd992Ef7bb7d175b6C9a68Be2b622DEB";
const GAS_MARGIN_BPS = 12_000n;

const abi = parseAbi([
  "struct LaunchParams { string name; string symbol; uint256 totalSupply; string imageURI; string xHandle; string website; bytes32 descriptionHash; bytes32 journeyHash; }",
  "function launch(LaunchParams p, bytes32 userSalt, uint256 devBuyEth) payable returns (address)",
  "function launchFee() view returns (uint256)",
  "function graduationEth() view returns (uint256)",
  "function snipeWindowSeconds() view returns (uint64)",
  "function snipeTaxBps() view returns (uint16)",
  "function curveShareBps() view returns (uint16)",
  "function virtualEthReserve() view returns (uint256)",
  "function maxDevBuy() view returns (uint256)",
  "function quoteLaunch(uint256 totalSupply, uint256 devBuyEth) view returns (uint256)",
  "error WrongValue(uint256 sent, uint256 required)",
  "error DevBuyExceedsCap(uint256 devBuy, uint256 cap)",
  "error EmptyName()",
]);

const read = (functionName, args = []) =>
  client.readContract({ address: LAUNCHER, abi, functionName, args });

const block = await client.getBlock();
console.log("latest block", block.number);

let failures = 0;
for (const [name, expected] of Object.entries(EXPECTED)) {
  const got = await read(name);
  const ok = BigInt(got) === BigInt(expected);
  console.log(`${name} ${got} ${ok ? "matches" : `DOES NOT MATCH content/launch.ts (${expected})`}`);
  if (!ok) failures++;
}

const launchFee = await read("launchFee");
console.log("launchFee", launchFee, "wei");

const salt = `0x${Date.now().toString(16).padStart(64, "0")}`;
const params = (name) => ({
  name,
  symbol: "PRE",
  totalSupply: 10n ** 27n,
  imageURI: "https://example.com/preflight.png",
  xHandle: "",
  website: "",
  descriptionHash: keccak256(stringToBytes("preflight")),
  journeyHash: `0x${"0".repeat(64)}`,
});
const base = { address: LAUNCHER, abi, functionName: "launch", account: FROM };

const devBuy = 1_000_000_000_000_000n; // 0.001 ETH
const quote = await read("quoteLaunch", [10n ** 27n, devBuy]);
console.log("quoteLaunch(1e27, 0.001 ETH)", quote, "tokens (wei)");
if (quote === 0n) failures++;

for (const [label, buy] of [
  ["no developer buy", 0n],
  ["0.001 ETH developer buy", devBuy],
]) {
  const args = [params("Preflight"), salt, buy];
  const value = launchFee + buy;
  const { result } = await client.simulateContract({ ...base, args, value });
  const gas = await client.estimateContractGas({ ...base, args, value });
  console.log(`simulate ok (${label}), predicted token ${result}, gas ${gas} padded ${(gas * GAS_MARGIN_BPS) / 10_000n}`);
}

// The cap check through the view, which needs no ETH from the sender.
try {
  await read("quoteLaunch", [10n ** 27n, EXPECTED.maxDevBuy + 1n]);
  console.log("negative case (dev buy over cap) did NOT revert");
  failures++;
} catch (e) {
  const r = e.walk?.((x) => x.name === "ContractFunctionRevertedError");
  const got = r?.data?.errorName;
  console.log("negative case (dev buy over cap) decodes as", got, r?.data?.args ?? "");
  if (got !== "DevBuyExceedsCap") failures++;
}

for (const [label, args, value, expect] of [
  ["wrong value", [params("Preflight"), salt, 0n], launchFee + 1n, "WrongValue"],
  ["empty name", [params(""), salt, 0n], launchFee, "EmptyName"],
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
  console.error(`${failures} check(s) failed`);
  process.exit(1);
}
console.log("preflight ok");
