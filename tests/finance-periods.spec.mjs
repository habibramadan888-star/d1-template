import assert from "node:assert/strict";
import test from "node:test";

import { calculateRentPeriod } from "../modules/finance/periods.mjs";
import { formatFilsAsAed, parseAedToFils } from "../modules/finance/money.mjs";

test("calculateRentPeriod uses system list rent for same-day monthly anchors", () => {
  const period = calculateRentPeriod({
    startDate: "2026-06-01",
    cycle: "1M",
    listPriceFils: parseAedToFils("770.00")
  });

  assert.equal(period.periodStartDate, "2026-06-01");
  assert.equal(period.displayEndDate, "2026-07-01");
  assert.equal(period.nextDueDate, "2026-07-01");
  assert.equal(period.billingDays, 30);
  assert.equal(formatFilsAsAed(period.dueFils), "770.00");
  assert.equal(period.pricingRule, "SYSTEM_LIST_PRICE");
});

test("calculateRentPeriod clamps monthly anchors when the target month is shorter", () => {
  const period = calculateRentPeriod({
    startDate: "2026-01-31",
    cycle: "1M",
    listPriceFils: parseAedToFils("770.00")
  });

  assert.equal(period.displayEndDate, "2026-02-28");
  assert.equal(period.nextDueDate, "2026-02-28");
  assert.equal(period.billingDays, 28);
});

test("calculateRentPeriod uses fixed 15D rent and separates display end from next due date", () => {
  const period = calculateRentPeriod({
    startDate: "2026-06-01",
    cycle: "15D"
  });

  assert.equal(period.displayEndDate, "2026-06-15");
  assert.equal(period.nextDueDate, "2026-06-16");
  assert.equal(period.billingDays, 15);
  assert.equal(formatFilsAsAed(period.dueFils), "400.00");
  assert.equal(period.pricingRule, "FIXED_15D_400_AED");
});

test("calculateRentPeriod uses 40 AED per custom day", () => {
  const period = calculateRentPeriod({
    startDate: "2026-06-01",
    cycle: "CUST",
    customDays: 3
  });

  assert.equal(period.displayEndDate, "2026-06-03");
  assert.equal(period.nextDueDate, "2026-06-04");
  assert.equal(period.billingDays, 3);
  assert.equal(formatFilsAsAed(period.dueFils), "120.00");
  assert.equal(period.pricingRule, "CUSTOM_DAYS_40_AED_PER_DAY");
});

test("calculateRentPeriod rejects invalid dates, cycles, and custom days", () => {
  assert.throws(
    () => calculateRentPeriod({ startDate: "2026-02-30", cycle: "15D" }),
    /Invalid calendar date/
  );
  assert.throws(() => calculateRentPeriod({ startDate: "2026-06-01", cycle: "2M" }), /Unsupported/);
  assert.throws(
    () => calculateRentPeriod({ startDate: "2026-06-01", cycle: "CUST", customDays: 0 }),
    /positive integer/
  );
});
