import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const employeePath = "deploy-worker/public/employee-v3.html";

test("checkout and deposit refund are blocked when cloud arrears are open", async () => {
  const html = await readFile(employeePath, "utf8");

  assert.match(html, /function employeeCheckoutRefundEventType\(\)/);
  assert.match(html, /return type==='CO'\?'checkout':\(type==='DR'\?'deposit_refund':''\)/);
  assert.match(html, /function employeeCheckoutRefundBlockedByArrears\(\)/);
  assert.match(html, /!!employeeCheckoutRefundEventType\(\)&&openTasksForBed\(\)\.length>0/);
  assert.match(html, /\['CO','DR'\]\.includes\(type\)&&openTasksForBed\(\)\.length>0/);
  assert.match(html, /Open Arrears Found/);
  assert.match(html, /Normal checkout is not allowed/);
  assert.match(html, /submit\.disabled=true/);
});

test("blocked checkout exposes left-with-arrears actions and deposit refund keeps owner approval", async () => {
  const html = await readFile(employeePath, "utf8");

  assert.match(html, /data-collect-arrears-first/);
  assert.match(html, /Collect Arrears First/);
  assert.match(html, /setEntryType\('AP'\)/);
  assert.match(html, /data-left-with-arrears-choice/);
  assert.match(html, /Left With Arrears/);
  assert.match(html, /data-contact-owner/);
  assert.match(html, /Contact Owner/);
  assert.match(html, /data-request-owner-approval/);
  assert.match(html, /Request Owner Approval/);
  assert.match(html, /requestOwnerApprovalForOpenArrears\(type,rows\)/);
  assert.match(html, /apiFetch\('\/api\/arrear_tasks\/update'/);
  assert.match(html, /followup_status:'\\u8f6c\\u8001\\u677f\\u5904\\u7406'/);
  assert.match(html, /data-cancel-arrears-block/);
});

test("checkout and deposit refund anchors preserve approval state", async () => {
  const html = await readFile(employeePath, "utf8");

  assert.match(html, /DR:\['event_type','bed','refund_amount','payment_method','refund_reason','checkout_ref','outstanding_arrears','owner_approval_required','owner_approval_status'/);
  assert.match(html, /CO:\['event_type','bed','checkout_date','deposit_refund','outstanding_arrears','owner_approval_required','owner_approval_status'/);
  assert.match(html, /const openArrearsTotal=openTasksForBed\(\)\.reduce\(\(s,t\)=>s\+taskRemain\(t\),0\)/);
  assert.match(html, /owner_approval_required:ownerApprovalRequired/);
  assert.match(html, /owner_approval_status:ownerApprovalRequired\?'pending_owner_approval':'not_required'/);
  assert.match(html, /outstanding_arrears:outstanding/);
  assert.match(html, /owner_approval_status:outstanding>0\?\(e\.owner_approval_status\|\|'pending_owner_approval'\)/);
  assert.match(html, /event_type:left\?'left_with_arrears':'checkout'/);
  assert.match(html, /return applyEntryAnchors\(payload\)/);
});

test("deposit refund and checkout hide rent-only fields and render event-specific summaries", async () => {
  const html = await readFile(employeePath, "utf8");

  assert.match(html, /const isDepositOut=type==='DR'/);
  assert.match(html, /const isCheckout=type==='CO'/);
  assert.match(html, /const hideRentOnly=isAp\|\|isDepositOut\|\|isCheckout/);
  assert.match(html, /\['listPrice','periodStart','periodEnd','periodDays','periodDue','due','paid','entryClr'\]/);
  assert.match(html, /employeeApplyEventSpecificFieldLabels\(type\)/);
  assert.match(html, /employeeRenderEventSpecificSummary\(\)/);
  assert.match(html, /Deposit Out \/ \\u9000\\u62bc\\u91d1/);
  assert.match(html, /Refund Amount \/ \\u9000\\u62bc\\u91d1\\u91d1\\u989d/);
  assert.match(html, /Checkout \/ \\u9000\\u623f/);
  assert.match(html, /Deposit Refund Amount \/ \\u5e94\\u9000\\u62bc\\u91d1/);
});

test("deposit refund has event-specific actual refund and difference reason fields", async () => {
  const html = await readFile(employeePath, "utf8");

  assert.match(html, /id="depositOutFields"/);
  assert.match(html, /id="depositOutBalance"/);
  assert.match(html, /id="depositOutRefundDate"/);
  assert.match(html, /id="depositOutDifferenceReason"/);
  assert.match(html, /employeeSetFieldLabel\('amount','Actual Refund Amount'/);
  assert.match(html, /Difference Reason is required when actual refund differs from deposit balance/);
  assert.match(html, /actual_refund_amount:type==='DR'\?amt:0/);
  assert.match(html, /refund_difference:type==='DR'\?Math\.round\(\(amt-depositHeld\(\)\)\*100\)\/100:0/);
});

test("normal checkout does not write deposit refund or deduction amounts", async () => {
  const html = await readFile(employeePath, "utf8");

  assert.match(html, /deposit_amt:type==='CO'\?0:0/);
  assert.match(html, /deposit_deduction:type==='CO'\?0:0/);
  assert.match(html, /deposit_refund:0/);
  assert.match(html, /\['overdayDeduction','noNoticeDeduction','otherDeduction','depositDeduction','depositReturnAmount','dedNote'\]/);
});
