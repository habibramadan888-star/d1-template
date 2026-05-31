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
    const arrearBedLabel = (a) => cleanArrearText(a.roomBed || a.room_bed || a.bed || a.bed_no, "床位待确认");
    const naturalArrearRoomBedKey = (a) => String(arrearBedLabel(a) || "床位待确认").replace(/^#/, "").trim();
    const fmtD = () => "2026-05-31";
    const ownerArrearsExportRows = () => rows;
    ${funcs}
    return buildArrearsWhatsAppText(rows);
    `
  );
}

const fixtureRows = [
  { taskId: "a", roomBed: "1-102", customerCode: "134", dueDate: "2026-05-25", packageCode: "D200" },
  { taskId: "b", roomBed: "2-219", customerCode: "219", dueDate: "2026-05-08", packageCode: "D200" },
  { taskId: "c", roomBed: "2-219", customerCode: "4014", dueDate: "2026-08-08", packageCode: "D200" },
  { taskId: "d", roomBed: "3-103", customerCode: "325", dueDate: "2026-05-07", packageCode: "D100" },
  { taskId: "e", roomBed: "8-202", customerCode: "835", dueDate: "2026-05-31", packageCode: "rent", remain: 20 }
];

test("WhatsApp arrears export uses final staff follow-up baseline", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const text = buildHarness(js)(fixtureRows);

  assert.match(text.split("\n")[0], /^Due \d{1,2}\/\d{1,2} \| \d+ overdue$/);
  assert.match(text, /\n---\n/);
  assert.match(text, /【1-102】/);
  assert.match(text, /134\s+6d\*\s+D200\s+0525/);
  assert.match(text, /219\s+23d\*\s+D200\s+0508/);
  assert.match(text, /4014\s+Due\s+D200\s+0808/);
  assert.match(text, /835\s+Due\s+D20\s+0531/);
});

test("WhatsApp baseline omits raw source and internal/debug fields", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const text = buildHarness(js)(fixtureRows);

  for (const forbidden of [
    "ttlock_card",
    "ttlock_expired_unpaid",
    "existing_arrears_record",
    "rent",
    "deposit",
    "source_type",
    "#ttlock-expired",
    "undefined",
    "null",
    "none",
    "🔥",
    "�"
  ]) {
    assert.doesNotMatch(text, new RegExp(forbidden, "i"));
  }
});

test("production cutover remains blocked", async () => {
  const gate = await readFile("scripts/gate-commercial-launch-readiness.mjs", "utf8");
  assert.match(gate, /PRODUCTION_NO_GO/);
});
