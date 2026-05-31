import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} must exist`);
  const argsOpen = source.indexOf("(", start);
  let parenDepth = 0;
  let argsClose = -1;
  for (let i = argsOpen; i < source.length; i += 1) {
    if (source[i] === "(") parenDepth += 1;
    if (source[i] === ")") parenDepth -= 1;
    if (parenDepth === 0) {
      argsClose = i;
      break;
    }
  }
  const open = source.indexOf("{", argsClose);
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === "{") depth += 1;
    if (source[i] === "}") depth -= 1;
    if (depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`Could not extract ${name}`);
}

test("existing arrears rows remain a first-class source in backend and frontend", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const apiMap = extractFunction(worker, "empTaskToBossArrear");
  const loader = extractFunction(js, "loadArrearsForOwner");

  assert.match(apiMap, /"existing_arrears_record"/);
  assert.match(worker, /source_status\.existing_arrears_record=empSourceStatus\(true/);
  assert.match(loader, /const existingRows=rawExistingRows\.filter/);
  assert.match(loader, /existingArrearsRecords:existingRows/);
});

test("TTLock source failure does not hide existing arrears", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const loader = extractFunction(js, "loadArrearsForOwner");

  assert.match(loader, /Promise\.allSettled/);
  assert.match(loader, /if\(!existingOk&&!ttlockStatusOk\)/);
  assert.match(loader, /existingOk\s*\?\s*\{ok:true/);
  assert.match(loader, /ttlockStatusOk/);
});
