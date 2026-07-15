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
  const checkoutValidator = functionBlock(worker, "validateCheckoutUploadFields");

  assert.match(validateBlock, /LEFT_WITH_ARREARS_REQUIRED_FIELDS_MISSING/);
  assert.match(checkoutValidator, /missing\.push\(\"contact_phone_or_method\"\)/);
  assert.match(checkoutValidator, /missing\.push\(\"left_date\"\)/);
  assert.match(checkoutValidator, /missing\.push\(\"promised_payment_date\"\)/);
  assert.match(checkoutValidator, /missing\.push\(\"left_arrears_amount\"\)/);
  assert.match(checkoutValidator, /missing\.push\(\"note\"\)/);
  assert.doesNotMatch(checkoutValidator, /missing\.push\(\"coverage_end_date\"\)/);
  assert.doesNotMatch(checkoutValidator, /missing\.push\(\"confirmed_not_returning_date\"\)/);
  assert.doesNotMatch(checkoutValidator, /missing\.push\(\"belongings_held\"\)/);
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
  assert.match(html, /Upload validation failed \//);
  assert.match(html, /\\u4e0a\\u4f20\\u6821\\u9a8c\\u5931\\u8d25/);
  assert.match(html, /Missing: \$\{missing\}/);
  assert.match(html, /Invalid: \$\{invalid\}/);
  assert.match(html, /data-upload-validation-error=\"true\"/);
  assert.match(html, /Record/);
  assert.match(html, /Stage/);
  assert.match(html, /Event/);
  assert.match(html, /Error Code/);
  assert.match(html, /\\u9519\\u8bef\\u4ee3\\u7801/);
  assert.match(html, /Missing Fields/);
  assert.match(html, /\\u7f3a\\u5931\\u5b57\\u6bb5/);
  assert.match(html, /Invalid Fields/);
  assert.match(html, /\\u65e0\\u6548\\u5b57\\u6bb5/);
  assert.match(html, /Suggested Action/);
  assert.match(html, /\\u5efa\\u8bae\\u64cd\\u4f5c/);
  assert.match(html, /employeeUploadValidationSuggestedAction\(r\)/);
  assert.match(html, /err\.dryRunResult=result/);
  assert.match(html, /renderEmployeeUploadDryRunError\(firstDryRunFailure\.result\)/);
  assert.match(html, /toast\(`Upload validation failed \/ \\u4e0a\\u4f20\\u6821\\u9a8c\\u5931\\u8d25: \$\{firstDryRunFailure\.result\.error_code\}`/);
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
  assert.match(commitBlock, /e\.sync_status='LOCAL'/);
  assert.match(commitBlock, /e\.upload_status='CHECKING_CLOUD'/);
  assert.match(commitBlock, /e\.cloud_sync_status='CHECKING_CLOUD'/);
  assert.doesNotMatch(html, /renderEmployeeButtonLabel\('Upload Failed','\\u4e0a\\u4f20\\u5931\\u8d25'\)/);
  assert.match(html, /exportBtn\.disabled=!hasRows/);
  assert.match(html, /renderEmployeeButtonLabel\('Done','Upload Complete'\)/);
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
  assert.match(finalRender, /const failed=\['VALIDATION_FAILED','STALE'\]\.includes\(recordState\.key\)/);
  assert.match(finalRender, /const remove=\['VALIDATION_FAILED','STALE'\]\.includes\(recordState\.key\)/);
  assert.match(finalRender, /renderSessionRecordValidationDetails\(recordState\.validation,i\)/);
  assert.match(finalRender, /data-refresh-arrears-record/);
  assert.match(finalRender, /Refresh Arrears/);
  assert.match(html, /Validation Failed/);
  assert.match(html, /Stale \/ Needs Refresh/);
  assert.doesNotMatch(finalRender, /const status=e\.sync_status==='SYNCED'/);
});

test("validation failure does not restore done or uploaded success state", async () => {
  const html = await readFile(employeePath, "utf8");
  const commitStart = html.lastIndexOf("async function commitSessionAndExport");
  assert.ok(commitStart >= 0, "effective commitSessionAndExport function must exist");
  const commitBlock = html.slice(commitStart);
  const failureStart = commitBlock.indexOf("if(dryRunFailed.length)");
  const uploadStart = commitBlock.indexOf("showStatus(`Uploading confirmed session");
  const successStart = commitBlock.indexOf("setUploadPhase('Upload complete','Done')");
  assert.ok(failureStart > 0 && uploadStart > failureStart, "dry-run failure branch must precede real upload");
  assert.ok(successStart > uploadStart, "success state must occur only after upload and cloud confirmation");
  const failureBranch = commitBlock.slice(failureStart, uploadStart);
  const successBranch = commitBlock.slice(successStart);

  assert.match(failureBranch, /renderEmployeeUploadDryRunError\(firstDryRunFailure\.result\)/);
  assert.match(failureBranch, /Upload validation failed \//);
  assert.match(failureBranch, /\\u4e0a\\u4f20\\u6821\\u9a8c\\u5931\\u8d25/);
  assert.match(failureBranch, /updateEntrySessionActionState\(\)/);
  assert.doesNotMatch(failureBranch, /setUploadPhase\('Upload complete','Done'\)/);
  assert.doesNotMatch(failureBranch, /Session uploaded to cloud/);
  assert.match(successBranch, /setUploadPhase\('Upload complete','Done'\)/);
  assert.match(successBranch, /Session uploaded to cloud/);

  assert.match(html, /currentSessionHasUploadBlockingError\(\)/);
  assert.doesNotMatch(html, /renderEmployeeButtonLabel\('Upload Failed','\\u4e0a\\u4f20\\u5931\\u8d25'\)/);
  assert.match(html, /exportBtn\.disabled=!hasRows/);
  assert.match(html, /whats\.disabled=!uploaded\|\|blocked/);
});

test("upload error codes have bilingual explanations", async () => {
  const html = await readFile(employeePath, "utf8");

  assert.match(html, /function employeeUploadErrorExplanation\(code\)/);
  assert.match(html, /UPLOAD_VALIDATION_FAILED:\['Upload validation failed\.'/);
  assert.match(html, /CHECKOUT_OPEN_ARREARS_OWNER_APPROVAL_REQUIRED/);
  assert.match(html, /ARREARS_REF_STALE_REFRESH_REQUIRED/);
  assert.match(html, /DEPOSIT_REFUND_DIFFERENCE_REASON_REQUIRED/);
  assert.match(html, /employeeUploadFieldListText\(r\.missing_fields\)/);
  assert.match(html, /employeeUploadSuggestedActionParts\(r\)/);
  assert.match(html, /Message<br><small>\\u9519\\u8bef\\u8bf4\\u660e<\/small>/);
  assert.match(html, /Suggested Action<br><small>\\u5efa\\u8bae\\u64cd\\u4f5c<\/small>/);
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

test("normal checkout open arrears is blocked while Deposit Out remains review-only", async () => {
  const html = await readFile(employeePath, "utf8");
  const checkoutValidateIndex = html.lastIndexOf("const employeeCheckoutArrearsLegacyValidate=validate");
  assert.ok(checkoutValidateIndex >= 0, "final checkout arrears validation wrapper must exist");
  const validateBlock = html.slice(checkoutValidateIndex, html.indexOf("const employeeCollapsedLegacyRenderSummary=renderSummary", checkoutValidateIndex));

  assert.match(validateBlock, /type==='CO'&&!leftMode&&openTasksForBed\(\)\.length>0/);
  assert.match(validateBlock, /Open Arrears Found/);
  assert.match(validateBlock, /submit\.disabled=true/);
  assert.match(validateBlock, /submit\.classList\.add\('disabled'\)/);
});

test("left with arrears UI exposes required visible fields and preserves anchors", async () => {
  const html = await readFile(employeePath, "utf8");

  assert.match(html, /id=\"leftCoverageEndDate\"/);
  assert.match(html, /id=\"leftArrearsAmount\"/);
  assert.match(html, /coverage_end_date:left\?employeeFieldValue\('leftCoverageEndDate'\):''/);
  assert.match(html, /left_arrears_amount:left\?num\(employeeFieldValue\('leftArrearsAmount'\)\|\|openArrearsTotal\):0/);
  assert.doesNotMatch(html, /Coverage End Date is required/);
  assert.match(html, /Left Arrears Amount is required/);
});
