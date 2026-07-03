import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const htmlPath = "deploy-worker/public/employee-v3.html";

test("Bed Transfer from/to bed inputs can be cleared before validation", async () => {
  const html = await readFile(htmlPath, "utf8");

  const genericListener =
    html
      .split(/\r?\n/)
      .find(
        (line) =>
          line.includes("'entryType','cycle'") &&
          line.includes(".addEventListener('input',syncForm)")
      ) || "";

  assert.doesNotMatch(
    genericListener,
    /transferFromBed/,
    "From Bed must not run generic syncForm before it clears the hidden bed value."
  );
  assert.match(genericListener, /bedTo/, "To Bed remains a normal controlled input and can be empty.");
  assert.match(
    html,
    /\$\(\'transferFromBed\'\)\.addEventListener\('input',\(\)=>\{if\(\$\(\'entryType\'\)\.value===\'TF\'\)\{\$\(\'bed\'\)\.value=\$\(\'transferFromBed\'\)\.value\.trim\(\)\.replace\(\s*\/\^#\/,\s*\'\'\);lookupBed\(\);syncForm\(\);\}\}\);/
  );
  assert.match(html, /if\(type==='TF'&&!\$\(\'transferFromBed\'\)\.value\.trim\(\)\)errors\.push/);
  assert.match(html, /if\(type==='TF'&&!\$\(\'bedTo\'\)\.value\.trim\(\)\)errors\.push/);
});

test("production cutover remains blocked", async () => {
  const gate = await readFile("scripts/gate-commercial-launch-readiness.mjs", "utf8");
  assert.match(gate, /PRODUCTION_NO_GO/);
});
