#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import prettier from "prettier";

const inventoryPath = path.resolve("API_INVENTORY.md");
const workerPath = path.resolve("deploy-worker/src/index.js");

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function splitMarkdownRow(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function parseInventory(markdown) {
  return markdown
    .split(/\r?\n/)
    .filter((line) => /^\|\s*(GET|POST|ANY)\s*\|/.test(line))
    .map((line) => {
      const cells = splitMarkdownRow(line);
      return {
        method: cells[0],
        path: cells[1]?.replace(/`/g, "") || "",
        purpose: cells[2] || "",
        login: cells[3] || "",
        roles: cells[4] || "",
        tenantScope: cells[5] || "",
        reads: cells[6] || "",
        writes: cells[7] || "",
        financial: cells[8] || "",
        audit: cells[10] || "",
        risk: cells[11] || "",
        notes: cells[12] || ""
      };
    });
}

function hasRoute(source, route) {
  return source.includes(`"${route}"`) || source.includes(`'${route}'`) || source.includes(route);
}

function classifyEnforcement(route, source) {
  const evidence = [];
  const warnings = [];

  if (route.login === "No") {
    evidence.push("public route by inventory");
  } else if (
    source.includes('path.startsWith("/api/")') &&
    source.includes("requireAuth(request, env)")
  ) {
    evidence.push("global /api requireAuth gate");
  } else {
    warnings.push("auth gate not statically proven");
  }

  if (/owner|manager/i.test(route.roles)) {
    if (source.includes("requireManager(user)") || source.includes('user.role !== "manager"')) {
      evidence.push("manager guard present in Worker source");
    } else {
      warnings.push("owner/manager guard not statically proven");
    }
  }

  if (/employee|staff/i.test(route.roles)) {
    if (
      source.includes("handleEmployeeApi") ||
      source.includes("HSC_EMPLOYEE_ROLES") ||
      source.includes("EEA_EMPLOYEE_ROLES") ||
      source.includes("allowStaffApi")
    ) {
      evidence.push("employee/staff guard or allowlist present");
    } else {
      warnings.push("employee/staff scope not statically proven");
    }
  }

  if (route.path.includes("/staging/")) {
    if (
      source.includes("ENABLE_HANDOVER_ATOMIC_STAGING") ||
      source.includes("ENABLE_EMPLOYEE_ENTRY_ADAPTER_STAGING")
    ) {
      evidence.push("staging feature flag guard present");
    } else {
      warnings.push("staging feature flag not statically proven");
    }
    if (source.includes('appEnv==="production")return {ok:false,status:404')) {
      evidence.push("production 404 guard present for staging route family");
    } else {
      warnings.push("production disabled behavior not statically proven");
    }
  }

  if (route.method === "ANY") {
    warnings.push("route accepts ANY method in source inventory");
  }

  if (/financial|Yes/i.test(route.financial) && route.audit === "No") {
    warnings.push("financial route lacks direct audit evidence in inventory");
  }

  if (
    /corpid/i.test(route.tenantScope) &&
    !/tenant_id|company_id|property_id/i.test(route.tenantScope)
  ) {
    warnings.push("tenant scope remains deployment corpid based");
  }

  if (!hasRoute(source, route.path)) {
    warnings.push("route path not found in Worker source");
  }

  return { evidence, warnings };
}

const inventory = read(inventoryPath);
const source = read(workerPath);
const routes = parseInventory(inventory);

const audited = routes.map((route) => {
  const { evidence, warnings } = classifyEnforcement(route, source);
  const status = warnings.length ? "MANUAL_REVIEW" : "STATIC_OK";
  return { ...route, evidence, warnings, status };
});

const summary = {
  total: audited.length,
  publicRoutes: audited.filter((route) => route.login === "No").length,
  authRoutes: audited.filter((route) => route.login !== "No").length,
  financialRoutes: audited.filter((route) => /Yes/i.test(route.financial)).length,
  stagingRoutes: audited.filter((route) => route.path.includes("/staging/")).length,
  anyMethodRoutes: audited.filter((route) => route.method === "ANY").length,
  manualReview: audited.filter((route) => route.status === "MANUAL_REVIEW").length
};

const matrix = [
  "# API Permission Matrix",
  "",
  `Generated: ${new Date().toISOString()}`,
  "",
  "Scope: static API-by-API permission audit. This script is read-only and does not call APIs, deploy, migrate, or modify Worker routes.",
  "",
  "| Method | Path | Login | Roles | Tenant Scope | Financial | Enforcement Evidence | Warnings | Status |",
  "| --- | --- | --- | --- | --- | --- | --- | --- | --- |",
  ...audited.map((route) =>
    [
      "|",
      route.method,
      `\`${route.path}\``,
      route.login,
      route.roles,
      route.tenantScope,
      route.financial,
      route.evidence.join("<br>") || "none",
      route.warnings.join("<br>") || "none",
      route.status,
      "|"
    ].join(" | ")
  ),
  "",
  "## Manual Review Focus",
  "",
  ...audited
    .filter((route) => route.status === "MANUAL_REVIEW")
    .map((route) => `- \`${route.method} ${route.path}\`: ${route.warnings.join("; ")}`)
];

const result = [
  "# API Permission Audit Result",
  "",
  `Generated: ${new Date().toISOString()}`,
  "",
  "| Metric | Count |",
  "| --- | ---: |",
  `| Total routes | ${summary.total} |`,
  `| Public routes | ${summary.publicRoutes} |`,
  `| Auth-required routes | ${summary.authRoutes} |`,
  `| Financial routes | ${summary.financialRoutes} |`,
  `| Staging-only routes | ${summary.stagingRoutes} |`,
  `| ANY-method routes | ${summary.anyMethodRoutes} |`,
  `| Manual review routes | ${summary.manualReview} |`,
  "",
  "Overall: `MANUAL_REQUIRED`",
  "",
  "Reasons:",
  "",
  "- Static route evidence cannot replace authenticated runtime role tests.",
  "- Tenant scope remains `corpid` based for many routes.",
  "- Financial routes still require P0-001/P0-003/P0-006/P0-008 completion before commercial launch.",
  "- `ANY` method routes need method discipline review.",
  "",
  "No production deploy, migration, remote D1 access, or secret access was performed."
];

fs.writeFileSync(
  path.resolve("API_PERMISSION_MATRIX.md"),
  await prettier.format(`${matrix.join("\n")}\n`, { parser: "markdown" })
);
fs.writeFileSync(
  path.resolve("API_PERMISSION_AUDIT_RESULT.md"),
  await prettier.format(`${result.join("\n")}\n`, { parser: "markdown" })
);

console.log("API_PERMISSION_AUDIT=MANUAL_REQUIRED");
console.log(`API_PERMISSION_ROUTES=${summary.total}`);
console.log(`API_PERMISSION_MANUAL_REVIEW=${summary.manualReview}`);
