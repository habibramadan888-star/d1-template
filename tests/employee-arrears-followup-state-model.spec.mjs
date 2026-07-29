import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

function extractLastFunction(source, name) {
  const signature = `function ${name}(`;
  const start = source.lastIndexOf(signature);
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

test("followup state model separates persisted, dirty, and gate-off states", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");
  const persisted = extractLastFunction(html, "employeeDirectiveHasPersistedFeedback");
  const dirty = extractLastFunction(html, "employeeDirectiveIsDirty");
  const update = extractLastFunction(html, "updateEmployeeDirectivePersistedState");
  const save = extractLastFunction(html, "saveEmployeeDirectiveFollowup");

  assert.match(persisted, /serverOriginalPromisedDate/);
  assert.match(persisted, /serverOriginalFollowupNote/);
  assert.match(dirty, /employeeDirectiveCurrentValues/);
  assert.match(dirty, /employeeDirectiveOriginalValues/);
  assert.match(update, /directiveDirty/);
  assert.match(update, /directivePersisted/);
  assert.match(update, /hasPersisted&&!dirty/);
  assert.match(save, /production_write_approval_required/);
});

test("saved unchanged state disables submit button instead of allowing gated write click", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");
  const update = extractLastFunction(html, "updateEmployeeDirectivePersistedState");

  assert.match(update, /btn\.disabled=true/);
  assert.match(update, /btn\.setAttribute\('aria-disabled','true'\)/);
  assert.match(update, /btn\.classList\.add\('disabled'\)/);
});

test("production cutover remains blocked", async () => {
  const gate = await readFile("scripts/gate-commercial-launch-readiness.mjs", "utf8");
  assert.match(gate, /PRODUCTION_NO_GO/);
});
