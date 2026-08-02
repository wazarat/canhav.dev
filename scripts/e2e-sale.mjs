/**
 * End-to-end proof of allocation sales:
 * launch a token → create a fixed-price sale (90s window, per-wallet cap,
 * 60/40 milestone-dated proceeds tranches) → fund a fresh buyer → two exact
 * buys → over-cap buy rejected → explore shows "Live sale" → window ends →
 * reclaim unsold → claim tranche 0 (60% of raise, to the creator) → tranche 1
 * still date-locked → indexer rows all correct.
 *
 * Needs: dev server (SITE_URL), local indexer (INDEXER_URL), contracts/.env.
 * Run: SITE_URL=http://localhost:PORT node --env-file=contracts/.env scripts/e2e-sale.mjs
 */
import { randomBytes } from "node:crypto";
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
const FACTORY = process.env.FACTORY ?? "0x30Db3A828F65B92434c6aDB27AEeD01850277b08";
const SALE = process.env.SALE ?? "0x869cE70ff8174802d98D26835ce4040754Ad284A";

const chain = defineChain({
  id: 46630,
  name: "Robinhood Chain Testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.testnet.chain.robinhood.com"] } },
});

const abi = parseAbi([
  "struct LaunchParams { string name; string symbol; uint256 totalSupply; string imageURI; string xHandle; string website; bytes32 descriptionHash; bytes32 journeyHash; }",
  "struct VestingParams { uint256 amount; uint64 startTimestamp; uint64 durationSeconds; uint64 cliffSeconds; }",
  "struct ProceedsTrancheInput { uint8 milestoneIndex; uint16 bps; uint64 unlockTime; }",
  "function launchToken(LaunchParams p, VestingParams v, bytes32 userSalt) payable returns (address)",
  "function launchFee() view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function balanceOf(address) view returns (uint256)",
  "function createSale(address token, bytes32 journeyHash, uint256 price, uint128 allocation, uint64 startTime, uint64 endTime, uint128 perWalletCap, ProceedsTrancheInput[] tranchesIn) returns (uint256)",
  "function buy(uint256 saleId) payable",
  "function claimProceeds(uint256 saleId, uint256 trancheIndex)",
  "function reclaimUnsold(uint256 saleId)",
  "event TokenLaunched(address indexed token, address indexed creator, string name, string symbol, uint256 totalSupply, string imageURI, string xHandle, string website, bytes32 descriptionHash, bytes32 journeyHash, bytes32 salt, uint64 version, uint256 launchFee, address treasury)",
  "event SaleCreated(uint256 indexed saleId, address indexed token, address indexed creator, bytes32 journeyHash, uint256 price, uint128 allocation, uint64 startTime, uint64 endTime, uint128 perWalletCap)",
  "error WalletCapExceeded(uint128 cap)",
  "error TrancheStillLocked(uint64 unlockTime)",
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

const creator = privateKeyToAccount(process.env.DEPLOYER_PRIVATE_KEY);
const buyerKey = `0x${randomBytes(32).toString("hex")}`;
const buyerAccount = privateKeyToAccount(buyerKey);
const client = createPublicClient({ chain, transport: http() });
const creatorWallet = createWalletClient({ account: creator, chain, transport: http() });
const buyerWallet = createWalletClient({ account: buyerAccount, chain, transport: http() });

async function send(wallet, request) {
  const hash = await wallet.writeContract(request);
  const receipt = await client.waitForTransactionReceipt({ hash });
  assert(receipt.status === "success", "tx reverted");
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
  throw new Error(`${eventName} not found`);
}

// ---------------------------------------------------------------- 1. launch

const doc = {
  version: 1,
  tokenName: "Sale Proof",
  ticker: "SLPR",
  why: "This token proves the allocation sale pipeline end to end: a fixed-price fee-free sale with a hard window and per-wallet cap, and proceeds locked in a milestone-dated schedule the creator cannot bypass.",
  supplyRationale: "1,000,000 tokens; a 200,000 allocation sold at a fixed price, the rest held by the creator for later phases.",
  milestones: [
    { date: "2026-08-16", title: "Sale completes", description: "Allocation sold or window ends." },
    { date: "2026-09-30", title: "Second proceeds tranche unlocks", description: "40% of the raise." },
  ],
};
const journeyHash = hashDoc(doc);

const pub = await fetch(`${SITE}/api/journeys`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ doc, clientHash: journeyHash, creator: creator.address }),
});
if (!pub.ok) throw new Error(`journey publish failed: ${(await pub.json()).error}`);

const launchFee = await client.readContract({ address: FACTORY, abi, functionName: "launchFee" });
const launchReceipt = await send(creatorWallet, {
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
      descriptionHash: keccak256(stringToBytes("Sale pipeline proof token")),
      journeyHash,
    },
    { amount: 0n, startTimestamp: 0n, durationSeconds: 0n, cliffSeconds: 0n },
    `0x${Date.now().toString(16).padStart(64, "0")}`,
  ],
});
const token = decodeFirst(launchReceipt, FACTORY, "TokenLaunched").token;
console.log("token launched:", token);

// ---------------------------------------------------------- 2. create sale

const PRICE = 10n ** 12n; // 0.000001 ETH per token — cheap enough for faucet ETH
const ALLOCATION = 200_000n * 10n ** 18n;
const CAP = 500n * 10n ** 18n;
const now = Math.floor(Date.now() / 1000);
const END = BigInt(now + 90);

