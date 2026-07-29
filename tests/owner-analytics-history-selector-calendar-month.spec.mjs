import assert from "node:assert/strict";
import test from "node:test";
import { readOwnerMain } from "./helpers/ledger-history-test-utils.mjs";

function calendarMonthKey(dateValue) {
  const d = String(dateValue || "").slice(0, 10);
  const match = d.match(/^(\d{4})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}` : "unknown";
}

test("analytics history selector groups archives by owner history calendar month", async () => {
  const source = await readOwnerMain();
  const start = source.indexOf("function getImportBillingPeriodInfo");
  const end = source.indexOf("function syncHistGroupSelectionUI", start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);

  const block = source.slice(start, end);
  assert.ok(block.includes("String(dateValue||'').slice(0,10)"));
  assert.ok(block.includes("key:`${m[1]}-${m[2]}`"));
  assert.ok(block.includes("label:`${m[1]}年${m[2]}月`"));
  assert.doesNotMatch(block, /cutoff|账期|m-1/);
});

test("2026-07-01 and 2026-07-02 remain in the same July group", () => {
  const dates = ["2026-07-02", "2026-07-01"];
  const july = dates.filter((date) => calendarMonthKey(date) === "2026-07");

  assert.deepEqual(july, dates);
  assert.equal(july.length, 2);
});

test("analytics selector loads the same visible history window as the history page", async () => {
  const source = await readOwnerMain();
  const start = source.indexOf("async function updateHistCount");
  const end = source.indexOf("function syncHistSelectionUI", start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);

  const block = source.slice(start, end);
  assert.ok(block.includes("const limit=Math.max(state.historyLimit||HISTORY_PAGE_SIZE,HISTORY_PAGE_SIZE);"));
  assert.ok(block.includes("/api/history?limit=${encodeURIComponent(limit)}"));
  assert.doesNotMatch(block, /api\/history\?limit=\$\{HISTORY_PAGE_SIZE\}/);
});
