import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  executeLocalD1Command,
  runLocalDevSeed,
  runLocalMigrations
} from "./db-local-bootstrap-utils.mjs";
import {
  installProcessCleanupHandlers,
  removeDirWithRetries,
  rootDir,
  runNodeScript,
  sanitizeLog,
  startWorker,
  stopProcessTree,
  waitForWorker
} from "./local-worker-utils.mjs";

const port = Number(process.env.CLEAN_D1_VERIFY_PORT || 8797);
const baseUrl = `http://127.0.0.1:${port}`;
const persistTo = await mkdtemp(path.join(tmpdir(), "homelink-clean-d1-verify-"));
let worker;
let workerLog = "";
let businessPassed = false;
let cleanupResult = "SKIPPED";
let cleanupStarted = false;

function logPhase(status, phase, note = "") {
  console.log(`${status} ${phase}${note ? ` - ${note}` : ""}`);
}

async function runPhase(phase, fn) {
  logPhase("PHASE", phase);
  try {
    const result = await fn();
    logPhase("PASS", phase);
    return result;
  } catch (error) {
    logPhase("FAIL", phase, error?.message || String(error));
    throw error;
  }
}

async function cleanupAfterRun(reason = "finally") {
  if (cleanupStarted) return;
  cleanupStarted = true;

  const stopResult = await stopProcessTree(worker, { label: "clean D1 Worker" });
  if (stopResult.ok) {
    logPhase("PASS", "Worker shutdown phase", `pid ${stopResult.pid || "none"} (${reason})`);
  } else {
    logPhase("WARNING", "Worker shutdown phase", `pid ${stopResult.pid} did not close cleanly`);
  }

  const cleanup = await removeDirWithRetries(persistTo, {
    label: "Temporary clean D1 directory"
  });
  if (cleanup.ok) {
    cleanupResult = "PASS";
    logPhase(
      "PASS",
      "D1 cleanup phase",
      `${cleanup.path} removed in ${cleanup.attempts} attempt(s)`
    );
  } else if (cleanup.movedTo) {
    cleanupResult = "WARNING";
    logPhase(
      "WARNING",
      "D1 cleanup phase",
      `${cleanup.path} moved to pending cleanup ${cleanup.movedTo}; next run uses an isolated directory`
    );
  } else {
    cleanupResult = "WARNING";
    logPhase(
      "WARNING",
      "D1 cleanup phase",
      `${cleanup.path} could not be removed (${cleanup.errorCode}); next run uses an isolated directory`
    );
  }

  console.log(`SUMMARY Business verification result: ${businessPassed ? "PASS" : "FAIL"}`);
  console.log(`SUMMARY Cleanup result: ${cleanupResult}`);
  console.log(
    `SUMMARY Overall result: ${
      businessPassed && cleanupResult === "PASS"
        ? "PASS"
        : businessPassed
          ? "PASS_WITH_CLEANUP_WARNING"
          : "FAIL"
    }`
  );
}

const removeCleanupHandlers = installProcessCleanupHandlers(cleanupAfterRun, {
  label: "verify-clean-d1 cleanup"
});

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
  logPhase("PASS", "Reset phase", `using isolated temp D1 directory ${persistTo}`);
  await runPhase("Migration phase", () => runLocalMigrations({ persistTo }));
  await runPhase("Seed phase", () => runLocalDevSeed({ persistTo }));

  await runPhase("Worker startup phase", async () => {
    worker = startWorker({ port, persistTo });
    worker.stdout.on("data", (chunk) => {
      workerLog += chunk.toString();
    });
    worker.stderr.on("data", (chunk) => {
      workerLog += chunk.toString();
    });

    await waitForWorker(baseUrl, 45000);
    console.log(`PASS Worker ready at ${baseUrl}`);
  });

  await runPhase("Smoke phase", () => runCheck("smoke", "smoke-worker.mjs"));
  await runPhase("Auth smoke phase", () => runCheck("smoke:auth", "smoke-auth.mjs"));
  logPhase("SKIPPED", "Delete-session test phase", "covered by npm run test:delete-session");
  await runPhase("Owner dashboard probe", () => runCheck("smoke:core", "smoke-core-flows.mjs"));
  await runPhase("Employee entry probe", () =>
    runCheck("smoke:employee-entry", "smoke-employee-entry.mjs")
  );

  await runPhase("Database evidence phase", () => {
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
  });

  console.log("PASS clean D1 bootstrap verification");
  businessPassed = true;
} catch (error) {
  if (workerLog) {
    console.error("Worker log tail:");
    console.error(sanitizeLog(workerLog));
  }
  throw error;
} finally {
  removeCleanupHandlers();
  await cleanupAfterRun();
}
