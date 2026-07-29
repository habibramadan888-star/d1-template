import { parseAedToFils } from "../finance/money.mjs";

const STAFF_KEYWORDS = new Set(["abdul", "bilal", "阿布都", "阿布杜"]);

function tokenizeRemark(rawRemark) {
  return String(rawRemark || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function parseBed(tokens) {
  const first = tokens[0] || "";
  const match = first.match(/^#?(\d+[A-Za-z]?)$/);
  return match ? match[1] : null;
}

function parseDepositFils(tokens) {
  for (const token of tokens) {
    const match = token.match(/^D(\d+(?:\.\d{1,2})?)$/i);
    if (match) return parseAedToFils(match[1]);
  }
  return null;
}

function parseMonthDayFromToken(token) {
  const match = token.match(/(\d{4})/);
  if (!match) return null;

  const value = match[1];
  const month = Number(value.slice(0, 2));
  const day = Number(value.slice(2, 4));
  if (month < 1 || month > 12) return null;

  const maxDay = new Date(Date.UTC(2024, month, 0)).getUTCDate();
  if (day < 1 || day > maxDay) return null;

  return `${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseCheckInMonthDay(tokens) {
  for (const token of tokens) {
    if (/^D/i.test(token)) continue;
    const monthDay = parseMonthDayFromToken(token);
    if (monthDay) return monthDay;
  }
  return null;
}

function classifyExclusion(tokens) {
  const lowerTokens = tokens.map((token) => token.toLowerCase());

  if (lowerTokens.some((token) => STAFF_KEYWORDS.has(token))) {
    return { excluded: true, reason: "STAFF_BED" };
  }

  if (lowerTokens.some((token) => token === "e")) {
    return { excluded: true, reason: "VACANT_BED" };
  }

  return { excluded: false, reason: null };
}

export function parseTtlockRemark(rawRemark) {
  const tokens = tokenizeRemark(rawRemark);
  const exclusion = classifyExclusion(tokens);

  return {
    rawRemark: String(rawRemark || "").trim(),
    tokens,
    bed: parseBed(tokens),
    depositFils: parseDepositFils(tokens),
    checkInMonthDay: parseCheckInMonthDay(tokens),
    excludedFromRentFollowup: exclusion.excluded,
    exclusionReason: exclusion.reason
  };
}
