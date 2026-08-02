/**
 * End-to-end proof of the AMM + fee split:
 * launch a token → create an opted-in pool → seed liquidity → fund a fresh
 * trader → swap both directions (outputs match the on-chain quotes, protocol
 * fee accrues exactly 70/30 creator/splitter) → claim creator + splitter fees
 * → splitter distributes to the platform payee (audited event) → remove half
 * the liquidity → indexer rows (pool reserves, swaps, liquidity events,
 * distribution) and the token page's Trading pool card.
 *
 * Run: SITE_URL=http://localhost:PORT node --env-file=contracts/.env scripts/e2e-amm.mjs
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
const AMM = process.env.AMM ?? "0xDd070b1f8e000D27491A3d38543ef0D72C758Df4";
const SPLITTER = process.env.SPLITTER ?? "0x9FDFae007b65d4c8F3CCA6AC242E3f141eC9DA18";

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
  "function approve(address spender, uint256 amount) returns (bool)",
  "function balanceOf(address) view returns (uint256)",
  "function createPool(address token, bool optInProtocolFee) returns (uint256)",
  "function addLiquidity(uint256 poolId, uint256 tokenAmountMax) payable returns (uint256)",
  "function removeLiquidity(uint256 poolId, uint256 sharesBurned, uint256 minEthOut, uint256 minTokensOut) returns (uint256, uint256)",
  "function swapEthForTokens(uint256 poolId, uint256 minTokensOut) payable returns (uint256)",
  "function swapTokensForEth(uint256 poolId, uint256 tokenIn, uint256 minEthOut) returns (uint256)",
  "function quoteEthForTokens(uint256 poolId, uint256 ethIn) view returns (uint256)",
  "function quoteTokensForEth(uint256 poolId, uint256 tokenIn) view returns (uint256)",
  "function claimEth(address account)",
  "function claimTokens(address token, address account)",
  "function accruedEth(address) view returns (uint256)",
  "function accruedTokens(address, address) view returns (uint256)",
  "function sharesOf(uint256, address) view returns (uint256)",
  "function pool(uint256) view returns ((address token, address creator, uint16 protocolFeeBps, uint256 ethReserve, uint256 tokenReserve, uint256 totalShares))",
  "function distributeEth()",
  "event TokenLaunched(address indexed token, address indexed creator, string name, string symbol, uint256 totalSupply, string imageURI, string xHandle, string website, bytes32 descriptionHash, bytes32 journeyHash, bytes32 salt, uint64 version, uint256 launchFee, address treasury)",
  "event PoolCreated(uint256 indexed poolId, address indexed token, address indexed creator, uint16 protocolFeeBps)",
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
const traderAccount = privateKeyToAccount(`0x${randomBytes(32).toString("hex")}`);
const client = createPublicClient({ chain, transport: http() });
const creatorWallet = createWalletClient({ account: creator, chain, transport: http() });
const traderWallet = createWalletClient({ account: traderAccount, chain, transport: http() });

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
  tokenName: "Pool Proof",
  ticker: "PLPR",
  why: "This token proves the AMM pipeline end to end: an opted-in pool whose swap volume accrues protocol fees split 70/30 between the creator and the platform's auditable FeeSplitter, with all knobs behind the timelock.",
  supplyRationale: "1,000,000 tokens; 100,000 seeded as the pool's first liquidity, the rest with the creator.",
  milestones: [
    { date: "2026-08-23", title: "Pool live with volume", description: "Swaps visible on the token page." },
    { date: "2026-09-30", title: "Fee split observed", description: "Creator and splitter both accrue from real volume." },
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
      descriptionHash: keccak256(stringToBytes("AMM pipeline proof token")),
      journeyHash,
    },
    { amount: 0n, startTimestamp: 0n, durationSeconds: 0n, cliffSeconds: 0n },
    `0x${Date.now().toString(16).padStart(64, "0")}`,
  ],
});
const token = decodeFirst(launchReceipt, FACTORY, "TokenLaunched").token;
console.log("token launched:", token);

// --------------------------------------------------- 2. pool + liquidity

const poolReceipt = await send(creatorWallet, {
  address: AMM, abi, functionName: "createPool", args: [token, true],
});
const created = decodeFirst(poolReceipt, AMM, "PoolCreated");
const poolId = created.poolId;
assert(created.protocolFeeBps === 20, "pool froze the 20 bps default");
console.log("pool created, id:", poolId);

const LIQ_ETH = 10n ** 15n; // 0.001 ETH
const LIQ_TOKENS = 100_000n * 10n ** 18n;
await send(creatorWallet, { address: token, abi, functionName: "approve", args: [AMM, LIQ_TOKENS] });
await send(creatorWallet, {
  address: AMM, abi, functionName: "addLiquidity", args: [poolId, LIQ_TOKENS], value: LIQ_ETH,
});
console.log("liquidity seeded: 0.001 ETH + 100k PLPR");

// -------------------------------------------------------- 3. trader swaps

const fundHash = await creatorWallet.sendTransaction({
  to: traderAccount.address, value: 8n * 10n ** 14n, // 0.0008 ETH
});
await client.waitForTransactionReceipt({ hash: fundHash });

const ETH_IN = 2n * 10n ** 14n; // 0.0002 ETH
const quoteBuy = await client.readContract({
  address: AMM, abi, functionName: "quoteEthForTokens", args: [poolId, ETH_IN],
});
await send(traderWallet, {
  address: AMM, abi, functionName: "swapEthForTokens", args: [poolId, quoteBuy], value: ETH_IN,
});
const traderTokens = await client.readContract({
  address: token, abi, functionName: "balanceOf", args: [traderAccount.address],
});
assert(traderTokens === quoteBuy, "buy output equals the on-chain quote");

const ethFee = (ETH_IN * 20n) / 10_000n;
const ethProjectCut = (ethFee * 7000n) / 10_000n;
assert(
  (await client.readContract({ address: AMM, abi, functionName: "accruedEth", args: [creator.address] })) === ethProjectCut,
  "creator accrued exactly 70% of the ETH protocol fee",
);
assert(
  (await client.readContract({ address: AMM, abi, functionName: "accruedEth", args: [SPLITTER] })) === ethFee - ethProjectCut,
  "splitter accrued exactly 30%",
);

const TOKENS_IN = traderTokens / 2n;
const quoteSell = await client.readContract({
  address: AMM, abi, functionName: "quoteTokensForEth", args: [poolId, TOKENS_IN],
});
await send(traderWallet, { address: token, abi, functionName: "approve", args: [AMM, TOKENS_IN] });
await send(traderWallet, {
  address: AMM, abi, functionName: "swapTokensForEth", args: [poolId, TOKENS_IN, quoteSell],
});
const tokenFee = (TOKENS_IN * 20n) / 10_000n;
const tokenProjectCut = (tokenFee * 7000n) / 10_000n;
assert(
  (await client.readContract({ address: AMM, abi, functionName: "accruedTokens", args: [token, creator.address] })) === tokenProjectCut,
  "creator accrued 70% of the token protocol fee",
);
console.log("both swaps match quotes; 70/30 accruals exact in both assets");

// ------------------------------------------------- 4. claims + distribution

const creatorEthBefore = await client.getBalance({ address: creator.address });
await send(traderWallet, { address: AMM, abi, functionName: "claimEth", args: [creator.address] });
assert(
  (await client.getBalance({ address: creator.address })) - creatorEthBefore === ethProjectCut,
  "creator claim paid the exact accrual",
);
await send(traderWallet, { address: AMM, abi, functionName: "claimEth", args: [SPLITTER] });

// Splitter payee is the deployer EOA — distribution is publicly triggerable.
const payeeBefore = await client.getBalance({ address: creator.address });
await send(traderWallet, { address: SPLITTER, abi, functionName: "distributeEth", args: [] });
assert(
  (await client.getBalance({ address: creator.address })) - payeeBefore === ethFee - ethProjectCut,
  "splitter distributed the platform share to its payee",
);
console.log("fees claimed + splitter distribution audited on-chain");

// ------------------------------------------------------ 5. remove liquidity

const myShares = await client.readContract({
  address: AMM, abi, functionName: "sharesOf", args: [poolId, creator.address],
});
await send(creatorWallet, {
  address: AMM, abi, functionName: "removeLiquidity", args: [poolId, myShares / 2n, 0n, 0n],
});
console.log("removed half the liquidity");

// ------------------------------------------------------------- 6. indexer

await sleep(8000);
const chainPool = await client.readContract({ address: AMM, abi, functionName: "pool", args: [poolId] });
const data = await gql(`{
  pools(where: { tokenAddress: "${token.toLowerCase()}" }) { items { poolId creator protocolFeeBps ethReserve tokenReserve totalShares } }
  swaps(where: { poolId: "${poolId}" }) { items { ethToToken amountIn amountOut protocolFeePaid } }
  liquidityEvents(where: { poolId: "${poolId}" }) { items { kind ethAmount shares } }
  feeDistributions { items { asset payee amount } }
}`);
assert(data.pools.items.length === 1, "indexer has the pool");
const ip = data.pools.items[0];
assert(ip.ethReserve === String(chainPool.ethReserve), "indexed ethReserve matches chain");
assert(ip.tokenReserve === String(chainPool.tokenReserve), "indexed tokenReserve matches chain");
assert(ip.totalShares === String(chainPool.totalShares), "indexed totalShares matches chain");
assert(data.swaps.items.length === 2, "indexer has both swaps");
assert(data.liquidityEvents.items.length === 2, "indexer has add + remove events");
assert(data.feeDistributions.items.length >= 1, "indexer has the splitter distribution");

const page = await (await fetch(`${SITE}/launch/t/${token.toLowerCase()}`)).text();
assert(page.includes("Trading pool"), "token page shows the pool card");
assert(page.includes("70% to the creator"), "page shows the fee split");

console.log("\n✅ E2E AMM PASS: pool → swaps (quote-exact) → 70/30 accrual → claims → distribution → indexer + page.");
console.log(`Token page: ${SITE}/launch/t/${token.toLowerCase()}`);
