import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const ui=await readFile(new URL('../deploy-worker/public/index-51-main.js',import.meta.url),'utf8');
const block=name=>{const start=ui.indexOf(`function ${name}`);assert.ok(start>=0,name);const next=ui.indexOf('\nfunction ',start+10);return ui.slice(start,next<0?ui.length:next);};

test('all three Bed Transfer Todo codes have code-specific UI',()=>{
  const renderer=block('ownerBedTransferTodoRowHtml');
  for(const code of ['BED_TRANSFER_TTLOCK_MOVE_REQUIRED','BED_TRANSFER_FEE_WAIVER_REVIEW_REQUIRED','BED_TRANSFER_VOID_FINANCIAL_RECONCILIATION_REQUIRED'])assert.match(renderer,new RegExp(code));
  assert.match(renderer,/请老板将 TTLock 信息/);
  assert.match(renderer,/免责声明原因/);
  assert.match(renderer,/不会自动退款/);
});

test('TTLock Todo shows D MMDD expiry warnings and has no force-complete control',()=>{
  assert.match(block('ownerTodoPhysicalSummary'),/parsed_deposit_amount/);
  assert.match(block('ownerTodoPhysicalSummary'),/parsed_checkin_mmdd/);
  assert.match(block('ownerTodoPhysicalSummary'),/normalized_expiry_value/);
  assert.doesNotMatch(block('ownerBedTransferTodoRowHtml'),/强制完成|force.complete/i);
});

test('waiver acknowledgment sends only the minimal legal contract',()=>{
  const ack=block('acknowledgeOwnerBedTransferWaiver');
  assert.match(ack,/\/api\/owner\/today-todos\/acknowledge/);
  assert.match(ack,/JSON\.stringify\(\{transfer_anchor_id:id,review_code:'BED_TRANSFER_FEE_WAIVER_REVIEW_REQUIRED',action:'acknowledged'\}\)/);
  assert.doesNotMatch(ack,/fee_amount|transfer_lineage_id|corpid|provider|phone|localStorage|LS\./i);
});

test('ack disabled is not success and success refetches Gateway',()=>{
  const ack=block('acknowledgeOwnerBedTransferWaiver');
  assert.match(ack,/OWNER_TODAY_TODO_ACK_DISABLED/);
  assert.match(ack,/老板已读写入尚未启用/);
  assert.match(ack,/await loadOwnerTodayTodos\(\)/);
  assert.match(ack,/state\.ownerTodayTodosStatus!=='success'/);
});

test('resolved Todo visibility follows Gateway rows and no local acknowledgment truth exists',()=>{
  assert.match(block('ownerOverviewTodayTodoRows'),/data\.todos/);
  assert.doesNotMatch(block('acknowledgeOwnerBedTransferWaiver'),/localStorage|sessionStorage|LS\./);
});
