import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const htmlPath = "deploy-worker/public/employee-v3.html";

test("Screenshot acceptance markers are present for hard Entry parity", async () => {
  const html = await readFile(htmlPath, "utf8");

  assert.match(html, /employee-tabs/);
  assert.match(html, /width:82px;/);
  assert.match(html, /data-view="entry"/);
  assert.match(html, /data-view="arrears"/);
  assert.doesNotMatch(html, /data-view="export"/);
  assert.match(html, /Boss Assigned Tasks/);
  assert.match(html, /System Reminders/);
  assert.match(html, /Expand Details/);
  assert.match(html, /Collapse Details/);
});
