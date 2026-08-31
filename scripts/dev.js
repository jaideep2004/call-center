const { createServer } = require("net");
const { spawn, execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const dns = require("dns");

// Load .env so DATABASE_URL and the other keys are visible to this script
// (and get passed down to the gateway + worker children). Next.js loads the
// env files itself, so this is purely additive.
require("dotenv").config();

const projectRoot = path.resolve(__dirname, "..");
const envLocalPath = path.join(projectRoot, ".env.local");
const nextBin = path.join(projectRoot, "node_modules", "next", "dist", "bin", "next");
const gatewayEntry = path.join(projectRoot, "src", "gateway", "index.ts");
const workerEntry = path.join(projectRoot, "src", "worker", "index.ts");

let gatewayProcess = null;
let workerProcess = null;
let nextProcess = null;

function tsxCli() {
  return path.join(projectRoot, "node_modules", "tsx", "dist", "cli.mjs");
}

function removeEnvLocal() {
  try { if (fs.existsSync(envLocalPath)) fs.unlinkSync(envLocalPath); } catch {}
}

function killAll() {
  if (nextProcess) { try { nextProcess.kill(); } catch {} nextProcess = null; }
  if (gatewayProcess) { try { gatewayProcess.kill(); } catch {} gatewayProcess = null; }
  if (workerProcess) { try { workerProcess.kill(); } catch {} workerProcess = null; }
}

function ensureRedis() {
  // Try to start redis via docker if available. If docker is not installed or
  // redis is already running, we gracefully fall back — the app works without
  // redis in single-instance dev (HTTP /publish bridge), just without
  // multi-instance pub/sub. The gateway logs "redis bridge connected" when ok.
  try {
    execSync("docker info", { stdio: "ignore", timeout: 3000 });
    try {
      // Prefer compose (project has redis in docker-compose.yml)
      execSync("docker compose up redis -d", { stdio: "ignore", timeout: 15000, cwd: projectRoot });
      console.info("  redis: docker compose redis started");
      return;
    } catch {}
    try {
      execSync("docker ps --filter name=call-center-redis --format {{.Names}}", { stdio: "pipe", timeout: 3000 }).toString().includes("call-center-redis");
      // already running
      return;
    } catch {}
    try {
      execSync("docker run -d --name call-center-redis -p 6379:6379 redis:7-alpine", { stdio: "ignore", timeout: 15000 });
      console.info("  redis: docker redis started (call-center-redis)");
    } catch {}
  } catch {
    // Docker not available — common on Windows without Docker Desktop.
    // HTTP gateway bridge still works; just warn.
    console.warn("  redis: docker not found — running without redis (HTTP gateway bridge only).");
    console.warn("         Install Docker Desktop or WSL redis for full pub/sub: wsl --install && wsl sudo apt install redis-server");
  }
}

process.on("exit", () => { removeEnvLocal(); killAll(); });
process.on("SIGINT", () => { removeEnvLocal(); killAll(); process.exit(); });
process.on("SIGTERM", () => { removeEnvLocal(); killAll(); });

function resolveDbHost(hostname) {
  return new Promise((resolve) => {
    dns.resolve6(hostname, (err, addrs6) => {
      if (!err && addrs6.length > 0) {
        resolve(`[${addrs6[0]}]`);
      } else {
        dns.resolve4(hostname, (_e, addrs4) => {
          resolve(!_e && addrs4.length > 0 ? addrs4[0] : hostname);
        });
      }
    });
  });
}

function findAvailablePort(startPort, excludePorts = []) {
  return new Promise((resolve, reject) => {
    if (excludePorts.includes(startPort)) {
      return resolve(findAvailablePort(startPort + 1, excludePorts));
    }
    const server = createServer();
    server.unref();
    server.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        resolve(findAvailablePort(startPort + 1, excludePorts));
      } else {
        reject(err);
      }
    });
    // No host argument: bind the dual-stack socket (:: / IPv6-any), matching how
    // Next.js and the gateway actually listen. Probing 0.0.0.0 only would miss
    // a process already holding the port on the IPv6 side.
    server.listen(startPort, () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

function startWorker(dbUrl) {
  return new Promise((resolve) => {
    if (!dbUrl) {
      console.warn("  DATABASE_URL not set — call-worker NOT started (no routing/failover/retreaver jobs)");
      return resolve(true);
    }
    workerProcess = spawn(
      process.execPath,
      [tsxCli(), workerEntry],
      {
        stdio: ["inherit", "pipe", "pipe"],
        env: { ...process.env, DATABASE_URL: dbUrl },
        cwd: projectRoot,
      },
    );

    let settled = false;
    workerProcess.stdout.on("data", (chunk) => {
      process.stdout.write(chunk);
      if (!settled && chunk.toString().includes("call-worker ready")) {
        settled = true;
        resolve(true);
      }
    });
    workerProcess.stderr.on("data", (chunk) => {
      process.stderr.write(chunk);
      if (!settled && chunk.toString().includes("call-worker ready")) {
        settled = true;
        resolve(true);
      }
    });
    workerProcess.on("error", () => { if (!settled) { settled = true; resolve(false); } });
    workerProcess.on("exit", () => { if (!settled) { settled = true; resolve(false); } });

    // pg-boss needs to connect to the DB + compile under tsx; give it room.
    setTimeout(() => { if (!settled) { settled = true; resolve(true); } }, 15000);
  });
}

function startGateway(realtimePort, appUrl) {
  return new Promise((resolve) => {
    gatewayProcess = spawn(
      process.execPath,
      [tsxCli(), gatewayEntry],
      {
        stdio: ["inherit", "inherit", "pipe"],
        env: {
          ...process.env,
          REALTIME_PORT: String(realtimePort),
          NEXT_PUBLIC_APP_URL: appUrl,
        },
        cwd: projectRoot,
      },
    );

    let settled = false;

    gatewayProcess.stderr.on("data", (chunk) => {
      process.stderr.write(chunk);
      const text = chunk.toString();
      if (!settled && text.includes("realtime-gateway ready")) {
        settled = true;
        resolve(true);
      }
    });

    gatewayProcess.on("error", () => { if (!settled) { settled = true; resolve(false); } });
    gatewayProcess.on("exit", () => { if (!settled) { settled = true; resolve(false); } });

    setTimeout(() => { if (!settled) { settled = true; resolve(true); } }, 5000);
  });
}

async function startOnPort(port, realtimePort, realtimeUrl, dbUrl) {
  const url = `http://localhost:${port}`;
  const gatewayUrl = `http://localhost:${realtimePort}`;

  dbUrl = dbUrl ?? process.env.DATABASE_URL ?? null;
  if (dbUrl) {
    const parsed = new URL(dbUrl);
    const ip = await resolveDbHost(parsed.hostname);
    if (ip !== parsed.hostname) {
      parsed.hostname = ip;
      dbUrl = parsed.toString();
    }
  }

  const envLocal = [
    `BETTER_AUTH_URL=${url}`,
    `NEXT_PUBLIC_APP_URL=${url}`,
    `NEXT_PUBLIC_REALTIME_URL=${realtimeUrl}`,
    `GATEWAY_URL=${gatewayUrl}`,
    `REALTIME_PORT=${realtimePort}`,
  ];
  if (dbUrl) envLocal.push(`DATABASE_URL=${dbUrl}`);
  envLocal.push("");
  fs.writeFileSync(envLocalPath, envLocal.join("\n"), "utf8");

  const env = { ...process.env, GATEWAY_URL: gatewayUrl, NEXT_PUBLIC_REALTIME_URL: realtimeUrl, REALTIME_PORT: String(realtimePort), BETTER_AUTH_URL: url, NEXT_PUBLIC_APP_URL: url };
  if (dbUrl) env.DATABASE_URL = dbUrl;

  return new Promise((resolve) => {
    nextProcess = spawn("node", [nextBin, "dev", "-p", String(port)], {
      stdio: ["inherit", "inherit", "pipe"],
      env,
      cwd: projectRoot,
    });

    let stderr = "";
    let settled = false;
    let timer;

    function finish(success) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (!success) { nextProcess.kill(); nextProcess = null; }
      resolve(success);
    }

    nextProcess.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
      process.stderr.write(chunk);
      if (stderr.includes("EADDRINUSE")) finish(false);
    });

    nextProcess.on("exit", (code) => {
      if (!settled) {
        if (stderr.includes("EADDRINUSE")) finish(false);
        else process.exit(code ?? 1);
      }
    });

    nextProcess.on("error", () => finish(false));

    timer = setTimeout(() => {
      if (!settled) {
        nextProcess.stderr.removeAllListeners();
        nextProcess.stderr.on("data", (chunk) => process.stderr.write(chunk));
        finish(true);
      }
    }, 3000);
  });
}

