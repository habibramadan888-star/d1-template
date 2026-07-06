import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("today actions preview groups overdue due today due soon and required", async () => {
  const ui = await readFile("deploy-worker/public/index-51-main.js", "utf8");

  assert.match(ui, /'TODAY ACTIONS':'today-actions'/);
  assert.match(ui, /function ownerOverviewShowTodayActionsPreview/);
  assert.match(ui, /\['overdue','Overdue'\]/);
  assert.match(ui, /\['due today','Due Today'\]/);
  assert.match(ui, /\['due soon','Due Soon'\]/);
  assert.match(ui, /\['required','Required'\]/);
  assert.match(ui, /showOwnerOverviewPreviewModal\('Today Actions'/);
});
