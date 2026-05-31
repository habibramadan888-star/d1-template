import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

function extractLastFunction(source, name) {
  const start = source.lastIndexOf(`function ${name}(`);
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

test("searchable identifiers are emitted as continuous ASCII substrings", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const customer = extractLastFunction(js, "arrearsWhatsappCustomerCode");
  const builder = extractLastFunction(js, "buildArrearsWhatsAppText");

  assert.match(customer, /replace\(\/\[\^\\w-\]\/g,''\)/);
  for (const token of ["customerCode", "cardCode", "tenantCardId"]) {
    assert.match(customer, new RegExp(token));
  }
  for (const token of ["【${bed}】", "arrearsWhatsappCustomerCode", "arrearsWhatsappDateCode"]) {
    assert.match(builder, token.includes("$") ? /\u3010\$\{bed\}\u3011/ : new RegExp(token));
  }
});

test("final baseline protects known searchable examples", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const builder = extractLastFunction(js, "buildArrearsWhatsAppText");

  assert.match(builder, /localeCompare\(b,undefined,\{numeric:true,sensitivity:'base'\}\)/);
  assert.doesNotMatch(builder, /split\(''\)|join\(' '\)/);
  assert.match(builder, /lines\.push\(`\$\{arrearsWhatsappCustomerCode\(a\)\}\s\s/);
});
