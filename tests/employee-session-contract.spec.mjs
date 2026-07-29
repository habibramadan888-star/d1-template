import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const employeeHtmlPath = "deploy-worker/public/employee-v3.html";
const workerPath = "deploy-worker/src/index.js";

test("employee session upload uses owner-visible employee_entry source", async () => {
  const html = await readFile(employeeHtmlPath, "utf8");
  const worker = await readFile(workerPath, "utf8");

  assert.match(html, /source:'employee_entry'/);
  assert.match(worker, /source:cleanText\(session\.source\|\|"employee_entry",40\)\|\|"employee_entry"/);
  assert.match(worker, /id:sessionId/);
  assert.match(worker, /corpid:user\.corpid/);
  assert.match(worker, /const sessionAnchorEntries=Array\.isArray\(session\.entries\)\?session\.entries\.map\(row=>normalizeEntryAnchor\(row\)\):\[\]/);
  assert.match(worker, /entries_count:sessionAnchorEntries\.length\|\|1/);
  assert.match(worker, /export_text:cleanText\(sessionExportText,50000\)/);
  assert.match(worker, /entries_json:cleanText\(sessionEntriesJson,50000\)/);
});

test("employee upload route does not run runtime DDL schema migration", async () => {
  const worker = await readFile(workerPath, "utf8");
  const route =
    worker.match(/async function handleEmployeeEntry\(request,env,user\)\{[\s\S]*?__name\(handleEmployeeEntry,"handleEmployeeEntry"\);/)?.[0] ||
    "";

  assert.doesNotMatch(route, /empEnsureSchema\(env\)/);
  assert.match(route, /employee_entry_schema_not_ready/);
});
