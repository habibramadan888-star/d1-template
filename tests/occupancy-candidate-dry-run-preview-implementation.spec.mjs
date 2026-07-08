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

async function loadPreviewHarness() {
  const worker = await readFile(workerPath, "utf8");
  const helperStart = worker.indexOf("function employeeEntryOccupancyCandidateNoWriteProof");
  const helperEnd = worker.indexOf("function validateRentUploadFields", helperStart);
  assert.ok(helperStart > 0 && helperEnd > helperStart, "occupancy helper block must exist");

  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(
    `
    function __name(fn){ return fn; }
    function cleanText(value,max=10000){ return Array.from(String(value ?? '')).join('').trim().slice(0,max); }
    function cleanDate(value){ return cleanText(value,32).slice(0,10); }
    function cleanId(value,max=80){ return cleanText(value,max).replace(/[^a-zA-Z0-9:_-]/g,''); }
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
        event_type:row?.event_type||entryAnchorEventType(type),
        bed:row?.bed||row?.room||'',
        from_bed:row?.from_bed||row?.bed_from||row?.room||'',
        to_bed:row?.to_bed||row?.bed_to||row?.roomTo||'',
        target_bed:row?.target_bed||row?.room||'',
        arrears_ref:row?.arrears_ref||row?.linked_task_id||row?.original_arrears_id||'',
        original_event_id:row?.original_event_id||''
      };
    }
    ${worker.slice(helperStart, helperEnd)}
    globalThis.buildEmployeeEntryOccupancyCandidatePreview = buildEmployeeEntryOccupancyCandidatePreview;
    globalThis.employeeEntryOccupancyCandidateNoWriteProof = employeeEntryOccupancyCandidateNoWriteProof;
    `,
    sandbox
  );
  return sandbox;
}

async function loadBedTransferFeeHarness() {
  const worker = await readFile(workerPath, "utf8");
  const start = worker.indexOf("function employeeEntryUploadHasExplicitValue");
  const end = worker.indexOf("function employeeEntryOccupancyCandidateNoWriteProof", start);
  assert.ok(start > 0 && end > start, "bed transfer fee helper block must exist");
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(
    `
    function __name(fn){ return fn; }
    function cleanText(value,max=10000){ return Array.from(String(value ?? '')).join('').trim().slice(0,max); }
    function employeeEntryUploadAmount(value){ return Number(String(value ?? 0).replace(/,/g,''))||0; }
    function entryAnchorPaymentMethod(value){
      const raw=String(value||'').trim().toLowerCase();
      if(raw==='c'||raw==='cash')return 'cash';
      if(raw==='b'||raw==='bank')return 'bank';
      return raw||'other';
    }
    ${worker.slice(start, end)}
    globalThis.employeeEntryBedTransferFee = employeeEntryBedTransferFee;
    `,
    sandbox
  );
  return sandbox;
}

function sessionBody(entries, entry = entries[0]) {
  return {
    entry,
    session: {
      id: "S-dryrun",
      session_id: "S-dryrun",
      entries
    }
  };
}

test("validate handler attaches occupancy_candidate_preview only on successful dry-run response", async () => {
  const worker = await readFile(workerPath, "utf8");
  const validateHandler = functionBlock(worker, "handleEmployeeEntryValidate", "async function");
  const realUpload = functionBlock(worker, "handleEmployeeEntry", "async function");

  assert.match(validateHandler, /occupancy_candidate_preview:buildEmployeeEntryOccupancyCandidatePreview\(user,body\)/);
  assert.match(validateHandler, /if\(!result\.ok\)return json\(\{success:false,\.\.\.result\},422\)/);
  assert.doesNotMatch(realUpload, /occupancy_candidate_preview/);
});

