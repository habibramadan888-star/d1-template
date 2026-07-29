import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("business route guards use server claim before serving pages", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");

  assert.match(worker, /const claim = await readRouteClaim\(request, env\)/);
  assert.match(worker, /if \(!claim\) return redirectToRootEntry\(request\)/);
  assert.match(worker, /if \(isStaffRoleValue\(claim\.role\)\)/);
  assert.doesNotMatch(worker, /isEmployeeRoleValue/);
  assert.match(worker, /if \(isReadonlyAdminRoleValue\(claim\.role\)\)/);
  assert.match(worker, /if \(canReadOwnerData\(claim\)\)/);
});

test("stale frontend role caches are cleared and not route authority", async () => {
  const portal = await readFile("deploy-worker/public/portal.html", "utf8");
  const owner = await readFile("deploy-worker/public/index-51-main.js", "utf8");

  assert.match(portal, /routeFromMe\(me\)/);
  assert.match(owner, /fetchCurrentAuthUser\(\)/);
  assert.doesNotMatch(portal, /localStorage\.getItem\(["'].*role/);
});
