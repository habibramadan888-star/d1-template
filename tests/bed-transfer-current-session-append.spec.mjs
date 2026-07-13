import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("employee UI keeps validated and recorded Bed Transfer outside Current Session", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");
  const start = html.indexOf("async function saveCanonicalBedTransferDraft");
  const end = html.indexOf("async function recordCanonicalBedTransfer", start);
  const validate = html.slice(start, end);
  const recordEnd = html.indexOf("async function saveEntry", end);
  const record = html.slice(end, recordEnd);
  assert.match(validate, /validatedRecord=employeeBedTransferRecordPayload/);
  assert.doesNotMatch(validate + record, /state\.drafts|saveDrafts\(|appendSyncedBedTransferSessionEntry/);
  assert.match(record, /apiFetch\('\/api\/employee\/entry'/);
});

test("Upload Session excludes any legacy local Bed Transfer row", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");
  const upload = html.slice(html.lastIndexOf("async function commitSessionAndExport"));
  assert.match(upload, /sessionOnlyDrafts=state\.drafts\.filter/);
  assert.match(upload, /toUpperCase\(\)!=='TF'/);
  assert.match(upload, /toLowerCase\(\)!=='bed_transfer'/);
});
