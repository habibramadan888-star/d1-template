import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workerPath = new URL("../deploy-worker/src/index.js", import.meta.url);
const employeePath = new URL("../deploy-worker/public/employee-v3.html", import.meta.url);

function functionBlock(source, name) {
  const start = source.search(new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`));
  assert.notEqual(start, -1, `${name} must exist`);
  const marker = `__name(${name},`;
  const end = source.indexOf(marker, start);
  if (end > start) return source.slice(start, end);
  let depth = 0;
  let seenBody = false;
  for (let i = start; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === "{") {
      depth += 1;
      seenBody = true;
    } else if (ch === "}") {
      depth -= 1;
      if (seenBody && depth === 0) return source.slice(start, i + 1);
    }
  }
  assert.fail(`${name} must close`);
}

function constBlock(source, name) {
  const start = source.indexOf(`const ${name}=`);
  assert.notEqual(start, -1, `${name} must exist`);
  const end = source.indexOf("};", start);
  assert.ok(end > start, `${name} must end`);
  return source.slice(start, end + 2);
}

test("normal Checkout validates bed, type, date and rejects open arrears", async () => {
  const worker = await readFile(workerPath, "utf8");
  const backend = functionBlock(worker, "validateCheckoutUploadFields");
  const payload = functionBlock(worker, "validateEmployeeEntryUploadPayload");
  const ui = functionBlock(await readFile(employeePath, "utf8"), "validateCheckoutEntry");

  assert.match(backend, /missing\.push\("bed"\)/);
  assert.match(backend, /missing\.push\("checkout_type"\)/);
  assert.match(backend, /missing\.push\("checkout_date"\)/);
  assert.match(payload, /CHECKOUT_OPEN_ARREARS_LEFT_WITH_ARREARS_REQUIRED/);
  assert.match(payload, /Normal checkout is not allowed/);
  assert.match(ui, /Normal checkout is not allowed/);
  assert.doesNotMatch(backend, /period_start|periodDue|list_price/);
});

test("Left With Arrears requires current readiness fields only", async () => {
  const worker = await readFile(workerPath, "utf8");
  const backend = functionBlock(worker, "validateCheckoutUploadFields");
  const payload = functionBlock(worker, "validateEmployeeEntryUploadPayload");
  const ui = functionBlock(await readFile(employeePath, "utf8"), "validateCheckoutEntry");

  for (const required of ["left_date", "left_arrears_amount", "promised_payment_date", "note"]) {
    assert.match(backend, new RegExp(`missing\\.push\\("${required}"\\)`), `${required} must be required by event validator`);
    assert.match(payload, new RegExp(`missing\\.push\\("${required}"\\)`), `${required} must be required by upload validator`);
  }

  assert.match(backend, /contact_phone_or_method/);
  assert.match(payload, /contact_phone_or_method/);
  assert.match(ui, /Phone or Contact Method is required/);
  assert.match(ui, /Note is required for Left With Arrears/);
  assert.doesNotMatch(backend, /missing\.push\("confirmed_not_returning_date"\)/);
  assert.doesNotMatch(backend, /missing\.push\("belongings_held"\)/);
  assert.doesNotMatch(payload, /missing\.push\("confirmed_not_returning_date"\)/);
  assert.doesNotMatch(payload, /missing\.push\("belongings_held"\)/);
});

test("Checkout anchor is clean and preserves structured ENTRY ANCHORS JSON fields", async () => {
  const worker = await readFile(workerPath, "utf8");
  const normalizer = functionBlock(worker, "normalizeEntryAnchor");
  const renderer = functionBlock(worker, "renderEntryAnchorForOwner");
  const allowed = constBlock(worker, "employeeSourceFirewallAllowedFields");
  const checkoutAllowed = allowed.match(/CO:\[[^\]]+\]/s)?.[0] || "";

  for (const field of [
    "checkout_date",
    "checkout_type",
    "checkout_mode",
    "left_with_arrears",
    "left_arrears_amount",
    "cloud_arrears_ref",
    "whatsapp_phone",
    "contact_method",
    "promised_payment_date",
    "final_note"
  ]) {
    assert.match(normalizer, new RegExp(field), `${field} must be normalized for Checkout`);
    assert.match(checkoutAllowed, new RegExp(field), `${field} must be allowed for Checkout`);
  }

  assert.match(renderer, /checkout/);
  assert.match(renderer, /left_with_arrears/);
  assert.match(worker, /employeeEntryExportTextWithAnchors/);

  for (const forbidden of ["tenant_card_id", "card_id", "old_ttlock_ref", "provider_phone", "phone_99099"]) {
    assert.doesNotMatch(checkoutAllowed, new RegExp(forbidden), `${forbidden} must not be allowed as Checkout identity`);
  }
});

test("Checkout does not define physical vacancy and occupancy warnings feed Today Todo", async () => {
  const worker = await readFile(workerPath, "utf8");
  const physical = functionBlock(worker, "canonicalOccupancyPhysicalBedStatus");
  const resolve = functionBlock(worker, "canonicalOccupancyResolveStatusFromAccess");
  const warnings = functionBlock(worker, "canonicalOccupancyConflictWarnings");
  const todo = functionBlock(worker, "ownerTodayTodoBuildDepositAndOccupancy");

  assert.match(physical, /access_snapshot_E_marker/);
  assert.match(resolve, /physical\.physical_bed_status==="vacant"/);
  assert.match(warnings, /TTLOCK_VACANT_WITHOUT_CHECKOUT_EVENT/);
  assert.match(warnings, /CHECKOUT_EVENT_WITHOUT_TTLOCK_E/);
  assert.match(todo, /TTLOCK_VACANT_WITHOUT_CHECKOUT_EVENT/);
  assert.match(todo, /CHECKOUT_EVENT_WITHOUT_TTLOCK_E/);
  assert.doesNotMatch(resolve, /latestCheckout\)\s*return\s*"vacant"/);
});
