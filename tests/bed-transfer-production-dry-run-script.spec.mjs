import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const docPath = new URL("../docs/BED_TRANSFER_PRODUCTION_DRY_RUN_SCRIPT.md", import.meta.url);

test("Bed Transfer production dry-run document exists and has the required safety contract", async () => {
  const doc = await readFile(docPath, "utf8");
  assert.match(doc, /GET \/api\/employee\/bed-context\?bed=<bed>/);
  assert.match(doc, /POST \/api\/employee\/entry\/validate/);
  assert.match(doc, /\/api\/employee\/bed-transfers/);
  assert.match(doc, /\/api\/employee\/entry/);
  assert.match(doc, /BED_TRANSFER_PRODUCTION_DRY_RUN_SCRIPT/);
  assert.match(doc, /dry_run: true/);
  assert.match(doc, /validate_only: true/);
  assert.match(doc, /no_write: true/);
  assert.match(doc, /source: "employee_entry"/);
  assert.match(doc, /event_type: "bed_transfer"/);
  assert.match(doc, /type: "TF"/);
  assert.match(doc, /bed 334 is not allowed/);
  assert.match(doc, /PRODUCTION_DRY_RUN_VERIFIED/);
  assert.match(doc, /NOT_VERIFIED/);
  assert.match(doc, /production_storage_changed: "unknown_not_fully_audited"/);
  assert.match(doc, /production_cutover: "PRODUCTION_NO_GO"/);
});

test("script includes all required safe dry-run cases and blocks write calls in executable code", async () => {
  const doc = await readFile(docPath, "utf8");
  const script = doc.match(/```js\r?\n([\s\S]*?)\r?\n```/)?.[1] || "";
  assert.ok(script, "browser-console script must be present");
  for (const caseName of [
    "146 -> 111 charged 50 AED",
    "146 -> 111 waived 0 AED with structured reason",
    "146 -> 146 same bed",
    "111 -> 146 source E/e",
    "146 -> 948 target not E/e",
    "948 -> 111 open arrears without carryover",
    "948 -> 111 wrong arrears ref or amount",
    "948 -> 111 exact arrears ref and full carryover",
    "146 -> 111 fee 49 AED",
    "146 -> 111 fee 51 AED"
  ]) assert.match(script, new RegExp(caseName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.doesNotMatch(script, /fetch\([^\n]*(?:bed-transfers|\/api\/employee\/entry['"])/);
  assert.doesNotMatch(script, /localStorage|sessionStorage|tenant_card_id|card_id|old_ttlock_ref|provider_phone|phone_99099/);
  assert.match(script, /allowedPaths\s*=\s*new Set\(\["\/api\/employee\/bed-context", "\/api\/employee\/entry\/validate"\]\)/);
  assert.match(script, /forbiddenBed/);
  assert.match(script, /exactlyOneOpenArrear/);
});
