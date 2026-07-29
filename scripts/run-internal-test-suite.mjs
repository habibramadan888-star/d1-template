import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  readDevVars,
  rootDir,
  startWorker,
  stopProcessTree,
  waitForWorker,
  workerDir
} from "./local-worker-utils.mjs";

const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
const port = Number(process.env.INTERNAL_TEST_PORT || 8787);
const baseUrl = process.env.INTERNAL_TEST_BASE_URL || `http://127.0.0.1:${port}`;
const persistTo =
  process.env.INTERNAL_TEST_PERSIST_TO ||
  path.join(workerDir, ".wrangler", `internal-test-${Date.now()}`);
const startedAt = new Date().toISOString();
const commit = spawnSync("git", ["rev-parse", "--short", "HEAD"], {
  cwd: rootDir,
  encoding: "utf8"
}).stdout.trim();

function runCommand(label, args, extraEnv = {}) {
  const started = Date.now();
  const result = spawnSync(npmCmd, args, {
    cwd: rootDir,
    env: { ...process.env, ...extraEnv },
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024
  });
  const output = `${result.stdout || ""}${result.stderr || ""}`;
  process.stdout.write(output);
  return {
    label,
    command: `npm ${args.join(" ")}`,
    exitCode: result.status,
    passed: result.status === 0,
    durationMs: Date.now() - started,
    outputTail: output.slice(-5000)
  };
}

function readJson(relativePath) {
  const file = path.join(rootDir, relativePath);
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function metricRow(label, report) {
  if (!report) return `| ${label} | n/a | n/a | n/a | n/a | missing report |`;
  return `| ${label} | ${report.qps ?? "n/a"} | ${report.p99 ?? "n/a"}ms | ${
    report.errors ?? "n/a"
  } | ${report.non2xx ?? "n/a"} | ${report.totalRequests ?? "n/a"} |`;
}

function buildSummary(results, workerStarted) {
  const readReport = readJson("load-test-report.json");
  const writeReport = readJson("load-test-write-report.json");
  const mixedReport = readJson("load-test-mixed-report.json");
  const failed = results.filter((item) => !item.passed);
  const commandRows = results
    .map(
      (item) =>
        `| ${item.label} | ${item.passed ? "PASS" : "FAIL"} | ${item.exitCode} | ${Math.round(
          item.durationMs / 1000
        )}s |`
    )
    .join("\n");
  const failureDetails = failed.length
    ? failed
        .map((item) => `### ${item.label}\n\n\`\`\`text\n${item.outputTail}\n\`\`\``)
        .join("\n\n")
    : "None.";

  return `# Internal Test Summary Report

Generated: ${new Date().toISOString()}

## Environment

- Test start: ${startedAt}
- Worker version: commit ${commit || "unknown"}
- Run mode: local wrangler dev (${workerStarted ? baseUrl : "worker did not start"})
- Phase0 route wiring: enabled for local test run

## Command Results

| Check | Status | Exit Code | Duration |
| --- | --- | ---: | ---: |
${commandRows}

## Functional Tests

- E2E command: ${results.find((item) => item.label === "E2E")?.passed ? "PASS" : "FAIL"}
- Regression command: ${
    results.find((item) => item.label === "Regression")?.passed ? "PASS" : "FAIL"
  }

## Load Test Results

| Test | QPS | p99 | errors | non2xx | totalRequests |
| --- | ---: | ---: | ---: | ---: | ---: |
${metricRow("Read loadtest", readReport)}
${metricRow("Write loadtest", writeReport)}
${metricRow("Mixed loadtest", mixedReport)}

## Failure Details

${failureDetails}

## Overall Conclusion

${failed.length ? "Blocking issues remain. See Failure Details." : "All executed checks passed."}
`;
}

async function main() {
  const env = readDevVars();
  const commonEnv = {
    TEST_BASE_URL: baseUrl,
    SMOKE_BASE_URL: baseUrl,
    TEST_ENV_FILE: path.join(workerDir, ".dev.vars"),
    SMOKE_ENV_FILE: path.join(workerDir, ".dev.vars"),
    LOADTEST_URL: `${baseUrl}/api/me`,
    LOADTEST_LOGIN_PASSWORD: env.LOCAL_MANAGER_PASSWORD,
    LOADTEST_WRITE_URL: `${baseUrl}/api/rent_config`,
    LOADTEST_WRITE_LOGIN_PASSWORD: env.LOCAL_MANAGER_PASSWORD,
    LOADTEST_MIXED_BASE_URL: baseUrl,
    LOADTEST_MIXED_LOGIN_PASSWORD: env.LOCAL_MANAGER_PASSWORD
  };

  const results = [];
  results.push(runCommand("Unit", ["run", "test"]));

  let worker;
  let workerStarted = false;
  let stdout = "";
  let stderr = "";
  try {
    worker = startWorker({
      port,
      persistTo,
      vars: {
        ENABLE_PHASE0_ROUTE_WIRING: "true"
      }
    });
    worker.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    worker.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    await waitForWorker(baseUrl, 45000, {
      child: worker,
      stdout,
      stderr,
      port,
      label: "internal-test-suite"
    });
    workerStarted = true;

    results.push(runCommand("E2E", ["run", "test:e2e"], commonEnv));
    results.push(runCommand("Regression", ["run", "test:regression"], commonEnv));
    results.push(runCommand("Read loadtest", ["run", "loadtest"], commonEnv));
    results.push(
      runCommand("Write loadtest", ["run", "loadtest:write"], {
        ...commonEnv,
        LOADTEST_WRITE_CONNECTIONS: process.env.LOADTEST_WRITE_CONNECTIONS || "1",
        LOADTEST_WRITE_DURATION: process.env.LOADTEST_WRITE_DURATION || "1",
        LOADTEST_WRITE_AMOUNT: process.env.LOADTEST_WRITE_AMOUNT || "10"
      })
    );
    results.push(runCommand("Mixed loadtest", ["run", "loadtest:mixed"], commonEnv));
  } catch (error) {
    results.push({
      label: "Worker startup",
      command: "wrangler dev",
      exitCode: 1,
      passed: false,
      durationMs: 0,
      outputTail: `${error?.message || error}\nSTDOUT:\n${stdout.slice(-3000)}\nSTDERR:\n${stderr.slice(-3000)}`
    });
  } finally {
    await stopProcessTree(worker, { label: "internal test Worker" });
  }

  const summary = buildSummary(results, workerStarted);
  writeFileSync(path.join(rootDir, "test-summary-report.md"), summary);
  writeFileSync(
    path.join(rootDir, "test-run-results.json"),
    `${JSON.stringify({ startedAt, finishedAt: new Date().toISOString(), commit, baseUrl, results }, null, 2)}\n`
  );

  console.log(`Internal test summary written: ${path.join(rootDir, "test-summary-report.md")}`);
  if (results.some((item) => !item.passed)) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
