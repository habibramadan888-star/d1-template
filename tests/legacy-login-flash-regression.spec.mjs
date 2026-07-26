import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("old employee PIN login UI is hidden before auth and never shown on unauthenticated bootstrap", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");

  assert.match(html, /<div class="login-overlay hidden" id="loginOverlay" aria-hidden="true">/);
  assert.match(html, /redirectToUnifiedLogin\('employee_session_required'\)/);
  assert.doesNotMatch(html, /loginOverlay'\)\.classList\.remove\('hidden'\)/);
  assert.doesNotMatch(html, /刷新页面必须重新输入 PIN/);
});

test("old owner login UI is suppressed before auth completion", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");

  assert.match(js, /showOwnerAuthChecking/);
  assert.match(js, /Legacy owner login fallback suppressed/);
  assert.match(js, /redirectToUnifiedLogin\('owner_session_required'\)/);
  assert.match(js, /if\(els\.loginPanel\)els\.loginPanel\.style\.display='none'/);
  assert.doesNotMatch(js, /setOwnerAuthMessage\(message,'ENTER EMPLOYEE CODE'\)/);
});

test("business pages keep api me as routing authority", async () => {
  const employee = await readFile("deploy-worker/public/employee-v3.html", "utf8");
  const owner = await readFile("deploy-worker/public/index-51-main.js", "utf8");

  assert.match(employee, /const r=await apiFetch\('\/api\/me',\{method:'GET',\.\.\.\(controller\?\{signal:controller\.signal\}:\{\}\)\}\)/);
  assert.match(owner, /const r=await apiFetch\('\/api\/me',\{method:'GET'\}\)/);
  assert.match(employee, /isEmployeeAuthRole\(me\.role\)/);
  assert.match(owner, /isOwnerAppRole\(me\.role\)/);
});
