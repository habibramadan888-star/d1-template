import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const htmlPath = "deploy-worker/public/employee-v3.html";

test("employee Bed Transfer copy uses record-only wording", async () => {
  const html = await readFile(htmlPath, "utf8");

  assert.match(html, /Bed transfer recorded \/ 换床记录已保存/);
  assert.match(html, /Bed transfer records save event anchors only/);
  assert.match(html, /RECORD TRANSFER/);
  assert.match(html, /Recorded \/ 已记录/);
  assert.doesNotMatch(html, /Bed transfer submitted for owner review/);
  assert.doesNotMatch(html, /SUBMIT FOR REVIEW/);
});
