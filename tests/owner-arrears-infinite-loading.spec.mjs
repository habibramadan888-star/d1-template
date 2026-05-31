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

test("arrears loader has a closed loading state machine", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const load = extractFunction(js, "loadArrearsForOwner");
  const panel = extractFunction(js, "renderOwnerOverviewArrearsPanel");

  assert.match(js, /ARREARS_FETCH_TIMEOUT_MS=10000/);
  assert.match(js, /ARREARS_SLOW_LOADING_MS=3000/);
  assert.match(js, /arrearsStatus:'idle'/);
  assert.match(load, /state\.arrearsStatus='loading'/);
  assert.match(load, /state\.arrearsStatus=state\.arrears\.length\?'success':'empty'/);
  assert.match(load, /state\.arrearsStatus='timeout'/);
  assert.match(load, /state\.arrearsStatus='error'/);
  assert.match(load, /finally/);
  assert.match(load, /state\.arrearsLoading=false/);
  assert.match(panel, /读取超时，请重试/);
  assert.match(panel, /retryOwnerOverviewArrears/);
});

test("abort and duplicate request paths cannot leave permanent skeleton", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const load = extractFunction(js, "loadArrearsForOwner");

  assert.match(load, /loadSeq!==state\.arrearsLoadSeq/);
  assert.match(load, /isAbortLikeError\(e\)/);
  assert.doesNotMatch(
    load,
    /if\(isAbortLikeError\(e\)\)\{\s*if\(showLoading\)showArrearsLoading\(\);\s*return false;\s*\}/
  );
  assert.match(load, /请求已中断，请重试|读取超时，请重试/);
});

test("production cutover remains no-go", async () => {
  const gate = await readFile("scripts/gate-commercial-launch-readiness.mjs", "utf8");
  assert.match(gate, /Overall: `PRODUCTION_NO_GO`/);
});
