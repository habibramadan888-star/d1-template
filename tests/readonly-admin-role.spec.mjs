import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("readonly admin is accepted for owner read routing", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const routing = await readFile("modules/auth/unified-login-routing.mjs", "utf8");
  const ownerJs = await readFile("deploy-worker/public/index-51-main.js", "utf8");

  assert.match(worker, /READONLY_ADMIN_ROLES/);
  assert.match(worker, /admin_readonly/);
  assert.match(worker, /readonly_admin/);
  assert.match(worker, /canReadOwnerData\(user\)/);
  assert.match(worker, /salt: String\(u\.salt \|\| u\.passwordSalt \|\| ""\)\.trim\(\)/);
  assert.match(worker, /verifyPassword\(password, account\.hash, account\.salt \|\| salt\)/);
  assert.match(routing, /READONLY_ADMIN_ROLES/);
  assert.match(
    routing,
    /roleForApp: READONLY_ADMIN_ROLES\.has\(role\) \? "readonly_admin" : "manager"/
  );
  assert.match(ownerJs, /function isReadonlyAdminRole\(r\)/);
  assert.match(ownerJs, /toOwnerSpaRole\(r\)\{return isReadonlyAdminRole\(r\)\?'readonly_admin'/);
});

test("readonly admin write requests are denied by backend and frontend guards", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const ownerJs = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const readiness = await readFile("COMMERCIAL_LAUNCH_READINESS_RESULT.md", "utf8");

  assert.match(worker, /function canWriteOwnerData\(user\)/);
  assert.match(
    worker,
    /function requireManager\(user\) \{\n  return canWriteOwnerData\(user\);\n\}/
  );
  assert.match(
    worker,
    /if\(isReadonlyAdminRoleValue\(user\?\.role\)&&request\.method!=="GET"\)return forbidden\(\);/
  );
  assert.match(worker, /if \(canWriteOwnerData\(user\)\) \{\n        await env\.DB\.prepare/);
  assert.match(
    worker,
    /if \(path === "\/api\/customers" && method === "POST"\) \{\n      if \(!requireManager\(user\)\) return forbidden\(\);/
  );
  assert.match(worker, /hasPlainWifiPasswords\(accounts\) && canWriteOwnerData\(user\)/);
  assert.match(ownerJs, /function denyReadonlyAdminWrite\(\)/);
  assert.match(ownerJs, /readonly-admin/);
  assert.match(ownerJs, /只读管理员不能修改数据/);
  assert.match(readiness, /PRODUCTION_NO_GO/);
});
