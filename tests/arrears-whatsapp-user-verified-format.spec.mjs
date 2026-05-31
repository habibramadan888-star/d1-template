import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

function extractLastFunction(source, name) {
  const start = source.lastIndexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} must exist`);
  const open = source.indexOf("{", source.indexOf(")", start));
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === "{") depth += 1;
    if (source[i] === "}") depth -= 1;
    if (depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`Could not extract ${name}`);
}

function buildHarness(source) {
  const names = [
    "arrearsWhatsappCustomerCode",
    "arrearsWhatsappDateCode",
    "arrearsWhatsappDueHeader",
    "arrearsWhatsappTimestamp",
    "arrearsWhatsappOverdueStatus",
    "arrearsWhatsappPackageLabel",
    "dedupeArrearsExportRows",
    "buildArrearsWhatsAppText"
  ];
  const funcs = names.map((name) => extractLastFunction(source, name)).join("\n");
  return new Function(
    "rows",
    `
    const cleanArrearText = (value, fallback) => {
      const raw = String(value ?? "").trim();
      return raw && !/^(none|null|undefined)$/i.test(raw) ? raw : fallback;
    };
    const arrearBedLabel = (a) => cleanArrearText(a.roomBed || a.room_bed || a.bed || a.bed_no, "bed-pending");
    const naturalArrearRoomBedKey = (a) => String(arrearBedLabel(a) || "bed-pending").replace(/^#/, "").trim();
    const fmtD = () => "2026-05-29";
    const ownerArrearsExportRows = () => rows;
    ${funcs}
    return buildArrearsWhatsAppText(rows);
    `
  );
}

test("WhatsApp output matches the user-verified searchable layout", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const text = buildHarness(js)([
    { taskId: "1", roomBed: "1-102", customerCode: "134", dueDate: "2026-05-25", packageCode: "D200" },
    { taskId: "2", roomBed: "2-219", customerCode: "219", dueDate: "2026-05-08", packageCode: "D200" },
    { taskId: "3", roomBed: "2-219", customerCode: "4014", dueDate: "2026-08-08", packageCode: "D200" },
    { taskId: "4", roomBed: "3-103", customerCode: "325", dueDate: "2026-05-07", packageCode: "D100" }
  ]);

  assert.match(text, /^Due Follow-up \| \d{1,2}\/\d{1,2} \d{2}:\d{2} \| \d+ overdue/m);
  assert.match(text, /============================/);
  assert.match(text, /\u30101-102\u3011\n134\s+4d\*\s+D200\s+0525/);
  assert.match(text, /\u30102-219\u3011\n219\s+21d\*\s+D200\s+0508\n4014\s+Due\s+D200\s+0808/);
  assert.match(text, /\u30103-103\u3011\n325\s+22d\*\s+D100\s+0507/);
});

test("WhatsApp output keeps search terms continuous and excludes raw/debug labels", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const text = buildHarness(js)([
    { taskId: "a", roomBed: "1-125", customerCode: "125", dueDate: "2026-05-20", packageCode: "D200", source_type: "ttlock_card" },
    { taskId: "b", roomBed: "2-219", customerCode: "219", dueDate: "2026-05-20", packageCode: "D200" },
    { taskId: "c", roomBed: "2-219", customerCode: "4014", dueDate: "2026-05-20", packageCode: "D200" }
  ]);

  for (const term of ["125", "219", "4014"]) {
    assert.match(text, new RegExp(`(^|\\n)${term}\\s`, "m"));
  }
  for (const forbidden of ["ttlock_card", "rent", "deposit", "source_type", "undefined", "null", "none", "\ufffd"]) {
    assert.doesNotMatch(text, new RegExp(forbidden, "i"));
  }
});
