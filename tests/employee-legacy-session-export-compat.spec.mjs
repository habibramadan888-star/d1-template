import test from "node:test";
import assert from "node:assert/strict";
import { buildWhatsappTextWithDrafts } from "./helpers/employee-entry-whatsapp-helper.mjs";

const receipt = (id, room, amount, cat, tag = "Old", extra = {}) => ({
  id, room, amount, paid: amount, cat, tag, created_at: "2026-07-11T12:00:00Z", ...extra
});

const legacyRowsTemplate = [
  receipt("1", "9113", 700, "cash"), receipt("2", "837", 700, "cash"),
  receipt("3", "218", 770, "cash"),
  receipt("mrfclsxth3tkc", "211", 900, "cash", "New", { due: 700, paid: 700, dep_due: 200, dep_paid: 200 }),
  receipt("5", "858", 650, "cash"), receipt("6", "948", 400, "cash"),
  receipt("7", "934", 750, "cash"), receipt("8", "828", 700, "cash"),
  receipt("9", "911", 650, "cash", "New"), receipt("10", "9115", 650, "cash", "New"),
  receipt("11", "9316", 700, "cash", "New"), receipt("12", "823", 700, "cash"),
  receipt("13", "642", 511, "cash"), receipt("14", "9311", 700, "cash"),
  receipt("15", "643", 680, "bank"), receipt("16", "641", 230, "bank"),
  receipt("17", "9315", 650, "bank", "New"), receipt("18", "943", 650, "bank", "New"),
  receipt("19", "947", 650, "bank", "New"), receipt("20", "328", 680, "bank"),
  receipt("21", "741", 680, "bank"), receipt("22", "325", 630, "bank"),
  { id: "23", room: "401", amount: 500, cat: "expense", tag: "Old", expense_desc: "commission", created_at: "2026-07-11T12:00:00Z" },
  { id: "24", room: "401", amount: 170, cat: "expense", tag: "New", expense_desc: "bed work", created_at: "2026-07-11T12:00:00Z" },
  { id: "25", room: "401", amount: 26, cat: "expense", tag: "Old", expense_desc: "bolt", created_at: "2026-07-11T12:00:00Z" },
  { id: "26", room: "202", amount: 7, cat: "expense", tag: "New", expense_desc: "sink pipe", created_at: "2026-07-11T12:00:00Z" }
];
const legacyRows = () => structuredClone(legacyRowsTemplate);

test("legacy 26-row transaction contract exports reconciled totals without mutation", async () => {
  const text = await buildWhatsappTextWithDrafts(legacyRows());
  assert.match(text, /Cash Received .*9,481/);
  assert.match(text, /Bank Received .*4,850/);
  assert.match(text, /Total Received .*14,331/);
  assert.match(text, /Expenses .*703/);
  assert.match(text, /Cash Handover 8,778/);
  assert.equal((text.match(/^\[[^\]]+\]/gm) || []).length, 26);
});

test("legacy rent-with-deposit displays one record as rent 700 plus deposit 200 without double counting", async () => {
  const text = await buildWhatsappTextWithDrafts(legacyRows());
  const line = text.split("\n").find((value) => value.startsWith("[211]"));
  assert.match(line, /paid 700 N \+ deposit 200 N cash/);
  assert.match(text, /Total Received .*14,331/);
  assert.match(text, /Deposit Included .*200/);
});

test("legacy Old/New map to O/N while expense remains untagged", async () => {
  const text = await buildWhatsappTextWithDrafts(legacyRows());
  assert.match(text, /^\[9113\] paid 700 O cash/m);
  assert.match(text, /^\[911\] paid 650 N cash/m);
  for (const line of text.split("\n").filter((value) => /\] expense /.test(value))) {
    assert.doesNotMatch(line, /\s[ON](?:\s|$)/);
  }
});

test("modern contract fields take precedence over legacy cat and Old/New values", async () => {
  const text = await buildWhatsappTextWithDrafts([{
    id: "modern", type: "R", event_type: "rent", room: "500", amount: 100,
    paid: 100, payment_method: "bank", cat: "cash", tag: "Old",
    created_at: "2026-07-11T12:00:00Z"
  }]);
  assert.match(text, /^\[500\] paid 100 bank/m);
  assert.doesNotMatch(text, /^\[500\].*\sO(?:\s|$)/m);
});
