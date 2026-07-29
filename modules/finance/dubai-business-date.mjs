const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

const dubaiDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Dubai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
});

function requireIsoDate(value, label = "date") {
  if (typeof value !== "string" || !ISO_DATE_PATTERN.test(value)) {
    throw new Error(`${label} must use YYYY-MM-DD.`);
  }
  const [year, month, day] = value.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  if (
    utc.getUTCFullYear() !== year ||
    utc.getUTCMonth() !== month - 1 ||
    utc.getUTCDate() !== day
  ) {
    throw new Error(`${label} is not a valid calendar date.`);
  }
  return value;
}

function utcMidnightMs(date) {
  const [year, month, day] = requireIsoDate(date).split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

export function getDubaiBusinessDate(instant = new Date()) {
  const date = instant instanceof Date ? instant : new Date(instant);
  if (Number.isNaN(date.getTime())) throw new Error("instant must be a valid date.");
  const parts = Object.fromEntries(
    dubaiDateFormatter.formatToParts(date).map((part) => [part.type, part.value])
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function compareBusinessDates(left, right) {
  const l = utcMidnightMs(left);
  const r = utcMidnightMs(right);
  return l === r ? 0 : l < r ? -1 : 1;
}

export function daysBetweenBusinessDates(startDate, endDate) {
  return Math.round((utcMidnightMs(endDate) - utcMidnightMs(startDate)) / DAY_MS);
}

export function classifyDueStatus(dueDate, options = {}) {
  const today = requireIsoDate(
    options.today || getDubaiBusinessDate(options.instant || new Date()),
    "today"
  );
  const due = requireIsoDate(dueDate, "dueDate");
  const daysUntilDue = daysBetweenBusinessDates(today, due);

  if (daysUntilDue < 0) {
    return {
      status: "OVERDUE",
      daysOverdue: Math.abs(daysUntilDue),
      daysUntilDue
    };
  }
  if (daysUntilDue === 0) {
    return {
      status: "DUE_TODAY",
      daysOverdue: 0,
      daysUntilDue
    };
  }
  if (daysUntilDue <= Number(options.soonDays ?? 3)) {
    return {
      status: "DUE_SOON",
      daysOverdue: 0,
      daysUntilDue
    };
  }
  return {
    status: "NOT_DUE",
    daysOverdue: 0,
    daysUntilDue
  };
}
