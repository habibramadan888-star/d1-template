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

test("review flags are warnings, not hard blockers", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");
  const validation = extractFunction(html, "bedTransferValidationSummary");

  assert.match(validation, /const errors=\[\], review=\[\]/);
  assert.match(validation, /review\.push\('New bed review'\)/);
  assert.match(validation, /review\.push\('Deposit review'\)/);
  assert.match(validation, /review\.push\('Rent difference review'\)/);
  assert.match(validation, /status:errors\.length\?'blocked':\(review\.length\?'recorded_with_notes':'validated'\)/);
  assert.doesNotMatch(validation, /errors\.push\('to_bed_occupied_or_needs_review'\)/);
  assert.doesNotMatch(validation, /errors\.push\('deposit_review_required'\)/);
  assert.doesNotMatch(validation, /errors\.push\('rent_difference_review'\)/);
});

test("backend records review flags without rejecting the save", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const handler = extractFunction(worker, "handleEmployeeBedTransferCreate", true);

  assert.match(handler, /const reviewFlags=Array\.isArray\(body\?\.review_flags\)/);
  assert.match(handler, /review_flags:JSON\.stringify\(reviewFlags\)/);
  assert.doesNotMatch(handler, /badRequest\("to_bed_occupied_or_needs_review"\)/);
  assert.doesNotMatch(handler, /badRequest\("deposit_review_required"\)/);
});
