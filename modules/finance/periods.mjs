import { assertFils } from "./money.mjs";

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const FILS_PER_CUSTOM_DAY = 4000n;
const FIFTEEN_DAY_RENT_FILS = 40000n;

function parseIsoDate(value) {
  const match = typeof value === "string" ? value.match(ISO_DATE_PATTERN) : null;
  if (!match) throw new Error("Date must use YYYY-MM-DD.");

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, monthIndex, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== monthIndex ||
    date.getUTCDate() !== day
  ) {
    throw new Error(`Invalid calendar date: ${value}`);
  }

  return date;
}

function formatIsoDate(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date, days) {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function daysInUtcMonth(year, monthIndex) {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

function addMonthsSameDay(date, months) {
  const year = date.getUTCFullYear();
  const monthIndex = date.getUTCMonth();
  const day = date.getUTCDate();
  const targetMonthIndex = monthIndex + months;
  const targetYear = year + Math.floor(targetMonthIndex / 12);
  const normalizedMonthIndex = ((targetMonthIndex % 12) + 12) % 12;
  const clampedDay = Math.min(day, daysInUtcMonth(targetYear, normalizedMonthIndex));
  return new Date(Date.UTC(targetYear, normalizedMonthIndex, clampedDay));
}

function requirePositiveInteger(value, label) {
  if (!Number.isInteger(value) || value <= 0)
    throw new Error(`${label} must be a positive integer.`);
  return value;
}

export function calculateRentPeriod(input) {
  if (!input || typeof input !== "object") {
    throw new TypeError("Rent period input must be an object.");
  }

  const start = parseIsoDate(input.startDate);
  const cycle = String(input.cycle || "")
    .trim()
    .toUpperCase();

  if (cycle === "1M") {
    const dueFils = assertFils(input.listPriceFils);
    if (dueFils < 0n) throw new RangeError("listPriceFils must be non-negative fils.");
    const nextDueDate = addMonthsSameDay(start, 1);

    return {
      cycle,
      periodStartDate: formatIsoDate(start),
      displayEndDate: formatIsoDate(nextDueDate),
      nextDueDate: formatIsoDate(nextDueDate),
      billingDays: Math.round((nextDueDate.getTime() - start.getTime()) / 86400000),
      dueFils,
      pricingRule: "SYSTEM_LIST_PRICE"
    };
  }

  if (cycle === "15D") {
    const displayEndDate = addDays(start, 14);
    const nextDueDate = addDays(start, 15);

    return {
      cycle,
      periodStartDate: formatIsoDate(start),
      displayEndDate: formatIsoDate(displayEndDate),
      nextDueDate: formatIsoDate(nextDueDate),
      billingDays: 15,
      dueFils: FIFTEEN_DAY_RENT_FILS,
      pricingRule: "FIXED_15D_400_AED"
    };
  }

  if (cycle === "CUST") {
    const customDays = requirePositiveInteger(input.customDays, "customDays");
    const displayEndDate = addDays(start, customDays - 1);
    const nextDueDate = addDays(start, customDays);

    return {
      cycle,
      periodStartDate: formatIsoDate(start),
      displayEndDate: formatIsoDate(displayEndDate),
      nextDueDate: formatIsoDate(nextDueDate),
      billingDays: customDays,
      dueFils: BigInt(customDays) * FILS_PER_CUSTOM_DAY,
      pricingRule: "CUSTOM_DAYS_40_AED_PER_DAY"
    };
  }

  throw new Error(`Unsupported rent cycle: ${input.cycle}`);
}
