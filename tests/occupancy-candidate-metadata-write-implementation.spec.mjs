import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const workerPath = "deploy-worker/src/index.js";

function functionBlock(source, name, kind = "function") {
  const start = source.indexOf(`${kind} ${name}(`);
  assert.ok(start >= 0, `${name} must exist`);
  const marker = `__name(${name}`;
  const end = source.indexOf(marker, start);
  assert.ok(end > start, `${name} block must end with __name marker`);
  return source.slice(start, end);
}

async function loadMetadataHarness() {
  const worker = await readFile(workerPath, "utf8");
  const helperStart = worker.indexOf("function employeeEntryOccupancyCandidateNoWriteProof");
  const helperEnd = worker.indexOf("function validateRentUploadFields", helperStart);
  assert.ok(helperStart > 0 && helperEnd > helperStart, "occupancy metadata helper block must exist");
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(
    `
    function __name(fn){ return fn; }
    function cleanText(value,max=10000){ return Array.from(String(value ?? '')).join('').trim().slice(0,max); }
    function cleanDate(value){ return cleanText(value,32).slice(0,10); }
    function cleanId(value,max=80){ return cleanText(value,max).replace(/[^a-zA-Z0-9_-]/g,''); }
    function cleanMoney(value){ return Math.round((Number(String(value ?? 0).replace(/,/g,''))||0)*100)/100; }
    function empTodayDubai(){ return '2026-07-08'; }
    function entryAnchorMoney(value){ return cleanMoney(value); }
    function entryAnchorType(row){
      const raw=String(row?.type||'').trim().toUpperCase();
      if(raw==='T'||raw==='TRANSFER'||raw==='BED_TRANSFER')return 'TF';
      if(raw)return raw;
      const event=String(row?.event_type||'').trim().toLowerCase();
      return {rent:'R',arrears_payment:'AP',deposit_in:'D',deposit_out:'DR',checkout:'CO',left_with_arrears:'CO',expense:'E',bed_transfer:'TF'}[event]||raw;
    }
    function entryAnchorEventType(type){
      return {R:'rent',AP:'arrears_payment',D:'deposit_in',DR:'deposit_out',CO:'checkout',E:'expense',TF:'bed_transfer',TFF:'bed_transfer_fee'}[type]||String(type||'entry').toLowerCase();
    }
    function buildAccessSnapshotDTO(rawRemark){
      return {bed:'',parsed_deposit_amount:null,parsed_checkin_mmdd:'',parsed_valid_until_mmdd:'',parse_status:rawRemark?'unparsed':'not_provided'};
    }
    function normalizeEntryAnchor(row){
      const type=entryAnchorType(row);
      return {
        ...row,
        id:row?.id||row?.event_id||'',
        event_id:row?.event_id||row?.id||'',
        anchor_id:row?.anchor_id||row?.event_id||row?.id||'',
        type,
        event_type:row?.event_type||entryAnchorEventType(type),
        bed:row?.bed||row?.room||'',
        room:row?.room||row?.bed||'',
        from_bed:row?.from_bed||row?.bed_from||row?.room||'',
        to_bed:row?.to_bed||row?.bed_to||row?.roomTo||'',
        target_bed:row?.target_bed||row?.room||'',
        arrears_ref:row?.arrears_ref||row?.linked_task_id||row?.original_arrears_id||'',
        original_event_id:row?.original_event_id||''
      };
    }
    ${worker.slice(helperStart, helperEnd)}
    globalThis.buildEmployeeEntryEntriesWithOccupancyCandidateMetadata = buildEmployeeEntryEntriesWithOccupancyCandidateMetadata;
    globalThis.employeeEntryOccupancyCandidateMetadataFromPreviewEvent = employeeEntryOccupancyCandidateMetadataFromPreviewEvent;
    `,
    sandbox
  );
  return sandbox;
}

