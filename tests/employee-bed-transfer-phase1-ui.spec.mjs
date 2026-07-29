import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const htmlPath = new URL('../deploy-worker/public/employee-v3.html', import.meta.url);
const html = await readFile(htmlPath, 'utf8');

function functionBlock(name) {
  const start = html.indexOf(`function ${name}`);
  assert.ok(start >= 0, `${name} must exist`);
  const next = html.indexOf('\nfunction ', start + 10);
  return html.slice(start, next < 0 ? html.length : next);
}

test('seven-event selector remains unchanged and uses the existing Bed Transfer item', () => {
  const eventTypes = [...html.matchAll(/class="event-chip"[^>]*data-type="([^"]+)"/g)].map(match => match[1]);
  assert.equal(eventTypes.length, 7);
  assert.equal(eventTypes.filter(type => type === 'TF').length, 1);
});

test('Bed Transfer form has canonical fee and difference choices without editable transfer time', () => {
  for (const id of ['transferFromBed','bedTo','transferReason','feePaid','transferFeePaymentMethod','transferWaiverReason','transferFeeDueDate','bedDifferenceMode','bedDifferenceAmount','bedDifferencePaymentMethod','bedDifferenceDueDate','bedDifferenceReason','bedTransferSourceContext','bedTransferTargetContext','bedTransferSequenceResult','bedTransferServerValidation']) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(html, /id="feePaid"[\s\S]*?value="paid"[\s\S]*?value="waived"[\s\S]*?value="unpaid"/);
  assert.match(html, /id="bedDifferenceMode"[\s\S]*?value="none"[\s\S]*?value="paid"[\s\S]*?value="unpaid"/);
  assert.doesNotMatch(html, /id="transferDate"|data-bed-transfer-date|transfer_date|transfer_at|canonical_accepted_at|accepted_at/);
});

test('local validation blocks required, same-bed and 334 cases and enforces fee/difference modes', () => {
  const block = functionBlock('validateBedTransferEntry');
  assert.match(block, /From Bed is required/);
  assert.match(block, /To Bed is required/);
  assert.match(block, /from===to/);
  assert.match(block, /from==='334'\|\|to==='334'/);
  assert.match(block, /feeMode==='paid'[\s\S]*transferFeePaymentMethod/);
  assert.match(block, /feeMode==='waived'[\s\S]*transferWaiverReason/);
  assert.match(block, /feeMode==='unpaid'[\s\S]*transferFeeDueDate/);
  assert.match(block, /differenceMode==='paid'[\s\S]*bedDifferencePaymentMethod/);
  assert.match(block, /differenceMode==='unpaid'[\s\S]*bedDifferenceDueDate/);
});

test('UI loads both canonical Bed Contexts and displays server-derived TTLock sequence messages', () => {
  const loader = functionBlock('employeeLoadBedTransferContexts');
  assert.equal((loader.match(/\/api\/employee\/bed-context\?bed=/g) || []).length, 2);
  assert.match(loader, /Promise\.all/);
  const renderer = functionBlock('employeeRenderBedTransferServerValidation');
  assert.match(renderer, /换床记录提交后，请老板将通通锁信息从来源床移动到目标床。/);
  assert.match(renderer, /系统已识别老板先完成通通锁移动，本次按现场换床记录提交。/);
  assert.match(renderer, /no_write_requested===true/);
});

test('Bed Context display does not expose provider/card/phone identity fields', () => {
  const safe = functionBlock('employeeBedTransferSafeContext');
  assert.doesNotMatch(safe, /provider|card_id|tenant_card|phone_99099|creator_phone/i);
  assert.match(safe, /physical_status/);
  assert.match(safe, /deposit_amount/);
  assert.match(safe, /mmdd/);
  assert.match(safe, /expiry/);
  assert.match(safe, /open_arrears_count/);
  assert.match(safe, /rent_coverage/);
});
