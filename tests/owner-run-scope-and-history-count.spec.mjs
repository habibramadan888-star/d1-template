import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const owner = await readFile("deploy-worker/public/index-51-main.js", "utf8");
const portal = await readFile("deploy-worker/public/portal.html", "utf8");

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

function portalReturnTo(location) {
  return new Function(
    "location",
    `const EMPLOYEE_ROLES=new Set(["employee","staff"]);const OWNER_ROLES=new Set(["owner","manager"]);const ADMIN_ROLES=new Set(["admin","admin_readonly","readonly_admin"]);${functionBlock(portal, "destinationForRole")};${functionBlock(portal, "safeReturnToForRole")};return safeReturnToForRole;`,
  )(location);
}

function portalCurrentReturnTo(location) {
  return new Function(
    "location",
    `const EMPLOYEE_ROLES=new Set(["employee","staff"]);const OWNER_ROLES=new Set(["owner","manager"]);const ADMIN_ROLES=new Set(["admin","admin_readonly","readonly_admin"]);${functionBlock(portal, "destinationForRole")};${functionBlock(portal, "safeReturnToForRole")};${functionBlock(portal, "loginHashForOwnerReturn")};${functionBlock(portal, "returnToForCurrentLogin")};return returnToForCurrentLogin;`,
  )(location);
}

test("Owner auth redirect preserves the exact validated Run and history hash", () => {
  const location = {
    href: "https://qa.example/owner?qa_run_id=QA-20260718-1BC6A134#history",
    origin: "https://qa.example",
    search: "?qa_run_id=QA-20260718-1BC6A134",
    replace(value) { this.replaced = value; },
  };
  const redirect = new Function(
    "location",
    `const UNIFIED_LOGIN_DESTINATION='/';${functionBlock(owner, "ownerQaRunId")};${functionBlock(owner, "ownerLoginReturnTo")};${functionBlock(owner, "redirectToUnifiedLogin")};return redirectToUnifiedLogin;`,
  )(location);
  redirect("owner_session_required");
  const target = new URL(location.replaced, location.origin);
  assert.equal(target.pathname, "/");
  assert.equal(target.searchParams.get("reason"), "owner_session_required");
  assert.equal(target.searchParams.get("return_to"), "/owner?qa_run_id=QA-20260718-1BC6A134#history");
});

test("portal accepts only controlled same-origin Owner query and hash", () => {
  const resolve = portalReturnTo({ origin: "https://qa.example" });
  const run = "QA-20260718-1BC6A134";
  assert.equal(resolve(`/owner?qa_run_id=${run}#history`, "manager"), `/owner?qa_run_id=${run}#history`);
  assert.equal(resolve(`/owner?qa_run_id=${run}#finance`, "owner"), `/owner?qa_run_id=${run}#finance`);
  assert.equal(resolve(`/owner?qa_run_id=${run}#todo`, "manager"), `/owner?qa_run_id=${run}#todo`);
  assert.equal(resolve("https://evil.example/owner#history", "manager"), null);
  assert.equal(resolve("//evil.example/owner", "manager"), null);
  assert.equal(resolve("/owner/../employee", "manager"), null);
  assert.equal(resolve(`/owner?qa_run_id=${run}&next=/owner#history`, "manager"), null);
  assert.equal(resolve("/owner?qa_run_id=INVALID#history", "manager"), null);
  assert.equal(resolve(`/owner?qa_run_id=${run}#javascript:alert(1)`, "manager"), null);
  assert.equal(resolve(`/employee?qa_run_id=${run}#entry`, "manager"), null);
});

