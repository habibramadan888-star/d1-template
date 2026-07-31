import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("owner current-period received uses active statement sessions only", async () => {
  const worker=await readFile("deploy-worker/src/index.js","utf8");
  const ui=await readFile("deploy-worker/public/index-51-main.js","utf8");
  assert.match(worker,/inclusion_rule:"active_owner_statement_sessions_only"/);
  assert.match(worker,/source==="employee_entry_raw_held"/);
  assert.match(worker,/RAW_ACCEPTED_HELD_FOR_REVIEW/);
  assert.match(worker,/seenAnchors\.has\(anchor\)/);
  assert.match(worker,/export_text FROM sessions/);
  assert.match(worker,/\^Total Received/);
  assert.match(worker,/gross<=0/);
  assert.match(worker,/if\(gross<=0\)continue;[\s\S]{0,180}seenAnchors\.has\(anchor\)/);
  assert.match(worker,/const billingPeriod=currentPeriodReceived/);
  assert.doesNotMatch(worker,/currentPeriodReceived=billingPeriodFinanceProjection/);
  assert.match(ui,/currentPeriodComparison/);
  const html=await readFile("deploy-worker/public/index-51.html","utf8");
  assert.match(html,/index-51-main\.js\?v=owner-billing-period-v12/);
});

test("owner history groups every month from the 3rd through the next month's 2nd", async () => {
  const ui=await readFile("deploy-worker/public/index-51-main.js","utf8");
  assert.match(ui,/const ownerHistoryBillingPeriod=/);
  assert.match(ui,/if\(date\.getUTCDate\(\)<3\)date\.setUTCMonth\(date\.getUTCMonth\(\)-1\)/);
  assert.match(ui,/Date\.UTC\(date\.getUTCFullYear\(\),date\.getUTCMonth\(\),3\)/);
  assert.match(ui,/Date\.UTC\(date\.getUTCFullYear\(\),date\.getUTCMonth\(\)\+1,2\)/);
  assert.match(ui,/const from=period\.start/);
  assert.match(ui,/const to=period\.end/);
});
