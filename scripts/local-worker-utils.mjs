import { execFileSync, spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, rename, rm } from "node:fs/promises";
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

function tailText(value, maxLength = 3000) {
  return sanitizeLog(String(value || "").slice(-maxLength));
}

function safeVarsSummary(vars = {}) {
  const secretLike = /secret|password|token|cookie|hash|pin|key/i;
  return Object.entries(vars)
    .map(
      ([key, value]) =>
        `${key}=${secretLike.test(key) ? "(hidden)" : JSON.stringify(String(value))}`
    )
    .join(", ");
}

export async function waitForWorker(baseUrl = defaultBaseUrl, timeoutMs = 30000, diagnostics = {}) {
  const started = Date.now();
  let lastError = "";
  let attempts = 0;
  while (Date.now() - started < timeoutMs) {
    attempts += 1;
    try {
      const response = await fetch(`${baseUrl}/api/me`, { redirect: "manual" });
      if ([200, 401, 403].includes(response.status)) return response.status;
      lastError = `status ${response.status}`;
    } catch (error) {
      lastError = error?.message || String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  const elapsedMs = Date.now() - started;
  const child = diagnostics.child;
  const details = [
    `Worker did not become ready on ${baseUrl}.`,
    `Last error: ${lastError}.`,
    `Attempts: ${attempts}.`,
    `Elapsed ms: ${elapsedMs}.`
  ];
  if (diagnostics.label) details.push(`Label: ${diagnostics.label}.`);
  if (diagnostics.port) details.push(`Port: ${diagnostics.port}.`);
  if (diagnostics.command) details.push(`Command: ${diagnostics.command}.`);
  if (diagnostics.vars) details.push(`Vars: ${safeVarsSummary(diagnostics.vars)}.`);
  if (child) {
    details.push(
      `Child pid: ${child.pid || "unknown"}, exitCode: ${child.exitCode ?? "null"}, signalCode: ${
        child.signalCode ?? "null"
      }.`
    );
  }
  if (diagnostics.stdout) details.push(`Last stdout:\n${tailText(diagnostics.stdout)}`);
  if (diagnostics.stderr) details.push(`Last stderr:\n${tailText(diagnostics.stderr)}`);
  throw new Error(
    `${details.join("\n")}\nRun npm run dev:worker in another terminal or use npm run smoke:with-worker.`
  );
}

export function startWorker({
  port = defaultPort,
  persistTo = defaultPersistTo,
  vars = {},
  configFile = "wrangler.toml",
  envFiles = [],
  envName = ""
} = {}) {
  if (!existsSync(wranglerBin)) {
    throw new Error(`Wrangler binary not found at ${wranglerBin}. Run npm install first.`);
  }
  const varArgs = Object.entries(vars).flatMap(([key, value]) => [
    "--var",
    `${key}:${String(value)}`
  ]);
  const envFileArgs = envFiles.flatMap((file) => ["--env-file", file]);
  const envNameArgs = envName ? ["--env", envName] : [];
  return spawn(
    process.execPath,
    [
      wranglerBin,
      "dev",
      "--config",
      configFile,
      ...envNameArgs,
      "--local",
      "--persist-to",
      persistTo,
      "--port",
      String(port),
      ...envFileArgs,
      ...varArgs
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

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableFetchError(error) {
  const parts = [
    error?.code,
    error?.errno,
    error?.syscall,
    error?.message,
    error?.cause?.code,
    error?.cause?.errno,
    error?.cause?.syscall,
    error?.cause?.message
  ]
    .filter(Boolean)
    .join(" ");
  return /ECONNRESET|ECONNREFUSED|UND_ERR_SOCKET|UND_ERR_CONNECT_TIMEOUT|EPIPE|fetch failed/i.test(
    parts
  );
}

function fetchDiagnosticsMessage({ url, method, attempts, elapsedMs, error, diagnostics = {} }) {
  const child = diagnostics.child;
  const details = [
    `Worker fetch failed after ${attempts} attempt(s).`,
    `URL: ${url}.`,
    `Method: ${method}.`,
    `Elapsed ms: ${elapsedMs}.`,
    `Error: ${error?.message || String(error)}.`
  ];
  if (error?.cause) details.push(`Cause: ${error.cause?.message || String(error.cause)}.`);
  if (diagnostics.label) details.push(`Label: ${diagnostics.label}.`);
  if (diagnostics.port) details.push(`Port: ${diagnostics.port}.`);
  if (diagnostics.command) details.push(`Command: ${diagnostics.command}.`);
  if (diagnostics.vars) details.push(`Vars: ${safeVarsSummary(diagnostics.vars)}.`);
  if (child) {
    details.push(
      `Child pid: ${child.pid || "unknown"}, exitCode: ${child.exitCode ?? "null"}, signalCode: ${
        child.signalCode ?? "null"
      }.`
    );
  }
  if (diagnostics.stdout) details.push(`Last stdout:\n${tailText(diagnostics.stdout)}`);
  if (diagnostics.stderr) details.push(`Last stderr:\n${tailText(diagnostics.stderr)}`);
  return details.join("\n");
}

export async function fetchWithRetry(
  url,
  options = {},
  { attempts = 4, delayMs = 200, diagnostics = {} } = {}
) {
  const started = Date.now();
  const method = String(options.method || "GET").toUpperCase();
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fetch(url, options);
    } catch (error) {
      lastError = error;
      if (!isRetryableFetchError(error) || attempt === attempts) {
        const enriched = new Error(
          fetchDiagnosticsMessage({
            url,
            method,
            attempts: attempt,
            elapsedMs: Date.now() - started,
            error,
            diagnostics
          })
        );
        enriched.cause = error;
        throw enriched;
      }
      await sleep(delayMs * attempt);
    }
  }

  throw lastError;
}

export async function stopProcessTree(child, { label = "child process", timeoutMs = 10000 } = {}) {
  if (!child?.pid) return { ok: true, skipped: true, label };
  if (child.exitCode !== null || child.signalCode !== null) {
    return { ok: true, alreadyExited: true, label, pid: child.pid };
  }

  const closed = new Promise((resolve) => {
    child.once("close", (code, signal) => resolve({ code, signal }));
  });

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
      // Best effort cleanup only; wait below will decide whether it actually closed.
    }
  }

  let result = await Promise.race([closed, sleep(timeoutMs).then(() => null)]);
  if (!result && process.platform !== "win32") {
    try {
      process.kill(-child.pid, "SIGKILL");
    } catch {
      try {
        child.kill("SIGKILL");
      } catch {
        // Best effort cleanup only.
      }
    }
    result = await Promise.race([closed, sleep(2000).then(() => null)]);
  }

  return {
    ok: Boolean(result),
    label,
    pid: child.pid,
    code: result?.code ?? null,
    signal: result?.signal ?? null
  };
}

function isRetryableWindowsFsError(error) {
  return ["EBUSY", "EPERM", "ENOTEMPTY"].includes(error?.code);
}

export async function removeDirWithRetries(
  target,
  { attempts = 10, delayMs = 300, label = "directory", pendingRoot } = {}
) {
  const resolved = path.resolve(target);
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await rm(resolved, { recursive: true, force: true });
      return { ok: true, path: resolved, attempts: attempt, label };
    } catch (error) {
      lastError = error;
      if (!isRetryableWindowsFsError(error) || attempt === attempts) break;
      await sleep(delayMs);
    }
  }

  const quarantineRoot = path.resolve(pendingRoot || path.join(rootDir, ".tmp", "pending-cleanup"));
  try {
    await mkdir(quarantineRoot, { recursive: true });
    const destination = path.join(
      quarantineRoot,
      `${path.basename(resolved)}-${Date.now().toString(36)}`
    );
    await rename(resolved, destination);
    return {
      ok: false,
      movedTo: destination,
      path: resolved,
      attempts,
      label,
      errorCode: lastError?.code || "UNKNOWN"
    };
  } catch (moveError) {
    return {
      ok: false,
      path: resolved,
      attempts,
      label,
      errorCode: lastError?.code || moveError?.code || "UNKNOWN",
      message: lastError?.message || moveError?.message || String(moveError)
    };
  }
}

export function installProcessCleanupHandlers(cleanup, { label = "process cleanup" } = {}) {
  let running = false;

  async function runAndExit(exitCode, reason, error) {
    if (running) return;
    running = true;
    if (error) console.error(sanitizeLog(error?.stack || error?.message || String(error)));
    try {
      await cleanup(reason);
    } catch (cleanupError) {
      console.error(`${label} failed: ${sanitizeLog(cleanupError?.message || cleanupError)}`);
    } finally {
      process.exit(exitCode);
    }
  }

  const onSigint = () => void runAndExit(130, "SIGINT");
  const onSigterm = () => void runAndExit(143, "SIGTERM");
  const onUncaught = (error) => void runAndExit(1, "uncaughtException", error);
  const onUnhandled = (reason) => void runAndExit(1, "unhandledRejection", reason);

  process.once("SIGINT", onSigint);
  process.once("SIGTERM", onSigterm);
  process.once("uncaughtException", onUncaught);
  process.once("unhandledRejection", onUnhandled);

  return () => {
    process.off("SIGINT", onSigint);
    process.off("SIGTERM", onSigterm);
    process.off("uncaughtException", onUncaught);
    process.off("unhandledRejection", onUnhandled);
  };
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
