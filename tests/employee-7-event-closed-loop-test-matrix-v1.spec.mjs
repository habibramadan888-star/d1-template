import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const DOC = new URL("../docs/EMPLOYEE_7_EVENT_CLOSED_LOOP_TEST_MATRIX_V1.md", import.meta.url);

async function docText() {
  return readFile(DOC, "utf8");
}

test("employee 7 event closed-loop matrix exists and is audit-only", async () => {
  const text = await docText();
  assert.match(text, /Employee 7 Event Closed-Loop Test Matrix V1/);
  assert.match(text, /No runtime behavior changed/);
  assert.match(text, /No production data changed/);
  assert.match(text, /No deploy/);
  assert.match(text, /No migration/);
  assert.match(text, /Production cutover = PRODUCTION_NO_GO/);
});

test("matrix includes all seven employee event types", async () => {
  const text = await docText();
  for (const eventName of [
    "Rent",
    "Arrears Payment",
    "Deposit In",
    "Deposit Out",
    "Checkout",
    "Expense",
    "Bed Transfer"
  ]) {
    assert.match(text, new RegExp(`\\b${eventName}\\b`));
  }
});

test("matrix covers every required audit dimension", async () => {
  const text = await docText();
  for (const dimension of [
    "Employee input fields covered",
    "Backend validation covered",
    "Dry-run preview covered",
    "Real upload covered",
    "Owner History list covered",
    "Owner History detail covered",
    "ENTRY ANCHORS JSON covered",
    "Financial totals covered",
    "Arrears/deposit/checkout projection covered if applicable",
    "Duplicate guard covered",
    "Correction/void/reversal covered",
    "Provider metadata/card_id/tenant_card_id/99099 forbidden identity covered",
    "Old data compatibility covered",
    "Live verified / test only / not covered status"
  ]) {
    assert.match(text, new RegExp(dimension.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("event classifications are conservative and explicit", async () => {
  const text = await docText();
  const expected = [
    ["Rent", "LIVE_VERIFIED"],
    ["Arrears Payment", "PARTIAL"],
    ["Deposit In", "PARTIAL"],
    ["Deposit Out", "PARTIAL"],
    ["Checkout", "PARTIAL"],
    ["Expense", "PARTIAL"],
    ["Bed Transfer", "PARTIAL"]
  ];

  for (const [eventName, status] of expected) {
    assert.match(text, new RegExp(`\\| ${eventName} \\| ${status} \\|`));
  }

  assert.doesNotMatch(text, /\| Deposit In \| LIVE_VERIFIED \|/);
  assert.doesNotMatch(text, /\| Deposit Out \| LIVE_VERIFIED \|/);
  assert.doesNotMatch(text, /\| Checkout \| LIVE_VERIFIED \|/);
  assert.doesNotMatch(text, /\| Expense \| LIVE_VERIFIED \|/);
  assert.doesNotMatch(text, /\| Bed Transfer \| LIVE_VERIFIED \|/);
});

test("known live evidence and known gaps are documented", async () => {
  const text = await docText();
  for (const evidence of [
    "bed `411`",
    "expected `730`, paid `730`",
    "S20260708-4fjda",
    "EMPV3-20260708-abdul-4fjda",
    "x6wio",
    "`80 AED` arrears_payment",
    "Bed Transfer dry-run preview is LIVE_VERIFIED",
    "forbidden inputs were false"
  ]) {
    assert.match(text, new RegExp(evidence.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  for (const gap of [
    "Standalone clean repayment",
    "Real upload",
    "not live verified",
    "Highest-Risk Missing Tests",
    "Recommended Next Test Order"
  ]) {
    assert.match(text, new RegExp(gap.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
  }
});

test("document does not overclaim live verification for this audit task", async () => {
  const text = await docText();
  assert.match(text, /TEST_PASS_ONLY for the matrix document/);
  assert.match(text, /NOT_LIVE_VERIFIED for any new evidence/);
  assert.match(text, /Runtime behavior changed: no/);
  assert.match(text, /Production data changed: no/);
  assert.match(text, /Deploy: no/);
  assert.match(text, /Migration: no/);
  assert.match(text, /Production cutover: PRODUCTION_NO_GO/);
});
