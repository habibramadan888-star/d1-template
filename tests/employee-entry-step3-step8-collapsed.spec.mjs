import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const employeePath = "deploy-worker/public/employee-v3.html";

test("Step 3 and Step 8 are converted to default-collapsed entry sections", async () => {
  const html = await readFile(employeePath, "utf8");

  assert.match(html, /\.employee-collapsible-step/);
  assert.match(html, /function employeeEnsureCollapsibleStep\(number,titleEn,titleZh\)/);
  assert.match(html, /employeeEnsureCollapsibleStep\(3,'Verify System Context','核对系统资料'\)/);
  assert.match(html, /employeeEnsureCollapsibleStep\(8,'Review & Submit','预览确认与提交'\)/);
  assert.match(html, /step\.classList\.add\('collapsed'\)/);
  assert.match(html, /step\.dataset\.employeeCollapsedInitialized='1'/);
});

test("collapsed summaries keep key status visible without hiding validation", async () => {
  const html = await readFile(employeePath, "utf8");

  assert.match(html, /function employeeStep3SummaryHtml\(\)/);
  assert.match(html, /<b>Bed Check<\/b>/);
  assert.match(html, /<b>Arrears<\/b>/);
  assert.match(html, /<b>Deposit<\/b>/);
  assert.match(html, /<b>System Rent<\/b>/);

  assert.match(html, /function employeeStep8SummaryHtml\(validationResult=null\)/);
  assert.match(html, /<b>Event<\/b>/);
  assert.match(html, /<b>Target<\/b>/);
  assert.match(html, /<b>Amount<\/b>/);
  assert.match(html, /<b>Status<\/b>/);
  assert.match(html, /Blocked/);
  assert.match(html, /employeeEnglishFirstMessage\(issue\)/);
});

test("collapsed section wrappers call legacy validation, summary, context, and sync logic", async () => {
  const html = await readFile(employeePath, "utf8");

  assert.match(html, /const employeeCollapsedLegacyValidate=validate/);
  assert.match(html, /const result=employeeCollapsedLegacyValidate\(\)/);
  assert.match(html, /employeeUpdateCollapsedStepSummaries\(result\)/);
  assert.match(html, /const employeeCollapsedLegacyRenderSummary=renderSummary/);
  assert.match(html, /employeeCollapsedLegacyRenderSummary\(\)/);
  assert.match(html, /const employeeCollapsedLegacyRenderContext=renderContext/);
  assert.match(html, /employeeCollapsedLegacyRenderContext\(\)/);
  assert.match(html, /const employeeCollapsedLegacySyncForm=syncForm/);
  assert.match(html, /employeeCollapsedLegacySyncForm\(\)/);
});
