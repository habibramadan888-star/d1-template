import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  EMPLOYEE_DESTINATION,
  OWNER_DESTINATION,
  PRODUCTION_CUTOVER_STATUS,
  UNIFIED_LOGIN_PATH,
  getCommercialLaunchStatusForUnifiedLogin,
  resolveUnifiedPostLoginRoute
} from "../modules/auth/unified-login-routing.mjs";

test("only unified-login.html is the primary login entry", async () => {
  const model = await readFile("UNIFIED_LOGIN_SINGLE_ENTRY_MODEL.md", "utf8");
  const guide = await readFile("INTERNAL_QA_START_GUIDE.md", "utf8");

  assert.equal(UNIFIED_LOGIN_PATH, "/unified-login.html");
  assert.match(model, /one primary login entry/i);
  assert.match(model, /no separate owner login page/i);
  assert.match(model, /no separate employee login page/i);
  assert.match(guide, /single unified login/i);
});

test("employee-v3.html is an employee business destination, not primary login entry", async () => {
  const model = await readFile("UNIFIED_LOGIN_SINGLE_ENTRY_MODEL.md", "utf8");
  const employeeScript = await readFile("EMPLOYEE_INTERNAL_TEST_SCRIPT.md", "utf8");

  assert.equal(EMPLOYEE_DESTINATION, "/employee-v3.html");
  assert.match(model, /Employee business page/);
  assert.match(
    model,
    /Employee business page[\s\S]+Destination after `\/api\/me` confirms `employee` or `staff`/
  );
  assert.match(employeeScript, /Do not treat `employee-v3\.html` as the primary login entry/);
});

test("index.html is an owner business destination, not primary login entry", async () => {
  const model = await readFile("UNIFIED_LOGIN_SINGLE_ENTRY_MODEL.md", "utf8");
  const ownerScript = await readFile("OWNER_INTERNAL_TEST_SCRIPT.md", "utf8");

  assert.equal(OWNER_DESTINATION, "/index.html");
  assert.match(model, /Owner business page/);
  assert.match(
    model,
    /Owner business page[\s\S]+Destination after `\/api\/me` confirms `owner`, `manager`, or `admin`/
  );
  assert.match(ownerScript, /Do not treat `index\.html` as a separate owner login page/);
});

test("employee role routes to employee business page", () => {
  const decision = resolveUnifiedPostLoginRoute({ meClaim: { role: "staff" } });

  assert.equal(decision.authority, "/api/me");
  assert.equal(decision.destination, EMPLOYEE_DESTINATION);
});

test("owner manager admin roles route to owner business page", () => {
  for (const role of ["owner", "manager", "admin"]) {
    const decision = resolveUnifiedPostLoginRoute({ meClaim: { role } });

    assert.equal(decision.authority, "/api/me");
    assert.equal(decision.destination, OWNER_DESTINATION);
  }
});

test("frontend role tamper remains ignored", () => {
  const decision = resolveUnifiedPostLoginRoute({
    meClaim: { role: "staff" },
    frontendRole: "manager",
    loginResponse: { role: "manager" }
  });

  assert.equal(decision.authority, "/api/me");
  assert.equal(decision.destination, EMPLOYEE_DESTINATION);
  assert.equal(decision.ignoredFrontendRole, "manager");
});

test("no second login page is introduced", async () => {
  const html = await readFile("deploy-worker/public/unified-login.html", "utf8");

  assert.match(html, /<main class="login-overlay unified-login-shell"/);
  assert.match(html, /Homelink 登录/);
  assert.doesNotMatch(html, /owner-login\.html|employee-login\.html|boss-login\.html/i);
  assert.doesNotMatch(html, /One login for every internal role/);
});

test("production cutover remains PRODUCTION_NO_GO", () => {
  assert.equal(getCommercialLaunchStatusForUnifiedLogin(), PRODUCTION_CUTOVER_STATUS);
});
