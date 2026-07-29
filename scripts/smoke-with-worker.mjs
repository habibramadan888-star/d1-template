import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  defaultBaseUrl,
  defaultEnvPath,
  defaultPersistTo,
  defaultPort,
  readDevVars,
  rootDir,
  runNodeScript,
  sanitizeLog,
  startWorker,
  stopProcessTree,
  waitForWorker
} from "./local-worker-utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const smokeWorkerScript = path.join(scriptDir, "smoke-worker.mjs");
const smokeAuthScript = path.join(scriptDir, "smoke-auth.mjs");

let worker;
let workerLog = "";

try {
  readDevVars(defaultEnvPath);
  worker = startWorker({ port: defaultPort, persistTo: defaultPersistTo });
  worker.stdout.on("data", (chunk) => {
    workerLog += chunk.toString();
  });
  worker.stderr.on("data", (chunk) => {
    workerLog += chunk.toString();
  });

  await waitForWorker(defaultBaseUrl, Number(process.env.WORKER_READY_TIMEOUT_MS || 45000));
  console.log(`PASS Worker ready at ${defaultBaseUrl}`);

  const commonEnv = {
    SMOKE_BASE_URL: defaultBaseUrl,
    SMOKE_ENV_FILE: defaultEnvPath
  };
  const checks = [
    ["smoke", smokeWorkerScript],
    ["smoke:auth", smokeAuthScript]
  ];

  let failed = false;
  for (const [name, script] of checks) {
    const result = await runNodeScript(script, commonEnv);
    process.stdout.write(result.output);
    if (result.code !== 0) {
      failed = true;
      console.error(`FAIL ${name} exited ${result.code}`);
    } else {
      console.log(`PASS ${name}`);
    }
  }

  if (failed) {
    console.error("Worker log tail:");
    console.error(sanitizeLog(workerLog));
    process.exitCode = 1;
  }
} catch (error) {
  console.error(`FAIL ${error.message}`);
  if (workerLog) {
    console.error("Worker log tail:");
    console.error(sanitizeLog(workerLog));
  }
  process.exitCode = 1;
} finally {
  const stopResult = await stopProcessTree(worker, { label: "smoke Worker" });
  if (!stopResult.ok) {
    console.warn(`WARNING smoke Worker pid ${stopResult.pid} did not close cleanly`);
  }
  console.log("Local Worker stopped.");
}

process.chdir(rootDir);
