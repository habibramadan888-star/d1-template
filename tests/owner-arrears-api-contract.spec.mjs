import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} must exist`);
  const open = source.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === "{") depth += 1;
    if (source[i] === "}") depth -= 1;
    if (depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`Could not extract ${name}`);
}

test("boss arrears API advertises the final two-source contract and first-page limit", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const listLimit = extractFunction(worker, "bossArrearsListLimit");
  const bossTasks = extractFunction(worker, "handleBossArrearsFollowupTasks");

  assert.match(listLimit, /return Math\.min\(Math\.max\(Math\.floor\(raw\),1\),100\)/);
  assert.match(bossTasks, /source_authority:\["existing_arrears_record","ttlock_expired_unpaid"\]/);
  assert.match(worker, /source_type:\/ttlock\/i\.test/);
});

test("boss arrears API fields match owner card renderer expectations", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const apiMap = extractFunction(worker, "empTaskToBossArrear");
  const normalizer = extractFunction(js, "normalizeArrearFromCloud");
  const renderer = extractFunction(js, "renderOwnerArrearsTaskCard");

  for (const field of [
    "source_type",
    "room_bed",
    "customer_code",
    "remain",
    "due_date",
    "promised_amount_fils",
    "promised_payment_date",
    "followup_note",
    "staff_note"
  ]) {
    assert.match(apiMap, new RegExp(field));
  }

  assert.match(normalizer, /promised_amount_fils/);
  assert.match(normalizer, /promised_payment_date/);
  assert.match(normalizer, /followup_note/);
  assert.match(renderer, /arrearPromiseAmountLabel/);
  assert.match(renderer, /arrearPromiseDateLabel/);
  assert.match(renderer, /arrearFollowupNoteLabel/);
});