async function loadFingerprintHarness() {
  const worker = await readFile(workerPath, "utf8");
  const start = worker.indexOf("const entryAnchorContract");
  const end = worker.indexOf("function cloudArrearsSessionIsActive", start);
  assert.ok(start > 0 && end > start, "employee anchor block must exist");
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(
    `
    function __name(fn){ return fn; }
    function cleanText(value,max=10000){ return Array.from(String(value ?? '')).join('').trim().slice(0,max); }
    function cleanDate(value){ return cleanText(value,32).slice(0,10); }
    const employeeEntryAnchorParseCache=new WeakMap();
    ${worker.slice(start, end)}
    globalThis.buildCanonicalEventFingerprint = buildCanonicalEventFingerprint;
    globalThis.extractEmployeeEntryAnchorsFromSession = extractEmployeeEntryAnchorsFromSession;
    `,
    sandbox
  );
  return sandbox;
}

function sevenEvents() {
  return [
    { type: "R", id: "ent-rent", room: "334", amount: 700, paid: 700, due: 780, period_due: 780, period_start: "2026-08-01", period_end: "2026-09-01" },
    { type: "AP", id: "ent-ap", room: "334", amount: 80, linked_task_id: "task-mraw1ygi-6094bf14", arrears_ref: "task-mraw1ygi-6094bf14" },
    { type: "D", id: "ent-dep-in", room: "321", amount: 200, deposit_reason: "new" },
    { type: "DR", id: "ent-dep-out", room: "321", amount: 100 },
    { type: "CO", id: "ent-checkout", room: "321", amount: 0, checkout_date: "2026-07-08" },
    { type: "E", id: "ent-expense", room: "401", target_bed: "401", amount: 14, expense_category: "maintenance" },
    { type: "TF", id: "ent-transfer", room: "145", bed_from: "145", bed_to: "146", amount: 50, payment_method: "cash" }
  ];
}

test("real upload wiring attaches metadata after validation and before entries_json write", async () => {
  const worker = await readFile(workerPath, "utf8");
  const uploadBlock = functionBlock(worker, "handleEmployeeEntry", "async function");
  const validateIndex = uploadBlock.indexOf("const validationResult=await validateEmployeeEntryUploadPayload");
  const metadataIndex = uploadBlock.indexOf("buildEmployeeEntryEntriesWithOccupancyCandidateMetadata(user,body,canonicalInputEntries)");
  const entriesJsonIndex = uploadBlock.indexOf("const sessionEntriesJson=JSON.stringify");
  const writeIndex = uploadBlock.indexOf('await empInsertDynamic(env,"sessions"');

  assert.ok(validateIndex > 0);
  assert.ok(metadataIndex > validateIndex);
  assert.ok(entriesJsonIndex > metadataIndex);
  assert.ok(writeIndex > entriesJsonIndex);
});

test("dry-run validation keeps structured entries without persisted metadata", async () => {
  const worker = await readFile(workerPath, "utf8");
  const validateBlock = functionBlock(worker, "validateEmployeeEntryUploadPayload", "async function");

  assert.match(validateBlock, /rawSessionEntries\.map\(row=>normalizeEntryAnchor\(row\)\)/);
  assert.doesNotMatch(validateBlock, /buildEmployeeEntryEntriesWithOccupancyCandidateMetadata/);
});

test("server-side helper attaches non-authoritative metadata for all seven event types", async () => {
  const h = await loadMetadataHarness();
  const entries = sevenEvents();
  const output = h.buildEmployeeEntryEntriesWithOccupancyCandidateMetadata(
    { corpid: "homelink" },
    { session: { id: "S-meta", entries } },
    entries
  );

  assert.equal(output.length, 7);
  for (const row of output) {
    const meta = row.occupancy_candidate_metadata;
    assert.equal(meta.version, "occupancy_candidate_v1");
    assert.equal(meta.non_authoritative, true);
    assert.equal(meta.metadata_only, true);
    assert.equal(meta.not_durable, true);
    assert.equal(meta.not_final_identity, true);
    assert.equal(meta.not_used_for_matching, true);
    assert.equal(meta.candidate_persistence, "metadata_only_not_authoritative");
    assert.equal(meta.source, "server_upload_preflight");
    assert.deepEqual(JSON.parse(JSON.stringify(meta.forbidden_inputs_used)), {
      card_id: false,
      tenant_card_id: false,
      provider_phone: false,
      phone_99099: false
    });
  }
  assert.deepEqual(output.map((row) => row.event_type), [
    "rent",
    "arrears_payment",
    "deposit_in",
    "deposit_out",
    "checkout",
    "expense",
    "bed_transfer"
  ]);
});

