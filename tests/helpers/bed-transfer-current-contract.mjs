import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

export const worker = await readFile(new URL('../../deploy-worker/src/index.js', import.meta.url), 'utf8');
export const employeeUi = await readFile(new URL('../../deploy-worker/public/employee-v3.html', import.meta.url), 'utf8');
export const businessContract = await readFile(new URL('../../docs/BED_TRANSFER_PHASE1_BUSINESS_CONTRACT_V1.md', import.meta.url), 'utf8');
const linkContract = await readFile(new URL('../../modules/employees/bed-transfer-canonical-link-anchor.mjs', import.meta.url), 'utf8');
const financeProjection = await readFile(new URL('../../modules/finance/bed-transfer-finance-arrears-projection.mjs', import.meta.url), 'utf8');

export function block(source, name) {
  let start = source.indexOf(`function ${name}`);
  if (source.slice(start - 6, start) === 'async ') start -= 6;
  assert.ok(start >= 0, `${name} missing`);
  const marker = source.indexOf(`__name(${name},`, start);
  if (marker > start) return source.slice(start, marker);
  const open = source.indexOf('{', start);
  let depth = 0;
  for (let index = open; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}') depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`${name} end missing`);
}

export function assertLegacyRecordOnlyPathSuperseded() {
  const legacy = block(worker, 'handleEmployeeBedTransferCreate');
  assert.match(legacy, /return bedTransferCanonicalPathRequiredResponse\(\)/);
  assert.doesNotMatch(legacy, /request\.json|INSERT|UPDATE|DELETE|\.run\(|\.batch\(/i);
  assert.match(worker, /BED_TRANSFER_LEGACY_WRITE_PATH_DISABLED/);
  assert.match(worker, /canonical_write_endpoint:"\/api\/employee\/entry"/);
  assert.match(businessContract, /Canonical Archive|sessions\.entries_json/);
}

export function assertCanonicalArchiveWrite() {
  const persist = block(worker, 'persistEmployeeBedTransferCanonicalArchive');
  assert.match(persist, /prepareCanonicalTransferArchiveWrite/);
  assert.match(persist, /INSERT INTO sessions .*source,entries_json\)/s);
  assert.match(persist, /CANONICAL_ARCHIVE_PERSISTENCE_VERIFICATION_FAILED/);
  assert.match(persist, /classifyExistingCanonicalTransfer/);
  assert.match(persist, /classified\.status==='conflict'/);
  assert.match(linkContract, /canonical_request_fingerprint|transfer_anchor_id/);
  assert.doesNotMatch(persist, /bed_transfer_events|entry_events|transactions|DB\.batch/);
  assert.match(block(worker, 'employeeBedTransferSingleEntryFailure'), /BED_TRANSFER_SESSION_MUST_BE_SINGLE_ENTRY/);
}

export function assertCanonicalNoMutation() {
  const persist = block(worker, 'persistEmployeeBedTransferCanonicalArchive');
  assert.equal((persist.match(/INSERT INTO sessions/g) || []).length, 1);
  assert.match(persist, /UPDATE sessions SET voided_at=.*CANONICAL_ARCHIVE_PERSISTENCE_VERIFICATION_FAILED/s);
  assert.doesNotMatch(persist, /occupancy|deposit|arrear_tasks|ttlock|bed_transfer_events|entry_events|transactions|DELETE/i);
  assert.match(worker, /production_cutover:"PRODUCTION_NO_GO"/);
}

export function assertCanonicalFeeContract() {
  assert.match(linkContract, /BED_TRANSFER_FEE_AMOUNT_INVALID/);
  assert.match(linkContract, /BED_TRANSFER_FEE_WAIVER_REASON_REQUIRED/);
  assert.match(linkContract, /BED_TRANSFER_FEE_DUE_DATE_REQUIRED/);
  assert.match(financeProjection, /bed_transfer_fee_income/);
  assert.match(financeProjection, /bed_price_difference_income/);
  assert.match(financeProjection, /rent_income: 0/);
  assert.match(employeeUi, /fee_mode/);
  assert.match(employeeUi, /fee_waiver_reason/);
  assert.match(employeeUi, /fee_due_date/);
}

export function assertCanonicalEmployeeUi() {
  const builder = block(employeeUi, 'buildBedTransferAnchor');
  const draft = block(employeeUi, 'saveCanonicalBedTransferDraft');
  for (const field of ['from_bed', 'to_bed', 'transfer_reason', 'fee_mode', 'fee_amount_aed', 'bed_price_difference_mode']) assert.match(builder, new RegExp(field));
  assert.doesNotMatch(builder, /transfer_date|transfer_at|tenant_card_id|card_id|provider_phone|phone_99099|old_ttlock_ref/);
  assert.match(draft, /validateEmployeeUploadDryRun/);
  assert.match(draft, /state\.drafts=\[entry\]/);
  assert.doesNotMatch(draft, /\/api\/employee\/bed-transfers/);
  assert.match(employeeUi, /const BED_TRANSFER_WRITE_ENABLED=false/);
}

export function assertCanonicalContextAndSummary() {
  assert.match(employeeUi, /employeeLoadBedTransferContexts/);
  assert.match(employeeUi, /state\.bedTransferContext=\{status/);
  assert.match(employeeUi, /employeeRenderBedTransferServerValidation/);
  assert.match(employeeUi, /employee_first_pre_move/);
  assert.match(employeeUi, /owner_first_post_move/);
  assert.match(employeeUi, /data-bed-transfer/);
  assert.doesNotMatch(block(employeeUi, 'buildBedTransferAnchor'), /source_context|target_context|provider|card_id/i);
}
