import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("owner mobile layout keeps employee-style cards, nav, forms, and table containment", async () => {
  const owner = await readFile("deploy-worker/public/index.html", "utf8");

  assert.match(owner, /@media\(max-width:720px\)/);
  assert.match(owner, /\.owner-ui-unified \.card\{border-radius:26px\}/);
  assert.match(
    owner,
    /\.owner-ui-unified \.kpi-strip\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/
  );
  assert.match(owner, /\.owner-ui-unified \.form-row\{grid-template-columns:1fr\}/);
  assert.match(
    owner,
    /\.owner-ui-unified \.nav\{display:grid;grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/
  );
  assert.match(owner, /\.owner-ui-unified \.nav-btn\{min-width:0!important;width:100%/);
  assert.match(owner, /\.owner-ui-unified \.owner-admin-tool\{display:none\}/);
  assert.match(owner, /\.owner-ui-unified \.tx-table\{min-width:620px\}/);
});

test("owner alternate entry keeps the same mobile alignment layer", async () => {
  const ownerAlt = await readFile("deploy-worker/public/index-51.html", "utf8");

  assert.match(ownerAlt, /@media\(max-width:720px\)/);
  assert.match(ownerAlt, /\.owner-ui-unified \.card\{border-radius:26px\}/);
  assert.match(
    ownerAlt,
    /\.owner-ui-unified \.nav\{display:grid;grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/
  );
  assert.match(ownerAlt, /\.owner-ui-unified \.nav-btn\{min-width:0!important;width:100%/);
  assert.match(
    ownerAlt,
    /\.owner-ui-unified \.inp,\.owner-ui-unified \.sel,\.owner-ui-unified \.ta\{font-size:16px\}/
  );
});

test("employee mobile design remains linked to the shared token file without deleting employee CSS", async () => {
  const employee = await readFile("deploy-worker/public/employee-v3.html", "utf8");

  assert.match(employee, /shared-design-tokens\.css/);
  assert.match(employee, /@media\(max-width:720px\)/);
  assert.match(employee, /\.page-title\{font-size:38px\}/);
  assert.match(employee, /\.card\{border-radius:26px;margin-bottom:18px\}/);
});
