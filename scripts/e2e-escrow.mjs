/**
 * End-to-end proof of the milestone escrow + updates loop:
 * launch a token → lock tranches against its milestones (one unlocking in
 * ~45s) → post a hash-anchored milestone update → verify indexer rows →
 * claim the unlocked tranche → verify the claimed flag flips and the token
 * page renders both the escrow and the update.
 *
 * Needs: dev server (SITE_URL), local indexer (INDEXER_URL), contracts/.env.
 * Run: SITE_URL=http://localhost:PORT node --env-file=contracts/.env scripts/e2e-escrow.mjs
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
const INDEXER = process.env.INDEXER_URL ?? "http://localhost:42069";
const FACTORY = process.env.FACTORY ?? "0xD6166E156B52eB9B301D56Bd68d5D9c551d7d4c5";
const ESCROW = process.env.ESCROW ?? "0x90C71DBA8A61Da14CA699f72D311e404094Cf192";
const UPDATES = process.env.UPDATES ?? "0x31358209375591b1285EaA437c2c9f189c48D073";

const chain = defineChain({
  id: 46630,
  name: "Robinhood Chain Testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.testnet.chain.robinhood.com"] } },
});

const abi = parseAbi([
  "struct LaunchParams { string name; string symbol; uint256 totalSupply; string imageURI; string xHandle; string website; bytes32 descriptionHash; bytes32 journeyHash; }",
  "struct VestingParams { uint256 amount; uint64 startTimestamp; uint64 durationSeconds; uint64 cliffSeconds; }",
  "struct TrancheInput { uint8 milestoneIndex; uint128 amount; uint64 unlockTime; }",
  "function launchToken(LaunchParams p, VestingParams v, bytes32 userSalt) payable returns (address)",
  "function launchFee() view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function balanceOf(address) view returns (uint256)",
  "function createEscrow(address token, bytes32 journeyHash, TrancheInput[] tranches) returns (uint256)",
  "function claim(uint256 escrowId, uint256 trancheIndex)",
  "function postUpdate(address token, uint8 milestoneIndex, bytes32 updateHash)",
  "event TokenLaunched(address indexed token, address indexed creator, string name, string symbol, uint256 totalSupply, string imageURI, string xHandle, string website, bytes32 descriptionHash, bytes32 journeyHash, bytes32 salt, uint64 version, uint256 launchFee, address treasury)",
  "event EscrowCreated(uint256 indexed escrowId, address indexed token, address indexed creator, bytes32 journeyHash)",
  "event TrancheClaimed(uint256 indexed escrowId, uint256 trancheIndex, address indexed token, address indexed creator, uint128 amount)",
]);

function sortValue(v) {
  if (Array.isArray(v)) return v.map(sortValue);
  if (v !== null && typeof v === "object")
    return Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortValue(v[k])]));
  return v;
}
const hashDoc = (doc) => keccak256(stringToBytes(JSON.stringify(sortValue(doc))));

const gql = async (query) => {
  const res = await fetch(`${INDEXER}/graphql`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(`GraphQL: ${JSON.stringify(json.errors)}`);
  return json.data;
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const assert = (cond, msg) => {
  if (!cond) throw new Error(`ASSERT: ${msg}`);
};

const account = privateKeyToAccount(process.env.DEPLOYER_PRIVATE_KEY);
const wallet = createWalletClient({ account, chain, transport: http() });
const client = createPublicClient({ chain, transport: http() });

async function send(request) {
  const hash = await wallet.writeContract(request);
  const receipt = await client.waitForTransactionReceipt({ hash });
  assert(receipt.status === "success", `tx reverted: ${hash}`);
  return receipt;
}

function decodeFirst(receipt, address, eventName) {
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== address.toLowerCase()) continue;
    try {
      const d = decodeEventLog({ abi, ...log });
      if (d.eventName === eventName) return d.args;
    } catch {}
  }
  throw new Error(`${eventName} not found in receipt`);
}

// ---------------------------------------------------------------- 1. launch

const doc = {
  version: 1,
  tokenName: "Escrow Proof",
  ticker: "ESCP",
  why: "This token proves the milestone escrow pipeline end to end: supply locked in the admin-less escrow singleton against journey milestones, a progress update anchored on-chain, and a tranche claimed after its unlock passes.",
  supplyRationale: "1,000,000 tokens; part locked in the milestone escrow to demonstrate the commitment device, the rest stays with the creator.",
  milestones: [
    { date: "2026-08-09", title: "Escrow visible on the token page", description: "Tranches render with milestone titles." },
    { date: "2026-09-30", title: "Second tranche unlocks", description: "Claimable after the date passes." },
  ],
};
const journeyHash = hashDoc(doc);

const pub = await fetch(`${SITE}/api/journeys`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ doc, clientHash: journeyHash, creator: account.address }),
});
if (!pub.ok) throw new Error(`journey publish failed: ${(await pub.json()).error}`);
console.log("journey stored:", journeyHash);

const launchFee = await client.readContract({ address: FACTORY, abi, functionName: "launchFee" });
const TOTAL = 1_000_000n * 10n ** 18n;
const launchReceipt = await send({
  address: FACTORY,
  abi,
  functionName: "launchToken",
  value: launchFee,
  args: [
    {
      name: doc.tokenName,
      symbol: doc.ticker,
      totalSupply: TOTAL,
      imageURI: "",
      xHandle: "",
      website: "",
      descriptionHash: keccak256(stringToBytes("Escrow pipeline proof token")),
      journeyHash,
    },
    { amount: 0n, startTimestamp: 0n, durationSeconds: 0n, cliffSeconds: 0n },
    `0x${Date.now().toString(16).padStart(64, "0")}`,
  ],
});
const launched = decodeFirst(launchReceipt, FACTORY, "TokenLaunched");
const token = launched.token;
console.log("token launched:", token);

// ------------------------------------------------------- 2. create escrow

const now = Math.floor(Date.now() / 1000);
const T0 = 100_000n * 10n ** 18n;
const T1 = 50_000n * 10n ** 18n;
const tranches = [
  { milestoneIndex: 0, amount: T0, unlockTime: BigInt(now + 45) },
  { milestoneIndex: 1, amount: T1, unlockTime: BigInt(now + 30 * 86400) },
];

await send({ address: token, abi, functionName: "approve", args: [ESCROW, T0 + T1] });
const escrowReceipt = await send({
  address: ESCROW,
  abi,
  functionName: "createEscrow",
  args: [token, journeyHash, tranches],
});
const created = decodeFirst(escrowReceipt, ESCROW, "EscrowCreated");
const escrowId = created.escrowId;
console.log("escrow created, id:", escrowId);

const escrowBal = await client.readContract({ address: token, abi, functionName: "balanceOf", args: [ESCROW] });
assert(escrowBal === T0 + T1, "escrow holds the locked total");

// ------------------------------------------------------- 3. post an update

const updateDoc = {
  version: 1,
  token: token.toLowerCase(),
  milestoneIndex: 0,
  body: "Escrow is live on the token page — this update was posted by the e2e script and its hash is anchored on-chain.",
};
const updateHash = hashDoc(updateDoc);
const upRes = await fetch(`${SITE}/api/milestone-updates`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ doc: updateDoc, clientHash: updateHash, author: account.address }),
});
if (!upRes.ok) throw new Error(`update store failed: ${(await upRes.json()).error}`);
await send({ address: UPDATES, abi, functionName: "postUpdate", args: [token, 0, updateHash] });
console.log("update anchored:", updateHash);

// ------------------------------------------------- 4. indexer sees it all

await sleep(8000);
const data = await gql(`{
  escrows(where: { tokenAddress: "${token.toLowerCase()}" }) { items { escrowId creator journeyHash } }
  escrowTranches { items { escrowId trancheIndex milestoneIndex amount unlockTime claimed } }
  milestoneUpdates(where: { tokenAddress: "${token.toLowerCase()}" }) { items { author milestoneIndex updateHash } }
}`);
assert(data.escrows.items.length === 1, "indexer has the escrow row");
assert(data.escrows.items[0].journeyHash.toLowerCase() === journeyHash.toLowerCase(), "escrow journeyHash matches");
const myTranches = data.escrowTranches.items.filter((t) => t.escrowId === String(escrowId));
assert(myTranches.length === 2, "indexer has both tranches");
assert(myTranches.every((t) => t.claimed === false), "tranches start unclaimed");
assert(data.milestoneUpdates.items.length === 1, "indexer has the update anchor");
assert(data.milestoneUpdates.items[0].updateHash.toLowerCase() === updateHash.toLowerCase(), "update hash matches");
console.log("indexer rows verified (escrow + 2 tranches + update)");

// --------------------------------------------------- 5. token page renders

const page = await fetch(`${SITE}/launch/t/${token.toLowerCase()}`);
const html = await page.text();
assert(page.ok, "token page 200");
assert(html.includes("Milestone escrow"), "page shows the escrow card");
assert(html.includes(updateDoc.body.slice(0, 40)), "page shows the verified update body");
console.log("token page renders escrow card + update thread");

// ------------------------------------------------------------- 6. claim

const wait = tranches[0].unlockTime - BigInt(Math.floor(Date.now() / 1000)) + 5n;
if (wait > 0n) {
  console.log(`waiting ${wait}s for the first tranche to unlock…`);
  await sleep(Number(wait) * 1000);
}
const balBefore = await client.readContract({ address: token, abi, functionName: "balanceOf", args: [account.address] });
const claimReceipt = await send({ address: ESCROW, abi, functionName: "claim", args: [escrowId, 0n] });
decodeFirst(claimReceipt, ESCROW, "TrancheClaimed");
const balAfter = await client.readContract({ address: token, abi, functionName: "balanceOf", args: [account.address] });
assert(balAfter - balBefore === T0, "claim released exactly the first tranche to the creator");

await sleep(8000);
const after = await gql(`{
  escrowTranches { items { escrowId trancheIndex claimed } }
}`);
const t0 = after.escrowTranches.items.find(
  (t) => t.escrowId === String(escrowId) && t.trancheIndex === "0",
);
const t1 = after.escrowTranches.items.find(
  (t) => t.escrowId === String(escrowId) && t.trancheIndex === "1",
);
assert(t0?.claimed === true, "indexer flipped tranche 0 to claimed");
assert(t1?.claimed === false, "tranche 1 still locked");

console.log("\n✅ E2E ESCROW PASS: lock → update → index → page → claim all verified.");
console.log(`Token page: ${SITE}/launch/t/${token.toLowerCase()}`);
