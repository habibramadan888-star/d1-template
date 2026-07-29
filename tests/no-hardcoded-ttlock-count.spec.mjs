import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("current TTLock counts are not hardcoded in live SOT paths", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");
  const ui = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const combined = `${worker}\n${html}\n${ui}`;

  for (const count of ["23", "33", "41", "55"]) {
    assert.doesNotMatch(combined, new RegExp(`ttlock[^\\n;]{0,100}${count}`, "i"));
    assert.doesNotMatch(combined, new RegExp(`${count}[^\\n;]{0,100}ttlock`, "i"));
  }
  assert.match(worker, /source:"owner_console_current_view"/);
});
