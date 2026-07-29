import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyDueStatus,
  compareBusinessDates,
  daysBetweenBusinessDates,
  getDubaiBusinessDate
} from "../modules/finance/dubai-business-date.mjs";

test("Dubai business date changes at Dubai midnight, not UTC midnight", () => {
  assert.equal(getDubaiBusinessDate("2026-05-01T19:59:59.000Z"), "2026-05-01");
  assert.equal(getDubaiBusinessDate("2026-05-01T20:00:00.000Z"), "2026-05-02");
});

test("Dubai business date ignores browser local timezone as authority", () => {
  const sameInstant = new Date("2026-05-01T21:30:00.000Z");
  assert.equal(getDubaiBusinessDate(sameInstant), "2026-05-02");
});

test("business date comparison and day counts use calendar dates", () => {
  assert.equal(compareBusinessDates("2026-05-02", "2026-05-02"), 0);
  assert.equal(compareBusinessDates("2026-05-01", "2026-05-02"), -1);
  assert.equal(daysBetweenBusinessDates("2026-05-02", "2026-05-05"), 3);
});

test("classifyDueStatus covers due today, overdue, due soon, and not due", () => {
  assert.equal(classifyDueStatus("2026-05-02", { today: "2026-05-02" }).status, "DUE_TODAY");
  assert.deepEqual(classifyDueStatus("2026-05-01", { today: "2026-05-04" }), {
    status: "OVERDUE",
    daysOverdue: 3,
    daysUntilDue: -3
  });
  assert.deepEqual(classifyDueStatus("2026-05-05", { today: "2026-05-02", soonDays: 3 }), {
    status: "DUE_SOON",
    daysOverdue: 0,
    daysUntilDue: 3
  });
  assert.equal(
    classifyDueStatus("2026-05-08", { today: "2026-05-02", soonDays: 3 }).status,
    "NOT_DUE"
  );
});

test("classifyDueStatus can derive today from a Dubai instant", () => {
  const status = classifyDueStatus("2026-05-02", {
    instant: "2026-05-01T20:30:00.000Z"
  });
  assert.equal(status.status, "DUE_TODAY");
});

test("Dubai date helpers reject invalid calendar values", () => {
  assert.throws(() => compareBusinessDates("2026-02-30", "2026-03-01"), /valid calendar/);
  assert.throws(() => classifyDueStatus("05/02/2026", { today: "2026-05-02" }), /YYYY-MM-DD/);
  assert.throws(() => getDubaiBusinessDate("not-a-date"), /valid date/);
});
