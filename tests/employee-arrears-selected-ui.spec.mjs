import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("employee arrears selector clearly shows selected cloud arrears", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");

  assert.match(html, /const selectedRef=String\(\$\(\'linkedTaskId\'\)\?\.value\|\|state\.selectedArrearsTaskRef\|\|''\)\.trim\(\)/);
  assert.match(html, /const isSelected=!!selectedRef&&m\.ref===selectedRef/);
  assert.match(html, /Arrears Selected/);
  assert.match(html, /selected_arrears_ref:/);
  assert.match(html, /data-selected-arrears="\$\{isSelected\?'true':'false'\}"/);
  assert.match(html, /\.open-arrears-item\.selected/);
  assert.match(html, /\.open-arrears-select\.selected/);
  assert.match(html, /employeeRenderOpenArrearsAlert\(\);\s*\n\s*validate\(\);/);
});
