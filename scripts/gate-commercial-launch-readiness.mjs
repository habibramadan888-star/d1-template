#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import prettier from "prettier";

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function hasAll(text, terms) {
  const lower = text.toLowerCase();
  return terms.every((term) => lower.includes(term.toLowerCase()));
}

const checks = [
  {
    area: "P0-007 Worker/auth smoke",
    evidence: ["P0_P1_STATUS_REVIEW.md", "RUN_REPORT.md"],
    required: ["P0-007", "Verified", "smoke:with-worker"],
    productionGate: "GO for regression only"
  },
  {
    area: "P0-004 delete_session void",
    evidence: ["P0_P1_STATUS_REVIEW.md", "RUN_REPORT.md"],
    required: ["P0-004", "Verified", "test:delete-session"],
    productionGate: "GO for regression only"
  },
  {
    area: "P0-005 clean D1 bootstrap",
    evidence: ["P0_P1_STATUS_REVIEW.md", "RUN_REPORT.md"],
    required: ["P0-005", "Verified", "verify:clean-d1"],
    productionGate: "GO for regression only"
  },
  {
    area: "P0-001 money precision",
    evidence: [
      "MONEY_RECONCILIATION_GATE_RESULT.md",
      "MONEY_AUDIT_TRIAGE.md",
      "P0_P1_STATUS_REVIEW.md"
    ],
    required: ["P0-001", "Partial", "MANUAL_REQUIRED"],
    productionGate: "NO-GO"
  },
  {
    area: "P0-002 handover atomic",
    evidence: ["P0_P1_STATUS_REVIEW.md", "HANDOVER_STAGING_ENDPOINT_REHEARSAL_RESULT.md"],
    required: ["P0-002", "Partial", "staging"],
    productionGate: "NO-GO"
  },
  {
    area: "P0-003 backend totals authority",
    evidence: [
      "P0_003C_BACKEND_TOTALS_LIVE_AUTHORITY_GATE.md",
      "BACKEND_TOTALS_LIVE_AUTHORITY_GATE_RESULT.md"
    ],
    required: ["MANUAL_REQUIRED", "dashboard", "receivables"],
    productionGate: "NO-GO"
  },
  {
    area: "P0-006 tenant/property scope",
    evidence: [
      "P0_006B_TENANT_PROPERTY_SCOPE_READINESS_GATE.md",
      "TENANT_SCOPE_READINESS_GATE_RESULT.md"
    ],
    required: ["MANUAL_REQUIRED", "corpid", "tenant"],
    productionGate: "NO-GO"
  },
  {
    area: "P0-008 receivables",
    evidence: [
      "P0_008B_RECEIVABLES_IMPLEMENTATION_READINESS_GATE.md",
      "RECEIVABLES_READINESS_GATE_RESULT.md"
    ],
    required: ["MANUAL_REQUIRED", "receivables"],
    productionGate: "NO-GO"
  },
  {
    area: "Real staging QA inputs",
    evidence: ["P0_001L_STAGING_ENVIRONMENT_PREFLIGHT.md", "STAGING_QA_MANUAL_REQUIRED.md"],
    required: ["MANUAL_REQUIRED", "staging", "backup", "rollback"],
    productionGate: "NO-GO"
  },
  {
    area: "Environment separation",
    evidence: [
      "ENVIRONMENT_SEPARATION_HARDENING_REVIEW.md",
      "ENVIRONMENT_SEPARATION_AUDIT_RESULT.md"
    ],
    required: ["MANUAL_REQUIRED", "D1", "KV", "APP_ENV"],
    productionGate: "NO-GO"
  },
  {
    area: "Runtime DDL removal",
    evidence: ["P1_002B_RUNTIME_DDL_REMOVAL_READINESS.md", "RUNTIME_DDL_REMOVAL_GATE_RESULT.md"],
    required: ["MANUAL_REQUIRED", "runtime DDL"],
    productionGate: "NO-GO"
  },
  {
    area: "Observability",
    evidence: ["OBSERVABILITY_AND_ERROR_MONITORING_PLAN.md", "OBSERVABILITY_READINESS_RESULT.md"],
    required: ["MANUAL_REQUIRED", "alert", "redaction"],
    productionGate: "NO-GO"
  },
  {
    area: "API permission matrix",
    evidence: ["API_PERMISSION_AUDIT_RESULT.md", "API_PERMISSION_MATRIX.md"],
    required: ["MANUAL_REQUIRED", "29", "25"],
    productionGate: "NO-GO"
  },
  {
    area: "DB table readiness",
    evidence: ["DB_TABLE_READINESS_AUDIT_RESULT.md", "DB_TABLE_COMMERCIAL_READINESS_MATRIX.md"],
    required: ["MANUAL_REQUIRED", "22", "10"],
    productionGate: "NO-GO"
  },
  {
    area: "Audit log coverage",
    evidence: ["AUDIT_LOG_COVERAGE_RESULT.md", "AUDIT_LOG_COVERAGE_MATRIX.md"],
    required: ["MANUAL_REQUIRED", "22", "11"],
    productionGate: "NO-GO"
  },
  {
    area: "Rollback readiness",
    evidence: [
      "ROLLBACK_READINESS_AUDIT_RESULT.md",
      "ROLLBACK_READINESS_MATRIX.md",
      "BLOCKER_REPORT.md"
    ],
    required: ["MANUAL_REQUIRED", "BLOCKED", "MONEY_DUAL_WRITE_READINESS_GATE.md"],
    productionGate: "NO-GO"
  },
  {
    area: "Secret hygiene",
    evidence: ["VERIFICATION_STATUS.md", "RUN_REPORT.md"],
    required: ["security:secrets", "PASS"],
    productionGate: "GO for preflight only"
  }
];

