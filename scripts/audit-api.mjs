import fs from "node:fs";
import path from "node:path";
import prettier from "prettier";

const root = process.cwd();
const workerPath = path.join(root, "deploy-worker", "src", "index.js");
const inventoryPath = path.join(root, "API_INVENTORY.md");
const source = fs.readFileSync(workerPath, "utf8");
const checkOnly = process.argv.includes("--check");

const routeCatalog = {
  "POST /auth/login": {
    purpose: "owner/staff password login",
    login: "No",
    roles: "public",
    tenantScope: "env `CORPID`",
    reads: "environment credentials",
    writes: "`active_sessions`",
    financial: "No",
    delete: "No",
    audit: "No",
    risk: "P1",
    notes: "Public credential route; production secret management required."
  },
  "POST /auth/employee-login": {
    purpose: "employee PIN login",
    login: "No",
    roles: "public",
    tenantScope: "env `CORPID`",
    reads: "`employee_users`",
    writes: "`active_sessions`",
    financial: "No",
    delete: "No",
    audit: "No",
    risk: "P1",
    notes: "Employee identity is not tenant/property-scoped enough for SaaS."
  },
  "POST /auth/confirm-manager": {
    purpose: "confirm manager credential",
    login: "Yes",
    roles: "authenticated",
    tenantScope: "session `corpid`",
    reads: "environment manager secret",
    writes: "none",
    financial: "No",
    delete: "No",
    audit: "No",
    risk: "P2",
    notes: "Requires authenticated session before manager confirmation."
  },
  "POST /auth/logout": {
    purpose: "clear browser session cookie",
    login: "No",
    roles: "public",
    tenantScope: "none",
    reads: "cookie",
    writes: "cookie only",
    financial: "No",
    delete: "No",
    audit: "No",
    risk: "P2",
    notes: "Does not revoke server-side session by itself."
  },
  "GET /favicon.ico": {
    purpose: "favicon response",
    login: "No",
    roles: "public",
    tenantScope: "none",
    reads: "none",
    writes: "none",
    financial: "No",
    delete: "No",
    audit: "No",
    risk: "P3",
    notes: "Static browser route."
  },
  "ANY /api/me": {
    purpose: "current user identity",
    login: "Yes",
    roles: "owner, employee",
    tenantScope: "session `corpid`",
    reads: "session",
    writes: "none",
    financial: "No",
    delete: "No",
    audit: "No",
    risk: "P1",
    notes: "Source currently accepts any HTTP method for this path."
  },
  "GET /api/me": {
    purpose: "staff allowlist declaration for identity route",
    login: "Yes",
    roles: "employee, owner",
    tenantScope: "session `corpid`",
    reads: "session",
    writes: "none",
    financial: "No",
    delete: "No",
    audit: "No",
    risk: "P2",
    notes: "Allowlist says GET, but route handler also contains `ANY /api/me`."
  },
  "GET /api/rent_config": {
    purpose: "read rent reference config",
    login: "Yes",
    roles: "employee, owner",
    tenantScope: "`corpid` filter",
    reads: "`app_settings`",
    writes: "runtime schema creation in request path",
    financial: "Yes",
    delete: "No",
    audit: "No",
    risk: "P1",
    notes: "Rent config needs versioning and migration-owned schema."
  },
  "POST /api/rent_config": {
    purpose: "update rent reference config",
    login: "Yes",
    roles: "owner",
    tenantScope: "`corpid` filter",
    reads: "request body",
    writes: "`app_settings`, `audit_logs`",
    financial: "Yes",
    delete: "No",
    audit: "Yes",
    risk: "P0",
    notes: "Affects future receivables; requires effective-date model before SaaS."
  },
  "POST /api/security/revoke_sessions": {
    purpose: "revoke other sessions",
    login: "Yes",
    roles: "owner",
    tenantScope: "`corpid` filter",
    reads: "`active_sessions`",
    writes: "`active_sessions`, `audit_logs`",
    financial: "No",
    delete: "No",
    audit: "Yes",
    risk: "P1",
    notes: "Runtime schema creation remains in request path."
  },
  "GET /api/employee/lock/cards": {
    purpose: "employee TTLock context",
    login: "Yes",
    roles: "employee, owner",
    tenantScope: "session `corpid`",
    reads: "TTLock API",
    writes: "`audit_logs`",
    financial: "Indirect",
    delete: "No",
    audit: "Yes",
    risk: "P1",
    notes: "External lock-card data becomes an accounting anchor."
  },
  "GET /api/employee/deposit": {
    purpose: "employee deposit balance lookup",
    login: "Yes",
    roles: "employee, owner",
    tenantScope: "`corpid` filter",
    reads: "`deposit_ledger`",
    writes: "none",
    financial: "Yes",
    delete: "No",
    audit: "No",
    risk: "P1",
    notes: "Deposit ledger is not yet integer-fils commercial schema."
  },
  "POST /api/employee/entry": {
    purpose: "employee transaction entry",
    login: "Yes",
    roles: "employee, owner",
    tenantScope: "`corpid` write",
    reads: "`transactions`, `arrear_tasks`, `deposit_ledger`, `app_settings`",
    writes:
      "`sessions`, `transactions`, `arrear_tasks`, `deposit_ledger`, `entry_events`, `audit_logs`",
    financial: "Yes",
    delete: "No",
    audit: "Yes",
    risk: "P0",
    notes: "Needs backend atomic handover commit and recomputed totals."
  },
  "POST /api/employee/migrate": {
    purpose: "employee schema migration endpoint",
    login: "Yes",
    roles: "owner",
    tenantScope: "`corpid`",
    reads: "schema",
    writes: "schema",
    financial: "Yes",
    delete: "No",
    audit: "Yes",
    risk: "P1",
    notes: "Request-path migration must move to migration pipeline."
  },
  "GET /api/arrear_tasks": {
    purpose: "list arrear follow-up tasks",
    login: "Yes",
    roles: "employee, owner",
    tenantScope: "`corpid` filter",
    reads: "`arrear_tasks`, legacy `arrears`",
    writes: "none",
    financial: "Yes",
    delete: "No",
    audit: "No",
    risk: "P1",
    notes: "Receivables model is still missing."
  },
  "POST /api/arrear_tasks/update": {
    purpose: "update arrear follow-up task",
    login: "Yes",
    roles: "employee limited, owner broader",
    tenantScope: "`corpid` filter",
    reads: "`arrear_tasks`, legacy `arrears`",
    writes: "`arrear_tasks`, `entry_events`, `audit_logs`",
    financial: "Yes",
    delete: "No",
    audit: "Yes",
    risk: "P0",
    notes: "Needs stricter lifecycle tests and receivable linkage."
  },
  "GET /api/lock/cards": {
    purpose: "owner TTLock load",
    login: "Yes",
    roles: "owner",
    tenantScope: "session `corpid`",
    reads: "TTLock API",
    writes: "`audit_logs`",
    financial: "Indirect",
    delete: "No",
    audit: "Yes",
    risk: "P1",
    notes: "External data should be snapshotted before accounting use."
  },
  "GET /api/wifi/accounts": {
    purpose: "read WiFi accounts",
    login: "Yes",
    roles: "owner",
    tenantScope: "`corpid` filter",
    reads: "`app_settings`",
    writes: "possible encrypted migration to `app_settings`, `audit_logs`",
    financial: "No",
    delete: "No",
    audit: "Conditional",
    risk: "P1",
    notes: "Read path can mutate encrypted storage."
  },
  "POST /api/wifi/accounts": {
    purpose: "save WiFi accounts",
    login: "Yes",
    roles: "owner",
    tenantScope: "`corpid` filter",
    reads: "request body",
    writes: "`app_settings`, `audit_logs`",
    financial: "No",
    delete: "No",
    audit: "Yes",
    risk: "P1",
    notes: "Sensitive secrets require production key rotation process."
  },
  "GET /api/arrears": {
    purpose: "owner arrears view",
    login: "Yes",
    roles: "owner",
    tenantScope: "`corpid` filter",
    reads: "arrear sources",
    writes: "none",
    financial: "Yes",
    delete: "No",
    audit: "No",
    risk: "P1",
    notes: "Must be backed by receivables before commercial reporting."
  },
  "GET /api/customers": {
    purpose: "read customer credit data",
    login: "Yes",
    roles: "owner",
    tenantScope: "`corpid` filter",
    reads: "`app_settings`",
    writes: "runtime schema creation in request path",
    financial: "Indirect",
    delete: "No",
    audit: "No",
    risk: "P1",
    notes: "JSON settings store is not enough for SaaS analytics."
  },
  "POST /api/customers": {
    purpose: "save customer credit data",
    login: "Yes",
    roles: "owner",
    tenantScope: "`corpid` filter",
    reads: "request body",
    writes: "`app_settings`, `audit_logs`",
    financial: "Indirect",
    delete: "No",
    audit: "Yes",
    risk: "P1",
    notes: "Needs normalized customer model before commercial multi-property use."
  },
  "POST /api/save_session": {
    purpose: "owner legacy session save",
    login: "Yes",
    roles: "owner",
    tenantScope: "`corpid` write",
    reads: "request body",
    writes: "`sessions`, `transactions`, legacy `arrears`",
    financial: "Yes",
    delete: "No",
    audit: "No direct route audit",
    risk: "P0",
    notes: "Legacy financial write path lacks backend-owned handover validation."
  },
  "POST /api/delete_session": {
    purpose: "delete session",
    login: "Yes",
    roles: "owner",
    tenantScope: "`corpid` filter",
    reads: "`sessions`, `transactions`",
    writes:
      "hard deletes `deposit_ledger`, `transactions`, `arrears`, `sessions`; voids `arrear_tasks`; writes `audit_logs`",
    financial: "Yes",
    delete: "Yes",
    audit: "Yes",
    risk: "P0",
    notes: "Commercial data must become void/soft-delete, not hard delete."
  },
  "POST /api/clear_arrear": {
    purpose: "manager clear arrear",
    login: "Yes",
    roles: "owner",
    tenantScope: "`corpid` filter",
    reads: "arrear sources",
    writes: "`arrears`, `arrear_tasks`, `audit_logs`",
    financial: "Yes",
    delete: "No",
    audit: "Yes",
    risk: "P0",
    notes: "Requires full before/after audit and receivable application."
  },
  "ANY /api/history": {
    purpose: "list sessions",
    login: "Yes",
    roles: "owner",
    tenantScope: "`corpid` filter",
    reads: "`sessions`",
    writes: "none",
    financial: "Yes",
    delete: "No",
    audit: "No",
    risk: "P1",
    notes: "Source currently accepts any HTTP method for this path."
  },
  "GET /api/session_detail": {
    purpose: "session transaction detail",
    login: "Yes",
    roles: "owner",
    tenantScope: "`corpid` filter",
    reads: "`transactions`",
    writes: "none",
    financial: "Yes",
    delete: "No",
    audit: "No",
    risk: "P1",
    notes: "Reads legacy decimal transaction rows."
  }
};

