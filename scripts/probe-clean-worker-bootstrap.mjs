import { execFileSync, spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runLocalDevSeed, runLocalMigrations } from "./db-local-bootstrap-utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..");
const workerDir = path.join(rootDir, "deploy-worker");
const wranglerBin = path.join(rootDir, "node_modules", "wrangler", "bin", "wrangler.js");
const smokeEntryScript = path.join(rootDir, "scripts", "smoke-employee-entry.mjs");
const port = Number(process.env.CLEAN_BOOTSTRAP_PORT || 8795);
const baseUrl = `http://127.0.0.1:${port}`;

async function waitForWorker(timeoutMs = 30000) {
  const started = Date.now();
  let lastError = "";
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(`${baseUrl}/api/me`);
      if (response.status === 401 || response.status === 403 || response.status === 200) return;
      lastError = `status ${response.status}`;
    } catch (error) {
      lastError = error?.message || String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Worker did not become ready on ${baseUrl}: ${lastError}`);
}

function killTree(child) {
  if (!child?.pid) return;
  try {
    if (process.platform === "win32") {
      execFileSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    } else {
      process.kill(-child.pid, "SIGTERM");
    }
  } catch {
    try {
      child.kill("SIGTERM");
    } catch {
      // Best effort cleanup only.
    }
  }
}

function sanitizeLog(text) {
  return String(text || "")
    .replace(
      /("?(?:JWT_SECRET|PW_SALT|DATA_ENCRYPTION_KEY|MANAGER_PW_HASH|STAFF_PW_HASH|TTLOCK_CLIENT_SECRET|TTLOCK_PASSWORD|LOCAL_MANAGER_PASSWORD|LOCAL_EMPLOYEE_PIN)"?\s*[:=]\s*)("[^"]+"|'[^']+'|[^\s,}]+)/gi,
      "$1(hidden)"
    )
    .slice(-2000);
}

const persistDir = await mkdtemp(path.join(tmpdir(), "homelink-clean-worker-bootstrap-"));
let worker;

try {
  await runLocalMigrations({ persistTo: persistDir });
  runLocalDevSeed({ persistTo: persistDir });

  worker = spawn(
    process.execPath,
    [
      wranglerBin,
      "dev",
      "--config",
      "wrangler.toml",
      "--local",
      "--persist-to",
      persistDir,
      "--port",
      String(port)
    ],
    {
      cwd: workerDir,
      env: { ...process.env },
      stdio: ["ignore", "pipe", "pipe"],
      detached: process.platform !== "win32"
    }
  );

  let workerLog = "";
  worker.stdout.on("data", (chunk) => {
    workerLog += chunk.toString();
  });
  worker.stderr.on("data", (chunk) => {
    workerLog += chunk.toString();
  });

  await waitForWorker();

  const smoke = spawn(process.execPath, [smokeEntryScript], {
    cwd: rootDir,
    env: {
      ...process.env,
      SMOKE_BASE_URL: baseUrl,
      SMOKE_ENV_FILE: "deploy-worker/.dev.vars"
    },
    stdio: ["ignore", "pipe", "pipe"]
  });

  let smokeOutput = "";
  smoke.stdout.on("data", (chunk) => {
    smokeOutput += chunk.toString();
  });
  smoke.stderr.on("data", (chunk) => {
    smokeOutput += chunk.toString();
  });

  const smokeCode = await new Promise((resolve) => {
    smoke.on("close", resolve);
  });

  console.log("Clean Worker bootstrap probe completed.");
  console.log(`Temporary D1 state: ${persistDir}`);
  console.log(`Employee entry smoke exit code: ${smokeCode}`);
  console.log(smokeOutput.trim().slice(0, 1200));

  if (smokeCode !== 0) {
    console.error("Worker log tail:");
    console.error(sanitizeLog(workerLog));
    console.error("P0 confirmed: clean local Worker bootstrap cannot complete employee entry.");
    process.exitCode = 1;
  } else {
    console.log("PASS clean local Worker bootstrap supports employee entry.");
  }
} finally {
  killTree(worker);
  await rm(persistDir, { recursive: true, force: true });
  console.log("Temporary D1 directory removed.");
}
