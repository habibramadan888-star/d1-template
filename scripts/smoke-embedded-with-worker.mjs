import fs from "node:fs";
import path from "node:path";
import { mkdir, rm, writeFile } from "node:fs/promises";
import prettier from "prettier";
import {
  defaultPersistTo,
  rootDir,
  sanitizeLog,
  startWorker,
  stopProcessTree,
  waitForWorker
} from "./local-worker-utils.mjs";

const reportPath = path.join(rootDir, "EMBEDDED_WORKER_RUNTIME_PROBE_RESULT.md");
const persistTo = path.join(defaultPersistTo, "embedded-smoke");
const workerDir = path.join(rootDir, "deploy-worker");
const baseEmbeddedConfigPath = path.join(workerDir, "wrangler.embedded.toml");
const tempConfigDir = path.join(rootDir, ".tmp", "embedded-worker-configs");

function tomlString(value) {
  return JSON.stringify(String(value));
}

async function createTempConfig(name, vars) {
  await mkdir(tempConfigDir, { recursive: true });
  const safeName = name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  const configPath = path.join(tempConfigDir, `wrangler.embedded.${safeName}.toml`);
  let config = fs.readFileSync(baseEmbeddedConfigPath, "utf8");
  const relativeMain = path.relative(
    tempConfigDir,
    path.join(workerDir, "src", "index.embedded.js")
  );
  config = config.replace(
    /^\s*main\s*=\s*"[^"]+"/m,
    `main = ${tomlString(relativeMain.replace(/\\/g, "/"))}`
  );
  const overrideText = Object.entries(vars)
    .map(([key, value]) => `${key} = ${tomlString(value)}`)
    .join("\n");
  if (/\[vars\]/.test(config)) {
    config = config.replace(/\[vars\]\s*/, `[vars]\n${overrideText}\n`);
  } else {
    config += `\n[vars]\n${overrideText}\n`;
  }
  await writeFile(configPath, config, "utf8");
  return configPath;
}

async function request(baseUrl, pathName, options = {}) {
  const response = await fetch(`${baseUrl}${pathName}`, {
    redirect: "manual",
    ...options,
    headers: {
      "Content-Type": "application/json",
      Origin: baseUrl,
      ...(options.headers || {})
    }
  });
  let body = "";
  try {
    body = await response.text();
  } catch {
    body = "";
  }
  return { status: response.status, body };
}

