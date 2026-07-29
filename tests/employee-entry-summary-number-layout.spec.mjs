import test from "node:test";
import assert from "node:assert/strict";
import { readEmployeeHtml } from "./helpers/employee-entry-whatsapp-helper.mjs";

test("Entry summary amounts use responsive non-clipping layout", async () => {
  const html = await readEmployeeHtml();

  assert.match(html, /\.entry-session-money/);
  assert.match(html, /data-entry-summary-money="true"/);
  assert.match(html, /font-variant-numeric:tabular-nums/);
  assert.match(html, /max-width:100%!important/);
  assert.match(html, /overflow-wrap:anywhere!important/);
  assert.match(html, /font-size:clamp\(12px,3\.45vw,16px\)!important/);
  assert.match(html, /grid-template-columns:repeat\(3,minmax\(0,1fr\)\)!important/);
});

test("Entry summary layout targets large readable amounts", async () => {
  const html = await readEmployeeHtml();

  assert.match(html, /Cash Handover|CASH HANDOVER/);
  assert.match(html, /Bank Transfer|BANK TRANSFER/);
  assert.match(html, /Gross Received|GROSS RECEIVED/);
  assert.match(html, /fmtDisplayMoney\(v\)/);
});
