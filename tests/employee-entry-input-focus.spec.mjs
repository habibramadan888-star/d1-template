import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const employeePath = "deploy-worker/public/employee-v3.html";

test("employee Entry keeps the active template mounted while typing", async () => {
  const html = await readFile(employeePath, "utf8");

  assert.match(html, /function employeeEntryActiveEditable\(\)/);
  assert.match(html, /const existingBody=mount\.querySelector\(':scope > \.event-template-fields'\);/);
  assert.match(
    html,
    /if\(mount\.dataset\.eventTemplate===key&&existingBody\)\{\s*mount\.dataset\.eventType=template\.event_type;\s*renderEmployeeBedInfoStrips\(\);\s*return template;\s*\}/s,
    "same event template must not be replaceChildren-remounted during input"
  );

  const mountFunction = html.match(/function employeeMountEntryTemplate[\s\S]*?function eventLabel/);
  assert.ok(mountFunction, "employeeMountEntryTemplate should exist");
  assert.ok(
    mountFunction[0].indexOf("mount.dataset.eventTemplate===key&&existingBody") <
      mountFunction[0].indexOf("mount.replaceChildren(head,body)"),
    "same-template guard must run before replaceChildren"
  );
});

test("employee Entry does not move required/reference sections while an input is active", async () => {
  const html = await readFile(employeePath, "utf8");

  assert.match(
    html,
    /if\(!employeeEntryActiveEditable\(\)\)employeePrioritizeEntryInputs\(\);/,
    "layout reparenting must be skipped while an Entry input or textarea is focused"
  );
  assert.match(html, /employeeRenderOpenArrearsAlert\(\);/);
});

test("bed lookups are debounced so typing does not trigger full lookup per character", async () => {
  const html = await readFile(employeePath, "utf8");

  assert.match(html, /let employeeBedLookupTimer=null;/);
  assert.match(html, /function employeeScheduleLookupBed\(\)/);
  assert.match(html, /setTimeout\(\(\)=>\{\s*employeeBedLookupTimer=null;\s*lookupBed\(\);\s*\},250\);/s);
  assert.match(
    html,
    /\$\(\'bed\'\)\.addEventListener\('input',\(\)=>\{if\(\$\(\'entryType\'\)\.value===\'TF\'\)\$\(\'transferFromBed\'\)\.value=\$\(\'bed\'\)\.value\.trim\(\)\.replace\(\/\^#\/,''\);employeeScheduleLookupBed\(\);/
  );
  assert.match(
    html,
    /\$\(\'transferFromBed\'\)\.addEventListener\('input',\(\)=>\{if\(\$\(\'entryType\'\)\.value===\'TF\'\)\{\$\(\'bed\'\)\.value=\$\(\'transferFromBed\'\)\.value\.trim\(\)\.replace\(\/\^#\/,''\);employeeScheduleLookupBed\(\);syncForm\(\);\}\}\);/
  );
});
