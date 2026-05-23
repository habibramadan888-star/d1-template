import { readFile } from "node:fs/promises";
import test from "node:test";
import assert from "node:assert/strict";

test("npm scripts keep Cloudflare deploy commands in dry-run mode", async () => {
  const pkg = JSON.parse(await readFile("package.json", "utf8"));

  for (const [name, script] of Object.entries(pkg.scripts)) {
    if (script.includes("wrangler deploy")) {
      assert.match(script, /--dry-run/, `${name} must not deploy production from root scripts`);
    }
  }
});

test("commercial CI workflow runs checks without deploy secrets", async () => {
  const workflow = await readFile(".github/workflows/commercial-check.yml", "utf8");

  assert.match(workflow, /npm ci/);
  assert.match(workflow, /npm run check/);
  assert.match(workflow, /contents: read/);
  assert.doesNotMatch(workflow, /wrangler deploy(?!.*--dry-run)/i);
  assert.doesNotMatch(workflow, /CLOUDFLARE_API_TOKEN|CF_API_TOKEN|secrets\./);
  assert.doesNotMatch(workflow, /migrations apply|d1 execute .*--remote/i);
});

test("secret hygiene check blocks tracked local secret files", async () => {
  const pkg = JSON.parse(await readFile("package.json", "utf8"));
  const script = await readFile("scripts/check-secrets.mjs", "utf8");

  assert.equal(pkg.scripts["security:secrets"], "node scripts/check-secrets.mjs");
  assert.match(pkg.scripts.check, /security:secrets/);
  assert.match(pkg.scripts.typecheck, /scripts\/check-secrets\.mjs/);
  assert.match(script, /deploy-worker\/\.dev\.vars/);
  assert.match(script, /\.env\.local/);
  assert.match(script, /Secret hygiene check failed/);
  assert.match(script, /tracked secret-looking assignment/);
});

test("server-side auth gate remains present in Worker source", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");

  assert.match(worker, /async function requireAuth/);
  assert.match(worker, /\/api\/me/);
  assert.match(worker, /handleEmployeeApi/);
});

test("API inventory is generated and checked against Worker route metadata", async () => {
  const pkg = JSON.parse(await readFile("package.json", "utf8"));
  const script = await readFile("scripts/audit-api.mjs", "utf8");
  const inventory = await readFile("API_INVENTORY.md", "utf8");

  assert.equal(pkg.scripts["audit:api"], "node scripts/audit-api.mjs");
  assert.equal(pkg.scripts["audit:api:check"], "node scripts/audit-api.mjs --check");
  assert.match(pkg.scripts.check, /audit:api:check/);
  assert.match(script, /const routeCatalog =/);
  assert.match(script, /API inventory catalog drift detected/);
  assert.match(script, /API_INVENTORY\.md is out of date/);
  assert.match(inventory, /Drift gate: `npm run audit:api:check`/);
  assert.match(inventory, /POST.+`\/api\/employee\/entry`.+P0/);
  assert.match(inventory, /POST.+`\/api\/delete_session`.+P0/);
});

