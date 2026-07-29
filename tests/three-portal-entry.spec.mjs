import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("GET root renders three portal entry asset", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const portal = await readFile("deploy-worker/public/portal.html", "utf8");

  assert.match(worker, /path === "\/" \|\| path === "\/home"/);
  assert.match(worker, /fetchStaticAsset\(request, env, "\/portal"\)/);
  for (const label of ["员工", "老板", "管理员"]) assert.match(portal, new RegExp(label));
  assert.match(portal, /data-portal="employee"/);
  assert.match(portal, /data-portal="owner"/);
  assert.match(portal, /data-portal="admin"/);
});

test("three portal page does not expose technical launch notes", async () => {
  const portal = await readFile("deploy-worker/public/portal.html", "utf8");
  const visible = portal.slice(portal.indexOf("<main"), portal.indexOf("<script>"));

  assert.doesNotMatch(visible, /PRODUCTION_NO_GO|D1|QA|server role|employee-v3\.html|index\.html/i);
});

test("portal login submits role-appropriate endpoints", async () => {
  const portal = await readFile("deploy-worker/public/portal.html", "utf8");

  assert.match(portal, /selectedPortal==="employee"[\s\S]*\/auth\/employee-login/);
  assert.match(portal, /: await requestJson\("\/auth\/login"/);
  assert.match(portal, /routeFromMe\(me\)/);
});
