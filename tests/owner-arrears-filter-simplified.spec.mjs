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

test("owner arrears filter only exposes all ttlock and existing arrears", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const normalize = extractLastFunction(js, "normalizeArrearFilter");
  const controls = extractLastFunction(js, "renderOwnerArrearsControls");

  assert.match(normalize, /'all','ttlock_expired_unpaid','existing_arrears_record'/);
  assert.match(controls, /\['all','全部'\]/);
  assert.match(controls, /\['ttlock_expired_unpaid','通通锁已过期'\]/);
  assert.match(controls, /\['existing_arrears_record','系统已有欠款'\]/);
  for (const forbidden of ["pending", "promised", "overdue", "not_requested", "current_due_unpaid"]) {
    assert.doesNotMatch(controls, new RegExp(`\\['${forbidden}'`));
  }
});

test("filter is applied to summary list selection and WhatsApp export source", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const filteredRows = extractLastFunction(js, "ownerArrearsFilteredRows");
  const exportText = extractLastFunction(js, "exportArrearsWhatsApp");

  assert.match(filteredRows, /normalizeArrearFilter\(state\.arrearFilter\)/);
  assert.match(filteredRows, /normalizeArrearsSourceType\(a\?\.sourceType\)===filter/);
  assert.match(exportText, /ownerArrearsFilteredRows\(\)/);
});
