import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const worker = await readFile("deploy-worker/src/index.js", "utf8");
const portal = await readFile("deploy-worker/public/portal.html", "utf8");
const employee = await readFile("deploy-worker/public/employee-v3.html", "utf8");

function functionBlock(source, name) {
  const start = source.search(new RegExp(`function\\s+${name}\\s*\\(`));
  assert.notEqual(start, -1, `${name} missing`);
  let depth = 0;
  const open = source.indexOf("{", start);
  for (let index = open; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}" && --depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`${name} unterminated`);
}

test("unauthenticated QA Employee deep link preserves the validated Run and entry hash", () => {
  const makeReturnTo = new Function(
    "qaAcceptanceEnabled",
    "qaAcceptanceRunId",
    `${functionBlock(worker, "employeeLoginReturnTo")}; return employeeLoginReturnTo;`,
  )(
    env => env.QA_ACCEPTANCE_ENABLED === "true",
    value => /^QA-\d{8}-[A-Z0-9]{4,12}$/.test(String(value || "")) ? String(value) : "",
  );
  const env = { QA_ACCEPTANCE_ENABLED: "true" };
  assert.equal(
    makeReturnTo(new Request("https://qa.example/employee?qa_run_id=QA-20260718-D8FEE436"), env),
    "/employee?qa_run_id=QA-20260718-D8FEE436#entry",
  );
  assert.equal(
    makeReturnTo(new Request("https://qa.example/employee?qa_run_id=https://evil.example"), env),
    "/employee#entry",
  );
});

test("portal accepts only the same-role same-origin relative Employee return target", () => {
  const resolve = new Function(
    "location",
    `const EMPLOYEE_ROLES=new Set(["employee","staff"]);const OWNER_ROLES=new Set(["owner","manager"]);const ADMIN_ROLES=new Set(["admin"]);${functionBlock(portal, "destinationForRole")};${functionBlock(portal, "safeReturnToForRole")};return safeReturnToForRole;`,
  )({ origin: "https://qa.example" });
  assert.equal(resolve("/employee?qa_run_id=QA-20260718-D8FEE436#entry", "staff"), "/employee?qa_run_id=QA-20260718-D8FEE436#entry");
  assert.equal(resolve("/employee?qa_run_id=QA-20260718-D8FEE436", "staff"), "/employee?qa_run_id=QA-20260718-D8FEE436#entry");
  assert.equal(resolve("https://evil.example/employee?qa_run_id=QA-20260718-D8FEE436", "staff"), null);
  assert.equal(resolve("//evil.example/employee", "staff"), null);
  assert.equal(resolve("/owner?qa_run_id=QA-20260718-D8FEE436", "staff"), null);
  assert.equal(resolve("/employee?qa_run_id=INVALID", "staff"), null);
  assert.equal(resolve("/employee?qa_run_id=QA-20260718-D8FEE436&next=/owner", "staff"), null);
});

test("Employee auth re-entry keeps the same Run while dropping malformed Run ids", () => {
  const resolve = new Function(
    "location",
    `${functionBlock(employee, "employeeLoginReturnTo")};return employeeLoginReturnTo;`,
  )({ href: "https://qa.example/employee?qa_run_id=QA-20260718-D8FEE436#entry", origin: "https://qa.example" });
  assert.equal(resolve(), "/employee?qa_run_id=QA-20260718-D8FEE436#entry");

  const invalid = new Function(
    "location",
    `${functionBlock(employee, "employeeLoginReturnTo")};return employeeLoginReturnTo;`,
  )({ href: "https://qa.example/employee?qa_run_id=javascript:alert(1)#entry", origin: "https://qa.example" });
  assert.equal(invalid(), "/employee#entry");
});

test("server and browser route contracts retain query/hash without changing draft state", () => {
  const route = functionBlock(worker, "handleAppEntryRoute");
  const redirect = functionBlock(employee, "redirectToUnifiedLogin");
  assert.match(route, /!claim\) return path === "\/employee" \? redirectToEmployeeLogin\(request, env\)/);
  assert.match(route, /path === "\/employee" \? fetchStaticAsset\(request, env, "\/employee-v3"\)/);
  assert.match(redirect, /params\.set\('return_to',employeeLoginReturnTo\(\)\)/);
  assert.doesNotMatch(redirect, /saveDrafts|clearDraft|New Session|state\.drafts\s*=/);
  assert.match(worker, /status NOT IN \('FINAL_ACCEPTED','UPLOAD_PASS','MANUAL_OWNER_ACCEPTED','REJECTED_CROSS_AUTH_REDIRECT'\)/);
});
