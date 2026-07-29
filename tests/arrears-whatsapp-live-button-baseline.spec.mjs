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
  const funcs = [
    "arrearsWhatsappCustomerCode",
    "arrearsWhatsappDateCode",
    "arrearsWhatsappDueHeader",
    "arrearsWhatsappTimestamp",
    "arrearsWhatsappOverdueStatus",
    "arrearsWhatsappPackageLabel",
    "dedupeArrearsExportRows",
    "buildArrearsWhatsAppText"
  ].map((name) => extractLastFunction(source, name)).join("\n");
  return new Function("rows", `
    const cleanArrearText = (value, fallback) => {
      const raw = String(value ?? "").trim();
      return raw && !/^(none|null|undefined)$/i.test(raw) ? raw : fallback;
    };
    const arrearBedLabel = (a) => cleanArrearText(a.roomBed || a.room_bed || a.bed || a.bed_no, "床位待确认");
    const naturalArrearRoomBedKey = (a) => String(arrearBedLabel(a) || "床位待确认").replace(/^#/, "").trim();
    const fmtD = () => "2026-05-31";
    const ownerArrearsExportRows = () => rows;
    ${funcs}
    return buildArrearsWhatsAppText(rows);
  `);
}

test("live WhatsApp button calls the final baseline builder path", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const exportFn = extractLastFunction(js, "exportArrearsWhatsApp");

  assert.match(exportFn, /ownerArrearsExportRows\(\)/);
  assert.match(exportFn, /buildArrearsWhatsAppText\(rows\)/);
  assert.doesNotMatch(exportFn, /preview_tasks|source_type|ttlock_card/);
});

test("final baseline keeps all acceptance search codes continuous", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const text = buildHarness(js)([
    { taskId: "1", roomBed: "1-125", customerCode: "125", dueDate: "2026-05-25", packageCode: "D200" },
    { taskId: "2", roomBed: "1-144", customerCode: "144", dueDate: "2026-05-25", packageCode: "D200" },
    { taskId: "3", roomBed: "2-219", customerCode: "219", dueDate: "2026-08-08", packageCode: "D200" },
    { taskId: "4", roomBed: "2-219", customerCode: "4014", dueDate: "2026-08-08", packageCode: "D200" },
    { taskId: "5", roomBed: "3-103", customerCode: "325", dueDate: "2026-12-07", packageCode: "D100" },
    { taskId: "6", roomBed: "6-126", customerCode: "641", dueDate: "2026-02-26", packageCode: "D200" },
    { taskId: "7", roomBed: "6-126", customerCode: "636", dueDate: "2026-10-28", packageCode: "D200" },
    { taskId: "8", roomBed: "8-202", customerCode: "816", dueDate: "2026-04-28", packageCode: "D150" },
    { taskId: "9", roomBed: "8-202", customerCode: "821", dueDate: "2026-04-28", packageCode: "D150" },
    { taskId: "10", roomBed: "8-202", customerCode: "835", dueDate: "2026-05-14", packageCode: "D0" },
    { taskId: "11", roomBed: "9-401", customerCode: "9321", dueDate: "2026-04-28", packageCode: "D100" }
  ]);

  for (const code of ["125", "144", "219", "4014", "325", "641", "636", "816", "821", "835", "9321"]) {
    assert.ok(text.includes(code), `${code} should be searchable`);
  }
  for (const forbidden of ["ttlock_card", "rent", "deposit", "source_type", "undefined", "null", "none", "\uFFFD"]) {
    assert.ok(!text.toLowerCase().includes(forbidden.toLowerCase()), `${forbidden} should not appear`);
  }
});

