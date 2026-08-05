/**
 * Phase-0 wiring proof for the /agents track: the env-configured ERC-8004
 * Identity Registry really is the Base Sepolia deployment, live and correctly
 * cross-referenced by the Reputation Registry.
 *
 * The failure this exists to catch is silent: the mainnet registry differs
 * from the testnet one only in vanity prefix (0x8004A169 vs 0x8004A818), and
 * a wrong address simply indexes nothing and registers nowhere.
 *
 * Rerunnable, read-only. Run: node --env-file=.env.local scripts/verify-agent-registry.mjs
 * Override RPC: AGENTS_RPC_URL=<url> node --env-file=.env.local scripts/verify-agent-registry.mjs
 */
import { createPublicClient, http, parseAbi } from "viem";
import { baseSepolia } from "viem/chains";

const EXPECTED_CHAIN_ID = 84532;
const TESTNET_PREFIX = "0x8004A818";
const MAINNET_PREFIX = "0x8004A169";
// ERC-1967 implementation slot: keccak256("eip1967.proxy.implementation") - 1
const EIP1967_IMPL_SLOT =
  "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";

const identity = process.env.NEXT_PUBLIC_AGENTS_IDENTITY_REGISTRY;
const reputation = process.env.NEXT_PUBLIC_AGENTS_REPUTATION_REGISTRY;
const rpc = process.env.AGENTS_RPC_URL || undefined; // undefined → chain default

let failures = 0;
const pass = (msg) => console.log(`  ✓ ${msg}`);
const fail = (msg) => {
  failures++;
  console.error(`  ✗ ${msg}`);
};

console.log(`RPC: ${rpc ?? baseSepolia.rpcUrls.default.http[0]} (chain default)`);

// 2 first — the prefix check needs no network and should fail fast.
console.log("\n[1/6] Registry addresses configured with the testnet prefix");
if (!identity) fail("NEXT_PUBLIC_AGENTS_IDENTITY_REGISTRY is not set.");
else if (!identity.startsWith(TESTNET_PREFIX))
  fail(
    `Identity registry ${identity} lacks the Base Sepolia prefix ${TESTNET_PREFIX}… ` +
      `(mainnet is ${MAINNET_PREFIX}… — testnet/mainnet mixup?).`,
  );
else pass(`Identity ${identity} matches ${TESTNET_PREFIX}…`);
if (!reputation) fail("NEXT_PUBLIC_AGENTS_REPUTATION_REGISTRY is not set.");
else pass(`Reputation ${reputation}`);
if (failures) exit();

const client = createPublicClient({ chain: baseSepolia, transport: http(rpc) });
const abi = parseAbi([
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function getIdentityRegistry() view returns (address)",
]);

console.log("\n[2/6] RPC serves the expected chain");
const chainId = await client.getChainId();
if (chainId !== EXPECTED_CHAIN_ID)
  fail(`RPC reports chain ${chainId}, expected Base Sepolia (${EXPECTED_CHAIN_ID}). Wrong AGENTS_RPC_URL?`);
else pass(`chainId ${chainId}`);
if (failures) exit();

console.log("\n[3/6] Code deployed at both registry addresses");
for (const [label, addr] of [["Identity", identity], ["Reputation", reputation]]) {
  const code = await client.getCode({ address: addr });
  if (!code || code === "0x") fail(`${label} registry ${addr} has no code on chain ${chainId}.`);
  else pass(`${label} registry has code (${(code.length - 2) / 2} bytes)`);
}
if (failures) exit();

console.log('\n[4/6] Identity registry identifies as ERC-8004 ("AgentIdentity")');
const [name, symbol] = await Promise.all([
  client.readContract({ address: identity, abi, functionName: "name" }),
  client.readContract({ address: identity, abi, functionName: "symbol" }),
]);
if (name !== "AgentIdentity") fail(`name() returned ${JSON.stringify(name)}, expected "AgentIdentity".`);
else pass(`name() = "${name}"`);
if (symbol !== "AGENT") fail(`symbol() returned ${JSON.stringify(symbol)}, expected "AGENT".`);
else pass(`symbol() = "${symbol}"`);

console.log("\n[5/6] Wiring: ReputationRegistry.getIdentityRegistry() points at our address");
const wired = await client.readContract({
  address: reputation,
  abi,
  functionName: "getIdentityRegistry",
});
if (wired.toLowerCase() !== identity.toLowerCase())
  fail(`Reputation registry points at ${wired}, not ${identity}.`);
else pass(`getIdentityRegistry() = ${wired}`);

console.log("\n[6/6] Identity address is the ERC-1967 proxy (not a direct deploy)");
const slot = await client.getStorageAt({ address: identity, slot: EIP1967_IMPL_SLOT });
if (!slot || BigInt(slot) === 0n) fail("ERC-1967 implementation slot is empty.");
else pass(`implementation = 0x${slot.slice(-40)}`);

exit();

function exit() {
  if (failures) {
    console.error(`\nFAILED: ${failures} check(s) did not pass. Do not proceed with this config.`);
    process.exit(1);
  }
  console.log("\nAll checks passed — registry wiring confirmed.");
  process.exit(0);
}
