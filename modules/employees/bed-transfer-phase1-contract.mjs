const FORBIDDEN_IDENTITY_KEYS = new Set([
  "cardid",
  "tenantcardid",
  "oldttlockref",
  "providerphone",
  "phone99099",
  "creatorphone",
  "cardcreationtime",
  "providermetadata",
  "ttlockprovidermetadata",
  "transferanchorid",
  "transferlineageid",
  "previoustransferanchorid",
  "localcache",
  "uitext",
  "preview",
  "whatsapptext"
  ,"sourcecontextanchorrefs","carriedarrearsrefs","rentcoverageref","depositcontextref","expirycontextref"
  ,"snapshotfingerprint","snapshotprovenance","currentbed","corpid","companyscope","staycontextid"
  ,"lifecycle","lifecyclestatus","status","void","voided","voidedat","voidstatus","reversalstatus"
]);

function text(value) {
  return String(value ?? "").trim();
}

function bed(value) {
  return text(value).replace(/^#+/, "");
}

function amount(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : null;
}

function exactDate(value) {
  const raw = text(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : "";
}

function failure(error_code, message, invalid_fields = [], missing_fields = []) {
  return {
    ok: false,
    event_type: "bed_transfer",
    type: "TF",
    error_code,
    message,
    invalid_fields,
    missing_fields
  };
}

function normalizedIdentityKey(value) {
  return String(value ?? "").replace(/[^a-z0-9]/gi, "").toLowerCase();
}

function collectForbiddenIdentityFields(value, fields = new Set(), seen = new Set()) {
  if (!value || typeof value !== "object" || seen.has(value)) return fields;
  seen.add(value);
  if (Array.isArray(value)) {
    value.forEach(item => collectForbiddenIdentityFields(item, fields, seen));
    return fields;
  }
  Object.entries(value).forEach(([key, child]) => {
    if (FORBIDDEN_IDENTITY_KEYS.has(normalizedIdentityKey(key))) fields.add(String(key));
    collectForbiddenIdentityFields(child, fields, seen);
  });
  return fields;
}

export function findBedTransferForbiddenIdentityFields(value) {
  return [...collectForbiddenIdentityFields(value)].sort((a, b) => a.localeCompare(b));
}

export function sanitizeBedTransferIdentityFields(value, seen = new Map()) {
  if (!value || typeof value !== "object") return value;
  if (seen.has(value)) return seen.get(value);
  const output = Array.isArray(value) ? [] : {};
  seen.set(value, output);
  if (Array.isArray(value)) {
    value.forEach(item => output.push(sanitizeBedTransferIdentityFields(item, seen)));
    return output;
  }
  Object.entries(value).forEach(([key, child]) => {
    if (!FORBIDDEN_IDENTITY_KEYS.has(normalizedIdentityKey(key))) {
      output[key] = sanitizeBedTransferIdentityFields(child, seen);
    }
  });
  return output;
}

function contextSnapshot(context = {}) {
  const nested = context.access_snapshot_context || context.access_snapshot || {};
  return { ...context, ...nested };
}

function snapshotUnavailable(context = {}) {
  const snapshot = contextSnapshot(context);
  const status = text(snapshot.parse_status || snapshot.source_status || snapshot.status).toLowerCase();
  const dataSource = text(snapshot.data_source || snapshot.source).toLowerCase();
  const candidateCount = snapshot.candidate_count;
  return Boolean(
    snapshot.gateway_error || snapshot.error || context.gateway_error || context.error ||
    snapshot.fallback === true || snapshot.stale === true || snapshot.ambiguous === true || snapshot.conflict === true ||
    dataSource.includes("cache") || dataSource.includes("fallback") ||
    ["unknown", "missing", "unavailable", "ambiguous", "conflict", "stale", "invalid"].includes(status) ||
    (candidateCount !== undefined && Number(candidateCount) !== 1)
  );
}

function contextPreview(context = {}) {
  const snapshot = contextSnapshot(context);
  return {
    physical_bed_status: text(snapshot.physical_bed_status),
    physical_bed_status_source: text(snapshot.physical_bed_status_source),
    parsed_vacancy_marker: snapshot.parsed_vacancy_marker === true,
    data_source: text(snapshot.data_source || snapshot.source_status || snapshot.source),
    fallback: snapshot.fallback === true,
    candidate_count: snapshot.candidate_count ?? null,
    ambiguous: snapshot.ambiguous === true,
    conflict: snapshot.conflict === true,
    stale: snapshot.stale === true,
    parse_status: text(snapshot.parse_status),
    parsed_deposit_amount: snapshot.parsed_deposit_amount ?? context.deposit_recorded_amount ?? null,
    rent_coverage_start: text(context.current_rent_coverage_start || context.rent_coverage_start),
    rent_coverage_end: text(context.current_rent_coverage_end || context.rent_coverage_end)
  };
}

export function validateBedTransferPhase1Contract(input = {}) {
  const forbiddenFields = findBedTransferForbiddenIdentityFields(input);
  if (forbiddenFields.length) {
    return {
      ...failure("BED_TRANSFER_FORBIDDEN_IDENTITY_FIELD", "Provider identity fields are not accepted for Bed Transfer.", forbiddenFields),
      forbidden_fields: forbiddenFields,
      write_attempted: false
    };
  }

  const fromBed = bed(input.from_bed);
  const toBed = bed(input.to_bed);
  const missing = [];
  if (!fromBed) missing.push("from_bed");
  if (!toBed) missing.push("to_bed");
  if (missing.length) return failure("BED_TRANSFER_REQUIRED_FIELD_MISSING", "Bed Transfer requires from_bed and to_bed.", [], missing);
  if (fromBed === "334" || toBed === "334") return failure("BED_TRANSFER_334_FORBIDDEN", "Bed 334 is excluded from Phase 1 Bed Transfer validation.", ["from_bed", "to_bed"]);
  if (fromBed === toBed) return failure("BED_TRANSFER_SAME_BED_NOT_ALLOWED", "From Bed and To Bed must be different.", ["from_bed", "to_bed"]);

  const feeChoice = text(input.fee_choice).toLowerCase();
  const feeAed = amount(input.fee_amount_aed);
  const feeFils = amount(input.fee_amount_fils);
  const feeAedExact = feeAed !== null && feeAed === 50;
  const feeFilsExact = feeFils !== null && feeFils === 5000;
  if (!["charged", "waived"].includes(feeChoice)) {
    return failure("BED_TRANSFER_FEE_CHOICE_INVALID", "Only charged or waived Bed Transfer fees are allowed.", ["fee_choice"]);
  }
  if (feeChoice === "charged" && (!feeAedExact || !feeFilsExact)) {
    return failure("BED_TRANSFER_FEE_AMOUNT_INVALID", "Charged Bed Transfer fee must be exactly 50 AED / 5000 fils.", ["fee_amount_aed", "fee_amount_fils"]);
  }
  if (feeChoice === "charged" && !text(input.payment_method)) {
    return failure("BED_TRANSFER_PAYMENT_METHOD_REQUIRED", "Charged Bed Transfer fee requires payment_method.", [], ["payment_method"]);
  }
  if (feeChoice === "waived" && (feeAed !== 0 || feeFils !== 0)) {
    return failure("BED_TRANSFER_FEE_AMOUNT_INVALID", "Waived Bed Transfer fee must be exactly 0 AED / 0 fils.", ["fee_amount_aed", "fee_amount_fils"]);
  }
  if (feeChoice === "waived" && !text(input.waiver_reason)) {
    return failure("BED_TRANSFER_WAIVER_REASON_REQUIRED", "Waived Bed Transfer fee requires waiver_reason.", [], ["waiver_reason"]);
  }
  if (!text(input.transfer_reason)) return failure("BED_TRANSFER_REASON_REQUIRED", "Bed Transfer requires transfer_reason.", [], ["transfer_reason"]);

  const source = input.source_context && typeof input.source_context === "object" ? input.source_context : {};
  const target = input.target_context && typeof input.target_context === "object" ? input.target_context : {};
  if (snapshotUnavailable(source) || snapshotUnavailable(target)) {
    return failure("BED_TRANSFER_ACCESS_SNAPSHOT_UNAVAILABLE", "Strict Access Snapshot data is required; fallback, stale, ambiguous, or conflicting data is rejected.", ["source_context", "target_context"]);
  }

  const sourceSnapshot = contextSnapshot(source);
  const targetSnapshot = contextSnapshot(target);
  if (sourceSnapshot.physical_bed_status === "vacant" || sourceSnapshot.physical_bed_status_source === "access_snapshot_E_marker" || sourceSnapshot.parsed_vacancy_marker === true) {
    return failure("BED_TRANSFER_SOURCE_ALREADY_TTLOCK_VACANT", "Source bed is already marked vacant by Access Snapshot E/e.", ["source_context"]);
  }
  if (sourceSnapshot.physical_bed_status !== "not_marked_vacant" || sourceSnapshot.physical_bed_status_source !== "access_snapshot_no_E") {
    return failure("BED_TRANSFER_SOURCE_ACCESS_SNAPSHOT_UNAVAILABLE", "Source bed Access Snapshot status is not a confirmed occupied context.", ["source_context"]);
  }
  if (targetSnapshot.physical_bed_status !== "vacant" || targetSnapshot.physical_bed_status_source !== "access_snapshot_E_marker" || targetSnapshot.parsed_vacancy_marker !== true) {
    return failure("BED_TRANSFER_TARGET_NOT_TTLOCK_VACANT", "Target bed must be vacant through Access Snapshot E/e.", ["target_context"]);
  }

  const sourceDeposit = sourceSnapshot.parsed_deposit_amount ?? source.deposit_recorded_amount;
  if (sourceSnapshot.deposit_ambiguous === true || sourceDeposit === null || sourceDeposit === undefined || amount(sourceDeposit) === null) {
    return failure("BED_TRANSFER_SOURCE_DEPOSIT_D_UNAVAILABLE", "Source Access Snapshot D amount is missing or ambiguous.", ["source_context"]);
  }

  const companyScope = text(input.company_scope);
  const sourceCompany = text(source.company_scope || source.corpid);
  const targetCompany = text(target.company_scope || target.corpid);
  if (!companyScope || sourceCompany !== companyScope || targetCompany !== companyScope) {
    return failure("BED_TRANSFER_COMPANY_SCOPE_MISMATCH", "Source and target beds must share the same company scope.", ["company_scope"]);
  }

  const coverageStart = exactDate(source.current_rent_coverage_start || source.rent_coverage_start);
  const coverageEnd = exactDate(source.current_rent_coverage_end || source.rent_coverage_end);
  if (!coverageStart || !coverageEnd) return failure("BED_TRANSFER_RENT_COVERAGE_REQUIRED", "Source rent coverage must provide absolute start and end dates.", ["rent_coverage"]);

  const openArrears = Array.isArray(source.open_arrears) ? source.open_arrears : [];
  if (openArrears.length > 1) return failure("BED_TRANSFER_MULTIPLE_OPEN_ARREARS_UNSUPPORTED", "Multiple open arrears are not supported by Phase 1 Bed Transfer.", ["open_arrears"]);
  let arrearsPreview = { enabled: false, cloud_arrears_ref: "", carried_arrears_amount: 0 };
  if (openArrears.length === 1) {
    const current = openArrears[0] || {};
    const currentRef = text(current.cloud_arrears_ref || current.arrears_ref || current.task_id || current.id);
    const remaining = amount(current.remaining_arrears ?? current.remaining_amount ?? current.remain ?? current.arrear_amount);
    const requestedRef = text(input.cloud_arrears_ref);
    const carried = amount(input.carried_arrears_amount);
    if (!requestedRef || requestedRef !== currentRef || input.arrears_carryover !== true || remaining === null || carried === null || Math.abs(carried - remaining) > 0.01) {
      return failure("BED_TRANSFER_ARREARS_CARRYOVER_INVALID", "One open arrears item requires its exact ref and full remaining amount to carry over.", ["cloud_arrears_ref", "arrears_carryover", "carried_arrears_amount"]);
    }
    arrearsPreview = { enabled: true, cloud_arrears_ref: requestedRef, carried_arrears_amount: carried };
  }

  return {
    ok: true,
    event_type: "bed_transfer",
    type: "TF",
    from_bed: fromBed,
    to_bed: toBed,
    fee_choice: feeChoice,
    fee_amount_aed: feeChoice === "charged" ? 50 : 0,
    fee_amount_fils: feeChoice === "charged" ? 5000 : 0,
    payment_method: feeChoice === "charged" ? text(input.payment_method) : "none",
    waiver_reason: feeChoice === "waived" ? text(input.waiver_reason) : "",
    transfer_reason: text(input.transfer_reason),
    company_scope: companyScope,
    rent_coverage: { start: coverageStart, end: coverageEnd },
    source_deposit: { recorded_amount: amount(sourceDeposit), source: "access_snapshot_remark_D" },
    arrears_carryover: arrearsPreview,
    source_context: contextPreview(source),
    target_context: contextPreview(target),
    readonly: true,
    dry_run_only: true,
    no_write: true,
    provider_identity_allowed: false
  };
}
