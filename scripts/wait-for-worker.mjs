import { defaultBaseUrl, waitForWorker } from "./local-worker-utils.mjs";

try {
  const status = await waitForWorker(
    defaultBaseUrl,
    Number(process.env.WORKER_READY_TIMEOUT_MS || 30000)
  );
  console.log(`PASS Worker ready at ${defaultBaseUrl} via /api/me status ${status}`);
} catch (error) {
  console.error(`FAIL ${error.message}`);
  process.exit(1);
}