const rows = checks.map((check) => {
  const missingFiles = check.evidence.filter((file) => !fs.existsSync(file));
  const text = check.evidence.map(read).join("\n");
  const termsPresent = hasAll(text, check.required);
  const result = missingFiles.length
    ? "BLOCKED"
    : termsPresent && check.productionGate.startsWith("NO-GO")
      ? "NO_GO_CONFIRMED"
      : termsPresent
        ? "STATIC_OK"
        : "MANUAL_REQUIRED";
  return {
    ...check,
    missingFiles,
    result,
    missingTerms: check.required.filter((term) => !text.toLowerCase().includes(term.toLowerCase()))
  };
});

const summary = {
  total: rows.length,
  staticOk: rows.filter((row) => row.result === "STATIC_OK").length,
  noGo: rows.filter((row) => row.result === "NO_GO_CONFIRMED").length,
  manual: rows.filter((row) => row.result === "MANUAL_REQUIRED").length,
  blocked: rows.filter((row) => row.result === "BLOCKED").length
};

const matrix = [
  "# Commercial Launch Readiness Matrix",
  "",
  `Generated: ${new Date().toISOString()}`,
  "",
  "Scope: read-only commercial launch gate. This script reads reports only and does not deploy, migrate, call APIs, access D1, or read secrets.",
  "",
  "| Area | Evidence | Required Markers | Missing | Result | Production Gate |",
  "| --- | --- | --- | --- | --- | --- |",
  ...rows.map((row) => {
    const missing = [...row.missingFiles, ...row.missingTerms.map((term) => `term:${term}`)];
    return `| ${row.area} | ${row.evidence.map((file) => `\`${file}\``).join("<br>")} | ${row.required.map((term) => `\`${term}\``).join(", ")} | ${missing.join("<br>") || "none"} | ${row.result} | ${row.productionGate} |`;
  }),
  "",
  "## Gate Conclusion",
  "",
  "- Local development and regression testing may continue.",
  "- Real staging QA is `MANUAL_REQUIRED` until target resources, accounts, backup, rollback, and feature flags are provided.",
  "- Production cutover is `NO-GO` because multiple P0/P1 launch gates remain incomplete.",
  "- This matrix is not deployment approval."
];

const result = [
  "# Commercial Launch Readiness Result",
  "",
  `Generated: ${new Date().toISOString()}`,
  "",
  "| Metric | Count |",
  "| --- | ---: |",
  `| Areas reviewed | ${summary.total} |`,
  `| STATIC_OK areas | ${summary.staticOk} |`,
  `| NO_GO_CONFIRMED areas | ${summary.noGo} |`,
  `| MANUAL_REQUIRED areas | ${summary.manual} |`,
  `| BLOCKED areas | ${summary.blocked} |`,
  "",
  "Overall: `PRODUCTION_NO_GO`",
  "",
  "Allowed next work: local/staging dry-run validation, manual QA preparation, and read-only audit expansion.",
  "",
  "Forbidden next work without human approval: production deploy, staging deploy, remote/production D1 migration, production feature flag enablement, and live accounting authority switch."
];

fs.writeFileSync(
  path.resolve("COMMERCIAL_LAUNCH_READINESS_MATRIX.md"),
  await prettier.format(`${matrix.join("\n")}\n`, { parser: "markdown" })
);
fs.writeFileSync(
  path.resolve("COMMERCIAL_LAUNCH_READINESS_RESULT.md"),
  await prettier.format(`${result.join("\n")}\n`, { parser: "markdown" })
);

console.log("COMMERCIAL_LAUNCH_READINESS=PRODUCTION_NO_GO");
console.log(`COMMERCIAL_LAUNCH_AREAS=${summary.total}`);
console.log(`COMMERCIAL_LAUNCH_NO_GO=${summary.noGo}`);
console.log(`COMMERCIAL_LAUNCH_MANUAL_REQUIRED=${summary.manual}`);
console.log(`COMMERCIAL_LAUNCH_BLOCKED=${summary.blocked}`);
