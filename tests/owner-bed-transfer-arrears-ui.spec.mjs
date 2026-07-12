import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const ui=await readFile(new URL('../deploy-worker/public/index-51-main.js',import.meta.url),'utf8');
const block=name=>{const start=ui.indexOf(`function ${name}`);assert.ok(start>=0,name);const next=ui.indexOf('\nfunction ',start+10);return ui.slice(start,next<0?ui.length:next);};

test('Unified Arrears reads canonical projection while preserving legacy Gateway rows',()=>{
  const loader=block('loadExistingArrearsForOwner');
  assert.match(loader,/\/api\/owner\/cloud-arrears\/projection/);
  assert.match(loader,/\/api\/boss\/arrears\/followup-tasks/);
  assert.match(loader,/projectedOpen\.map\(normalizeArrearFromCloud\)/);
  assert.match(loader,/legacyRows/);
});

test('Rent transfer fee and bed difference sources are distinct',()=>{
  const normalize=block('normalizeArrearsSourceType');
  for(const source of ['rent_arrears','bed_transfer_fee_unpaid','bed_price_difference_unpaid'])assert.match(normalize,new RegExp(source));
  const labels=block('arrearSourceLabel');
  assert.match(labels,/租金欠款/);assert.match(labels,/换床费欠款/);assert.match(labels,/床价差欠款/);
});

test('Gateway original/current beds and amounts are preserved independently',()=>{
  const normalize=block('normalizeArrearFromCloud');
  assert.match(normalize,/originalBed:a\.original_bed/);
  assert.match(normalize,/effectiveCurrentBed:a\.effective_current_bed/);
  assert.match(normalize,/originalAmount:Number\(a\.original_amount/);
  assert.match(normalize,/remain/);
  const card=block('renderOwnerArrearsTaskCard');
  assert.match(card,/原床位 \/ 当前显示床位/);
  assert.match(card,/原始金额 \/ 剩余金额/);
});

test('full-payment-only is visible and no partial payment control exists',()=>{
  const card=block('renderOwnerArrearsTaskCard');
  assert.match(card,/FULL_PAYMENT_ONLY/);
  assert.match(card,/只允许一次性还清/);
  assert.doesNotMatch(card,/partial payment|部分还款按钮|data-partial-payment/);
});

test('multiple and closed debts render as separate Gateway rows',()=>{
  const render=ui.slice(ui.lastIndexOf('function renderArrearsPanel'));
  assert.match(render,/pageRows\.map\(a=>renderOwnerArrearsTaskCard/);
  assert.match(render,/state\.arrearsClosed\.map\(a=>renderOwnerArrearsTaskCard/);
  assert.match(render,/data-owner-arrears-closed-list/);
});

test('remaining amount is copied from Gateway and never recalculated',()=>{
  const normalize=block('normalizeArrearFromCloud');
  assert.match(normalize,/rawRemain=a\.remaining_arrears\?\?a\.remain\?\?a\.remaining\?\?a\.remaining_amount/);
  assert.doesNotMatch(normalize,/originalAmount\s*-|arrear_amount\s*-/);
});
