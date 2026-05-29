import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("employee page does not surface anonymous Script error toast", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");

  assert.match(html, /function employeeRuntimeErrorInfo\(e\)/);
  assert.match(html, /isAnonymousScriptError/);
  assert.match(html, /Anonymous browser\/extension script error suppressed/);
  assert.doesNotMatch(html, /toast\('页面脚本错误：'\+\(e\.message/);
});

test("employee runtime errors are sanitized and main page still renders", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");
  const readiness = await readFile("COMMERCIAL_LAUNCH_READINESS_RESULT.md", "utf8");

  assert.match(html, /showStatus\('页面脚本错误，请刷新重试','bad'\)/);
  assert.match(html, /window\.addEventListener\('unhandledrejection'/);
  assert.match(html, /id="view-entry"/);
  assert.match(html, /id="eventChips"/);
  assert.match(html, /id="btnSaveEntry"/);
  assert.match(readiness, /PRODUCTION_NO_GO/);
});
