import {
  defaultBaseUrl,
  defaultPort,
  defaultPersistTo,
  sanitizeLog,
  startWorker,
  stopProcessTree
} from "./local-worker-utils.mjs";

const worker = startWorker({ port: defaultPort, persistTo: defaultPersistTo });

console.log(`Starting local Worker at ${defaultBaseUrl}`);
console.log(`Local D1/KV persistence: ${defaultPersistTo}`);
console.log("Press Ctrl+C to stop.");

worker.stdout.on("data", (chunk) => process.stdout.write(sanitizeLog(chunk)));
worker.stderr.on("data", (chunk) => process.stderr.write(sanitizeLog(chunk)));

function stop() {
  void stopProcessTree(worker, { label: "dev Worker" });
}

process.on("SIGINT", stop);
process.on("SIGTERM", stop);

const code = await new Promise((resolve) => worker.on("close", resolve));
process.exitCode = typeof code === "number" ? code : 0;