async function main() {
  ensureRedis();

  const nextStart = parseInt(process.env.PORT || "30001", 10);
  const gatewayStart = parseInt(process.env.REALTIME_PORT || "3002", 10);

  // Find both ports upfront so gateway CORS matches Next.js origin
  const nextPort = await findAvailablePort(nextStart);
  const realtimePort = await findAvailablePort(gatewayStart, [nextPort]);
  const realtimeUrl = `http://localhost:${realtimePort}`;
  const appUrl = `http://localhost:${nextPort}`;

  // Resolve the DB host once; the worker and Next share the same URL
  let dbUrl = process.env.DATABASE_URL ?? null;
  if (dbUrl) {
    try {
      const parsed = new URL(dbUrl);
      const ip = await resolveDbHost(parsed.hostname);
      if (ip !== parsed.hostname) {
        parsed.hostname = ip;
        dbUrl = parsed.toString();
      }
    } catch {}
  }

  console.info(`  Realtime gateway on port: ${realtimePort}`);

  const gatewayOk = await startGateway(realtimePort, appUrl);
  if (!gatewayOk) {
    console.error("  Failed to start realtime gateway");
    killAll();
    removeEnvLocal();
    process.exit(1);
  }

  const workerOk = await startWorker(dbUrl);
  if (!workerOk) {
    // The app still works without the worker (routing is inline by default), so
    // don't kill the session — but make it unmistakable that jobs are missing.
    console.error("  !! call-worker FAILED to start — no routing/failover/retreaver jobs. See errors above.");
  }

  console.info(`\n  Next.js on port: ${nextPort}\n`);

  const ok = await startOnPort(nextPort, realtimePort, realtimeUrl, dbUrl);
  if (ok) {
    console.info(`  BETTER_AUTH_URL=${appUrl}`);
    console.info(`  NEXT_PUBLIC_APP_URL=${appUrl}`);
    console.info(`  NEXT_PUBLIC_REALTIME_URL=${realtimeUrl}`);
    return;
  }

  console.error("  Could not start Next.js — port may have been taken after check");
  killAll();
  removeEnvLocal();
  process.exit(1);
}

main();
