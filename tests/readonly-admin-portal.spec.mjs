import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("admin portal supports readonly admin login and destination", async () => {
  const portal = await readFile("deploy-worker/public/portal.html", "utf8");

  assert.match(portal, /data-portal="admin"/);
  assert.match(portal, /accountInput\.value="admin"/);
  assert.match(portal, /ADMIN_ROLES=new Set\(\["readonly_admin","admin_readonly"\]\)/);
  assert.match(portal, /if\(ADMIN_ROLES\.has\(r\)\)return"\/admin"/);
});

test("readonly admin remains backend read-only", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const owner = await readFile("deploy-worker/public/index-51-main.js", "utf8");

  assert.match(worker, /READONLY_ADMIN_ROLES/);
  assert.match(worker, /canWrite: canWriteOwnerData\(user\)/);
  assert.match(
    worker,
    /if \(path === "\/api\/customers" && method === "POST"\) \{\s*if \(!requireManager\(user\)\) return forbidden\(\);/
  );
  assert.match(owner, /function denyReadonlyAdminWrite\(\)/);
});
