import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const htmlPath = "deploy-worker/public/employee-v3.html";

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
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

test("System row badges use the same console SOT bucket as summary", async () => {
  const html = await readFile(htmlPath, "utf8");
  const normalizeBucket = extractFunction(html, "normalizeEmployeeReminderBucket");
  const normalizeRow = extractFunction(html, "normalizeEmployeeSystemReminder");
  const followupCard = extractFunction(html, "followupCard");

  assert.match(normalizeBucket, /row\?\.console_status/);
  assert.match(normalizeBucket, /row\?\.summary_bucket/);
  assert.match(normalizeBucket, /'overdue'/);
  assert.match(normalizeBucket, /'due_today'/);
  assert.match(normalizeBucket, /'due_soon'/);
  assert.match(normalizeRow, /const summaryBucket=normalizeEmployeeReminderBucket\(row\)/);
  assert.match(normalizeRow, /console_status:summaryBucket/);
  assert.match(normalizeRow, /summary_bucket:summaryBucket/);
  assert.match(followupCard, /employeeReminderBucketLabel\(item\)/);
  assert.match(followupCard, /employeeReminderBucketClass\(item\)/);
  assert.doesNotMatch(followupCard, /Not overdue \/ \\u672a\\u903e\\u671f/);
});

test("System row badge labels cover overdue, due today, and due soon", async () => {
  const html = await readFile(htmlPath, "utf8");
  const label = extractFunction(html, "employeeReminderBucketLabel");
  const cls = extractFunction(html, "employeeReminderBucketClass");

  assert.match(label, /Overdue/);
  assert.match(label, /Due Today/);
  assert.match(label, /Due Soon/);
  assert.match(cls, /bucket==='overdue'/);
  assert.match(cls, /bucket==='due_today'\|\|bucket==='due_soon'/);
});

test("production cutover remains blocked", async () => {
  const gate = await readFile("scripts/gate-commercial-launch-readiness.mjs", "utf8");
  assert.match(gate, /PRODUCTION_NO_GO/);
});

