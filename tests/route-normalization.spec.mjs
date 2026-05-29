import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("legacy login and html paths normalize to root or business aliases", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");

  assert.match(worker, /path === "\/login" \|\| path === "\/unified-login\.html"/);
  assert.match(worker, /redirectToRootEntry\(request\)/);
  assert.match(
    worker,
    /path === "\/employee-login" \|\| path === "\/staff-login" \|\| path === "\/employee\.html"/
  );
  assert.match(worker, /redirectToRootEntry\(request, "employee"\)/);
  assert.match(worker, /path === "\/owner-login"/);
  assert.match(worker, /redirectToRootEntry\(request, "owner"\)/);
  assert.match(worker, /path === "\/admin-login"/);
  assert.match(worker, /redirectToRootEntry\(request, "admin"\)/);
  assert.match(worker, /path === "\/employee-v3\.html" \|\| path === "\/employee-v2\.html"/);
  assert.match(worker, /redirectToPath\(request, "\/employee"\)/);
  assert.match(worker, /path === "\/index\.html" \|\| path === "\/index-51\.html"/);
  assert.match(worker, /redirectToPath\(request, "\/owner"\)/);
});

test("business route aliases serve canonical assets after auth claim check", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");

  assert.match(worker, /readRouteClaim\(request, env\)/);
  assert.match(
    worker,
    /path === "\/employee" \? fetchStaticAsset\(request, env, "\/employee-v3"\)/
  );
  assert.match(worker, /path === "\/owner" \? fetchStaticAsset\(request, env, "\/index-51"\)/);
  assert.match(worker, /path === "\/admin" \? fetchStaticAsset\(request, env, "\/index-51"\)/);
});
