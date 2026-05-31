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

test("arrears timeout abort is classified and not rendered as user-facing API failure", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const timeoutFetch = extractFunction(js, "apiFetchWithTimeout");
  const abortLike = extractFunction(js, "isAbortLikeError");
  const load = extractFunction(js, "loadArrearsForOwner");

  assert.match(
    timeoutFetch,
    /controller\.abort\(new DOMException\('Request timed out', 'TimeoutError'\)\)/
  );
  assert.match(abortLike, /AbortError/);
  assert.match(abortLike, /TimeoutError/);
  assert.match(abortLike, /aborted/);
  assert.ok(load.indexOf("if(isAbortLikeError(e))") < load.indexOf("showArrearsLoadError(e)"));
  assert.doesNotMatch(js, /signal is aborted without reason/);
});

test("arrears duplicate fetches are sequenced so stale requests cannot overwrite current view", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const load = extractFunction(js, "loadArrearsForOwner");

  assert.match(js, /arrearsLoadSeq:0/);
  assert.match(load, /const loadSeq=\(state\.arrearsLoadSeq\|\|0\)\+1/);
  assert.match(load, /if\(loadSeq!==state\.arrearsLoadSeq\)return false/);
  assert.match(load, /if\(loadSeq===state\.arrearsLoadSeq\)\{/);
  assert.match(load, /state\.arrearsLoading=false/);
});
