import { execFileSync, spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
export const rootDir = path.resolve(scriptDir, "..");
export const workerDir = path.join(rootDir, "deploy-worker");
export const wranglerBin = path.join(rootDir, "node_modules", "wrangler", "bin", "wrangler.js");
export const defaultPort = Number(process.env.WORKER_PORT || process.env.SMOKE_PORT || 8793);
export const defaultBaseUrl = process.env.SMOKE_BASE_URL || `http://127.0.0.1:${defaultPort}`;
export const defaultEnvPath = process.env.SMOKE_ENV_FILE || path.join(workerDir, ".dev.vars");
export const defaultPersistTo =
  process.env.WRANGLER_PERSIST_TO || path.join(workerDir, ".wrangler", "local-dev");

export function parseDevVars(text) {
  const out = {};
  for (const rawLine of String(text || "").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

export function readDevVars(envPath = defaultEnvPath) {
  if (!existsSync(envPath)) {
    throw new Error(
      `Local dev secrets file missing: ${envPath}. Run npm run dev:secrets or copy deploy-worker/.dev.vars.example.`
    );
  }
  return parseDevVars(readFileSync(envPath, "utf8"));
}

export function assertLocalDevAuthEnv(env) {
  const missing = [];
  for (const key of ["JWT_SECRET", "PW_SALT", "MANAGER_PW_HASH", "LOCAL_MANAGER_PASSWORD"]) {
    if (!String(env[key] || "").trim()) missing.push(key);
  }
  if (missing.length) throw new Error(`Missing local auth secret(s): ${missing.join(", ")}`);
  const appEnv = String(env.APP_ENV || "").toLowerCase();
  if (!["development", "dev", "local", "test"].includes(appEnv)) {
    throw new Error(
      `APP_ENV must be development/local/test for local auth smoke, got "${env.APP_ENV || ""}"`
    );
  }
  if (String(env.ALLOW_DEV_SEED || "").toLowerCase() !== "true") {
    throw new Error("ALLOW_DEV_SEED must be true for local employee auth smoke");
  }
}

export async function waitForWorker(baseUrl = defaultBaseUrl, timeoutMs = 30000) {
  const started = Date.now();
  let lastError = "";
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(`${baseUrl}/api/me`, { redirect: "manual" });
      if ([200, 401, 403].includes(response.status)) return response.status;
      lastError = `status ${response.status}`;
    } catch (error) {
      lastError = error?.message || String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(
    `Worker did not become ready on ${baseUrl}. Last error: ${lastError}. ` +
      "Run npm run dev:worker in another terminal or use npm run smoke:with-worker."
  );
}

export function startWorker({ port = defaultPort, persistTo = defaultPersistTo } = {}) {
  if (!existsSync(wranglerBin)) {
    throw new Error(`Wrangler binary not found at ${wranglerBin}. Run npm install first.`);
  }
  return spawn(
    process.execPath,
    [
      wranglerBin,
      "dev",
      "--config",
      "wrangler.toml",
      "--local",
      "--persist-to",
      persistTo,
      "--port",
      String(port)
    ],
    {
      cwd: workerDir,
      env: {
        ...process.env,
        WRANGLER_SEND_METRICS: "false"
      },
      stdio: ["ignore", "pipe", "pipe"],
      detached: process.platform !== "win32"
    }
  );
}

export function killTree(child) {
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

export function sanitizeLog(text) {
  return String(text || "")
    .replace(
      /("?(?:JWT_SECRET|PW_SALT|DATA_ENCRYPTION_KEY|MANAGER_PW_HASH|STAFF_PW_HASH|TTLOCK_CLIENT_SECRET|TTLOCK_PASSWORD|LOCAL_MANAGER_PASSWORD|LOCAL_STAFF_PASSWORD|LOCAL_EMPLOYEE_PIN)"?\s*[:=]\s*)("[^"]+"|'[^']+'|[^\s,}]+)/gi,
      "$1(hidden)"
    )
    .slice(-3000);
}

export async function runNodeScript(scriptPath, env = {}) {
  const child = spawn(process.execPath, [scriptPath], {
    cwd: rootDir,
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"]
  });
  let output = "";
  child.stdout.on("data", (chunk) => {
    output += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    output += chunk.toString();
  });
  const code = await new Promise((resolve) => child.on("close", resolve));
  return { code, output };
}
