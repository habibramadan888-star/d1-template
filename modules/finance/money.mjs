const AED_AMOUNT_PATTERN = /^([+-])?(\d+)(?:\.(\d{1,2}))?$/;
const AED_GROUPED_AMOUNT_PATTERN = /^([+-])?(\d{1,3}(?:,\d{3})+)(?:\.(\d{1,2}))?$/;

export function normalizeMoneyInput(input) {
  if (typeof input !== "string") {
    throw new TypeError("AED amount must be provided as a string to avoid floating point input.");
  }

  const trimmed = input.trim();
  if (!trimmed) throw new Error("Invalid AED amount: empty string");
  if (/nan|infinity/i.test(trimmed)) throw new Error(`Invalid AED amount: ${input}`);

  const plain = trimmed.match(AED_AMOUNT_PATTERN);
  if (plain) return trimmed;

  const grouped = trimmed.match(AED_GROUPED_AMOUNT_PATTERN);
  if (grouped) return trimmed.replace(/,/g, "");

  throw new Error(`Invalid AED amount: ${input}`);
}

export function parseAedToFils(input, options = {}) {
  const normalized = normalizeMoneyInput(input);
  const match = normalized.match(AED_AMOUNT_PATTERN);
  if (!match) throw new Error(`Invalid AED amount: ${input}`);

  const negative = match[1] === "-";
  if (negative && !options.allowNegative) {
    throw new Error("Negative AED amount is not allowed.");
  }

  const whole = BigInt(match[2]);
  const fraction = BigInt((match[3] || "").padEnd(2, "0"));
  const fils = whole * 100n + fraction;
  return negative ? -fils : fils;
}

export function assertFils(value) {
  if (typeof value !== "bigint") {
    throw new TypeError("Money minor-unit value must be a bigint.");
  }
  return value;
}

export function assertValidFils(value, options = {}) {
  const fils = assertFils(value);
  if (fils < 0n && !options.allowNegative) {
    throw new Error("Negative money minor-unit value is not allowed.");
  }
  return fils;
}

export function addFils(...values) {
  const items = values.length === 1 && Array.isArray(values[0]) ? values[0] : values;
  if (!Array.isArray(items)) throw new TypeError("addFils expects fils values.");
  return items.reduce((total, value) => total + assertFils(value), 0n);
}

export function subtractFils(left, right) {
  return assertFils(left) - assertFils(right);
}

export function maxFils(left, right) {
  return assertFils(left) >= assertFils(right) ? left : right;
}

export function compareFils(left, right) {
  const a = assertFils(left);
  const b = assertFils(right);
  if (a === b) return 0;
  return a > b ? 1 : -1;
}

export function toSafeSqlInteger(value) {
  const fils = assertFils(value);
  const min = BigInt(Number.MIN_SAFE_INTEGER);
  const max = BigInt(Number.MAX_SAFE_INTEGER);
  if (fils < min || fils > max) {
    throw new RangeError("Money minor-unit value exceeds JavaScript safe integer range.");
  }
  return Number(fils);
}

export function formatFilsAsAed(value) {
  const fils = assertFils(value);
  const negative = fils < 0n;
  const absolute = negative ? -fils : fils;
  const whole = absolute / 100n;
  const fraction = String(absolute % 100n).padStart(2, "0");
  return `${negative ? "-" : ""}${whole}.${fraction}`;
}

export const filsToAedString = formatFilsAsAed;
