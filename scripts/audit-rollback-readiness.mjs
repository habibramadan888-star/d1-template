#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import prettier from "prettier";

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

const checks = [
  {
    area: "Employee entry adapter route switch",
    evidenceFiles: [
      "EMPLOYEE_ENTRY_ROUTE_SWITCH_ROLLBACK_RESULT.md",
      "EMPLOYEE_ENTRY_ROLLBACK_DRILL_RESULT.md",
      "P0_001K_CUTOVER_READINESS_CHECKLIST.md"
    ],
    requiredTerms: ["rollback", "ENABLE_EMPLOYEE_ENTRY_ADAPTER_LIVE_ROUTE", "legacy"],
    risk: "P0-001"
  },
  {
    area: "Handover staging endpoint",
    evidenceFiles: [
      "HANDOVER_ATOMIC_GO_LIVE_GATE.md",
      "HANDOVER_STAGING_ENDPOINT_IMPLEMENTATION.md",
      "P0_002D_GO_NO_GO_REVIEW.md"
    ],
    requiredTerms: ["rollback", "feature flag", "production"],
    risk: "P0-002"
  },
  {
    area: "Backend totals live authority",
    evidenceFiles: [
      "BACKEND_TOTALS_AUTHORITY_GATE.md",
      "P0_003C_BACKEND_TOTALS_LIVE_AUTHORITY_GATE.md"
    ],
    requiredTerms: ["rollback", "staging", "dashboard"],
    risk: "P0-003"
  },
  {
    area: "Money minor-unit migration/backfill",
    evidenceFiles: [
      "MONEY_DUAL_WRITE_READINESS_GATE.md",
      "MONEY_RECONCILIATION_GATE.md",
      "P0_001D_GO_NO_GO_CHECKLIST.md"
    ],
    requiredTerms: ["rollback", "reconciliation", "production"],
    risk: "P0-001"
  },
  {
    area: "Runtime DDL removal",
    evidenceFiles: [
      "RUNTIME_DDL_MIGRATION_PLAN.md",
      "P1_002B_RUNTIME_DDL_REMOVAL_READINESS.md",
      "NEXT_PROMPT_P1_002C_RUNTIME_DDL_CONTROLLED_REMOVAL.md"
    ],
    requiredTerms: ["rollback", "migration", "production"],
    risk: "P1-002"
  },
  {
    area: "Embedded Worker artifact",
    evidenceFiles: [
      "EMBEDDED_WORKER_CONTROLLED_WRITE_PLAN.md",
      "DEPLOY_ARTIFACT_GO_NO_GO_GATE.md",
      "WORKER_DRIFT_CI_GATE_PLAN.md"
    ],
    requiredTerms: ["rollback", "dry-run", "deploy"],
    risk: "P1-006"
  },
  {
    area: "Receivables implementation",
    evidenceFiles: [
      "RECEIVABLES_MODEL_DESIGN.md",
      "P0_008B_RECEIVABLES_IMPLEMENTATION_READINESS_GATE.md",
      "NEXT_PROMPT_P0_008C_RECEIVABLES_LOCAL_STAGING_REHEARSAL.md"
    ],
    requiredTerms: ["rollback", "migration", "staging"],
    risk: "P0-008"
  },
  {
    area: "Tenant/property scope",
    evidenceFiles: [
      "TENANCY_MIGRATION_PLAN.md",
      "P0_006B_TENANT_PROPERTY_SCOPE_READINESS_GATE.md",
      "NEXT_PROMPT_P0_006C_TENANT_SCOPE_LOCAL_STAGING_REHEARSAL.md"
    ],
    requiredTerms: ["rollback", "migration", "tenant"],
    risk: "P0-006"
  },
  {
    area: "Production deployment",
    evidenceFiles: [
      "PRODUCTION_DEPLOYMENT_SAFETY_CHECKLIST.md",
      "ENVIRONMENT_SEPARATION_HARDENING_REVIEW.md",
      "P0_001L_PRODUCTION_CUTOVER_NO_GO_REVIEW.md"
    ],
    requiredTerms: ["rollback", "backup", "production"],
    risk: "P1-010"
  },
  {
    area: "Observability and incident response",
    evidenceFiles: [
      "OBSERVABILITY_AND_ERROR_MONITORING_PLAN.md",
      "OBSERVABILITY_GO_NO_GO_CHECKLIST.md"
    ],
    requiredTerms: ["alert", "retention", "redaction"],
    risk: "P1-009"
  }
];

