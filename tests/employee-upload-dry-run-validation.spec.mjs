import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workerPath = "deploy-worker/src/index.js";
const employeePath = "deploy-worker/public/employee-v3.html";

function functionBlock(source, name) {
  const start = source.indexOf(`function ${name}`);
  assert.ok(start >= 0, `${name} must exist`);
  const marker = `__name(${name},`;
  const end = source.indexOf(marker, start);
  assert.ok(end > start, `${name} block must end with __name marker`);
  return source.slice(start, end);
}

test("employee upload dry-run endpoint is routed and never writes D1", async () => {
  const worker = await readFile(workerPath, "utf8");
  const validateBlock = functionBlock(worker, "validateEmployeeEntryUploadPayload");
  const validateHandler = functionBlock(worker, "handleEmployeeEntryValidate");

  assert.match(worker, /path===\"\/api\/employee\/entry\/validate\"&&request\.method===\"POST\"/);
  assert.match(worker, /return handleEmployeeEntryValidate\(request,env,user\)/);
  assert.doesNotMatch(validateBlock, /\.run\(/, "dry-run validation must not run D1 writes");
  assert.doesNotMatch(validateBlock, /empInsertDynamic\(/, "dry-run validation must not insert rows");
  assert.doesNotMatch(validateBlock, /empEvent\(/, "dry-run validation must not write events");
  assert.doesNotMatch(validateBlock, /audit\(/, "dry-run validation must not write audit logs");
  assert.doesNotMatch(validateHandler, /\.run\(/, "dry-run handler must not run D1 writes");
});

test("real employee upload reuses dry-run validation before write path", async () => {
  const worker = await readFile(workerPath, "utf8");
  const uploadBlock = functionBlock(worker, "handleEmployeeEntry");
  const validationIndex = uploadBlock.indexOf("validateEmployeeEntryUploadPayload(env,user,body");
  const entryIndex = uploadBlock.indexOf("const entry=body?.entry||{}");
  const writeIndex = uploadBlock.indexOf("empInsertDynamic(env,\"sessions\"");

  assert.ok(validationIndex > 0, "real upload must call shared dry-run validator");
  assert.ok(validationIndex < entryIndex, "validation must run before upload payload mutation");
  assert.ok(validationIndex < writeIndex, "validation must run before session writes");
  assert.match(uploadBlock, /if\(!validationResult\.ok\)return json\(\{success:false,\.\.\.validationResult\},422\)/);
});

test("arrears payment dry-run accepts projection-aware refs and returns exact AP errors", async () => {
  const worker = await readFile(workerPath, "utf8");
  const validateBlock = functionBlock(worker, "validateEmployeeEntryUploadPayload");
  const readOnlyLookup = functionBlock(worker, "empFindOpenArrearTaskForPaymentReadOnly");

  assert.match(validateBlock, /empFindOpenArrearTaskForPaymentReadOnly\(env,user,taskId,room\)/);
  assert.match(validateBlock, /ARREARS_REF_STALE_REFRESH_REQUIRED/);
  assert.match(validateBlock, /This arrears item is no longer open\. Please refresh arrears\./);
  assert.match(readOnlyLookup, /empFindProjectionArrearsForPayment\(env,user,cleanTaskId,bed\)/);
  assert.ok(
    readOnlyLookup.indexOf("empFindProjectionArrearsForPayment(env,user,cleanTaskId,bed)") <
      readOnlyLookup.indexOf("SELECT * FROM arrear_tasks"),
    "projection must be checked before stale materialized arrear_tasks"
  );
  assert.match(readOnlyLookup, /if\(projected\)return null/);
  assert.match(validateBlock, /LINKED_TASK_REQUIRED/);
  assert.doesNotMatch(validateBlock, /LINKED_TASK_NOT_OPEN/);
  assert.match(validateBlock, /ARREAR_PAYMENT_AMOUNT_INVALID/);
  assert.match(validateBlock, /event_type:\"arrears_payment\"/);
});

test("deposit out dry-run enforces difference reason only when refund differs", async () => {
  const worker = await readFile(workerPath, "utf8");
  const validateBlock = functionBlock(worker, "validateEmployeeEntryUploadPayload");

  assert.match(validateBlock, /const diff=Math\.round\(\(amount-depositBalance\)\*100\)\/100/);
  assert.doesNotMatch(validateBlock, /const diff=cleanMoney\(amount-depositBalance\)/);
  assert.match(validateBlock, /DEPOSIT_REFUND_DIFFERENCE_REASON_REQUIRED/);
  assert.match(validateBlock, /missing_fields:\[\"difference_reason\"\]/);
  assert.match(validateBlock, /actual_refund_amount:amount/);
  assert.match(validateBlock, /refund_difference:diff/);
});

test("left with arrears dry-run returns required missing fields", async () => {
  const worker = await readFile(workerPath, "utf8");
  const validateBlock = functionBlock(worker, "validateEmployeeEntryUploadPayload");

  assert.match(validateBlock, /LEFT_WITH_ARREARS_REQUIRED_FIELDS_MISSING/);
  assert.match(validateBlock, /missing\.push\(\"whatsapp_phone\"\)/);
  assert.match(validateBlock, /missing\.push\(\"coverage_end_date\"\)/);
  assert.match(validateBlock, /missing\.push\(\"confirmed_not_returning_date\"\)/);
  assert.match(validateBlock, /missing\.push\(\"promised_payment_date\"\)/);
  assert.match(validateBlock, /missing\.push\(\"left_arrears_amount\"\)/);
  assert.match(validateBlock, /missing\.push\(\"belongings_held\"\)/);
  assert.match(validateBlock, /missing\.push\(\"belongings_note\"\)/);
});

test("employee UI runs dry-run validation before real upload and surfaces backend fields", async () => {
  const html = await readFile(employeePath, "utf8");
  const commitStart = html.lastIndexOf("async function commitSessionAndExport");
  assert.ok(commitStart >= 0, "effective commitSessionAndExport function must exist");
  const commitBlock = html.slice(commitStart);
  const dryRunIndex = commitBlock.indexOf("validateEmployeeUploadDryRun(e,sessionForEntry,i)");
  const realUploadIndex = commitBlock.indexOf("apiFetch('/api/employee/entry',{");

  assert.match(html, /function formatEmployeeUploadDryRunError\(result,index\)/);
  assert.match(html, /function normalizeEmployeeUploadDryRunError\(result,index/);
  assert.match(html, /function renderEmployeeUploadDryRunError\(result\)/);
  assert.match(html, /apiFetch\('\/api\/employee\/entry\/validate'/);
  assert.ok(dryRunIndex > 0, "commit flow must call dry-run validation");
  assert.ok(realUploadIndex > dryRunIndex, "real upload must happen only after dry-run validation");
  assert.match(html, /Upload validation failed:/);
  assert.match(html, /Missing: \$\{missing\}/);
  assert.match(html, /Invalid: \$\{invalid\}/);
  assert.match(html, /data-upload-validation-error=\"true\"/);
  assert.match(html, /Record/);
  assert.match(html, /Stage/);
  assert.match(html, /Event/);
  assert.match(html, /Error Code/);
  assert.match(html, /Missing Fields/);
  assert.match(html, /Invalid Fields/);
  assert.match(html, /Suggested Action/);
  assert.match(html, /employeeUploadValidationSuggestedAction\(r\)/);
  assert.match(html, /err\.dryRunResult=result/);
  assert.match(html, /renderEmployeeUploadDryRunError\(firstDryRunFailure\.result\)/);
  assert.match(html, /toast\(`Upload validation failed: \$\{firstDryRunFailure\.result\.error_code\}`/);
  assert.doesNotMatch(html, /toast\('Upload validation failed before cloud write\.'/);
  assert.match(html, /const failedIndex=Number\(firstDryRunFailure\.result\?\.event_index\|\|0\)/);
  assert.match(html, /state\.uploadValidationFailedIndex=failedIndex/);
  assert.match(html, /data-session-record-index="\$\{recordIndex\}"/);
  assert.match(html, /upload-validation-failed/);
  assert.match(html, /data-remove-session-record/);
  assert.match(html, /removeCurrentSessionRecord\(btn\.dataset\.removeSessionRecord/);
  assert.match(commitBlock, /uploadList\.forEach\(e=>\{e\.upload_status='VALIDATING';e\.upload_validation_error=null;\}\)/);
  assert.match(commitBlock, /originalDrafts\[failedIndex\]\.upload_status=firstDryRunFailure\.result\?\.error_code==='ARREARS_REF_STALE_REFRESH_REQUIRED'\?'STALE':'VALIDATION_FAILED'/);
  assert.match(commitBlock, /e\.upload_status='UPLOADING'/);
  assert.match(commitBlock, /upload_status:'SYNCED'/);
});

test("current session status machine prioritizes validation failed and stale over synced", async () => {
  const html = await readFile(employeePath, "utf8");
  const finalRenderStart = html.lastIndexOf("renderSessionPreview=function(){");
  assert.ok(finalRenderStart >= 0, "final renderSessionPreview override must exist");
  const finalRender = html.slice(finalRenderStart, html.indexOf("renderSummary=function(){", finalRenderStart));

  assert.match(html, /function employeeSessionRecordState\(entry,index\)/);
  assert.match(html, /function renderSessionRecordValidationDetails\(result,index\)/);
  assert.match(html, /ARREARS_REF_STALE_REFRESH_REQUIRED/);
  assert.match(html, /This arrears item is no longer open\. Please refresh arrears or remove this record\./);
  assert.match(finalRender, /const recordState=employeeSessionRecordState\(e,i\)/);
  assert.match(finalRender, /recordState\.key!=='SYNCED'/);
  assert.match(finalRender, /renderSessionRecordValidationDetails\(recordState\.validation,i\)/);
  assert.match(finalRender, /data-refresh-arrears-record/);
  assert.match(finalRender, /Refresh Arrears/);
  assert.match(html, /Validation Failed/);
  assert.match(html, /Stale \/ Needs Refresh/);
  assert.doesNotMatch(finalRender, /const status=e\.sync_status==='SYNCED'/);
});

test("stale arrears selection is cleared or marked when open refs disappear", async () => {
  const html = await readFile(employeePath, "utf8");

  assert.match(html, /state\.selectedArrearsTaskRef=''/);
  assert.match(html, /state\.selectedArrearsTaskSnapshot=null/);
  assert.match(html, /state\.arrearsTasksLoaded=Array\.isArray\(state\.tasks\)/);
  assert.match(html, /employeeOpenTaskRefSet\(\)/);
  assert.match(html, /state\.arrearsTasksLoaded&&!openRefs\.has\(ref\)/);
  assert.match(html, /Refresh Arrears/);
});

test("checkout open arrears is blocked before add to session", async () => {
  const html = await readFile(employeePath, "utf8");
  const checkoutValidateIndex = html.lastIndexOf("const employeeCheckoutArrearsLegacyValidate=validate");
  assert.ok(checkoutValidateIndex >= 0, "final checkout arrears validation wrapper must exist");
  const validateBlock = html.slice(checkoutValidateIndex, html.indexOf("const employeeCollapsedLegacyRenderSummary=renderSummary", checkoutValidateIndex));

  assert.match(validateBlock, /\['CO','DR'\]\.includes\(type\)&&openTasksForBed\(\)\.length>0/);
  assert.match(validateBlock, /Open Arrears Found/);
  assert.match(validateBlock, /submit\.disabled=true/);
  assert.match(validateBlock, /submit\.classList\.add\('disabled'\)/);
});

test("left with arrears UI exposes required visible fields and preserves anchors", async () => {
  const html = await readFile(employeePath, "utf8");

  assert.match(html, /id=\"leftCoverageEndDate\"/);
  assert.match(html, /id=\"leftArrearsAmount\"/);
  assert.match(html, /coverage_end_date:leftMode\?\$\(\'leftCoverageEndDate\'\)\.value:''/);
  assert.match(html, /left_arrears_amount:leftMode\?num\(\$\(\'leftArrearsAmount\'\)\?\.value\|\|openArrearsTotal\):0/);
  assert.match(html, /Coverage End Date is required/);
  assert.match(html, /Left Arrears Amount is required/);
});
