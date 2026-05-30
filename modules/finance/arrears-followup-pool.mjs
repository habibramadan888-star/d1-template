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
  const raw = text(sourceType || fallback || "historical_arrears").toLowerCase();
  if (raw === "arrears" || raw === "arrear_tasks") return "historical_arrears";
  if (raw === "current_due" || raw === "current_due_unpaid") return "current_due_unpaid";
  if (raw === "ttlock" || raw === "ttlock_expired") return "ttlock_expired_card";
  return raw;
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
      "historical_arrears"
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
    amountAuthorityStatus: text(
      row.amount_authority_status ||
        row.amountAuthorityStatus ||
        (remain === null ? "unknown" : "known")
    ),
    dueDate: cleanDate(row.due_date || row.dueDate || row.promise_date || row.promiseDate),
    closeStatus: text(row.close_status || row.closeStatus),
    followupStatus: text(row.followup_status || row.followupStatus),
    accountingStatus: text(row.accounting_status || row.accountingStatus || "open")
  };
}

function normalizeCurrentDue(row) {
  const remain = moneyOrNull(row.remaining ?? row.remain ?? row.amount ?? row.price);
  const room = normalizeRoom(row.room || row.bed || row.roomBed);
  const dueDate = cleanDate(row.dueDate || row.due_date || row.endDate);
  return {
    ...row,
    id: text(row.id || `current-due-${room}-${dueDate}`),
    taskId: text(row.taskId || row.task_id || `current-due-${room}-${dueDate}`),
    sourceType: "current_due_unpaid",
    sourceRef: text(row.sourceRef || row.source_ref || `${room}|${dueDate}`),
    room,
    roomBed: room,
    customerCode: text(row.customerCode || row.customer_code || row.name),
    cardCode: text(row.cardCode || row.card_code || row.name),
    packageCode: text(row.packageCode || row.package_code || "rent"),
    note: text(row.note || "本期到期未结清"),
    remain,
    amountAuthorityStatus: remain === null ? "unknown" : "known",
    dueDate,
    closeStatus: "",
    followupStatus: text(row.followupStatus || row.followup_status || "待跟进"),
    accountingStatus: text(row.accountingStatus || row.accounting_status || "open")
  };
}

function normalizeTtlockExpiredCard(row) {
  const room = normalizeRoom(row.room || row.bed || row.lockRoom || row.roomBed);
  const dueDate = cleanDate(row.dueDate || row.due_date || row.endDate || row.end);
  const remain = moneyOrNull(row.remain ?? row.remaining ?? row.amount);
  return {
    ...row,
    id: text(row.id || `ttlock-expired-${room}-${dueDate || "unknown"}`),
    taskId: text(row.taskId || row.task_id || `ttlock-expired-${room}-${dueDate || "unknown"}`),
    sourceType: "ttlock_expired_card",
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
    note: text(row.note || "通通锁卡片已过期，金额待核对"),
    remain,
    amountAuthorityStatus: remain === null ? "unknown" : "known",
    dueDate,
    closeStatus: "",
    followupStatus: text(row.followupStatus || row.followup_status || "待核对"),
    accountingStatus: text(row.accountingStatus || row.accounting_status || "needs_amount_review")
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
  return row.remain === null || Number(row.remain) > 0;
}

export function arrearsPoolDedupeKey(row) {
  const sourceType = normalizeSourceType(row.sourceType || row.source_type || row.source);
  const sourceRef = text(row.sourceRef || row.source_ref);
  if (sourceRef) return `${sourceType}|${sourceRef}`;
  return `${sourceType}|${normalizeRoom(row.room || row.roomBed)}|${cleanDate(row.dueDate || row.due_date)}|${row.remain ?? "unknown"}`;
}

export function buildArrearsFollowupPool(sources = {}, options = {}) {
  const today = cleanDate(options.today || new Date()) || new Date().toISOString().slice(0, 10);
  const rows = [
    ...(sources.historicalArrears || []).map(normalizeHistoricalArrear),
    ...(sources.currentDueUnpaid || []).map(normalizeCurrentDue),
    ...(sources.ttlockExpiredCards || []).map(normalizeTtlockExpiredCard)
  ];
  const seen = new Set();
  return rows
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
      const sourceOrder = { ttlock_expired_card: 0, historical_arrears: 1, current_due_unpaid: 2 };
      return (sourceOrder[a.sourceType] ?? 9) - (sourceOrder[b.sourceType] ?? 9);
    });
}
