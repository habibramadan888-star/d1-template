import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(
  new URL("../deploy-worker/public/employee-v3.html", import.meta.url),
  "utf8"
);

test("validation result synchronizes native and ARIA disabled state", () => {
  const start = source.indexOf("validate=function(){");
  const end = source.indexOf("renderSessionPreview=function(){", start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const block = source.slice(start, end);

  assert.match(block, /const blocked=Array\.isArray\(result\?\.errors\)&&result\.errors\.length>0;/);
  assert.match(block, /submit\.disabled=blocked;/);
  assert.match(block, /if\(blocked\)submit\.setAttribute\('aria-disabled','true'\);else submit\.removeAttribute\('aria-disabled'\);/);
  assert.doesNotMatch(block, /result\.errors\s*=\s*\[\]|force|bypass/i);
});
