import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const source=await fs.readFile(new URL('../deploy-worker/src/index.js',import.meta.url),'utf8');

test('existing bounded fail-closed gateway adds canonical transfer projection without a todo store',()=>{
  assert.match(source,/path === "\/api\/owner\/today-todos" && method === "GET"/);
  assert.match(source,/limit=Math\.min\(Math\.max\(Number\(opts\.limit\|\|100\),1\),500\)/);
  assert.match(source,/projectBedTransferOwnerTodos\(\{corpid:user\.corpid,archive_entries:archiveEntries,access_snapshots:transferSnapshots\}\)/);
  assert.match(source,/TODAY_TODO_GATEWAY_FAILED/);
  assert.match(source,/failed_closed:true/);
  assert.doesNotMatch(source,/CREATE TABLE[^\n]*todo/i);
  assert.doesNotMatch(source,/localStorage[^\n]*today/i);
});

test('existing deposit vacancy and source-driven resolution paths remain unchanged',()=>{
  assert.match(source,/DEPOSIT_D_RECONCILIATION_REQUIRED/);
  assert.match(source,/DEPOSIT_IN_ON_TTLOCK_VACANT_BED/);
  assert.match(source,/Access Snapshot D amount is updated/);
  assert.match(source,/The todo resolves when TTLock no longer shows E\/e/);
});

test('ack route is owner-only, disabled by default, local-only and inserts one canonical session',()=>{
  assert.match(source,/\/api\/owner\/today-todos\/acknowledge/);
  assert.match(source,/if\(!canWriteOwnerData\(user\)\)return forbidden\(\)/);
  assert.match(source,/OWNER_TODAY_TODO_ACK_ENABLED/);
  assert.match(source,/\["development","dev","local","test"\]/);
  assert.match(source,/OWNER_TODAY_TODO_ACK_DISABLED/);
  assert.match(source,/empInsertDynamicMode\(env,"sessions"/);
  assert.match(source,/source:"owner_review_acknowledgment"/);
  assert.match(source,/original_transfer_mutated:false,finance_mutated:false/);
});

test('gateway uses sanitized TTLock facts and retains production no-go',()=>{
  assert.match(source,/ownerTodayTodoSafeTransferSnapshot/);
  assert.doesNotMatch(source.slice(source.indexOf('function ownerTodayTodoSafeTransferSnapshot'),source.indexOf('__name\(ownerTodayTodoSafeTransferSnapshot')),/card_id|tenant_card_id|provider_phone|old_ttlock_ref/);
  assert.match(source,/production_cutover:"PRODUCTION_NO_GO"/);
});