test("occupancy preview helpers are pure and contain no write calls", async () => {
  const worker = await readFile(workerPath, "utf8");
  const helperStart = worker.indexOf("function employeeEntryOccupancyCandidateNoWriteProof");
  const helperEnd = worker.indexOf("function validateRentUploadFields", helperStart);
  const helperBlock = worker.slice(helperStart, helperEnd);

  for (const forbidden of [
    ".run(",
    "empInsertDynamic(",
    "empEvent(",
    "audit(",
    "handleEmployeeEntry(",
    "env.DB.prepare"
  ]) {
    assert.doesNotMatch(helperBlock, new RegExp(forbidden.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("preview top-level shape and no-write proof match contract", async () => {
  const h = await loadPreviewHarness();
  const preview = h.buildEmployeeEntryOccupancyCandidatePreview(
    { corpid: "homelink" },
    sessionBody([
      {
        type: "R",
        id: "ent-rent",
        room: "334",
        amount: 700,
        period_start: "2026-08-01",
        period_end: "2026-09-01"
      }
    ])
  );

  assert.equal(preview.enabled, true);
  assert.equal(preview.mode, "dry_run_preview_only");
  assert.equal(preview.no_write, true);
  assert.equal(preview.source, "server_dry_run");
  assert.equal(preview.candidate_persistence, "not_persisted");
  assert.equal(preview.migration_required_for_durable_id, true);
  assert.equal(preview.no_write_proof.dry_run, true);
  assert.equal(Array.isArray(preview.no_write_proof.write_endpoints_called), true);
  assert.equal(preview.no_write_proof.write_endpoints_called.length, 0);
  assert.equal(preview.no_write_proof.d1_write_count, 0);
  assert.equal(preview.no_write_proof.real_upload_called, false);
  assert.equal(preview.no_write_proof.candidate_persistence, "not_persisted");
});

test("rent preview returns a dry-run candidate without forbidden identity inputs", async () => {
  const h = await loadPreviewHarness();
  const preview = h.buildEmployeeEntryOccupancyCandidatePreview(
    { corpid: "homelink" },
    sessionBody([
      {
        type: "R",
        id: "ent-rent",
        room: "334",
        amount: 700,
        period_start: "2026-08-01",
        period_end: "2026-09-01",
        card_id: "provider-card",
        tenant_card_id: "legacy-tenant-card",
        provider_phone: "+971525199099"
      }
    ])
  );
  const event = preview.events[0];

  assert.equal(event.event_type, "rent");
  assert.equal(event.occupancy_candidate_status, "candidate_created");
  assert.match(event.occupancy_candidate_id, /^occ_candidate:homelink:334:/);
  assert.deepEqual(JSON.parse(JSON.stringify(event.forbidden_inputs_used)), {
    card_id: false,
    tenant_card_id: false,
    provider_phone: false,
    phone_99099: false
  });
  assert.doesNotMatch(event.occupancy_candidate_id, /provider-card|legacy-tenant-card|99099/i);
});

test("arrears payment preview inherits by ref only and stays unresolved without existing candidate", async () => {
  const h = await loadPreviewHarness();
  const preview = h.buildEmployeeEntryOccupancyCandidatePreview(
    { corpid: "homelink" },
    sessionBody([
      {
        type: "AP",
        id: "ent-ap",
        room: "334",
        amount: 80,
        arrears_ref: "task-mraw1ygi-6094bf14",
        linked_task_id: "task-mraw1ygi-6094bf14"
      }
    ])
  );
  const event = preview.events[0];

  assert.equal(event.event_type, "arrears_payment");
  assert.equal(event.occupancy_candidate_status, "candidate_unresolved");
  assert.equal(event.occupancy_candidate_id, null);
  assert.equal(event.candidate_basis.linked_arrears_ref, "task-mraw1ygi-6094bf14");
});

test("deposit in, deposit out, checkout, left-with-arrears, expense, and transfer statuses are represented", async () => {
  const h = await loadPreviewHarness();
  const entries = [
    { type: "D", id: "ent-dep-in", room: "321", amount: 200, deposit_reason: "new" },
    { type: "DR", id: "ent-dep-out", room: "321", amount: 100 },
    { type: "CO", id: "ent-checkout", room: "321", amount: 0, checkout_date: "2026-07-08" },
    { type: "CO", id: "ent-left", room: "623", amount: 0, left_with_arrears: true, whatsapp_phone: "+971501234567" },
    { type: "E", id: "ent-expense", amount: 20, expense_category: "property" },
    { type: "TF", id: "ent-transfer", room: "112", bed_from: "112", bed_to: "111", amount: 50, fee_paid: "Y" }
  ];
  const preview = h.buildEmployeeEntryOccupancyCandidatePreview({ corpid: "homelink" }, sessionBody(entries));
  const statuses = Object.fromEntries(preview.events.map((event) => [event.event_id, event.occupancy_candidate_status]));

  assert.equal(statuses["ent-dep-in"], "candidate_created");
  assert.equal(statuses["ent-dep-out"], "candidate_unresolved");
  assert.equal(statuses["ent-checkout"], "candidate_checkout_pending");
  assert.equal(statuses["ent-left"], "candidate_left_with_arrears");
  assert.equal(statuses["ent-expense"], "candidate_not_applicable");
  assert.equal(statuses["ent-transfer"], "candidate_unresolved");
  assert.equal(preview.events.find((event) => event.event_id === "ent-transfer").candidate_basis.from_state_after_expected, "vacant_or_closed_preview");
});

test("bed transfer occupied target returns candidate conflict anomaly", async () => {
  const h = await loadPreviewHarness();
  const preview = h.buildEmployeeEntryOccupancyCandidatePreview(
    { corpid: "homelink" },
    sessionBody([
      {
        type: "TF",
        id: "ent-transfer",
        room: "112",
        bed_from: "112",
        bed_to: "111",
        amount: 50,
        fee_paid: "Y",
        to_bed_occupied: true
      }
    ])
  );
  const event = preview.events[0];

  assert.equal(event.occupancy_candidate_status, "candidate_conflict");
  assert.equal(event.anomalies[0].risk_code, "BED_TRANSFER_TO_OCCUPIED_BED");
});

test("bed transfer fee normalization accepts paid aliases", async () => {
  const h = await loadBedTransferFeeHarness();
  const cases = [
    { fee_paid: true, fee_amount: 50, payment_method: "cash" },
    { transfer_fee: 50, payment_method: "cash" },
    { fee_amount: 50, payment_method: "cash" },
    { type: "TF", amount: 50, payment_method: "cash" }
  ];
  for (const fixture of cases) {
    const fee = h.employeeEntryBedTransferFee(fixture, {});
    assert.equal(fee.fee_choice, "paid");
    assert.equal(fee.fee_paid, true);
    assert.equal(fee.fee_waived, false);
    assert.equal(fee.fee_amount, 50);
    assert.equal(fee.payment_method, "cash");
  }
});

test("bed transfer fee normalization accepts waived and none aliases", async () => {
  const h = await loadBedTransferFeeHarness();
  const waived = h.employeeEntryBedTransferFee({ fee_waived: true, fee_waived_reason: "manager approval" }, {});
  const choiceWaived = h.employeeEntryBedTransferFee({ fee_choice: "waived", waived_reason: "customer request" }, {});
  const none = h.employeeEntryBedTransferFee({ fee_choice: "none", transfer_fee: 0 }, {});
  const missing = h.employeeEntryBedTransferFee({}, {});

  assert.equal(waived.fee_choice, "waived");
  assert.equal(waived.waiver_reason, "manager approval");
  assert.equal(choiceWaived.fee_choice, "waived");
  assert.equal(choiceWaived.waiver_reason, "customer request");
  assert.equal(none.fee_choice, "none");
  assert.equal(none.fee_amount, 0);
  assert.equal(missing.fee_choice, "");
});

test("bed transfer validation uses canonical fee helper and no rent period fields", async () => {
  const worker = await readFile(workerPath, "utf8");
  const validateFields = functionBlock(worker, "validateBedTransferUploadFields");
  const validatePayload = functionBlock(worker, "validateEmployeeEntryUploadPayload", "async function");

  assert.match(validateFields, /const fee=employeeEntryBedTransferFee\(entry,normalized\)/);
  assert.match(validateFields, /TRANSFER_FEE_CHOICE_REQUIRED/);
  assert.match(validateFields, /BED_TRANSFER_WAIVER_REASON_REQUIRED/);
  assert.match(validateFields, /missing_fields:\["fee_paid"\]/);
  assert.match(validatePayload, /const fee=employeeEntryBedTransferFee\(entry,normalized\)/);
  assert.doesNotMatch(validateFields, /rent_period_start|rent_period_end|period_start|period_end/);
  assert.doesNotMatch(validateFields, /missing\.push\("transfer_reason"\)/);
});

test("bed transfer dispatch uses event_type before legacy type and never falls through to rent", async () => {
  const worker = await readFile(workerPath, "utf8");
  const typeResolver = functionBlock(worker, "employeeEntryUploadType");
  const validateBlock = functionBlock(worker, "validateEmployeeEntryUploadPayload", "async function");
  const anchorType = functionBlock(worker, "entryAnchorType");

  assert.match(typeResolver, /const event=cleanText\(entry\.event_type,60\)\.toLowerCase\(\)/);
  assert.match(typeResolver, /bed_transfer:"TF"/);
  assert.match(typeResolver, /T:"TF"/);
  assert.match(typeResolver, /return eventMap\[event\]/);
  assert.match(validateBlock, /const type=employeeEntryUploadType\(entry\)/);
  assert.doesNotMatch(validateBlock, /const type=cleanText\(entry\.type\|\|entry\.reason_code\|\|"R",12\)\.toUpperCase\(\)/);
  assert.match(anchorType, /raw==="T"\|\|raw==="TRANSFER"\|\|raw==="BED_TRANSFER"/);
});

test("legacy type T bed transfer preview is not routed to rent preview", async () => {
  const h = await loadPreviewHarness();
  const preview = h.buildEmployeeEntryOccupancyCandidatePreview(
    { corpid: "homelink" },
    sessionBody([
      {
        type: "T",
        event_type: "bed_transfer",
        id: "ent-transfer-live-fixture",
        from_bed: "145",
        to_bed: "146",
        transfer_date: "2026-10-01",
        amount: 50,
        payment_method: "cash"
      }
    ])
  );
  const event = preview.events[0];

  assert.equal(event.event_type, "bed_transfer");
  assert.equal(event.from_bed, "145");
  assert.equal(event.to_bed, "146");
  assert.notEqual(event.event_type, "rent");
  assert.notEqual(event.occupancy_candidate_status, "candidate_created");
  assert.deepEqual(JSON.parse(JSON.stringify(event.forbidden_inputs_used)), {
    card_id: false,
    tenant_card_id: false,
    provider_phone: false,
    phone_99099: false
  });
  assert.equal(preview.no_write_proof.real_upload_called, false);
});

test("duplicate guard still runs before business validation", async () => {
  const worker = await readFile(workerPath, "utf8");
  const validateBlock = functionBlock(worker, "validateEmployeeEntryUploadPayload", "async function");
  const duplicateGuardStart = validateBlock.indexOf("const duplicateGuard=await checkEmployeeEntryDuplicates");
  const businessValidationStart = validateBlock.indexOf("const eventFieldValidation=validateEmployeeEntryUploadEventFields");
  const shortPaidValidationStart = validateBlock.indexOf("ARREAR_TASK_REQUIRED_FOR_SHORTFALL");

  assert.ok(duplicateGuardStart > 0);
  assert.ok(duplicateGuardStart < businessValidationStart);
  assert.ok(duplicateGuardStart < shortPaidValidationStart);
});
