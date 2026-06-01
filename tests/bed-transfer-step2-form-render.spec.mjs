import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const htmlPath = "deploy-worker/public/employee-v3.html";

test("Bed Transfer Step 2 form exposes required fields", async () => {
  const html = await readFile(htmlPath, "utf8");

  assert.match(html, /id="transferFields"/);
  assert.match(html, /id="transferFromBed"/);
  assert.match(html, /data-bed-transfer-from="true"/);
  assert.match(html, /id="bedTo"/);
  assert.match(html, /data-bed-transfer-to="true"/);
  assert.match(html, /id="transferDate"/);
  assert.match(html, /data-bed-transfer-date="true"/);
  assert.match(html, /id="transferReason"/);
  assert.match(html, /data-bed-transfer-reason="true"/);
  assert.match(html, /id="remark"/);
});

test("Bed Transfer Step 2 validation blocks same from/to bed", async () => {
  const html = await readFile(htmlPath, "utf8");

  assert.match(html, /from_bed/);
  assert.match(html, /to_bed/);
  assert.match(html, /不能相同/);
});