const pathCondition =
  /path\s*={2,3}\s*["`]([^"`]+)["`](?:\s*&&\s*(?:request\.)?method\s*={2,3}\s*["`]([A-Z]+)["`])?/g;
const methodThenPathCondition =
  /(?:request\.)?method\s*={2,3}\s*["`]([A-Z]+)["`]\s*&&\s*path\s*={2,3}\s*["`]([^"`]+)["`]/g;

function scanRoutes() {
  const routes = new Map();

  for (const match of source.matchAll(pathCondition)) {
    const pathValue = match[1];
    const method = match[2] || "ANY";
    if (!pathValue?.startsWith("/")) continue;
    routes.set(`${method} ${pathValue}`, { method, path: pathValue });
  }

  for (const match of source.matchAll(methodThenPathCondition)) {
    const method = match[1] || "ANY";
    const pathValue = match[2];
    if (!pathValue?.startsWith("/")) continue;
    routes.set(`${method} ${pathValue}`, { method, path: pathValue });
  }

  return [...routes.values()].sort((a, b) =>
    `${a.path} ${a.method}`.localeCompare(`${b.path} ${b.method}`)
  );
}

function riskRows(routes, risk) {
  return routes
    .filter((route) => routeCatalog[`${route.method} ${route.path}`]?.risk === risk)
    .map((route) => {
      const key = `${route.method} ${route.path}`;
      const item = routeCatalog[key];
      return `- \`${key}\`: ${item.notes}`;
    });
}

function buildInventory() {
  const routes = scanRoutes();
  const discoveredKeys = new Set(routes.map((route) => `${route.method} ${route.path}`));
  const catalogKeys = new Set(Object.keys(routeCatalog));
  const missingCatalog = [...discoveredKeys].filter((key) => !catalogKeys.has(key)).sort();
  const staleCatalog = [...catalogKeys].filter((key) => !discoveredKeys.has(key)).sort();

  if (missingCatalog.length || staleCatalog.length) {
    const details = [
      "API inventory catalog drift detected.",
      missingCatalog.length ? `Missing catalog metadata: ${missingCatalog.join(", ")}` : "",
      staleCatalog.length ? `Stale catalog metadata: ${staleCatalog.join(", ")}` : ""
    ].filter(Boolean);
    throw new Error(details.join("\n"));
  }

  const p0 = riskRows(routes, "P0");
  const p1 = riskRows(routes, "P1");
  const methodCounts = routes.reduce((acc, route) => {
    acc[route.method] = (acc[route.method] || 0) + 1;
    return acc;
  }, {});

  const lines = [
    "# API Inventory",
    "",
    "Date: 2026-05-23",
    "Source: generated from `deploy-worker/src/index.js` by `scripts/audit-api.mjs`",
    "Production calls: none",
    "",
    "## Summary",
    "",
    `- Total routes found by scan: ${routes.length}`,
    `- Method counts: ${Object.entries(methodCounts)
      .map(([method, count]) => `${method}=${count}`)
      .join(", ")}`,
    "- Auth model: public auth routes, then `requireAuth`, then staff allowlist / manager checks",
    "- Tenant scope currently uses `corpid`",
    "- Future SaaS scope still needs `tenant_id/company_id/property_id`",
    "- Drift gate: `npm run audit:api:check` fails if route metadata does not match Worker source",
    "",
    "## Inventory",
    "",
    "| Method | Path | Purpose | Login | Roles | Tenant Scope | Reads | Writes | Financial | Delete | Audit | Risk | Notes |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |"
  ];

  for (const route of routes) {
    const key = `${route.method} ${route.path}`;
    const item = routeCatalog[key];
    lines.push(
      [
        `| ${route.method}`,
        `\`${route.path}\``,
        item.purpose,
        item.login,
        item.roles,
        item.tenantScope,
        item.reads,
        item.writes,
        item.financial,
        item.delete,
        item.audit,
        item.risk,
        item.notes
      ].join(" | ") + " |"
    );
  }

  lines.push(
    "",
    "## P0 API Risks",
    "",
    ...p0,
    "",
    "## P1 API Risks",
    "",
    ...p1,
    "",
    "## Next API Work",
    "",
    "1. Add route-level tests for unauthenticated, employee, owner, and future admin cases.",
    "2. Replace hard delete route behavior with void workflow after database audit.",
    "3. Introduce tenant/property scope model before multi-customer SaaS rollout.",
    "4. Keep frontend hidden buttons as UX only; server checks remain mandatory.",
    ""
  );

  return lines.join("\n");
}

const nextInventory = await prettier.format(buildInventory(), { parser: "markdown" });

if (checkOnly) {
  const current = fs.existsSync(inventoryPath) ? fs.readFileSync(inventoryPath, "utf8") : "";
  if (current !== nextInventory) {
    throw new Error("API_INVENTORY.md is out of date. Run `npm run audit:api`.");
  }
  console.log("API inventory is up to date.");
} else {
  fs.writeFileSync(inventoryPath, nextInventory);
  console.log(`API inventory written: ${scanRoutes().length} routes`);
}
