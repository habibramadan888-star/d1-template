import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  executeLocalD1Command,
  runLocalDevSeed,
  runLocalMigrations
} from "./db-local-bootstrap-utils.mjs";
import {
  killTree,
  rootDir,
  runNodeScript,
  sanitizeLog,
  startWorker,
  waitForWorker
} from "./local-worker-utils.mjs";

const port = Number(process.env.CLEAN_D1_VERIFY_PORT || 8797);
const baseUrl = `http://127.0.0.1:${port}`;
const persistTo = await mkdtemp(path.join(tmpdir(), "homelink-clean-d1-verify-"));
let worker;
let workerLog = "";

async function runCheck(name, script, extraEnv = {}) {
  const result = await runNodeScript(path.join(rootDir, "scripts", script), {
    SMOKE_BASE_URL: baseUrl,
    SMOKE_ENV_FILE: "deploy-worker/.dev.vars",
    ...extraEnv
  });
  if (result.code !== 0) {
    throw new Error(`${name} failed:\n${result.output.slice(-3000)}`);
  }
  console.log(`PASS ${name}`);
  console.log(result.output.trim().slice(-1200));
}

try {
  await runLocalMigrations({ persistTo });
  runLocalDevSeed({ persistTo });

  worker = startWorker({ port, persistTo });
  worker.stdout.on("data", (chunk) => {
    workerLog += chunk.toString();
  });
  worker.stderr.on("data", (chunk) => {
    workerLog += chunk.toString();
  });

  await waitForWorker(baseUrl, 45000);
  console.log(`PASS Worker ready at ${baseUrl}`);

  await runCheck("smoke", "smoke-worker.mjs");
  await runCheck("smoke:auth", "smoke-auth.mjs");
  await runCheck("smoke:core", "smoke-core-flows.mjs");
  await runCheck("smoke:employee-entry", "smoke-employee-entry.mjs");

  const [countResult] = JSON.parse(
    executeLocalD1Command(
      `SELECT
        (SELECT COUNT(*) FROM sessions) AS sessions_count,
        (SELECT COUNT(*) FROM transactions) AS transactions_count,
        (SELECT COUNT(*) FROM arrear_tasks) AS arrear_tasks_count,
        (SELECT COUNT(*) FROM audit_logs) AS audit_logs_count,
        (SELECT COUNT(*) FROM entry_events) AS entry_events_count,
        (SELECT COUNT(*) FROM app_settings WHERE key='rent_ref_room') AS rent_settings_count`,
      { persistTo, json: true }
    )
  );
  const row = countResult?.results?.[0] || {};
  for (const key of [
    "sessions_count",
    "transactions_count",
    "arrear_tasks_count",
    "audit_logs_count",
    "entry_events_count",
    "rent_settings_count"
  ]) {
    if (Number(row[key] || 0) < 1) {
      throw new Error(`${key} expected >= 1 after clean D1 verify, got ${row[key]}`);
    }
    console.log(`PASS ${key} ${row[key]}`);
  }

  console.log("PASS clean D1 bootstrap verification");
} catch (error) {
  if (workerLog) {
    console.error("Worker log tail:");
    console.error(sanitizeLog(workerLog));
  }
  throw error;
} finally {
  killTree(worker);
  await rm(persistTo, { recursive: true, force: true });
  console.log("Temporary clean D1 directory removed.");
}
