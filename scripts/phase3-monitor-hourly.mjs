import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const docsDir = path.join(rootDir, "docs");
const jsonPath = path.join(docsDir, "PHASE_3_MONITORING_SAMPLE_RESULT.json");
const markdownPath = path.join(docsDir, "PHASE_3_MONITORING_SAMPLE_RESULT.md");

const thresholds = {
  healthLatencyWarningMs: Number(process.env.PHASE3_HEALTH_LATENCY_WARNING_MS || 200),
  healthLatencyRollbackMs: Number(process.env.PHASE3_HEALTH_LATENCY_ROLLBACK_MS || 300),
  errorRateWarning: Number(process.env.PHASE3_ERROR_RATE_WARNING || 0.001),
  errorRateRollback: Number(process.env.PHASE3_ERROR_RATE_ROLLBACK || 0.01)
};

const endpoints = [
  { id: "worker-health", path: "/api/health", required: true },
  { id: "db-health", path: "/api/health/db", required: true },
  { id: "error-metrics", path: "/api/metrics/errors", required: false }
];

function normalizeBaseUrl(value) {
  if (!value) return null;
  return value.replace(/\/+$/, "");
}

async function fetchEndpoint(baseUrl, endpoint, token) {
  const started = Date.now();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  try {
    const response = await fetch(`${baseUrl}${endpoint.path}`, { headers });
    const bodyText = await response.text();
    let body = null;
    try {
      body = bodyText ? JSON.parse(bodyText) : null;
    } catch {
      body = bodyText.slice(0, 500);
    }

    return {
      ...endpoint,
      status: response.status,
      ok: response.ok,
      latencyMs: Date.now() - started,
      body
    };
  } catch (error) {
    return {
      ...endpoint,
      status: null,
      ok: false,
      latencyMs: Date.now() - started,
      error: error.message
    };
  }
}

function evaluateSample(sample) {
  if (sample.decision === "MANUAL_REQUIRED") {
    return sample;
  }

  const failures = [];
  const warnings = [];

  for (const result of sample.results) {
    if (result.required && !result.ok) {
      failures.push(`${result.id} failed`);
    }
    if (result.latencyMs >= thresholds.healthLatencyRollbackMs) {
      failures.push(`${result.id} latency ${result.latencyMs}ms >= rollback threshold`);
    } else if (result.latencyMs >= thresholds.healthLatencyWarningMs) {
      warnings.push(`${result.id} latency ${result.latencyMs}ms >= warning threshold`);
    }

    const errorRate =
      typeof result.body?.errorRate === "number"
        ? result.body.errorRate
        : typeof result.body?.error_rate === "number"
          ? result.body.error_rate
          : null;
    if (errorRate !== null) {
      if (errorRate >= thresholds.errorRateRollback) {
        failures.push(`${result.id} error rate ${errorRate} >= rollback threshold`);
      } else if (errorRate >= thresholds.errorRateWarning) {
        warnings.push(`${result.id} error rate ${errorRate} >= warning threshold`);
      }
    }
  }

  return {
    ...sample,
    decision: failures.length ? "ROLLBACK_REVIEW_REQUIRED" : warnings.length ? "WARNING" : "PASS",
    warnings,
    failures
  };
}

function toMarkdown(sample) {
  const rows = (sample.results || [])
    .map(
      (result) =>
        `| ${result.id} | ${result.path} | ${result.ok ? "PASS" : "FAIL"} | ${result.status ?? "n/a"} | ${result.latencyMs}ms | ${result.error || ""} |`
    )
    .join("\n");

  return `# Phase 3 Monitoring Sample Result

Generated: ${sample.generatedAt}

Decision: ${sample.decision}

Production status: \`PRODUCTION_NO_GO\`.

## Scope

This script samples a production-copy URL only when \`PHASE3_MONITOR_NETWORK_APPROVED=YES\` and \`PHASE3_PRODUCTION_COPY_BASE_URL\` are set.

## Results

| Check | Path | Result | Status | Latency | Error |
| --- | --- | --- | ---: | ---: | --- |
${rows || "| n/a | n/a | MANUAL_REQUIRED | n/a | n/a | Network sampling was not approved. |"}

## Warnings

${sample.warnings?.length ? sample.warnings.map((warning) => `- ${warning}`).join("\n") : "- None"}

## Failures

${sample.failures?.length ? sample.failures.map((failure) => `- ${failure}`).join("\n") : "- None"}

## Thresholds

| Threshold | Value |
| --- | ---: |
| Health latency warning | ${thresholds.healthLatencyWarningMs}ms |
| Health latency rollback | ${thresholds.healthLatencyRollbackMs}ms |
| Error rate warning | ${thresholds.errorRateWarning} |
| Error rate rollback | ${thresholds.errorRateRollback} |
`;
}

async function main() {
  mkdirSync(docsDir, { recursive: true });

  const baseUrl = normalizeBaseUrl(process.env.PHASE3_PRODUCTION_COPY_BASE_URL);
  const networkApproved = process.env.PHASE3_MONITOR_NETWORK_APPROVED === "YES";
  const token = process.env.PHASE3_MONITOR_BEARER_TOKEN || "";

  let sample = {
    generatedAt: new Date().toISOString(),
    baseUrl: baseUrl || null,
    networkApproved,
    thresholds,
    results: [],
    warnings: [],
    failures: []
  };

  if (!baseUrl || !networkApproved) {
    sample = {
      ...sample,
      decision: "MANUAL_REQUIRED",
      warnings: [
        "Set PHASE3_PRODUCTION_COPY_BASE_URL and PHASE3_MONITOR_NETWORK_APPROVED=YES to sample production-copy."
      ],
      failures: []
    };
  } else {
    const results = [];
    for (const endpoint of endpoints) {
      results.push(await fetchEndpoint(baseUrl, endpoint, token));
    }
    sample = evaluateSample({ ...sample, results });
  }

  writeFileSync(jsonPath, `${JSON.stringify(sample, null, 2)}\n`);
  writeFileSync(markdownPath, toMarkdown(sample));

  console.log(`PHASE3_MONITOR_DECISION=${sample.decision}`);
  console.log(`PHASE3_MONITOR_RESULTS=${path.relative(rootDir, markdownPath)}`);

  if (sample.decision === "ROLLBACK_REVIEW_REQUIRED") {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
