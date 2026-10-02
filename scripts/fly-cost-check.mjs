/**
 * Fly.io has no spending cap, so this is the nearest thing to one. It reads
 * what is configured on the account right now (machines, volumes, dedicated
 * IPv4 addresses), prices it, and exits 1 when the monthly total is over the
 * budget or when something is set up in a way that quietly costs more.
 *
 * Fly never adds or resizes machines by itself, so the configured total is
 * the bill, apart from outbound data at about 2 cents per GB.
 *
 * Run: node scripts/fly-cost-check.mjs
 *      FLY_BUDGET=25 node scripts/fly-cost-check.mjs
 *
 * Needs the fly CLI, signed in. Read only: it lists, it never changes.
 *
 * The rates below are estimates for shared machines in iad, calibrated on the
 * 3.32 dollars a month for shared-cpu-1x 512MB recorded in indexer/README.md
 * (2026-09). Check them against Billing, Upcoming invoice in the Fly dashboard
 * and correct them here if Fly's prices move.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const RATES = {
  /** One shared vCPU with its included 256MB, per month. */
  sharedCpu: 2.02,
  /** Each GB of RAM beyond 256MB per vCPU, per month. */
  ramPerGb: 5.2,
  /** Provisioned volume storage per GB, per month. */
  volumePerGb: 0.15,
  /** A dedicated IPv4 address, per month. Shared IPv4 and IPv6 are free. */
  dedicatedIpv4: 2,
};

const BUDGET = Number(process.env.FLY_BUDGET ?? 20);

/** The size each app is meant to run at, read from its fly config. */
const CONFIGS = ["indexer/fly.toml", "indexer/fly.arbitrum.toml"];

function fly(args) {
  try {
    return JSON.parse(execFileSync("fly", [...args, "--json"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
  } catch {
    return null;
  }
}

function machineCost(guest) {
  if (guest.cpu_kind !== "shared") return null;
  const includedMb = guest.cpus * 256;
  const extraGb = Math.max(0, guest.memory_mb - includedMb) / 1024;
  return guest.cpus * RATES.sharedCpu + extraGb * RATES.ramPerGb;
}

function intended() {
  const out = new Map();
  for (const file of CONFIGS) {
    try {
      const text = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
      const app = text.match(/^app\s*=\s*"([^"]+)"/m)?.[1];
      const cpus = Number(text.match(/^\s*cpus\s*=\s*(\d+)/m)?.[1]);
      const memory = Number(text.match(/^\s*memory_mb\s*=\s*(\d+)/m)?.[1]);
      if (app && cpus && memory) out.set(app, { cpus, memory, file });
    } catch {
      // A missing config only means that app's size is not compared.
    }
  }
  return out;
}

const apps = fly(["apps", "list"]);
if (!apps) {
  console.error("Could not read the Fly account. Is the fly CLI installed and signed in (fly auth login)?");
  process.exit(2);
}

const want = intended();
const usd = (n) => `$${n.toFixed(2)}`;
const rows = [];
const warnings = [];
let total = 0;

for (const app of apps) {
  const name = app.Name;
  const machines = fly(["machines", "list", "-a", name]) ?? [];
  const volumes = fly(["volumes", "list", "-a", name]) ?? [];
  const ips = fly(["ips", "list", "-a", name]) ?? [];

  for (const m of machines) {
    const guest = m.config?.guest;
    if (!guest) continue;
    const cost = machineCost(guest);
    const size = `${guest.cpus} ${guest.cpu_kind} cpu, ${guest.memory_mb}MB`;
    if (cost === null) {
      warnings.push(`${name} runs a ${guest.cpu_kind} machine (${size}), which this script cannot price and which costs far more than a shared one.`);
      continue;
    }
    total += cost;
    rows.push([name, `machine ${m.id} (${size}, ${m.state})`, cost]);
    const meant = want.get(name);
    if (meant && (guest.cpus !== meant.cpus || guest.memory_mb !== meant.memory))
      warnings.push(`${name} is at ${size} but ${meant.file} says ${meant.cpus} cpu, ${meant.memory}MB. If this is a backfill size left on, scale it back.`);
  }
  // A Postgres app may hold replicas by design. An indexer must be exactly one machine.
  if (machines.length > 1 && want.has(name))
    warnings.push(`${name} has ${machines.length} machines. An indexer must run exactly one (fly scale count 1 -a ${name}).`);

  for (const v of volumes) {
    const cost = (v.size_gb ?? 0) * RATES.volumePerGb;
    total += cost;
    rows.push([name, `volume ${v.name} (${v.size_gb}GB)`, cost]);
  }
  for (const ip of ips) {
    if (ip.Type !== "v4") continue;
    total += RATES.dedicatedIpv4;
    rows.push([name, `dedicated IPv4 ${ip.Address}`, RATES.dedicatedIpv4]);
  }
}

const width = Math.max(...rows.map((r) => r[0].length), 4);
for (const [app, what, cost] of rows) console.log(`${app.padEnd(width)}  ${usd(cost).padStart(7)}  ${what}`);
console.log(`${"".padEnd(width)}  ${"-------".padStart(7)}`);
console.log(`${"Total".padEnd(width)}  ${usd(total).padStart(7)}  a month, estimated, against a budget of ${usd(BUDGET)}`);

for (const w of warnings) console.log(`\nWarning. ${w}`);
if (total > BUDGET) console.log(`\nOver budget by ${usd(total - BUDGET)}.`);
else console.log(`\nWithin budget, ${usd(BUDGET - total)} to spare.`);

process.exit(total > BUDGET || warnings.length ? 1 : 0);
