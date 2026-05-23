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

test("server-side auth gate remains present in Worker source", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");

  assert.match(worker, /async function requireAuth/);
  assert.match(worker, /\/api\/me/);
  assert.match(worker, /handleEmployeeApi/);
});

test("known financial risks are still documented while code remains unchanged", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const dbAudit = await readFile("DATABASE_AUDIT.md", "utf8");
  const financeAudit = await readFile("FINANCE_AUDIT.md", "utf8");

  assert.match(worker, /\bREAL\b|DELETE FROM/i);
  assert.match(dbAudit, /Money fields use `REAL`/);
  assert.match(financeAudit, /Cannot Go Live/);
});
