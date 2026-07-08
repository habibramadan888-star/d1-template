import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const DOC = "docs/X6WIO_CORRECTION_FINAL_CLOSEOUT_AUDIT_V1.md";

async function doc() {
  return readFile(DOC, "utf8");
}

function escaped(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test("closeout audit document exists and identifies x6wio correction", async () => {
  const text = await doc();
  assert.match(text, /X6WIO Correction Final Closeout Audit V1/);
  assert.match(text, /x6wio duplicate upload issue was corrected by one additive owner correction anchor/);
  assert.match(text, /LIVE_VERIFIED/);
});

test("original problem documents w1ofc and x6wio sessions", async () => {
  const text = await doc();
  for (const value of [
    "EMPV3-20260707-abdul-w1ofc",
    "#334 rent 700",
    "#134 rent 770",
    "EMPV3-20260707-abdul-x6wio",
    "S20260707-x6wio",
    "Duplicate overcount",
    "1470 AED"
  ]) {
    assert.match(text, new RegExp(escaped(value)));
  }
});

test("business confirmation records 80 AED real payment and correction strategy", async () => {
  const text = await doc();
  for (const value of [
    "Owner confirmed the `80 AED arrears_payment` in x6wio was real cash received",
    "ent20260707-x6wio-01",
    "#334 arrears_payment 80",
    "ent20260707-x6wio-02",
    "#334 rent 700 duplicate",
    "ent20260707-x6wip-03",
    "#134 rent 770 duplicate"
  ]) {
    assert.match(text, new RegExp(escaped(value)));
  }
});

test("correction anchor identity and target are documented", async () => {
  const text = await doc();
  for (const value of [
    "CORR-S20260708-0bhe6yg",
    "CORR-20260708-owner-1sucnhp",
    "duplicate_upload_correction",
    "S20260707-x6wio",
    "EMPV3-20260707-abdul-x6wio",
    "correction_anchor_only"
  ]) {
    assert.match(text, new RegExp(escaped(value)));
  }
});

test("financial result documents raw correction and adjusted totals", async () => {
  const text = await doc();
  for (const value of [
    "cash = `1550`",
    "gross = `1550`",
    "rent_income = `1470`",
    "arrears_repaid = `80`",
    "cash_delta = `-1470`",
    "gross_delta = `-1470`",
    "rent_income_delta = `-1470`",
    "arrears_repaid_delta = `0`",
    "cash = `80`",
    "gross = `80`",
    "rent_income = `0`"
  ]) {
    assert.match(text, new RegExp(escaped(value)));
  }
});

test("verification evidence documents owner-browser live result", async () => {
  const text = await doc();
  for (const value of [
    "legacy endpoint returns 3 original rows",
    "correction_applied = true",
    "correction_events_count = 2",
    "warnings = `[]`",
    "adjusted gross = `80`",
    "adjusted cash = `80`",
    "adjusted rent_income = `0`",
    "adjusted arrears_repaid = `80`"
  ]) {
    assert.match(text, new RegExp(escaped(value)));
  }
});

test("immutability evidence documents original rows visible and no mutations", async () => {
  const text = await doc();
  for (const value of [
    "Original rows remain visible",
    "ent20260707-x6wio-01",
    "ent20260707-x6wio-02",
    "ent20260707-x6wip-03",
    "No hard delete",
    "No original row mutation",
    "No transaction mutation",
    "No arrear_task mutation",
    "No deposit mutation"
  ]) {
    assert.match(text, new RegExp(escaped(value)));
  }
});

test("apply gate disabled status is documented", async () => {
  const text = await doc();
  for (const value of [
    "POST /api/owner/corrections/apply",
    "OWNER_CORRECTION_APPLY_DISABLED",
    "no_write = `true`",
    "real_apply_called = `false`",
    "correction_write_attempted = `false`",
    "No second correction anchor written"
  ]) {
    assert.match(text, new RegExp(escaped(value)));
  }
});

test("safety timeline includes all required milestones", async () => {
  const text = await doc();
  for (const value of [
    "H2 dry-run preview `LIVE_VERIFIED`",
    "H3A apply disabled gate `LIVE_VERIFIED`",
    "H3B1 target-scoped gate `LIVE_VERIFIED`",
    "H3B2 preflight `LIVE_VERIFIED`",
    "H3B3 runbook `TEST_PASS`",
    "H3B4 gate enable package `TEST_PASS`",
    "H3B5 owner-browser precheck `LIVE_VERIFIED`",
    "H3B5B gate enabled verification `LIVE_VERIFIED`",
    "H3B5 final apply `PARTIAL_SUCCESS`",
    "H3B5C apply gate disabled",
    "H4B2 direct post-apply reader fixed",
    "final owner-browser verification `LIVE_VERIFIED`"
  ]) {
    assert.match(text, new RegExp(escaped(value)));
  }
});

test("remaining non-goals and future recommendations are documented", async () => {
  const text = await doc();
  for (const value of [
    "owner UI not changed",
    "history list not changed",
    "daily summary not changed",
    "employee UI not changed",
    "employee upload not changed",
    "durable correction_events table not implemented",
    "tenant_card_id legacy matching not replaced",
    "WhatsApp compiler not implemented",
    "durable occupancy_session_id not implemented",
    "Owner History adjusted mode UI planning",
    "Correction reversal flow planning",
    "Durable correction_events table planning",
    "Broader owner summary adjusted totals planning",
    "Tenant_card_id legacy matching replacement planning",
    "WhatsApp compiler planning"
  ]) {
    assert.match(text, new RegExp(escaped(value)));
  }
});

test("closeout scope remains documentation only and production no-go", async () => {
  const text = await doc();
  for (const value of [
    "Runtime behavior changed in this step: no",
    "Production data changed in this step: no",
    "Deploy in this step: no",
    "Migration in this step: no",
    "RETURN_TO_ROADMAP_PLANNING / STOP",
    "production_cutover = `PRODUCTION_NO_GO`"
  ]) {
    assert.match(text, new RegExp(escaped(value)));
  }
});
