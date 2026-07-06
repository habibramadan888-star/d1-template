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
  assert.match(html, /Checkout or deposit refund requires owner approval/);
  assert.match(html, /submit\.disabled=true/);
});

test("blocked checkout and deposit refund expose owner approval actions", async () => {
  const html = await readFile(employeePath, "utf8");

  assert.match(html, /data-collect-arrears-first/);
  assert.match(html, /Collect Arrears First/);
  assert.match(html, /setEntryType\('AP'\)/);
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
  assert.match(html, /return applyEntryAnchors\(payload\)/);
});

