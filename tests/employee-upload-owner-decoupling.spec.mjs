import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const employee = readFileSync(new URL('../deploy-worker/public/employee-v3.html', import.meta.url), 'utf8');

function block(startMarker, endMarker) {
  const start = employee.indexOf(startMarker);
  const end = employee.indexOf(endMarker, start);
  assert.ok(start >= 0, `${startMarker} not found`);
  assert.ok(end > start, `${endMarker} not found after ${startMarker}`);
  return employee.slice(start, end);
}

test('owner cloud review state remains visible but cannot stop raw employee upload', () => {
  const upload = block('async function commitSessionAndExport()', 'function normalizeEmployeeView(');
  assert.doesNotMatch(upload, /if\(currentSessionHasCloudReviewBlock\(\)\)/);
  assert.doesNotMatch(upload, /Owner review is required before upload/);
  assert.match(employee, /function renderEmployeeCloudReviewPanel\(/);
});

test('Bed Transfer capability state cannot disable the whole Session upload', () => {
  const actions = block('updateEntrySessionActionState=function()', 'function refreshSessionViews()');
  assert.doesNotMatch(actions, /transferWriteBlocked/);
  assert.doesNotMatch(actions, /Bed Transfer validation only/);
  assert.match(actions, /exportBtn\.disabled=!hasRows/);
});

test('enabled Upload Session clears stale auth aria-disabled state', () => {
  const actions = block('updateEntrySessionActionState=function()', 'function refreshSessionViews()');
  assert.match(actions, /exportBtn\.removeAttribute\('aria-disabled'\)/);
});

test('technical failures still preserve drafts and do not report false success', () => {
  const upload = block('async function commitSessionAndExport()', 'function normalizeEmployeeView(');
  assert.match(upload, /state\.drafts=allOriginalDrafts/);
  assert.match(upload, /saveDrafts\(\)/);
  assert.match(upload, /apiFetch\('\/api\/employee\/entry'/);
  assert.match(upload, /upload_validation_error/);
});
