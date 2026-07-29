import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const htmlPath = "deploy-worker/public/employee-v3.html";

test("Bed Transfer event selection normalizes legacy values", async () => {
  const html = await readFile(htmlPath, "utf8");

  assert.match(html, /function normalizeEntryTypeValue/);
  assert.match(html, /bed_transfer/);
  assert.match(html, /transfer_bed/);
  assert.match(html, /return 'TF'/);
  assert.match(html, /type=normalizeEntryTypeValue\(type\)/);
  assert.match(html, /dataset\.normalizedEvent=normalizedBusinessEvent\(\)/);
});

test("Bed Transfer selection rerenders form and context", async () => {
  const html = await readFile(htmlPath, "utf8");

  assert.match(html, /function setEntryType\(type\)/);
  assert.match(html, /syncForm\(\)/);
  assert.match(html, /renderContext\(\)/);
});
