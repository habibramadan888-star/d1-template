import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const source = await fs.readFile(new URL('../deploy-worker/src/index.js', import.meta.url), 'utf8');

test('canonical AP remains synced after debt closes while AP void remains cloud voided', () => {
  assert.match(source, /status:"cloud_confirmed",sync_status:"SYNCED"/);
  assert.match(source, /syncStatus=corrected\?"CLOUD_CORRECTED":\(voided\?"CLOUD_VOIDED":"CLOUD_DELETED"\)/);
  assert.match(source, /cloudEntries=extractEmployeeEntryAnchorsFromSession\(session\)/);
});

test('later source transfer void requires reconciliation and local synced flag is not authoritative', () => {
  assert.match(source, /status:"cloud_source_reconciliation",sync_status:"OWNER_REVIEW_REQUIRED"/);
  assert.match(source, /source_transfer_voided_reconciliation_required/);
  assert.match(source, /cloud_authoritative:true/);
  assert.doesNotMatch(source, /if\(entry\?\.sync_status==="SYNCED"\)/);
});
