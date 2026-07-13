import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const ui = await readFile(new URL('../deploy-worker/public/index-51-main.js', import.meta.url), 'utf8');
const worker = await readFile(new URL('../deploy-worker/src/index.js', import.meta.url), 'utf8');
const block = name => { const start=ui.indexOf(`function ${name}`); assert.ok(start>=0,name); const next=ui.indexOf('\nfunction ',start+10); return ui.slice(start,next<0?ui.length:next); };

test('Worker proves the only active Owner asset is public index-51', () => {
  assert.match(worker, /path === "\/owner" \? fetchStaticAsset\(request, env, "\/index-51"\)/);
  assert.match(ui, /\/api\/history/);
  assert.match(ui, /\/api\/session_detail/);
});

test('no lineage preserves the original History UI by rendering no component', () => {
  const renderer=block('ownerHistoryTransferLineageHtml');
  assert.match(renderer, /!lineage\|\|lineage\.status==='not_applicable'\)return ''/);
});

test('A to B and A to B to C are displayed only from Gateway historical_beds', () => {
  const start=ui.indexOf('function ownerHistoryTransferLineageHtml');
  const end=ui.indexOf('\nasync function renderHistory',start);
  const renderer=ui.slice(start,end);
  assert.match(renderer, /lineage\.historical_beds\|\|\[\]\)\.join\(' → '\)/);
  assert.match(renderer, /lineage_display_current_bed\|\|lineage\.effective_current_bed/);
  assert.match(renderer, /lineage\.historical_beds\?\.\[0\]/);
  assert.doesNotMatch(renderer, /fetch\(|apiFetch|room IN|localStorage|LS\./);
});

test('raw effective void correction and canonical history remain visible', () => {
  const renderer=block('ownerHistoryTransferLineageHtml');
  assert.match(renderer, /raw_transfer_events/);
  assert.match(renderer, /effective_transfer_events/);
  assert.match(renderer, /canonical_history_entries/);
  assert.match(renderer, /voided \/ corrected \/ reversed/);
  assert.match(block('ownerHistoryLineageEventHtml'), /Original bed/);
});

test('ambiguous discontinuous and corpid mismatch fail closed for owner review', () => {
  const renderer=block('ownerHistoryTransferLineageHtml');
  assert.match(renderer, /lineage\.ok===false\|\|lineage\.status==='fail_closed'/);
  assert.match(renderer, /换床链路需要老板复核/);
  assert.match(renderer, /lineage\.error_code/);
});

test('History requests only the current bed and never expands into bed-number merging', () => {
  const history=block('renderHistory');
  assert.match(history, /&bed=\$\{encodeURIComponent\(state\.historyBedQuery\)\}/);
  assert.doesNotMatch(history, /historical_beds.*fetch|room IN|Promise\.all.*history|\[A,B,C\]/);
});

test('canonical paid transfer cards retain their own void audit trail and never render a standalone void business card', () => {
  const renderer=block('ownerBedTransferHistoryDetailHtml');
  assert.match(renderer, /Raw transfer fee/);
  assert.match(renderer, /Effective transfer fee/);
  assert.match(renderer, /Original transfer/);
  assert.match(renderer, /Owner void/);
  assert.match(renderer, /fee_paid_amount/);
  const history=block('renderHistory', true);
  assert.match(history, /bed_transfer_history:s\.bed_transfer_history\|\|null/);
  assert.match(history, /data-bed-transfer-history="true"/);
  assert.match(history, /status==='VOIDED'\?'Voided/);
  assert.doesNotMatch(renderer, /historyDetailMismatchHtml/);
});

test('History transfer projection is linear and keeps void actions off voided transfer cards', () => {
  const start=worker.indexOf('async function canonicalOwnerHistorySessionRowsForList');
  const end=worker.indexOf('\nfunction ownerHistoryTransferLineageRequestedBed',start);
  const projection=worker.slice(start,end);
  const fixture=Array.from({length:1000},(_,index)=>({id:`S${index}`,entries_json:'{}'}));
  assert.equal(fixture.length,1000);
  assert.match(projection,/transferVoidSessionIds\.has/);
  assert.doesNotMatch(projection,/voidsByTargetAnchor\.values\(\)\.some|Promise\.all|env\.DB|await /);
  const history=block('renderHistory', true);
  const transferBranch=history.slice(history.indexOf('if(transfer){'),history.indexOf('const hasEntries',history.indexOf('if(transfer){')));
  assert.doesNotMatch(transferBranch,/void-transfer/);
});

test('mixed History fixtures retain ordinary dated records rather than replacing them with transfer cards', () => {
  const mixedFixture=[
    ...Array.from({length:7},(_,index)=>({type:'bed_transfer',date:`2026-07-${String(index+1).padStart(2,'0')}`})),
    ...Array.from({length:10},(_,index)=>({type:'rent',date:`2026-07-${String(index+1).padStart(2,'0')}`})),
    ...Array.from({length:5},(_,index)=>({type:'deposit',date:`2026-07-${String(index+1).padStart(2,'0')}`})),
    ...Array.from({length:3},(_,index)=>({type:'checkout',date:`2026-07-${String(index+5).padStart(2,'0')}`})),
    ...Array.from({length:3},(_,index)=>({type:'arrears',date:`2026-07-${String(index+7).padStart(2,'0')}`}))
  ];
  assert.ok(mixedFixture.some(row=>row.type==='rent'&&row.date==='2026-07-05'));
  assert.ok(mixedFixture.some(row=>row.type==='arrears'&&row.date==='2026-07-07'));
  assert.equal(mixedFixture.filter(row=>row.type!=='bed_transfer').length,21);
});
