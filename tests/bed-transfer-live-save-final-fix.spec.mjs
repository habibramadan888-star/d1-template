import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

function extractFunction(source, name, asyncFn = false) {
  const token = `${asyncFn ? "async " : ""}function ${name}`;
  const start = source.lastIndexOf(token);
  assert.notEqual(start, -1, `${name} must exist`);
  const next = source.indexOf("\nfunction ", start + token.length);
  return source.slice(start, next === -1 ? source.length : next);
}

test("live Bed Transfer save posts to the dedicated ledger endpoint", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");
  const submit = extractFunction(html, "submitBedTransferEvent", true);

  assert.match(submit, /apiFetch\('\/api\/employee\/bed-transfers'/);
  assert.match(submit, /from_bed:e\.bed_from/);
  assert.match(submit, /to_bed:e\.bed_to/);
  assert.match(submit, /transfer_date:e\.transfer_date/);
  assert.match(submit, /fee_mode:e\.fee_mode/);
  assert.match(submit, /amount_fils:e\.amount_fils/);
  assert.match(submit, /waiver_reason:e\.fee_waiver_reason/);
  assert.match(submit, /review_flags:bedTransferValidationSummary/);
});

test("live Bed Transfer error copy includes the concrete API reason", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");
  const submit = extractFunction(html, "submitBedTransferEvent", true);

  assert.match(submit, /const msg=err\?\.message\|\|String\(err\|\|'submit_failed'\)/);
  assert.match(submit, /Bed transfer not saved \/ 换床记录未保存/);
});

test("backend save tolerates optional schema columns while preserving ledger anchors", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const handler = extractFunction(worker, "handleEmployeeBedTransferCreate", true);

  assert.match(handler, /const bedTransferColumns=await empTableColumns\(env,"bed_transfer_events"\)/);
  assert.match(handler, /const insertColumns=BED_TRANSFER_EVENT_COLUMNS\.filter/);
  assert.match(handler, /review_flags:reviewFlags/);
  assert.match(handler, /status:"recorded"/);
  assert.doesNotMatch(handler, /status:"pending_review"/);
});
