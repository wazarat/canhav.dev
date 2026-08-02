/**
 * End-to-end proof of the item-2 "done when": complete a journey, deploy a
 * testnet token, and confirm the journey hash in the TokenLaunched event
 * matches the stored document.
 *
 * Deliberately re-implements canonicalization instead of importing
 * lib/journey.ts — exactly what a third-party verifier would do. The
 * /api/journeys 409 check cross-validates the two implementations.
 *
 * Needs: dev server on :3000, contracts/.env (deployer key), .env.local (DB).
 * Run: node --env-file=contracts/.env scripts/e2e-launch.mjs
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

const SITE = process.env.SITE_URL ?? "http://localhost:3000";
const FACTORY = process.env.FACTORY ?? "0x30Db3A828F65B92434c6aDB27AEeD01850277b08"; // v4 (LibClone)

const chain = defineChain({
  id: 46630,
  name: "Robinhood Chain Testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.testnet.chain.robinhood.com"] } },
});

const abi = parseAbi([
  "struct LaunchParams { string name; string symbol; uint256 totalSupply; string imageURI; string xHandle; string website; bytes32 descriptionHash; bytes32 journeyHash; }",
  "struct VestingParams { uint256 amount; uint64 startTimestamp; uint64 durationSeconds; uint64 cliffSeconds; }",
  "function launchToken(LaunchParams p, VestingParams v, bytes32 userSalt) payable returns (address)",
  "function launchFee() view returns (uint256)",
  "event TokenLaunched(address indexed token, address indexed creator, string name, string symbol, uint256 totalSupply, string imageURI, string xHandle, string website, bytes32 descriptionHash, bytes32 journeyHash, bytes32 salt, uint64 version, uint256 launchFee, address treasury)",
]);

const NO_VESTING = { amount: 0n, startTimestamp: 0n, durationSeconds: 0n, cliffSeconds: 0n };

// Independent canonicalization (mirrors lib/journey.ts by spec, not by import).
function sortValue(v) {
  if (Array.isArray(v)) return v.map(sortValue);
  if (v !== null && typeof v === "object")
    return Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortValue(v[k])]));
  return v;
}
const canonicalize = (doc) => JSON.stringify(sortValue(doc));
const hashDoc = (doc) => keccak256(stringToBytes(canonicalize(doc)));

const account = privateKeyToAccount(process.env.DEPLOYER_PRIVATE_KEY);
console.log("Creator (stranger stand-in):", account.address);

const doc = {
  version: 1,
  tokenName: "Journey Proof",
  ticker: "JRNY",
  why: "This token exists purely to prove the launchpad's journey pipeline end to end: a document written before launch, hashed, committed on-chain in the TokenLaunched event, and verified afterwards against the stored copy.",
  supplyRationale: "Exactly 1,000,000 tokens, all minted to the creator at launch — a test supply with no distribution story.",
  milestones: [
    { date: "2026-08-07", title: "Indexer shows this token", description: "Visible on /launch/explore within a block or two." },
    { date: "2026-08-14", title: "Journey verified on the token page", description: "Hash recomputed server-side matches the event." },
  ],
};

const journeyHash = hashDoc(doc);
console.log("journeyHash (client):", journeyHash);

// 1. Publish journey — server re-canonicalizes; a mismatch would 409.
const pub = await fetch(`${SITE}/api/journeys`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ doc, clientHash: journeyHash, creator: account.address }),
});
const pubJson = await pub.json();
if (!pub.ok) throw new Error(`journey publish failed: ${pubJson.error}`);
console.log("journey stored, server hash:", pubJson.journeyHash);

// 2. Launch on-chain with that hash.
const wallet = createWalletClient({ account, chain, transport: http() });
const client = createPublicClient({ chain, transport: http() });

// v3: launches carry an exact-value fee (0 unless raised through the timelock).
const launchFee = await client.readContract({ address: FACTORY, abi, functionName: "launchFee" });
console.log("launchFee (wei):", launchFee);

const salt = `0x${Date.now().toString(16).padStart(64, "0")}`;
const txHash = await wallet.writeContract({
  address: FACTORY,
  abi,
  functionName: "launchToken",
  value: launchFee,
  args: [
    {
      name: doc.tokenName,
      symbol: doc.ticker,
      totalSupply: 1_000_000n * 10n ** 18n,
      imageURI: "",
      xHandle: "",
      website: "",
      descriptionHash: keccak256(stringToBytes("Journey pipeline proof token")),
      journeyHash,
    },
    NO_VESTING,
    salt,
  ],
});
console.log("launch tx:", txHash);
const receipt = await client.waitForTransactionReceipt({ hash: txHash });
if (receipt.status !== "success") throw new Error("tx reverted");

// 3. Decode the event and compare hashes.
let event = null;
for (const log of receipt.logs) {
  if (log.address.toLowerCase() !== FACTORY.toLowerCase()) continue;
  try {
    const d = decodeEventLog({ abi, ...log });
    if (d.eventName === "TokenLaunched") event = d.args;
  } catch {}
}
if (!event) throw new Error("TokenLaunched event not found");
console.log("token:", event.token, "| event journeyHash:", event.journeyHash);

if (event.journeyHash.toLowerCase() !== journeyHash.toLowerCase())
  throw new Error("HASH MISMATCH: event vs client");

// 4. Round-trip: fetch the stored doc by the EVENT's hash and re-verify.
const back = await fetch(`${SITE}/api/journeys/${event.journeyHash}`);
const backJson = await back.json();
if (!back.ok) throw new Error(`journey fetch failed: ${backJson.error}`);
const recomputed = hashDoc(backJson.doc);
if (recomputed.toLowerCase() !== event.journeyHash.toLowerCase())
  throw new Error("HASH MISMATCH: stored doc vs event");

console.log("\n✅ E2E PASS: journey doc → hash → on-chain event → stored doc all agree.");
console.log(`Token page: ${SITE}/launch/t/${event.token.toLowerCase()}`);