test("frontend-provided metadata is ignored and rebuilt server-side", async () => {
  const h = await loadMetadataHarness();
  const input = [{
    type: "R",
    id: "ent-rent",
    room: "334",
    amount: 700,
    occupancy_candidate_metadata: {
      candidate_id: "frontend-forged",
      forbidden_inputs_used: { card_id: true, tenant_card_id: true, provider_phone: true, phone_99099: true }
    }
  }];
  const output = h.buildEmployeeEntryEntriesWithOccupancyCandidateMetadata(
    { corpid: "homelink" },
    { session: { id: "S-meta", entries: input } },
    input
  );
  const meta = output[0].occupancy_candidate_metadata;

  assert.notEqual(meta.candidate_id, "frontend-forged");
  assert.equal(meta.source, "server_upload_preflight");
  assert.deepEqual(JSON.parse(JSON.stringify(meta.forbidden_inputs_used)), {
    card_id: false,
    tenant_card_id: false,
    provider_phone: false,
    phone_99099: false
  });
});

test("candidate metadata does not affect canonical fingerprint", async () => {
  const h = await loadFingerprintHarness();
  const base = {
    type: "R",
    event_id: "ent-rent",
    room: "334",
    amount: 700,
    paid: 700,
    due: 780,
    period_due: 780,
    pay_type: "C",
    period_start: "2026-08-01",
    period_end: "2026-09-01"
  };
  const withMetadata = {
    ...base,
    occupancy_candidate_metadata: {
      version: "occupancy_candidate_v1",
      candidate_id: "occ_candidate:homelink:334:20260708:ent-rent",
      forbidden_inputs_used: { card_id: false, tenant_card_id: false, provider_phone: false, phone_99099: false }
    }
  };

  assert.equal(
    h.buildCanonicalEventFingerprint(base, { corpid: "homelink" }),
    h.buildCanonicalEventFingerprint(withMetadata, { corpid: "homelink" })
  );
});

test("owner history parser and old sessions remain compatible with metadata and without metadata", async () => {
  const h = await loadFingerprintHarness();
  const oldEntry = { type: "R", id: "old-rent", room: "334", amount: 700, paid: 700, due: 700, period_due: 700 };
  const newEntry = {
    ...oldEntry,
    id: "new-rent",
    occupancy_candidate_metadata: {
      version: "occupancy_candidate_v1",
      non_authoritative: true,
      metadata_only: true,
      not_durable: true,
      not_final_identity: true,
      not_used_for_matching: true,
      forbidden_inputs_used: { card_id: false, tenant_card_id: false, provider_phone: false, phone_99099: false }
    }
  };

  const oldRows = h.extractEmployeeEntryAnchorsFromSession({
    id: "S-old",
    corpid: "homelink",
    source: "employee_entry",
    entries_json: JSON.stringify({ entries: [oldEntry] })
  });
  const newRows = h.extractEmployeeEntryAnchorsFromSession({
    id: "S-new",
    corpid: "homelink",
    source: "employee_entry",
    entries_json: JSON.stringify({ entries: [newEntry] })
  });

  assert.equal(oldRows.length, 1);
  assert.equal(newRows.length, 1);
  assert.equal(oldRows[0].event_type, "rent");
  assert.equal(newRows[0].event_type, "rent");
  assert.equal(newRows[0].occupancy_candidate_metadata.version, "occupancy_candidate_v1");
});

test("metadata implementation avoids forbidden runtime scopes", async () => {
  const worker = await readFile(workerPath, "utf8");
  const metadataBlock = [
    functionBlock(worker, "employeeEntryOccupancyCandidateMetadataFromPreviewEvent"),
    functionBlock(worker, "buildEmployeeEntryEntriesWithOccupancyCandidateMetadata")
  ].join("\n");

  assert.doesNotMatch(metadataBlock, /\.run\(/);
  assert.doesNotMatch(metadataBlock, /empInsertDynamic\(/);
  assert.doesNotMatch(metadataBlock, /env\.DB/);
  assert.doesNotMatch(metadataBlock, /tenant_card_id.*basis/i);
  assert.doesNotMatch(metadataBlock, /provider_phone.*basis/i);
});