async function runWorkerProbe({ name, port, vars, checks }) {
  const baseUrl = `http://127.0.0.1:${port}`;
  const configPath = await createTempConfig(name, vars);
  const child = startWorker({
    port,
    persistTo,
    configFile: configPath
  });
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => {
    stdout += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  const rows = [];
  try {
    await waitForWorker(baseUrl, 45000);
    for (const check of checks) {
      const result = await check(baseUrl);
      rows.push(result);
    }
  } finally {
    await stopProcessTree(child, { label: `embedded worker ${name}` });
    await rm(configPath, { force: true });
  }

  return {
    name,
    rows,
    stdout: sanitizeLog(stdout),
    stderr: sanitizeLog(stderr)
  };
}

function expectStatus(label, actual, expected, body = "") {
  const allowed = Array.isArray(expected) ? expected : [expected];
  const pass = allowed.includes(actual);
  return {
    check: label,
    expected: Array.isArray(expected) ? expected.join(" or ") : expected,
    actual: body ? `${actual} ${body.slice(0, 120).replace(/\s+/g, " ")}` : actual,
    result: pass ? "PASS" : "FAIL"
  };
}

const postBody = JSON.stringify({ rows: [], idempotency_key: "embedded-smoke-probe" });

const scenarios = [
  {
    name: "production disabled",
    port: 8803,
    vars: { APP_ENV: "production", ENABLE_HANDOVER_ATOMIC_STAGING: "true" },
    checks: [
      async (baseUrl) => {
        const res = await request(baseUrl, "/api/me");
        return expectStatus("/api/me unauthenticated", res.status, 401, res.body);
      },
      async (baseUrl) => {
        const res = await request(baseUrl, "/api/staging/handover/commit", {
          method: "POST",
          body: postBody
        });
        return expectStatus("staging handover production disabled", res.status, 404, res.body);
      },
      async (baseUrl) => {
        const res = await request(baseUrl, "/api/delete_session", {
          method: "POST",
          body: JSON.stringify({ id: "embedded-smoke-noop" })
        });
        return expectStatus("delete_session route guarded", res.status, [401, 403], res.body);
      }
    ]
  },
  {
    name: "feature flag off",
    port: 8804,
    vars: { APP_ENV: "staging", ENABLE_HANDOVER_ATOMIC_STAGING: "false" },
    checks: [
      async (baseUrl) => {
        const res = await request(baseUrl, "/api/staging/handover/commit", {
          method: "POST",
          body: postBody
        });
        return expectStatus("staging handover feature disabled", res.status, 403, res.body);
      }
    ]
  },
  {
    name: "feature flag on",
    port: 8805,
    vars: { APP_ENV: "staging", ENABLE_HANDOVER_ATOMIC_STAGING: "true" },
    checks: [
      async (baseUrl) => {
        const res = await request(baseUrl, "/api/staging/handover/commit", {
          method: "POST",
          body: postBody
        });
        return expectStatus(
          "staging handover route reachable and auth guarded",
          res.status,
          401,
          res.body
        );
      }
    ]
  }
];

const results = [];
let failed = false;
try {
  for (const scenario of scenarios) {
    const result = await runWorkerProbe(scenario);
    results.push(result);
    if (result.rows.some((row) => row.result !== "PASS")) failed = true;
  }
} catch (error) {
  failed = true;
  results.push({
    name: "probe startup/runtime",
    rows: [
      {
        check: "embedded worker runtime probe",
        expected: "startup and guarded route checks",
        actual: sanitizeLog(error?.message || error),
        result: "FAIL"
      }
    ],
    stdout: "",
    stderr: sanitizeLog(error?.stack || error)
  });
}

const markdown = await prettier.format(
  [
    "# Embedded Worker Runtime Probe Result",
    "",
    "Scope: local-only P1-006B smoke using `deploy-worker/wrangler.embedded.toml`. This is not a deploy and does not use remote D1.",
    "",
    `- Overall result: **${failed ? "FAIL" : "PASS"}**`,
    "",
    "## Checks",
    "",
    "| Scenario | Check | Expected | Actual | Result |",
    "| --- | --- | --- | --- | --- |",
    ...results.flatMap((scenario) =>
      scenario.rows.map(
        (row) =>
          `| ${scenario.name} | ${row.check} | ${row.expected} | ${row.actual} | ${row.result} |`
      )
    ),
    "",
    "## Notes",
    "",
    "- Production mode must return 404 for `/api/staging/handover/commit`.",
    "- Staging/local with feature flag off must return 403 before auth.",
    "- Staging/local with feature flag on must expose the route but still require auth.",
    "- `/api/delete_session` is only probed as unauthenticated 401; no destructive delete is executed.",
    "",
    "## Worker Logs",
    "",
    ...results.flatMap((scenario) => [
      `### ${scenario.name}`,
      "",
      "```text",
      scenario.stderr || scenario.stdout || "No worker log output captured.",
      "```",
      ""
    ]),
    ""
  ].join("\n"),
  { parser: "markdown" }
);

fs.writeFileSync(reportPath, markdown, "utf8");

console.log(`EMBEDDED_WORKER_RUNTIME_PROBE=${failed ? "FAIL" : "PASS"}`);
console.log(`EMBEDDED_WORKER_RUNTIME_PROBE_REPORT=${path.relative(rootDir, reportPath)}`);
if (failed) process.exit(1);
