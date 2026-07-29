import assert from "node:assert/strict";
import test from "node:test";

import { parseTtlockRemark } from "../modules/properties/ttlock-remark.mjs";
import { formatFilsAsAed } from "../modules/finance/money.mjs";

test("parseTtlockRemark extracts bed, deposit, and month-day without inventing a year", () => {
  const parsed = parseTtlockRemark("144 D200 0101");

  assert.equal(parsed.rawRemark, "144 D200 0101");
  assert.equal(parsed.bed, "144");
  assert.equal(formatFilsAsAed(parsed.depositFils), "200.00");
  assert.equal(parsed.checkInMonthDay, "01-01");
  assert.equal(parsed.excludedFromRentFollowup, false);
  assert.equal(parsed.exclusionReason, null);
});

test("parseTtlockRemark keeps full raw remark while extracting the first valid month-day token", () => {
  const parsed = parseTtlockRemark("325 D100 1207p05 08p23 +971525199099");

  assert.equal(parsed.rawRemark, "325 D100 1207p05 08p23 +971525199099");
  assert.equal(parsed.bed, "325");
  assert.equal(formatFilsAsAed(parsed.depositFils), "100.00");
  assert.equal(parsed.checkInMonthDay, "12-07");
});

test("parseTtlockRemark excludes staff beds from rent follow-up", () => {
  assert.deepEqual(parseTtlockRemark("431 D200 Abdul").exclusionReason, "STAFF_BED");
  assert.deepEqual(parseTtlockRemark("852 D200 bilal").exclusionReason, "STAFF_BED");
  assert.equal(parseTtlockRemark("431 D200 Abdul").excludedFromRentFollowup, true);
});

test("parseTtlockRemark excludes explicit vacant beds only when e is a standalone token", () => {
  assert.equal(parseTtlockRemark("111 e").excludedFromRentFollowup, true);
  assert.equal(parseTtlockRemark("111 e").exclusionReason, "VACANT_BED");
  assert.equal(parseTtlockRemark("111 tenant").excludedFromRentFollowup, false);
});

test("parseTtlockRemark does not fabricate missing anchors", () => {
  const parsed = parseTtlockRemark("not-a-bed no-deposit no-date");

  assert.equal(parsed.bed, null);
  assert.equal(parsed.depositFils, null);
  assert.equal(parsed.checkInMonthDay, null);
});
