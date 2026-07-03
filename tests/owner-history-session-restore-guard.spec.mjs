import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const resultPath = "EMPLOYEE_OWNER_SESSION_RESTORE_RESULT.md";

test("production restore evidence is scoped to the one approved employee session", async () => {
  const result = await readFile(resultPath, "utf8");

  assert.match(result, /S20260703-amv7l/);
  assert.match(result, /EMPV3-20260703-abdul-amv7l/);
  assert.match(result, /homelink/);
  assert.match(result, /2026-07-03/);
  assert.match(result, /one sessions row restore only/);
  assert.match(result, /WHERE id = 'S20260703-amv7l'/);
  assert.match(result, /AND anchor_id = 'EMPV3-20260703-abdul-amv7l'/);
  assert.match(result, /AND corpid = 'homelink'/);
  assert.match(result, /AND date = '2026-07-03'/);
  assert.match(result, /migration \| no/);
  assert.match(result, /production cutover \| `PRODUCTION_NO_GO`/);
});
