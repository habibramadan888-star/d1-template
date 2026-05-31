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

test("WhatsApp export is actionable and has manual fallback", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const exportFn = extractLastFunction(js, "exportArrearsWhatsApp");
  const fallback = extractLastFunction(js, "showArrearsWhatsAppFallback");

  assert.match(exportFn, /ownerArrearsExportRows\(\)/);
  assert.match(exportFn, /navigator\.clipboard\?\.writeText/);
  assert.match(exportFn, /window\.open/);
  assert.match(exportFn, /showArrearsWhatsAppFallback/);
  assert.match(fallback, /textarea/);
  assert.match(fallback, /打开 WhatsApp/);
  assert.doesNotMatch(exportFn, /apiFetch\(|method:\s*['"]POST['"]/);
});

test("WhatsApp text is built from the backend SOT display rows", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const build = extractLastFunction(js, "buildArrearsWhatsAppText");

  assert.match(build, /rows=ownerArrearsExportRows\(\)/);
  assert.match(build, /naturalArrearRoomBedKey/);
  assert.match(build, /arrearsWhatsappCustomerCode/);
  assert.match(build, /arrearsWhatsappDateCode/);
  assert.match(build, /Due \$\{arrearsWhatsappDueHeader\(list\)\} \| \$\{overdueCount\} overdue/);
});