function evaluate(check) {
  const texts = check.evidenceFiles.map((file) => ({ file, text: read(file) }));
  const missingFiles = texts.filter((item) => !item.text).map((item) => item.file);
  const combined = texts
    .map((item) => item.text)
    .join("\n")
    .toLowerCase();
  const missingTerms = check.requiredTerms.filter((term) => !combined.includes(term.toLowerCase()));
  const result =
    missingFiles.length > 0
      ? "BLOCKED"
      : missingTerms.length > 0
        ? "MANUAL_REQUIRED"
        : "READY_DRAFT";
  return { ...check, missingFiles, missingTerms, result };
}

const rows = checks.map(evaluate);
const summary = {
  reviewed: rows.length,
  readyDraft: rows.filter((row) => row.result === "READY_DRAFT").length,
  manual: rows.filter((row) => row.result === "MANUAL_REQUIRED").length,
  blocked: rows.filter((row) => row.result === "BLOCKED").length
};

const matrix = [
  "# Rollback Readiness Matrix",
  "",
  `Generated: ${new Date().toISOString()}`,
  "",
  "Scope: static rollback/readiness audit. This script reads reports only and does not deploy, migrate, call APIs, or access D1.",
  "",
  "| Area | Risk | Evidence Files | Required Terms | Missing | Result |",
  "| --- | --- | --- | --- | --- | --- |",
  ...rows.map((row) => {
    const cells = [
      row.area,
      row.risk,
      row.evidenceFiles.map((file) => `\`${file}\``).join("<br>"),
      row.requiredTerms.map((term) => `\`${term}\``).join(", "),
      [...row.missingFiles, ...row.missingTerms.map((term) => `term:${term}`)].join("<br>") ||
        "none",
      row.result
    ];
    return `| ${cells.join(" | ")} |`;
  }),
  "",
  "## Interpretation",
  "",
  "- `READY_DRAFT` means rollback evidence exists at documentation/checklist level only; it is not production approval.",
  "- `MANUAL_REQUIRED` means rollout/cutover must not proceed until the missing rollback terms are reviewed.",
  "- `BLOCKED` means expected rollback evidence files are missing."
];

const result = [
  "# Rollback Readiness Audit Result",
  "",
  `Generated: ${new Date().toISOString()}`,
  "",
  "| Metric | Count |",
  "| --- | ---: |",
  `| Areas reviewed | ${summary.reviewed} |`,
  `| READY_DRAFT areas | ${summary.readyDraft} |`,
  `| MANUAL_REQUIRED areas | ${summary.manual} |`,
  `| BLOCKED areas | ${summary.blocked} |`,
  "",
  "Overall: `MANUAL_REQUIRED`",
  "",
  "No production deploy, staging deploy, D1 migration, remote D1 access, or secret access was performed."
];

fs.writeFileSync(
  path.resolve("ROLLBACK_READINESS_MATRIX.md"),
  await prettier.format(`${matrix.join("\n")}\n`, { parser: "markdown" })
);
fs.writeFileSync(
  path.resolve("ROLLBACK_READINESS_AUDIT_RESULT.md"),
  await prettier.format(`${result.join("\n")}\n`, { parser: "markdown" })
);

console.log("ROLLBACK_READINESS_AUDIT=MANUAL_REQUIRED");
console.log(`ROLLBACK_READY_DRAFT=${summary.readyDraft}`);
console.log(`ROLLBACK_MANUAL_REQUIRED=${summary.manual}`);
console.log(`ROLLBACK_BLOCKED=${summary.blocked}`);
