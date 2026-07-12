import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const html=await readFile(new URL('../deploy-worker/public/employee-v3.html',import.meta.url),'utf8');
const block=(name)=>{const start=html.indexOf(`function ${name}`);assert.ok(start>=0,name);const next=html.slice(start+10).match(/\n(?:async\s+)?function\s+/);return html.slice(start,next?start+10+next.index:html.length)};

const constant=(name)=>{
  const start=html.indexOf(`const ${name}=`);
  assert.ok(start>=0,name);
  const end=html.indexOf('];',start);
  assert.ok(end>start,name);
  return html.slice(start,end+2);
};

test('Bed Transfer keeps its editable controls inside the mounted parent',()=>{
  const managed=constant('employeeEntryTemplateNodes');
  assert.match(managed,/'transferFields'/);
  for(const nested of [
    'transferFromBed','bedTo','feePaid','transferReason','transferWaiverReasonWrap',
    'transferFeePaymentMethodWrap','transferFeeDueDateWrap','bedDifferenceMode',
    'bedDifferenceAmountWrap','bedDifferencePaymentMethodWrap','bedDifferenceDueDateWrap',
    'bedDifferenceReasonWrap'
  ])assert.doesNotMatch(managed,new RegExp(`['"]${nested}['"]`),nested);

  const transfer=html.slice(html.indexOf('<div class="grid" id="transferFields">'),html.indexOf('<div class="grid" id="expenseFields">'));
  for(const id of ['transferFromBed','bedTo']){
    const input=transfer.match(new RegExp(`<input\\s+id="${id}"[^>]*>`))?.[0]||'';
    assert.ok(input,`${id} input`);
    assert.doesNotMatch(input,/\b(?:hidden|disabled|readonly)\b/i,id);
  }
  assert.doesNotMatch(block('syncForm'),/ensureBedTransferStep2Mount\(/);
});

test('canonical actions and reset retain the Bed Transfer value contract',()=>{
  const validate=block('validateEmployeeUploadDryRun');
  const record=block('recordCanonicalBedTransfer');
  assert.match(validate,/apiFetch\(['"]\/api\/employee\/entry\/validate['"]/);
  assert.match(record,/apiFetch\(['"]\/api\/employee\/entry['"]/);
  for(const route of ['/api/employee/bed-transfers','/api/save_session'])assert.equal((validate+record).includes(route),false,route);
  const reset=block('resetForm');
  assert.match(reset,/'transferFromBed'/);
  assert.match(reset,/'bedTo'/);
  assert.match(reset,/serverValidation:null/);
});
