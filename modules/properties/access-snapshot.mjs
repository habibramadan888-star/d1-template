function cleanText(value, max = 10000) {
  return Array.from(String(value ?? "")).join("").trim().slice(0, max);
}

function cleanMoney(value) {
  const amount = Number(String(value ?? 0).replace(/,/g, ""));
  return Number.isFinite(amount) ? Math.round(amount * 100) / 100 : 0;
}

function normalizePhone(value) {
  return cleanText(value, 80).replace(/[^\d+]/g, "");
}

function hashRuntimeId(value) {
  let hash = 2166136261;
  for (const char of String(value || "")) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function parseMonthDayToken(token) {
  const match = String(token || "").match(/(\d{4})/);
  if (!match) return "";
  const value = match[1];
  const month = Number(value.slice(0, 2));
  const day = Number(value.slice(2, 4));
  if (month < 1 || month > 12) return "";
  const maxDay = new Date(Date.UTC(2024, month, 0)).getUTCDate();
  if (day < 1 || day > maxDay) return "";
  return `${String(month).padStart(2, "0")}${String(day).padStart(2, "0")}`;
}

function isProviderPhone(value, source = "") {
  const phone = normalizePhone(value);
  if (!phone) return false;
  if (/99099$/.test(phone)) return true;
  return /provider|card|access|lock|ttlock/i.test(String(source || ""));
}

function providerMetadata(metadata = {}) {
  const providerPhone = cleanText(
    metadata.provider_phone || metadata.providerPhone || metadata.card_phone || metadata.access_card_phone || "",
    80
  );
  const providerAccountPhone = cleanText(metadata.provider_account_phone || metadata.providerAccountPhone || "", 80);
  return {
    ...(cleanText(metadata.card_id || metadata.cardId, 120) ? { card_id: cleanText(metadata.card_id || metadata.cardId, 120) } : {}),
    ...(cleanText(metadata.tenant_card_id || metadata.tenantCardId, 120) ? { tenant_card_id: cleanText(metadata.tenant_card_id || metadata.tenantCardId, 120) } : {}),
    ...(cleanText(metadata.hardware_card_id || metadata.hardwareCardId, 120) ? { hardware_card_id: cleanText(metadata.hardware_card_id || metadata.hardwareCardId, 120) } : {}),
    ...(providerPhone ? { provider_phone: normalizePhone(providerPhone) } : {}),
    ...(providerAccountPhone ? { provider_account_phone: normalizePhone(providerAccountPhone) } : {}),
    is_provider_phone_non_authoritative: true
  };
}

function parseRemarkTokens(rawRemark) {
  const normalized = cleanText(rawRemark).replace(/[;,]+/g, " ").replace(/\s+/g, " ");
  return normalized ? normalized.split(" ") : [];
}

function parseAccessRemark(rawRemark) {
  const raw = cleanText(rawRemark);
  const tokens = parseRemarkTokens(raw);
  const warnings = [];
  let bed = "";
  let parsedDepositAmount = null;
  let parsedCheckinMmdd = "";
  let parsedValidUntilMmdd = "";
  let parsedBusinessNote = "";
  let parsedVacancyMarker = false;

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (!bed) bed = (token.match(/^#?(\d{2,5}[A-Za-z]?)$/) || [])[1] || "";
    if (/^[Ee]$/.test(token)) parsedVacancyMarker = true;
    if (parsedDepositAmount === null) {
      const deposit = token.match(/^D(\d{1,5}(?:\.\d{1,2})?)$/i);
      if (deposit) parsedDepositAmount = cleanMoney(deposit[1]);
    }
    if (!parsedCheckinMmdd && !/^(exp|until|valid)$/i.test(token)) {
      parsedCheckinMmdd = parseMonthDayToken(token);
      if (parsedCheckinMmdd && token.replace(/\d{4}/, "")) {
        parsedBusinessNote = token.replace(/\d{4}/, "");
      }
    }
    if (/^(exp|until|valid)$/i.test(token)) {
      parsedValidUntilMmdd = parseMonthDayToken(tokens[i + 1] || "");
    }
  }

  if (!parsedBusinessNote && tokens.length) {
    const noteTokens = [];
    let seenCheckin = false;
    for (let i = 0; i < tokens.length; i += 1) {
      const token = tokens[i];
      if (i === 0 && bed) continue;
      if (/^[Ee]$/.test(token)) continue;
      if (/^D\d/i.test(token)) continue;
      if (/^(exp|until|valid)$/i.test(token)) {
        i += 1;
        continue;
      }
      const md = parseMonthDayToken(token);
      if (md && !seenCheckin) {
        seenCheckin = true;
        const remainder = token.replace(/\d{4}/, "");
        if (remainder) noteTokens.push(remainder);
        continue;
      }
      if (md && seenCheckin) continue;
      noteTokens.push(token);
    }
    parsedBusinessNote = cleanText(noteTokens.join(" "), 500);
  }

  const vacancyFields = parsedVacancyMarker
    ? { parsedVacancyMarker, physicalBedStatus: "vacant", physicalBedStatusSource: "access_snapshot_E_marker" }
    : { parsedVacancyMarker, physicalBedStatus: bed ? "not_marked_vacant" : "unknown", physicalBedStatusSource: bed ? "access_snapshot_no_E" : "missing_access_snapshot" };
  if (!raw) return { bed: "", parsedDepositAmount, parsedCheckinMmdd, parsedValidUntilMmdd, ...vacancyFields, physicalBedStatus: "unknown", physicalBedStatusSource: "missing_access_snapshot", parsedBusinessNote, parseStatus: "invalid", warnings: ["empty_remark"] };
  if (!bed) return { bed: "", parsedDepositAmount, parsedCheckinMmdd, parsedValidUntilMmdd, ...vacancyFields, parsedBusinessNote, parseStatus: "unparsed", warnings: ["missing_bed"] };
  if (parsedDepositAmount === null || !parsedCheckinMmdd) warnings.push("missing_deposit_or_checkin");
  const parseStatus = warnings.length ? "partial" : "parsed";
  return { bed, parsedDepositAmount, parsedCheckinMmdd, parsedValidUntilMmdd, ...vacancyFields, parsedBusinessNote, parseStatus, warnings };
}

export function buildAccessSnapshotDTO(rawRemark, options = {}) {
  const parsed = parseAccessRemark(rawRemark);
  const propertyId = cleanText(options.property_id || options.propertyId || "", 80);
  const syncedAt = cleanText(options.synced_at || options.syncedAt || "", 40);
  const provider = providerMetadata(options.provider_metadata || options.providerMetadata || options);
  const idSeed = [propertyId, cleanText(rawRemark), syncedAt, provider.card_id || provider.tenant_card_id || ""].join("|");

  return {
    access_snapshot_id: cleanText(idSeed) ? `runtime_access_snapshot_${hashRuntimeId(idSeed)}` : "",
    property_id: propertyId,
    bed: parsed.bed,
    raw_remark: cleanText(rawRemark),
    parsed_deposit_amount: parsed.parsedDepositAmount,
    parsed_checkin_mmdd: parsed.parsedCheckinMmdd,
    parsed_valid_until_mmdd: parsed.parsedValidUntilMmdd,
    parsed_vacancy_marker: parsed.parsedVacancyMarker,
    physical_bed_status: parsed.physicalBedStatus,
    physical_bed_status_source: parsed.physicalBedStatusSource,
    parsed_business_note: parsed.parsedBusinessNote,
    parse_status: parsed.parseStatus,
    source: "access_card_remark",
    synced_at: syncedAt,
    non_authoritative_provider_metadata: provider,
    warnings: parsed.warnings
  };
}

export function isAccessSnapshotProviderPhoneNonAuthoritative(value, source = "access_card_metadata") {
  return isProviderPhone(value, source);
}
