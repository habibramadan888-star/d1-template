import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Left With Arrears requires and persists belongings metadata", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");
  const worker = await readFile("deploy-worker/src/index.js", "utf8");

  assert.match(html, /Belongings Held/);
  assert.match(html, /leftBelongingsHeld/);
  assert.match(html, /leftBelongingsNote/);
  assert.match(html, /Belongings Note is required when belongings are held/);
  assert.match(worker, /belongings_held:entry\.belongings_held===true/);
  assert.match(worker, /belongings_note:cleanText\(entry\.belongings_note/);
});
