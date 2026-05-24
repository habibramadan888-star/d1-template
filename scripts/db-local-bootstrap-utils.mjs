import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  assertLocalDevAuthEnv,
  defaultEnvPath,
  readDevVars,
  rootDir,
  workerDir,
  wranglerBin
} from "./local-worker-utils.mjs";

export const localD1DatabaseName = process.env.LOCAL_D1_DATABASE || "homelink";
export const defaultCleanD1PersistTo = path.join(workerDir, ".wrangler", "p0-005-clean-d1");
export const localMigrationDir = path.join(rootDir, "migrations", "local");

function norm(value) {
  return path.resolve(value).toLowerCase();
}

export function resolveCleanD1PersistTo(input = process.env.CLEAN_D1_PERSIST_TO) {
  return path.resolve(input || defaultCleanD1PersistTo);
}

export function assertSafeLocalPersistTo(persistTo) {
  const resolved = path.resolve(persistTo);
  const workerWrangler = path.join(workerDir, ".wrangler");
  const allowedRoots = [workerWrangler, tmpdir()].map(norm);
  const normalized = norm(resolved);
  const allowed = allowedRoots.some(
    (root) => normalized === root || normalized.startsWith(`${root}\\`)
  );
  if (!allowed) {
    throw new Error(
      `Refusing local D1 operation outside safe local roots: ${resolved}. ` +
        `Allowed roots: ${workerWrangler}, ${tmpdir()}`
    );
  }
  if (normalized === norm(workerWrangler) || normalized === norm(tmpdir())) {
    throw new Error(`Refusing to target broad local root directly: ${resolved}`);
  }
  return resolved;
}

function runWranglerD1(args) {
  if (!existsSync(wranglerBin)) {
    throw new Error(`Wrangler binary not found at ${wranglerBin}. Run npm install first.`);
  }
  if (args.includes("--remote"))
    throw new Error("Remote D1 operations are forbidden in local bootstrap scripts.");
  const command = [wranglerBin, "d1", "execute", localD1DatabaseName, ...args];
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return execFileSync(process.execPath, command, {
        cwd: workerDir,
        encoding: "utf8",
        env: { ...process.env, WRANGLER_SEND_METRICS: "false" }
      });
    } catch (error) {
      if (!isRetryableLocalD1FetchFailure(error, args) || attempt === maxAttempts) throw error;
      const delayMs = 500 * attempt;
      console.warn(
        `WARN local D1 command hit transient Wrangler fetch failure; retry ${attempt + 1}/${maxAttempts} after ${delayMs}ms.`
      );
      sleepSync(delayMs);
    }
  }
}

function isRetryableLocalD1FetchFailure(error, args) {
  if (!args.includes("--local")) return false;
  const text = [
    error?.message,
    error?.stdout,
    error?.stderr,
    ...(Array.isArray(error?.output) ? error.output : [])
  ]
    .filter(Boolean)
    .join("\n");
  return /fetch failed|connectivity issue/i.test(text);
}

function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

export async function listLocalMigrationFiles() {
  const files = (await readdir(localMigrationDir))
    .filter((name) => name.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b));
  return files.map((name) => path.join(localMigrationDir, name));
}

export async function runLocalMigrations({ persistTo = resolveCleanD1PersistTo() } = {}) {
  const safePersistTo = assertSafeLocalPersistTo(persistTo);
  const files = await listLocalMigrationFiles();
  if (!files.length) throw new Error(`No local migration files found in ${localMigrationDir}`);
  for (const file of files) {
    runWranglerD1(["--local", "--persist-to", safePersistTo, "--file", file]);
    console.log(`PASS local migration ${path.relative(rootDir, file)}`);
  }
  return { persistTo: safePersistTo, files };
}

function sqlText(value) {
  return String(value ?? "").replaceAll("'", "''");
}

export function executeLocalD1Command(
  command,
  { persistTo = resolveCleanD1PersistTo(), json = false } = {}
) {
  const safePersistTo = assertSafeLocalPersistTo(persistTo);
  const args = ["--local", "--persist-to", safePersistTo, "--command", command];
  if (json) args.push("--json");
  return runWranglerD1(args);
}

export function assertDevSeedAllowed() {
  const env = readDevVars(defaultEnvPath);
  assertLocalDevAuthEnv(env);
  return env;
}

export function runLocalDevSeed({ persistTo = resolveCleanD1PersistTo() } = {}) {
  const safePersistTo = assertSafeLocalPersistTo(persistTo);
  const env = assertDevSeedAllowed();
  const corpid = env.CORPID || "local-dev-company";
  const now = new Date().toISOString();
  const rentConfig = JSON.stringify({ SMOKE101: 770 });
  executeLocalD1Command(
    `INSERT OR REPLACE INTO app_settings (corpid, key, value, updated_by, updated_at)
     VALUES ('${sqlText(corpid)}', 'rent_ref_room', '${sqlText(rentConfig)}', 'local_dev_seed', '${sqlText(now)}')`,
    { persistTo: safePersistTo }
  );
  console.log(`PASS local dev seed app_settings for ${corpid}`);
  return { persistTo: safePersistTo, corpid };
}