test("Owner post-login navigation restores the accepted return target", () => {
  const run = "QA-20260718-1BC6A134";
  const location = { origin: "https://qa.example", search: `?portal=owner&return_to=${encodeURIComponent(`/owner?qa_run_id=${run}#history`)}` };
  const resolve = new Function(
    "location",
    `const EMPLOYEE_ROLES=new Set(["employee","staff"]);const OWNER_ROLES=new Set(["owner","manager"]);const ADMIN_ROLES=new Set(["admin","admin_readonly","readonly_admin"]);${functionBlock(portal, "destinationForRole")};${functionBlock(portal, "safeReturnToForRole")};${functionBlock(portal, "loginHashForOwnerReturn")};${functionBlock(portal, "returnToForCurrentLogin")};${functionBlock(portal, "ownerPostLoginPath")};return ownerPostLoginPath;`,
  )(location);
  assert.equal(resolve({ role: "manager" }, { next_path: "/owner" }), `/owner?qa_run_id=${run}#history`);
  assert.equal(resolve({ role: "staff" }, { next_path: "/owner" }), null);
  assert.equal(resolve({ role: "manager" }, { next_path: "https://evil.example/owner" }), null);
});

test("server Owner redirect and portal fragment handoff preserve the exact deep link", async () => {
  assert.match(await readFile("deploy-worker/src/index.js", "utf8"), /path === "\/owner" \? redirectToOwnerLogin\(request, env\)/);
  const run = "QA-20260718-1BC6A134";
  const resolve = portalCurrentReturnTo({ origin: "https://qa.example", hash: "#history" });
  assert.equal(resolve(`/owner?qa_run_id=${run}`, "manager"), `/owner?qa_run_id=${run}#history`);
  assert.equal(resolve(`/owner?qa_run_id=${run}`, "staff"), null);
  assert.equal(portalCurrentReturnTo({ origin: "https://qa.example", hash: "#javascript:alert(1)" })(`/owner?qa_run_id=${run}`, "manager"), `/owner?qa_run_id=${run}`);
});

test("History count falls back to trusted entriesCount only for an empty entries array", () => {
  const count = new Function(`${functionBlock(owner, "ownerHistorySessionEntryCount")};return ownerHistorySessionEntryCount;`)();
  assert.equal(count({ entries: [{ id: "one" }, { id: "two" }], entriesCount: 99 }), 2);
  assert.equal(count({ entries: [], entriesCount: 1 }), 1);
  assert.equal(count({ entries: [], entries_count: 1, bed_transfer_history: {} }), 1);
  assert.equal(count({ entries: [], entriesCount: Number.NaN }), 0);
  assert.equal(count({ entries: [], entriesCount: -1 }), 0);

  const ordinary = Array.from({ length: 38 }, (_, index) => ({ id: `S${index + 1}`, entries: [], entriesCount: 1 }));
  const transfers = Array.from({ length: 6 }, (_, index) => ({ id: `TF${index + 1}`, entries: [], entriesCount: 1, bed_transfer_history: {} }));
  const rows = [...ordinary, ...transfers];
  assert.equal(rows.length, 44);
  assert.equal(rows.reduce((sum, row) => sum + count(row), 0), 44);
  assert.equal(rows.filter(row => !row.bed_transfer_history).length, 38);
  assert.equal(rows.filter(row => row.bed_transfer_history).length, 6);
  assert.ok(rows.some(row => row.id === "S17"));
  assert.match(owner, /const totalEntries=items\.reduce\(\(sum,s\)=>sum\+ownerHistorySessionEntryCount\(s\),0\)/);
  assert.doesNotMatch(owner, /s\.entries\?s\.entries\.length:\(s\.entriesCount\|\|0\)/);
});

test("a preserved rejected QA Run cannot contaminate the new Run validation snapshot", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const start = worker.indexOf("if(qaValidationContext?.ok===true&&aggregateRequested)");
  const block = worker.slice(start, worker.indexOf("const aggregateTypes", start));
  assert.match(block, /archive_session_prefix=`\$\{qaValidationContext\.run\.qa_run_id\}-%`/);
  assert.match(block, /strict_archive_session_prefix=true/);
  assert.match(block, /transaction_session_prefix=request_context\.archive_session_prefix/);
  assert.match(block, /qaAcceptanceAttachServerValidationFixtures\(request_context,qaValidationContext\.contract\)/);
  assert.match(worker, /function qaAcceptanceEnabled\(env=\{\}\)\{/);
});

test("run-scoped validation uses only server-attested arrears fixtures", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const start = worker.indexOf("function qaAcceptanceAttachServerValidationFixtures");
  const block = worker.slice(start, worker.indexOf("function qaValidationDiagnosticEnvelope", start));
  assert.match(block, /contract\.scenarios/);
  assert.match(block, /employeeEntryUploadType\(entry\)!=="AP"/);
  assert.match(block, /qa_server_attested_matrix/);
  assert.match(block, /arrear_amount:original/);
  assert.match(worker, /qa_arrears_fixture_by_ref instanceof Map/);
  assert.match(worker, /empFindOpenArrearTaskForPaymentReadOnly[\s\S]*qa_arrears_fixture_by_ref\.get\(cleanTaskId\)/);
  assert.match(worker, /qaAcceptanceAttachServerValidationFixtures\(requestContext,contract\)/);
});
