import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const workerPath='deploy-worker/src/index.js';
const employeePath='deploy-worker/public/employee-v3.html';

function block(source,startMarker,endMarker){
  const start=source.indexOf(startMarker);
  const end=source.indexOf(endMarker,start);
  assert.ok(start>=0,`${startMarker} not found`);
  assert.ok(end>start,`${endMarker} not found after ${startMarker}`);
  return source.slice(start,end);
}

test('employee sync-state authority is limited to raw session and entry-event receipts',async()=>{
  const source=await readFile(workerPath,'utf8');
  const sync=block(source,'async function handleEmployeeEntrySyncState','__name(handleEmployeeEntrySyncState');
  assert.match(sync,/extractEmployeeEntryAnchorsFromSession\(session\)/);
  assert.match(sync,/FROM entry_events/);
  assert.match(sync,/ref_type='employee_raw_entry'/);
  assert.match(sync,/event_type='raw_ingestion_accepted'/);
  assert.doesNotMatch(sync,/FROM transactions|persistedTransactionIds|transaction_entry_id/);
  assert.doesNotMatch(sync,/rebuildAllCloudArrears|effectiveTransferAnchorIds|source_transfer_voided/);
});

test('employee sync-state lookup is bounded and remains non-writing',async()=>{
  const source=await readFile(employeePath,'utf8');
  const sync=block(source,'async function reconcileEmployeeCloudSyncState','function currentSessionId');
  assert.match(sync,/new AbortController\(\)/);
  assert.match(sync,/setTimeout\(\(\)=>controller\.abort\(\),5000\)/);
  assert.match(sync,/signal:controller\?\.signal/);
  assert.match(sync,/no_write:true/);
  assert.match(sync,/finally\{/);
  assert.match(sync,/clearTimeout\(timeoutId\)/);
});
