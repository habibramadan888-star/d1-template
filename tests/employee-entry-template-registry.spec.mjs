import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const htmlPath = "deploy-worker/public/employee-v3.html";

function templateBlock(html, name) {
  const marker = `${name}:{`;
  const start = html.indexOf(marker);
  assert.notEqual(start, -1, `${name} template should exist`);
  const nextComma = html.indexOf("\n  },", start);
  const nextEnd = html.indexOf("\n};", start);
  const next = nextComma === -1 ? nextEnd : (nextEnd === -1 ? nextComma : Math.min(nextComma, nextEnd));
  assert.notEqual(next, -1, `${name} template block should close`);
  return html.slice(start, next);
}

test("employee Entry defines seven event-specific templates", async () => {
  const html = await readFile(htmlPath, "utf8");

  assert.match(html, /const entryTemplates=\{/);
  assert.match(html, /const employeeEntryTemplates=entryTemplates/);
  assert.match(html, /function employeeMountEntryTemplate\(type=\$\(\'entryType\'\)\?\.value\)/);
  assert.match(html, /mount\.dataset\.eventTemplate=key/);
  assert.match(html, /body\.dataset\.templateFields=key/);

  for (const name of [
    "rent",
    "arrears_payment",
    "deposit_in",
    "deposit_out",
    "checkout",
    "expense",
    "bed_transfer"
  ]) {
    const block = templateBlock(html, name);
    assert.match(block, /fields:\[/, `${name} should own UI fields`);
    assert.match(block, /required_fields:\[/, `${name} should own required fields`);
    assert.match(block, /system_read_fields:\[/, `${name} should define system-read fields`);
    assert.match(block, /forbidden_fields:\[/, `${name} should define forbidden fields`);
    assert.match(block, /validator:/, `${name} should dispatch to its validator`);
    assert.match(block, /anchorBuilder:/, `${name} should dispatch to its anchor builder`);
    assert.match(block, /uploadValidation:uploadValidationByEventType/, `${name} should dispatch upload validation by event type`);
    assert.match(block, /whatsappRenderer:renderEntryAnchorForWhatsapp/, `${name} should render WhatsApp by anchor`);
    assert.match(block, /ownerDetailRenderer:renderEntryAnchorForOwner/, `${name} should render owner detail by anchor`);
  }
});

test("templates keep event-specific forbidden fields out of the active main flow", async () => {
  const html = await readFile(htmlPath, "utf8");

  const arrears = templateBlock(html, "arrears_payment");
  assert.match(arrears, /fields:\['selectedEventWrap','genericBedFieldWrap','apFields','paymentStep','amount','arrearsPaymentCorePanel','remark'\]/);
  assert.match(arrears, /forbidden_fields:\['listPrice','periodStep','periodStart','periodEnd','periodDue','due','paid','entryClr','checkoutFields','depositOutFields','transferFields','expenseFields'\]/);

  const depositOut = templateBlock(html, "deposit_out");
  assert.match(depositOut, /fields:\['selectedEventWrap','genericBedFieldWrap','paymentStep','amount','depositOutFields','remark'\]/);
  assert.match(depositOut, /forbidden_fields:\['listPrice','periodStep','periodStart','periodEnd','periodDue','due','paid','entryClr','checkoutFields','transferFields','expenseFields'\]/);

  const checkout = templateBlock(html, "checkout");
  assert.match(checkout, /fields:\['selectedEventWrap','genericBedFieldWrap','leftWithArrearsMode','checkoutDate','leftWithArrearsFields','remark'\]/);
  assert.match(checkout, /forbidden_fields:\['listPrice','periodStep','periodStart','periodEnd','periodDue','due','paid','entryClr','depositOutFields','paymentStep','amount','transferFields','expenseFields'\]/);

  const expense = templateBlock(html, "expense");
  assert.match(expense, /fields:\['selectedEventWrap','paymentStep','amount','expenseFields','remark'\]/);
  assert.match(expense, /forbidden_fields:\['genericBedFieldWrap','periodStep','linkedTaskId','depositOutFields','checkoutFields','transferFields','listPrice'\]/);

  const transfer = templateBlock(html, "bed_transfer");
  assert.match(transfer, /fields:\['selectedEventWrap','transferFromBed','bedTo','transferDate','feePaid','transferReason','transferWaiverReasonWrap','remark'\]/);
  assert.match(transfer, /forbidden_fields:\['genericBedFieldWrap','periodStep','linkedTaskId','depositOutFields','checkoutFields','expenseFields','listPrice','arrearsPaymentCorePanel'\]/);
});

test("active template mount parks non-selected fields outside the current main flow", async () => {
  const html = await readFile(htmlPath, "utf8");

  assert.match(html, /id="employeeEventTemplateMount"/);
  assert.match(html, /id="employeeTemplateFieldParking"/);
  assert.match(html, /parking\.appendChild\(node\)/);
  assert.match(html, /mount\.replaceChildren\(head,body\)/);
  assert.match(html, /template\.fields\.forEach\(id=>\{/);
  assert.match(html, /body\.appendChild\(node\)/);
  assert.match(html, /employeeMountEntryTemplate\(type\)/);
  assert.match(html, /const flowEnd=templateMount\|\|legacyFlowEnd/);
});

test("seven template validators and anchor builders are present", async () => {
  const html = await readFile(htmlPath, "utf8");

  for (const fn of [
    "validateRentEntry",
    "validateArrearsPaymentEntry",
    "validateDepositInEntry",
    "validateDepositOutEntry",
    "validateCheckoutEntry",
    "validateExpenseEntry",
    "validateBedTransferEntry",
    "buildRentAnchor",
    "buildArrearsPaymentAnchor",
    "buildDepositInAnchor",
    "buildDepositOutAnchor",
    "buildCheckoutAnchor",
    "buildExpenseAnchor",
    "buildBedTransferAnchor"
  ]) {
    assert.match(html, new RegExp(`function ${fn}\\(`));
  }
});
