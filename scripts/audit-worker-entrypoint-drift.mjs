import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import prettier from "prettier";

const root = process.cwd();
const sourcePath = path.join(root, "deploy-worker", "src", "index.js");
const embeddedPath = path.join(root, "deploy-worker", "src", "index.embedded.js");
const outputPath = path.join(root, "WORKER_ENTRYPOINT_DRIFT_AUDIT.md");

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function sha256(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function extractRoutes(source) {
  const routes = new Set();
  const literal = /["`]((?:\/auth|\/api)\/[^"`\s?]+)["`]/g;
  for (const match of source.matchAll(literal)) {
    routes.add(match[1]);
  }
  return [...routes].sort();
}

function hasAny(source, patterns) {
  return patterns.some((pattern) =>
    pattern instanceof RegExp ? pattern.test(source) : source.includes(pattern)
  );
}

const criticalItems = [
  {
    item: "/api/staging/handover/commit",
    patterns: ["/api/staging/handover/commit"],
    risk: "P0/P1",
    recommendation:
      "Embedded deploy path must not be used for staging handover validation unless this route is present."
  },
  {
    item: "ENABLE_HANDOVER_ATOMIC_STAGING guard",
    patterns: ["ENABLE_HANDOVER_ATOMIC_STAGING"],
    risk: "P0/P1",
    recommendation:
      "Feature-flag guard must match source before any staging endpoint can be deployed through embedded artifact."
  },
  {
    item: "APP_ENV production disabled guard",
    patterns: ["HSC_ALLOWED_APP_ENVS", "APP_ENV"],
    risk: "P0/P1",
    recommendation: "Production-disabled behavior must exist in any deployable artifact."
  },
  {
    item: "handover staging tables",
    patterns: ["handover_commits", "handover_commit_rows", "handover_idempotency_keys"],
    risk: "P0/P1",
    recommendation:
      "Staging commit persistence must only be considered validated if table references match source behavior."
  },
  {
    item: "handover staging audit evidence",
    patterns: ["handover_audit_events", "entry_events", "audit_logs"],
    risk: "P1",
    recommendation: "Audit evidence paths must exist in the deployed artifact."
  },
  {
    item: "/api/delete_session",
    patterns: ["/api/delete_session"],
    risk: "P0",
    recommendation: "Delete session route must be present only with void/soft-delete behavior."
  },
  {
    item: "delete_session void behavior",
    patterns: ["voided_at", "void_reason", "void_source", "already_voided"],
    risk: "P0",
    recommendation:
      "Embedded artifact must preserve P0-004 void behavior; hard delete must not reappear."
  },
  {
    item: "/api/me",
    patterns: ["/api/me"],
    risk: "P1",
    recommendation: "Identity route must match source auth semantics."
  },
  {
    item: "/api/history",
    patterns: ["/api/history"],
    risk: "P1",
    recommendation: "History route drift can make owner history validation differ from deployment."
  },
  {
    item: "owner auth routes",
    patterns: ["/auth/login", "/auth/logout"],
    risk: "P1",
    recommendation: "Owner auth route drift blocks credible deployment validation."
  },
  {
    item: "employee auth routes",
    patterns: ["/auth/employee-login"],
    risk: "P1",
    recommendation: "Employee auth route drift blocks credible employee flow validation."
  },
  {
    item: "Bearer token auth compatibility",
    patterns: ["Authorization", "Bearer"],
    risk: "P1",
    recommendation: "Auth smoke behavior must remain consistent across entrypoints."
  },
  {
    item: "runtime schema compatibility",
    patterns: ["CREATE TABLE IF NOT EXISTS", "ALTER TABLE", "empEnsureSchema"],
    risk: "P1",
    recommendation:
      "Runtime DDL remains a P1 risk, but source and embedded artifacts must at least match until migration discipline removes it."
  }
];

const source = read(sourcePath);
const embedded = read(embeddedPath);
const sourceRoutes = extractRoutes(source);
const embeddedRoutes = extractRoutes(embedded);
const routeUnion = [...new Set([...sourceRoutes, ...embeddedRoutes])].sort();

const criticalRows = criticalItems.map((check) => {
  const inSource = hasAny(source, check.patterns);
  const inEmbedded = hasAny(embedded, check.patterns);
  return {
    item: check.item,
    source: inSource,
    embedded: inEmbedded,
    match: inSource === inEmbedded,
    risk: check.risk,
    recommendation: check.recommendation
  };
});

const routeRows = routeUnion.map((route) => {
  const inSource = sourceRoutes.includes(route);
  const inEmbedded = embeddedRoutes.includes(route);
  return {
    item: route,
    source: inSource,
    embedded: inEmbedded,
    match: inSource === inEmbedded,
    risk:
      route === "/api/staging/handover/commit" ? "P0/P1" : inSource !== inEmbedded ? "P1" : "P3",
    recommendation:
      inSource === inEmbedded
        ? "No route drift detected."
        : "Regenerate or review embedded artifact before deploy through embedded config."
  };
});

const criticalMismatches = criticalRows.filter((row) => !row.match);
const routeMismatches = routeRows.filter((row) => !row.match);
const stagingRouteMissing = criticalRows.some(
  (row) => row.item === "/api/staging/handover/commit" && row.source && !row.embedded
);

function yesNo(value) {
  return value ? "Yes" : "No";
}

function table(rows) {
  return [
    "| Item | Source Worker | Embedded Worker | Match | Risk | Recommendation |",
    "| --- | --- | --- | --- | --- | --- |",
    ...rows.map(
      (row) =>
        `| \`${row.item}\` | ${yesNo(row.source)} | ${yesNo(row.embedded)} | ${yesNo(row.match)} | ${row.risk} | ${row.recommendation} |`
    )
  ].join("\n");
}

const markdown = await prettier.format(
  [
    "# Worker Entrypoint Drift Audit",
    "",
    "Scope: P1-006 controlled embedded Worker drift review. This script is read-only and does not overwrite deploy artifacts.",
    "",
    "## Entrypoints",
    "",
    `- Source Worker: \`${path.relative(root, sourcePath)}\``,
    `- Embedded Worker artifact: \`${path.relative(root, embeddedPath)}\``,
    `- Source SHA-256: \`${sha256(source)}\``,
    `- Embedded SHA-256: \`${sha256(embedded)}\``,
    `- Source API/auth route literals found: ${sourceRoutes.length}`,
    `- Embedded API/auth route literals found: ${embeddedRoutes.length}`,
    "",
    "## Critical Behavior Comparison",
    "",
    table(criticalRows),
    "",
    "## Route Drift Comparison",
    "",
    table(routeRows),
    "",
    "## Deployment Risk",
    "",
    `- Critical behavior mismatches: ${criticalMismatches.length}`,
    `- Route mismatches: ${routeMismatches.length}`,
    `- Staging handover route missing from embedded: ${yesNo(stagingRouteMissing)}`,
    `- Staging deploy using embedded artifact: ${stagingRouteMissing ? "NO-GO" : "Needs entrypoint confirmation"}`,
    `- Production deploy using embedded artifact: ${criticalMismatches.length ? "NO-GO until drift is resolved or embedded is proven unused" : "Needs standard deploy gate"}`,
    "- Source `wrangler.toml` path remains the local verification target; embedded deploy path needs separate approval.",
    "",
    "## Recommendation",
    "",
    "1. Do not deploy through `wrangler.embedded.toml` while critical mismatches remain.",
    "2. Keep local/staging validation on `deploy-worker/src/index.js` unless a controlled embedded write is approved.",
    "3. Run `npm run verify:embedded-worker` and `npm run build:embedded:dry-run` before any deploy-prep decision.",
    "4. Treat this as a deployment-artifact gate, not as production deployment approval.",
    ""
  ].join("\n"),
  { parser: "markdown" }
);

fs.writeFileSync(outputPath, markdown);

console.log(`WORKER_DRIFT_CRITICAL_MISMATCHES=${criticalMismatches.length}`);
console.log(`WORKER_DRIFT_ROUTE_MISMATCHES=${routeMismatches.length}`);
console.log(`WORKER_DRIFT_STAGING_HANDOVER_MISSING=${stagingRouteMissing ? "yes" : "no"}`);
console.log(`WORKER_DRIFT_REPORT=${path.relative(root, outputPath)}`);
