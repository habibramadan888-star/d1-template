import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("owner Bed Transfer records show fee, waiver, entry event, and audit anchors", async () => {
  const ownerJs = await readFile("deploy-worker/public/index-51-main.js", "utf8");

  assert.match(ownerJs, /data-owner-bed-transfer-records="true"/);
  assert.match(ownerJs, /fee_mode\|\|'charged'/);
  assert.match(ownerJs, /Waived \/ 已豁免/);
  assert.match(ownerJs, /amount_fils\?\?t\.transfer_fee_fils\?\?5000/);
  assert.match(ownerJs, /Waiver:/);
  assert.match(ownerJs, /entry \$\{esc\(t\.entry_event_id\|\|'-'\)\}/);
  assert.match(ownerJs, /audit \$\{esc\(t\.audit_id\|\|'-'\)\}/);
  assert.doesNotMatch(ownerJs, /approve.*Bed Transfer/i);
  assert.doesNotMatch(ownerJs, /reject.*Bed Transfer/i);
});
