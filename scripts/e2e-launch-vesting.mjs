/**
 * End-to-end proof of roadmap item 4: launch a token WITH vesting through
 * factory v2, then verify the balance split, the VestingCreated event
 * (resolved start), the indexer row, and the token page rendering the
 * schedule read from chain.
 *
 * Needs: dev server :3000, indexer :42069, contracts/.env (deployer key).
 * Run: node --env-file=contracts/.env scripts/e2e-launch-vesting.mjs
 */
import {
  createPublicClient,
  createWalletClient,
  decodeEventLog,
  defineChain,
  http,
  keccak256,
  parseAbi,
  stringToBytes,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

const SITE = "http://localhost:3000";
const INDEXER = "http://localhost:42069";
const FACTORY = "0x10F33eE0f6a72D7Cc1f41196B4EF80B28C909Bc0"; // v2

const chain = defineChain({
  id: 46630,
  name: "Robinhood Chain Testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.testnet.chain.robinhood.com"] } },
});

const abi = parseAbi([
  "struct LaunchParams { string name; string symbol; uint256 totalSupply; string imageURI; string xHandle; string website; bytes32 descriptionHash; bytes32 journeyHash; }",
  "struct VestingParams { uint256 amount; uint64 startTimestamp; uint64 durationSeconds; uint64 cliffSeconds; }",
  "function launchToken(LaunchParams p, VestingParams v, bytes32 userSalt) returns (address)",
  "function balanceOf(address) view returns (uint256)",
  "event TokenLaunched(address indexed token, address indexed creator, string name, string symbol, uint256 totalSupply, string imageURI, string xHandle, string website, bytes32 descriptionHash, bytes32 journeyHash, bytes32 salt, uint64 version)",
  "event VestingCreated(address indexed token, address indexed vestingWallet, address indexed beneficiary, uint256 amount, uint64 startTimestamp, uint64 durationSeconds, uint64 cliffSeconds)",
]);

function sortValue(v) {
  if (Array.isArray(v)) return v.map(sortValue);
  if (v !== null && typeof v === "object")
    return Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortValue(v[k])]));
  return v;
}
const hashDoc = (doc) => keccak256(stringToBytes(JSON.stringify(sortValue(doc))));

const account = privateKeyToAccount(process.env.DEPLOYER_PRIVATE_KEY);
const wallet = createWalletClient({ account, chain, transport: http() });
const client = createPublicClient({ chain, transport: http() });

const TOTAL = 1_000_000n * 10n ** 18n;
const VEST_AMOUNT = TOTAL / 5n; // 20%
const DURATION = 180n * 86400n;
const CLIFF = 30n * 86400n;

const doc = {
  version: 1,
  tokenName: "Vested Proof",
  ticker: "VPRF",
  why: "This token proves the vesting pipeline end to end: a fifth of the supply locked in an on-chain VestingWallet clone at launch, with the schedule committed in the VestingCreated event and surfaced by the indexer.",
  supplyRationale: "1,000,000 tokens: 20% vests linearly over 180 days with a 30-day cliff; the remaining 80% goes to the creator at launch.",
  milestones: [
    { date: "2026-08-31", title: "Cliff passes", description: "First tokens become releasable." },
    { date: "2027-01-28", title: "Fully vested", description: "Entire locked share released." },
  ],
};
const journeyHash = hashDoc(doc);

// 1. Publish journey.
const pub = await fetch(`${SITE}/api/journeys`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ doc, clientHash: journeyHash, creator: account.address }),
});
if (!pub.ok) throw new Error(`journey publish failed: ${(await pub.json()).error}`);
console.log("journey stored:", journeyHash);

// 2. Launch with vesting.
const salt = `0x${Date.now().toString(16).padStart(64, "0")}`;
const txHash = await wallet.writeContract({
  address: FACTORY,
  abi,
  functionName: "launchToken",
  args: [
    {
      name: doc.tokenName,
      symbol: doc.ticker,
      totalSupply: TOTAL,
      imageURI: "",
      xHandle: "",
      website: "",
      descriptionHash: keccak256(stringToBytes("Vesting pipeline proof token")),
      journeyHash,
    },
    { amount: VEST_AMOUNT, startTimestamp: 0n, durationSeconds: DURATION, cliffSeconds: CLIFF },
    salt,
  ],
});
console.log("launch tx:", txHash);
const receipt = await client.waitForTransactionReceipt({ hash: txHash });
if (receipt.status !== "success") throw new Error("tx reverted");
const block = await client.getBlock({ blockNumber: receipt.blockNumber });

// 3. Decode both events.
let launched = null;
let vested = null;
for (const log of receipt.logs) {
  if (log.address.toLowerCase() !== FACTORY.toLowerCase()) continue;
  try {
    const d = decodeEventLog({ abi, ...log });
    if (d.eventName === "TokenLaunched") launched = d.args;
    if (d.eventName === "VestingCreated") vested = d.args;
  } catch {}
}
if (!launched || !vested) throw new Error("missing events");
console.log("token:", launched.token, "| vesting wallet:", vested.vestingWallet);

// 4. Assertions.
if (vested.amount !== VEST_AMOUNT) throw new Error("wrong vested amount");
if (vested.durationSeconds !== DURATION || vested.cliffSeconds !== CLIFF)
  throw new Error("wrong schedule");
const drift = vested.startTimestamp > block.timestamp
  ? vested.startTimestamp - block.timestamp
  : block.timestamp - vested.startTimestamp;
if (drift !== 0n) throw new Error(`start not resolved to block time (drift ${drift}s)`);

const creatorBal = await client.readContract({
  address: launched.token, abi, functionName: "balanceOf", args: [account.address],
});
const walletBal = await client.readContract({
  address: launched.token, abi, functionName: "balanceOf", args: [vested.vestingWallet],
});
if (creatorBal !== TOTAL - VEST_AMOUNT) throw new Error("creator balance wrong");
if (walletBal !== VEST_AMOUNT) throw new Error("wallet balance wrong");
console.log("balance split verified: creator 80%, vesting wallet 20%");

// 5. Indexer row (realtime — wait up to ~30s).
let row = null;
for (let i = 0; i < 15 && !row; i++) {
  await new Promise((r) => setTimeout(r, 2000));
  const res = await fetch(`${INDEXER}/graphql`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `{ vestings(where: { tokenAddress: "${launched.token.toLowerCase()}" }) { items { walletAddress amount startTimestamp durationSeconds cliffSeconds } } }`,
    }),
  });
  row = (await res.json()).data?.vestings?.items?.[0] ?? null;
}
if (!row) throw new Error("indexer never surfaced the vesting row");
if (row.walletAddress.toLowerCase() !== vested.vestingWallet.toLowerCase())
  throw new Error("indexer wallet mismatch");
console.log("indexer row verified:", row);

// 6. Token page renders the schedule (read from chain, not a form field).
const page = await fetch(`${SITE}/launch/t/${launched.token.toLowerCase()}`);
const html = await page.text();
for (const needle of ["Vesting", "Vesting wallet", "Cliff ends", "Fully vested", "Releasable now"]) {
  if (!html.includes(needle)) throw new Error(`token page missing "${needle}"`);
}
console.log("token page renders the vesting schedule with live reads");

console.log("\n✅ E2E VESTING PASS");
console.log(`Token page: ${SITE}/launch/t/${launched.token.toLowerCase()}`);
