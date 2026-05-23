const AED_AMOUNT_PATTERN = /^([+-])?(\d+)(?:\.(\d{1,2}))?$/;

export function parseAedToFils(input, options = {}) {
  if (typeof input !== "string") {
    throw new TypeError("AED amount must be provided as a string to avoid floating point input.");
  }

  const normalized = input.replace(/,/g, "").trim();
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

export function addFils(values) {
  if (!Array.isArray(values)) throw new TypeError("addFils expects an array.");
  return values.reduce((total, value) => total + assertFils(value), 0n);
}

export function subtractFils(left, right) {
  return assertFils(left) - assertFils(right);
}

export function maxFils(left, right) {
  return assertFils(left) >= assertFils(right) ? left : right;
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
