import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const html = await readFile(new URL('../deploy-worker/public/employee-v3.html', import.meta.url), 'utf8');
const worker = await readFile(new URL('../deploy-worker/src/index.js', import.meta.url), 'utf8');

function block(source, name) {
  let start = source.indexOf(`function ${name}`);
  if (source.slice(start - 6, start) === 'async ') start -= 6;
  assert.ok(start >= 0, `${name} must exist`);
  const marker = source.indexOf(`__name(${name},`, start);
  if (marker >= 0) return source.slice(start, marker);
  const next = source.indexOf('\nfunction ', start + 10);
  return source.slice(start, next < 0 ? source.length : next);
}

test('client Bed Transfer serializer is explicit and never spreads Bed Context', () => {
  const builder = block(html, 'buildBedTransferAnchor');
  assert.doesNotMatch(builder, /employeeBaseEntryPayload|\.\.\.|bedTransferContext|source_context|target_context/);
  for (const field of ['from_bed','to_bed','transfer_reason','fee_mode','fee_amount_aed','fee_amount_fils','payment_method','fee_waiver_reason','fee_due_date','bed_price_difference_mode','bed_price_difference_amount_aed','bed_price_difference_payment_method','bed_price_difference_due_date','bed_price_difference_reason']) {
    assert.match(builder, new RegExp(`\\b${field}\\b`));
  }
});

test('client serializer excludes every server-managed and provider identity field', () => {
  const builder = block(html, 'buildBedTransferAnchor');
  for (const field of ['transfer_anchor_id','transfer_lineage_id','previous_transfer_anchor_id','source_context_anchor_refs','carried_arrears_refs','snapshot_fingerprint','corpid','stay_context_id','tenant_card_id','card_id','old_ttlock_ref','provider_phone','phone_99099','transfer_date','transfer_at','canonical_accepted_at','accepted_at']) {
    assert.doesNotMatch(builder, new RegExp(field));
  }
});

test('all client timestamp aliases are rejected recursively before DB access', () => {
  const firewall = block(worker, 'bedTransferForbiddenIdentityFieldsFromBody');
  assert.match(firewall, /new Set\(\["transferat","transferdate","canonicalacceptedat","acceptedat"\]\)/);
  assert.match(firewall, /Object\.entries\(value\)/);
  assert.match(firewall, /collectTimestamps\(child\)/);
  assert.match(firewall, /collectTimestamps\(body\)/);
});

test('canonical validator uses only server time and validate response proves no write requested', () => {
  const validator = block(worker, 'validateEmployeeBedTransferCanonicalLink');
  assert.match(validator, /transfer_at:empNow\(\)/);
  assert.doesNotMatch(validator, /normalized\.transfer_date|entry\.transfer_date|entry\.transfer_at/);
  const payloadValidator = block(worker, 'validateEmployeeEntryUploadPayload');
  assert.match(payloadValidator, /no_write_requested:\["TF","TFF"\]\.includes\(type\)/);
  assert.match(payloadValidator, /write_attempted:false/);
});

test('server TF contract and allowlist no longer accept a client transfer timestamp', () => {
  assert.doesNotMatch(worker.match(/TF:\["event_type","from_bed"[\s\S]*?\]\n};/)?.[0] || '', /transfer_date/);
  const allowlistStart = worker.indexOf('TF:["id"', worker.indexOf('const employeeSourceFirewallAllowedFields'));
  const allowlistEnd = worker.indexOf(']\n};', allowlistStart);
  const allowlist = worker.slice(allowlistStart, allowlistEnd);
  assert.doesNotMatch(allowlist, /transfer_date|transfer_at|canonical_accepted_at|accepted_at|old_ttlock_context|tenant_card_id/);
});
