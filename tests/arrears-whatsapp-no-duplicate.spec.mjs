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

test("export chooses selected rows when selected rows exist", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const exportRows = extractLastFunction(js, "ownerArrearsExportRows");
  const exportFn = extractLastFunction(js, "exportArrearsWhatsApp");

  assert.match(exportRows, /const selected=ownerArrearsSelectedRows\(\)/);
  assert.match(exportRows, /return selected\.length\?selected:ownerArrearsFilteredRows\(\)/);
  assert.match(exportFn, /const rows=ownerArrearsExportRows\(\)/);
});

test("export de-duplicates rows before composing WhatsApp text", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const dedupe = extractLastFunction(js, "dedupeArrearsExportRows");
  const builder = extractLastFunction(js, "buildArrearsWhatsAppText");

  assert.match(dedupe, /const seen=new Set\(\)/);
  assert.match(dedupe, /seen\.has\(key\)/);
  assert.match(dedupe, /seen\.add\(key\)/);
  assert.match(builder, /dedupeArrearsExportRows\(rows\)\.slice\(0,120\)/);
  assert.doesNotMatch(builder, /preview_tasks|all_tasks/);
});

test("export does not append selected rows to filtered rows", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const exportRows = extractLastFunction(js, "ownerArrearsExportRows");

  assert.doesNotMatch(exportRows, /concat|push|\.\.\.selected.*\.\.\.ownerArrearsFilteredRows/s);
});
