import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const ui=await readFile(new URL('../deploy-worker/public/index-51-main.js',import.meta.url),'utf8');
const block=name=>{const start=ui.indexOf(`function ${name}`);assert.ok(start>=0,name);const next=ui.indexOf('\nfunction ',start+10);return ui.slice(start,next<0?ui.length:next);};

test('Finance UI reads the canonical projection directly',()=>{
  assert.match(block('loadOwnerFinanceProjection'),/ownerGatewayJson\('\/api\/owner\/finance\/projection'/);
});

test('transfer fee and bed difference stay separate from Rent',()=>{
  const renderer=block('renderOwnerFinancePanel');
  for(const field of ['rent_income','bed_transfer_fee_income','bed_price_difference_income'])assert.match(renderer,new RegExp(`data\\.${field}`));
  assert.match(renderer,/data-finance-transfer-fee/);
  assert.match(renderer,/data-finance-bed-difference/);
});

test('repayment components are classification detail and not double-counted',()=>{
  const renderer=block('renderOwnerFinancePanel');
  assert.match(renderer,/arrears_repaid/);
  assert.match(renderer,/bed_transfer_fee_arrears_repaid/);
  assert.match(renderer,/bed_price_difference_arrears_repaid/);
  assert.match(renderer,/classification detail only and are not added again/);
  assert.doesNotMatch(renderer,/reduce\(|bed_transfer_fee_arrears_repaid\s*\+/);
});

test('raw effective totals and reconciliation warnings are explicit',()=>{
  const renderer=block('renderOwnerFinancePanel');
  assert.match(renderer,/raw_transfer_events/);
  assert.match(renderer,/effective_transfer_events/);
  assert.match(renderer,/data-owner-finance-reconciliation-warning/);
  assert.match(renderer,/row\.raw_totals/);
  assert.match(renderer,/row\.archive_effective_totals/);
  assert.match(renderer,/data-owner-finance-raw-effective/);
});

test('Finance renderer never sums canonical events',()=>{
  assert.doesNotMatch(block('renderOwnerFinancePanel'),/\.reduce\(|gross_received\s*\+|rent_income\s*\+/);
});
