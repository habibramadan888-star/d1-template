import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

function extractAsyncFunction(source, name) {
  const start = source.indexOf(`async function ${name}(`);
  assert.notEqual(start, -1, `${name} must exist`);
  const open = source.indexOf("{", source.indexOf(")", start));
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === "{") depth += 1;
    if (source[i] === "}") depth -= 1;
    if (depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`Could not extract ${name}`);
}

test("owner write path and employee read path use the same userid assignment field", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const ownerCreate = extractAsyncFunction(worker, "handleBossArrearsDirectives");
  const employeeRead = extractAsyncFunction(worker, "handleEmployeeArrearsDirectives");
  const mapper = worker.slice(
    worker.indexOf("function empTaskToEmployeeDirective"),
    worker.indexOf("__name(empTaskToEmployeeDirective")
  );

  assert.match(ownerCreate, /const assigned=assignedFallback\|\|cleanText\(old\.userid\|\|""/);
  assert.match(ownerCreate, /"userid=\?"/);
  assert.match(employeeRead, /WHERE corpid=\? AND userid=\?/);
  assert.match(employeeRead, /\.bind\(user\.corpid,user\.userid\)/);
  assert.match(mapper, /assigned_employee_id:cleanText\(t\?\.userid\|\|""/);
});

test("employee directive read filters only active assigned lifecycle rows", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const employeeRead = extractAsyncFunction(worker, "handleEmployeeArrearsDirectives");

  for (const status of ["assigned", "pending", "viewed", "promised", "followed_up", "needs_review", "overdue"]) {
    assert.match(employeeRead, new RegExp(status));
  }
  for (const closedStatus of ["CLOSED", "VOID", "WRITTEN_OFF", "WAIVED"]) {
    assert.match(employeeRead, new RegExp(closedStatus));
  }
  assert.match(employeeRead, /LIMIT 100/);
});