await send(creatorWallet, { address: token, abi, functionName: "approve", args: [SALE, ALLOCATION] });
const saleReceipt = await send(creatorWallet, {
  address: SALE,
  abi,
  functionName: "createSale",
  args: [
    token,
    journeyHash,
    PRICE,
    ALLOCATION,
    0n,
    END,
    CAP,
    [
      { milestoneIndex: 0, bps: 6000, unlockTime: END },
      { milestoneIndex: 1, bps: 4000, unlockTime: END + 30n * 86400n },
    ],
  ],
});
const saleId = decodeFirst(saleReceipt, SALE, "SaleCreated").saleId;
console.log("sale created, id:", saleId);

// ------------------------------------------------------- 3. fund buyer, buy

const fundHash = await creatorWallet.sendTransaction({
  to: buyerAccount.address,
  value: 2n * 10n ** 15n, // 0.002 ETH covers buys + gas
});
await client.waitForTransactionReceipt({ hash: fundHash });
console.log("buyer funded:", buyerAccount.address);

const cost300 = 300n * PRICE;
const cost200 = 200n * PRICE;
await send(buyerWallet, { address: SALE, abi, functionName: "buy", args: [saleId], value: cost300 });
await send(buyerWallet, { address: SALE, abi, functionName: "buy", args: [saleId], value: cost200 });
const buyerTokens = await client.readContract({
  address: token, abi, functionName: "balanceOf", args: [buyerAccount.address],
});
assert(buyerTokens === 500n * 10n ** 18n, "buyer received exactly 500 tokens instantly");

let overCapReverted = false;
try {
  await client.simulateContract({
    address: SALE, abi, functionName: "buy", args: [saleId],
    value: PRICE, account: buyerAccount.address,
  });
} catch (e) {
  overCapReverted = String(e).includes("WalletCapExceeded");
}
assert(overCapReverted, "over-cap buy reverts with WalletCapExceeded");
console.log("two exact buys OK, over-cap rejected");

// ---------------------------------------- 4. indexer + pages during window

await sleep(8000);
const mid = await gql(`{
  sales(where: { tokenAddress: "${token.toLowerCase()}" }) { items { saleId sold raised unsoldReclaimed } }
  saleTranches { items { saleId trancheIndex bps claimed } }
  purchases(where: { saleId: "${saleId}" }) { items { buyer tokenAmount cost } }
}`);
assert(mid.sales.items.length === 1, "indexer has the sale");
assert(mid.sales.items[0].sold === String(500n * 10n ** 18n), "indexer sold updated");
assert(mid.sales.items[0].raised === String(cost300 + cost200), "indexer raised updated");
assert(mid.purchases.items.length === 2, "indexer has both purchases");
assert(
  mid.saleTranches.items.filter((t) => t.saleId === String(saleId)).length === 2,
  "indexer has both proceeds tranches",
);

const explore = await (await fetch(`${SITE}/launch/explore`)).text();
assert(explore.includes("Live sale"), "explore shows the Live sale badge");
const page = await (await fetch(`${SITE}/launch/t/${token.toLowerCase()}`)).text();
assert(page.includes("Allocation sale"), "token page shows the sale card");
assert(page.includes("Zero platform cut"), "token page shows the fee-free note");
console.log("indexer rows + explore badge + sale card verified");

// ------------------------------------------------- 5. end, reclaim, claim

const remain = Number(END) - Math.floor(Date.now() / 1000) + 5;
if (remain > 0) {
  console.log(`waiting ${remain}s for the sale window to end…`);
  await sleep(remain * 1000);
}

await send(buyerWallet, { address: SALE, abi, functionName: "reclaimUnsold", args: [saleId] });
const creatorTokens = await client.readContract({
  address: token, abi, functionName: "balanceOf", args: [creator.address],
});
assert(
  creatorTokens === 1_000_000n * 10n ** 18n - 500n * 10n ** 18n,
  "unsold allocation returned to creator",
);

const raised = cost300 + cost200;
const expectedFirst = (raised * 6000n) / 10_000n;
const creatorEthBefore = await client.getBalance({ address: creator.address });
await send(buyerWallet, { address: SALE, abi, functionName: "claimProceeds", args: [saleId, 0n] });
const creatorEthAfter = await client.getBalance({ address: creator.address });
assert(
  creatorEthAfter - creatorEthBefore === expectedFirst,
  "tranche 0 paid exactly 60% of the raise to the creator",
);

let lockedReverted = false;
try {
  await client.simulateContract({
    address: SALE, abi, functionName: "claimProceeds", args: [saleId, 1n],
    account: buyerAccount.address,
  });
} catch (e) {
  lockedReverted = String(e).includes("TrancheStillLocked");
}
assert(lockedReverted, "tranche 1 still date-locked");

await sleep(8000);
const after = await gql(`{
  sales(where: { tokenAddress: "${token.toLowerCase()}" }) { items { unsoldReclaimed } }
  saleTranches { items { saleId trancheIndex claimed claimedAmount } }
}`);
assert(after.sales.items[0].unsoldReclaimed === true, "indexer flipped unsoldReclaimed");
const t0 = after.saleTranches.items.find(
  (t) => t.saleId === String(saleId) && t.trancheIndex === "0",
);
assert(t0?.claimed === true && t0?.claimedAmount === String(expectedFirst), "indexer tranche 0 claimed with amount");

console.log("\n✅ E2E SALE PASS: create → buy (exact, capped) → badge → end → reclaim → claim all verified.");
console.log(`Token page: ${SITE}/launch/t/${token.toLowerCase()}`);
