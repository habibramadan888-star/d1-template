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

test("owner batch control labels selected rows as a dry-run list, not real sent count", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const updateButton = extractLastFunction(js, "updateArrearDirectiveButtonState");
  const controls = extractLastFunction(js, "renderOwnerArrearsControls");

  assert.match(updateButton, /生成下发清单/);
  assert.match(updateButton, /checkedCount/);
  assert.match(controls, /生成下发清单/);
  assert.doesNotMatch(updateButton, /已下发.*checkedCount|员工已收到|真实下发/);
});

test("owner dry-run action does not call the persisted directive write API", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const send = extractLastFunction(js, "sendArrearDirectives");

  assert.match(send, /ownerArrearsSelectedRows\(\)/);
  assert.match(send, /buildArrearsWhatsAppText\(rows\)/);
  assert.match(send, /dry-run/);
  assert.match(send, /未写入员工端/);
  assert.match(send, /员工不会收到这些任务/);
  assert.doesNotMatch(send, /apiFetch\(|\/api\/boss\/arrears\/directives|method:\s*['"]POST['"]/);
});

test("production cutover remains blocked", async () => {
  const gate = await readFile("scripts/gate-commercial-launch-readiness.mjs", "utf8");
  assert.match(gate, /PRODUCTION_NO_GO/);
});
