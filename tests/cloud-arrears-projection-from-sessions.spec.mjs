import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workerPath = "deploy-worker/src/index.js";
const docPath = "CLOUD_ARREARS_PROJECTION_CONTRACT.md";

test("cloud arrears projection contract documents sessions.entries_json as SOT", async () => {
  const doc = await readFile(docPath, "utf8");

  assert.match(doc, /source of truth is `sessions\.entries_json`/);
  assert.match(doc, /Duplicate rent rows or duplicate sessions never close arrears/);
  assert.match(doc, /Only matching `arrears_payment` anchors reduce `remaining_arrears`/);
  assert.match(doc, /GET \/api\/owner\/cloud-arrears\/projection/);
  assert.match(doc, /Production cutover remains `PRODUCTION_NO_GO`/);
});

test("projection builder derives rent short-paid arrears from active session anchors", async () => {
  const worker = await readFile(workerPath, "utf8");

  assert.match(worker, /function buildCloudArrearsProjectionFromSessions\(sessions=\[\],opts=\{\}\)/);
  assert.match(worker, /if\(!cloudArrearsSessionIsActive\(session\)\)continue/);
  assert.match(worker, /type==="R"&&\(anchor\.short_paid\|\|entryAnchorMoney\(anchor\.arrears_amount\)>0\)&&entryAnchorMoney\(anchor\.arrears_amount\)>0/);
  assert.match(worker, /source_type:"employee_entry_short_paid"/);
  assert.match(worker, /original_type:"rent_short_paid"/);
  assert.match(worker, /itemsByRef\.set\(item\.arrears_ref,item\)/);
});

test("duplicate rent short-paid anchors are keyed by source session and event, not bed-period totals", async () => {
  const worker = await readFile(workerPath, "utf8");
  const projectionBlock = worker.slice(
    worker.indexOf("function buildCloudArrearsProjectionFromSessions"),
    worker.indexOf("__name(buildCloudArrearsProjectionFromSessions")
  );

  assert.match(worker, /cloudArrearsProjectionRef\(session,anchor,index,prefix="ca"\)/);
  assert.match(worker, /`\$\{prefix\}-\$\{session\?\.id\|\|"session"\}-\$\{cloudArrearsSourceEventId\(anchor,index\)\}`/);
  assert.doesNotMatch(projectionBlock, /periodDue-totalPaid|SUM\(paid\)|total_paid/);
  assert.doesNotMatch(projectionBlock, /bed.*period.*set|period.*bed.*set/);
});

test("voided sessions are excluded from projection", async () => {
  const worker = await readFile(workerPath, "utf8");

  assert.match(worker, /function cloudArrearsSessionIsActive\(session\)/);
  assert.match(worker, /!String\(session\?\.voided_at\|\|""\)\.trim\(\)&&status!=="VOID"/);
  assert.match(worker, /COALESCE\(voided_at,''\)=''/);
  assert.match(worker, /COALESCE\(handover_status,''\)<>'VOID'/);
});

test("production sessions without entries_json still project from export_text anchors", async () => {
  const worker = await readFile(workerPath, "utf8");
  const fetchBlock = worker.slice(
    worker.indexOf("async function cloudArrearsFetchActiveSessionRows"),
    worker.indexOf("__name(cloudArrearsFetchActiveSessionRows")
  );

  assert.match(fetchBlock, /const columns=await empTableColumns\(env,"sessions"\)/);
  assert.match(fetchBlock, /const hasEntriesJson=columns\.has\("entries_json"\)/);
  assert.match(fetchBlock, /where\+=hasEntriesJson\?/);
  assert.match(fetchBlock, /COALESCE\(entries_json,''\)<>'' OR COALESCE\(export_text,''\) LIKE '%ENTRY ANCHORS JSON%'/);
  assert.match(fetchBlock, /:"COALESCE\(export_text,''\) LIKE '%ENTRY ANCHORS JSON%'"/);
  assert.match(fetchBlock, /const entriesExpr=hasEntriesJson\?"entries_json":"'' AS entries_json"/);
  assert.match(fetchBlock, /const summaryExpr=hasSummaryJson\?"summary_json":"'' AS summary_json"/);
});

test("only arrears_payment with matching ref settles projection arrears", async () => {
  const worker = await readFile(workerPath, "utf8");
  const projectionBlock = worker.slice(
    worker.indexOf("function buildCloudArrearsProjectionFromSessions"),
    worker.indexOf("__name(buildCloudArrearsProjectionFromSessions")
  );

  assert.match(projectionBlock, /if\(type==="AP"\)/);
  assert.match(projectionBlock, /const item=itemsByRef\.get\(payment\.ref\)/);
  assert.match(projectionBlock, /item\.actual_received=entryAnchorMoney\(Number\(item\.actual_received\|\|0\)\+payment\.payment_amount\)/);
  assert.match(projectionBlock, /item\.remaining_arrears=entryAnchorMoney\(Math\.max\(0,Number\(item\.arrear_amount\|\|0\)-item\.actual_received\)\)/);
  assert.match(projectionBlock, /item\.status="settled"/);
});

test("left_with_arrears checkout anchors attach customer-left metadata to projection", async () => {
  const worker = await readFile(workerPath, "utf8");
  const projectionBlock = worker.slice(
    worker.indexOf("function buildCloudArrearsProjectionFromSessions"),
    worker.indexOf("__name(buildCloudArrearsProjectionFromSessions")
  );

  assert.match(worker, /function cloudArrearsApplyLeftWithArrearsMeta\(item,anchor\)/);
  assert.match(projectionBlock, /type==="CO"&&\(anchor\.left_with_arrears\|\|anchor\.checkout_mode==="left_with_arrears"\)/);
  assert.match(projectionBlock, /source_type:"left_with_arrears"/);
  assert.match(worker, /item\.customer_left=true/);
  assert.match(worker, /item\.belongings_held=!!anchor\.belongings_held/);
  assert.match(worker, /item\.whatsapp_phone=cleanText\(anchor\.whatsapp_phone\|\|anchor\.former_customer_phone/);
});

test("employee and owner reads are projection-aware", async () => {
  const worker = await readFile(workerPath, "utf8");

  assert.match(worker, /async function getOpenCloudArrearsForBed\(env,user,bed,opts=\{\}\)/);
  assert.match(worker, /await empAppendCloudArrearsProjectionRows\(env,user,tasks,seenIds,seenKeys,source_status,\{limit\}\)/);
  assert.match(worker, /async function ownerOverviewFetchArrears\(env,user\)/);
  assert.match(worker, /const projection=await rebuildAllCloudArrears\(env,user,\{limit:1000\}\)/);
  assert.match(worker, /path === "\/api\/owner\/cloud-arrears\/projection" && method === "GET"/);
  assert.match(worker, /return handleOwnerCloudArrearsProjection\(request, env, user\)/);
});
