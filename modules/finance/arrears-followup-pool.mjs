const DAY_MS = 86400000;

function text(value, fallback = "") {
  return String(value ?? fallback).trim();
}

function cleanDate(value) {
  const raw = text(value);
  if (!raw) return "";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw.slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function moneyOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round(amount * 100) / 100 : null;
}

function normalizeSourceType(sourceType, fallback) {
  const raw = text(sourceType || fallback || "existing_arrears_record").toLowerCase();
  if (
    [
      "arrears",
      "arrear",
      "arrear_tasks",
      "historical_arrears",
      "existing_arrears",
      "legacy_arrears",
      "existing_arrears_record"
    ].includes(raw)
  ) {
    return "existing_arrears_record";
  }
  if (["ttlock", "ttlock_expired", "ttlock_expired_card", "ttlock_expired_unpaid"].includes(raw)) {
    return "ttlock_expired_unpaid";
  }
  return "unsupported_arrears_source";
}

function normalizeRoom(value) {
  return text(value).replace(/^#+/, "");
}

function dueSortKey(row, today) {
  const due = cleanDate(row.dueDate || row.due_date || row.endDate);
  if (!due) return Number.MAX_SAFE_INTEGER;
  const dueTs = new Date(`${due}T00:00:00Z`).getTime();
  const todayTs = new Date(`${today}T00:00:00Z`).getTime();
  return Number.isFinite(dueTs) ? dueTs - todayTs : Number.MAX_SAFE_INTEGER;
}

function normalizeHistoricalArrear(row) {
  const remain = moneyOrNull(row.remain ?? row.remaining ?? row.remaining_amount);
  return {
    ...row,
    id: text(row.id || row.task_id || row.taskId),
    taskId: text(row.task_id || row.taskId || row.id),
    sourceType: normalizeSourceType(
      row.source_type || row.sourceType || row.source,
      "existing_arrears_record"
    ),
    sourceRef: text(row.source_ref || row.sourceRef || row.task_id || row.taskId || row.id),
    room: normalizeRoom(row.room || row.bed || row.room_bed || row.roomBed),
    roomBed: normalizeRoom(row.room_bed || row.roomBed || row.room || row.bed),
    customerCode: text(
      row.customer_code ||
        row.customerCode ||
        row.tenant_card_id ||
        row.tenantCardId ||
        row.tenant_name
    ),
    cardCode: text(row.card_code || row.cardCode || row.tenant_card_id || row.tenantCardId),
    packageCode: text(row.package_code || row.packageCode || row.type || "rent"),
    remain,
    amountAuthorityStatus: remain === null ? "unknown" : "known",
    dueDate: cleanDate(row.due_date || row.dueDate || row.promise_date || row.promiseDate),
    closeStatus: text(row.close_status || row.closeStatus),
    followupStatus: text(row.followup_status || row.followupStatus),
    accountingStatus: text(row.accounting_status || row.accountingStatus || "open")
  };
}

function normalizeTtlockExpiredCard(row) {
  const room = normalizeRoom(row.room || row.bed || row.lockRoom || row.roomBed);
  const dueDate = cleanDate(row.dueDate || row.due_date || row.endDate || row.end);
  const remain = moneyOrNull(
    row.bedRentAmount ??
      row.bed_rent_amount ??
      row.bedRent ??
      row.bed_rent ??
      row.rentAmount ??
      row.rent_amount ??
      row.remain ??
      row.remaining ??
      row.amount
  );
  return {
    ...row,
    id: text(row.id || `ttlock-expired-${room}-${dueDate || "unknown"}`),
    taskId: text(row.taskId || row.task_id || `ttlock-expired-${room}-${dueDate || "unknown"}`),
    sourceType: "ttlock_expired_unpaid",
    sourceRef: text(
      row.sourceRef ||
        row.source_ref ||
        `${room}|${dueDate}|${row.cardName || row.customerCode || ""}`
    ),
    room,
    roomBed: room,
    customerCode: text(row.customerCode || row.customer_code || row.cardName || row.tenantName),
    cardCode: text(row.cardCode || row.card_code || row.cardName),
    packageCode: text(row.packageCode || row.package_code || "ttlock_card"),
    note: text(row.note || "TTLock expired unpaid; amount comes from bed rent mapping"),
    remain,
    amountAuthorityStatus: remain === null ? "missing_bed_rent" : "bed_rent_mapping",
    dueDate,
    closeStatus: "",
    followupStatus: text(row.followupStatus || row.followup_status || "pending_followup"),
    accountingStatus: text(row.accountingStatus || row.accounting_status || "open")
  };
}

function isOpenTask(row) {
  const closed = new Set([
    "closed",
    "cleared",
    "paid",
    "settled",
    "void",
    "voided",
    "written_off",
    "cancelled",
    "canceled",
    "已结清",
    "结清",
    "关闭",
    "作废"
  ]);
  if (!row || row.cleared) return false;
  if (closed.has(text(row.closeStatus || row.close_status).toLowerCase())) return false;
  if (closed.has(text(row.followupStatus || row.followup_status).toLowerCase())) return false;
  return Number.isFinite(Number(row.remain)) && Number(row.remain) > 0;
}

export function arrearsPoolDedupeKey(row) {
  const sourceType = normalizeSourceType(row.sourceType || row.source_type || row.source);
  const sourceRef = text(row.sourceRef || row.source_ref);
  if (sourceRef) return `${sourceType}|${sourceRef}`;
  return `${sourceType}|${normalizeRoom(row.room || row.roomBed)}|${cleanDate(
    row.dueDate || row.due_date
  )}|${row.remain ?? "unknown"}`;
}

export function buildArrearsFollowupPool(sources = {}, options = {}) {
  const today = cleanDate(options.today || new Date()) || new Date().toISOString().slice(0, 10);
  const rows = [
    ...(sources.existingArrearsRecords || []).map(normalizeHistoricalArrear),
    ...(sources.historicalArrears || []).map(normalizeHistoricalArrear),
    ...(sources.ttlockExpiredUnpaid || []).map(normalizeTtlockExpiredCard),
    ...(sources.ttlockExpiredCards || []).map(normalizeTtlockExpiredCard)
  ];
  const seen = new Set();
  return rows
    .filter(
      (row) =>
        row.sourceType === "existing_arrears_record" || row.sourceType === "ttlock_expired_unpaid"
    )
    .filter(isOpenTask)
    .filter((row) => {
      const key = arrearsPoolDedupeKey(row);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => {
      const dueDelta = dueSortKey(a, today) - dueSortKey(b, today);
      if (dueDelta) return dueDelta;
      const sourceOrder = { ttlock_expired_unpaid: 0, existing_arrears_record: 1 };
      return (sourceOrder[a.sourceType] ?? 9) - (sourceOrder[b.sourceType] ?? 9);
    });
}
