import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../deploy-worker/public/index-51-main.js', import.meta.url), 'utf8');

test('Owner History offers exact canonical transfer void without using generic delete', () => {
  assert.match(source, /exactBetaTransferVoidCandidate=.*s\.source==='employee_entry'.*cnt===1.*gross_received/s);
  assert.match(source, /data-act="void-transfer">Void Transfer/);
  const start = source.indexOf("if(a.dataset.act==='void-transfer')");
  const end = source.indexOf("}else if(a.dataset.act==='del')", start);
  assert.ok(start >= 0 && end > start);
  const block = source.slice(start, end);
  assert.match(block, /\/api\/session_detail\?id=/);
  assert.match(block, /rows\.length!==1\|\|transfers\.length!==1/);
  assert.match(block, /BED_TRANSFER_VOID_EXACT_SESSION_REQUIRED/);
  assert.match(block, /transfer_anchor_id\|\|transfers\[0\]\?\.anchor_id\|\|transfers\[0\]\?\.event_id\|\|s\.anchorId/);
  assert.match(block, /\/api\/owner\/bed-transfer\/void/);
  assert.match(block, /CONTROLLED_BETA_TEST_CLEANUP/);
  assert.doesNotMatch(block, /\/api\/delete_session/);
});