test("database static scan is generated separately from manual database audit", async () => {
  const pkg = JSON.parse(await readFile("package.json", "utf8"));
  const script = await readFile("scripts/audit-db.mjs", "utf8");
  const scan = await readFile("DATABASE_STATIC_SCAN.md", "utf8");
  const manualAudit = await readFile("DATABASE_AUDIT.md", "utf8");

  assert.equal(pkg.scripts["audit:db"], "node scripts/audit-db.mjs");
  assert.equal(pkg.scripts["audit:db:check"], "node scripts/audit-db.mjs --check");
  assert.match(pkg.scripts.check, /audit:db:check/);
  assert.match(script, /DATABASE_STATIC_SCAN\.md/);
  assert.doesNotMatch(script, /outputPath\s*=.*DATABASE_AUDIT\.md/);
  assert.doesNotMatch(script, /writeFileSync\([^)]*DATABASE_AUDIT\.md/s);
  assert.match(script, /Production database mutation: none/);
  assert.match(scan, /This is a static scan artifact/);
  assert.match(scan, /Runtime CREATE TABLE appears in Worker source/);
  assert.match(scan, /Hard delete statement/);
  assert.match(manualAudit, /## Recommended Migration Order/);
});

test("authenticated core smoke covers owner and employee permission boundaries", async () => {
  const pkg = JSON.parse(await readFile("package.json", "utf8"));
  const script = await readFile("scripts/smoke-core-flows.mjs", "utf8");

  assert.equal(pkg.scripts["smoke:core"], "node scripts/smoke-core-flows.mjs");
  assert.match(pkg.scripts.typecheck, /scripts\/smoke-core-flows\.mjs/);
  assert.match(script, /unauthenticated \/api\/me/);
  assert.match(script, /owner \/api\/history/);
  assert.match(script, /owner \/api\/arrears/);
  assert.match(script, /employee allowed \/api\/rent_config/);
  assert.match(script, /employee allowed \/api\/arrear_tasks/);
  assert.match(script, /employee denied/);
  assert.match(script, /\/api\/delete_session/);
  assert.match(script, /\/api\/security\/revoke_sessions/);
  assert.doesNotMatch(pkg.scripts.check, /smoke:core/);
});

test("clean Worker bootstrap probe is explicit local-only and not a default gate", async () => {
  const pkg = JSON.parse(await readFile("package.json", "utf8"));
  const script = await readFile("scripts/probe-clean-worker-bootstrap.mjs", "utf8");

  assert.equal(
    pkg.scripts["probe:clean-bootstrap"],
    "node scripts/probe-clean-worker-bootstrap.mjs"
  );
  assert.match(pkg.scripts.typecheck, /scripts\/probe-clean-worker-bootstrap\.mjs/);
  assert.doesNotMatch(pkg.scripts.check, /probe:clean-bootstrap/);
  assert.match(script, /--local/);
  assert.match(script, /--persist-to/);
  assert.match(script, /mkdtemp/);
  assert.match(script, /Temporary D1 directory removed/);
  assert.match(script, /P0 confirmed/);
  assert.doesNotMatch(script, /--remote/);
});

test("migration rehearsal script is local-only", async () => {
  const pkg = JSON.parse(await readFile("package.json", "utf8"));
  const script = await readFile("scripts/rehearse-migration.mjs", "utf8");

  assert.equal(pkg.scripts["migration:rehearse"], "node scripts/rehearse-migration.mjs");
  assert.match(script, /--local/);
  assert.match(script, /--persist-to/);
  assert.doesNotMatch(script, /--remote/);
  assert.doesNotMatch(script, /migrations apply/i);
});

test("migration rehearsal script uses disposable local cleanup instead of SQL rollback", async () => {
  const script = await readFile("scripts/rehearse-migration.mjs", "utf8");

  assert.match(script, /mkdtemp/);
  assert.match(script, /await rm\(persistDir/);
  assert.match(script, /Temporary D1 directory removed/);
  assert.match(script, /D1 rejects SQL ROLLBACK/);
  assert.doesNotMatch(script, /BEGIN TRANSACTION;/);
  assert.doesNotMatch(script, /ROLLBACK;/);
});

test("legacy reconciliation dry-run is explicit local read-only", async () => {
  const pkg = JSON.parse(await readFile("package.json", "utf8"));
  const script = await readFile("scripts/reconcile-legacy-dry-run.mjs", "utf8");
  const gitignore = await readFile(".gitignore", "utf8");

  assert.equal(pkg.scripts["reconciliation:dry-run"], "node scripts/reconcile-legacy-dry-run.mjs");
  assert.match(script, /Missing required --persist-to/);
  assert.match(script, /--local/);
  assert.match(script, /--persist-to/);
  assert.match(script, /arg === "--remote"/);
  assert.match(script, /forbidden for legacy reconciliation dry-run/);
  assert.doesNotMatch(script, /wrangler[^"]*--remote/i);
  assert.doesNotMatch(
    script,
    /\b(INSERT|UPDATE|DELETE FROM|CREATE TABLE|ALTER TABLE|DROP TABLE)\b/i
  );
  assert.match(gitignore, /reconciliation-output\//);
});

test("known financial risks are still documented while code remains unchanged", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const dbAudit = await readFile("DATABASE_AUDIT.md", "utf8");
  const financeAudit = await readFile("FINANCE_AUDIT.md", "utf8");

  assert.match(worker, /\bREAL\b|DELETE FROM/i);
  assert.match(dbAudit, /Money fields use `REAL`/);
  assert.match(financeAudit, /Cannot Go Live/);
});
