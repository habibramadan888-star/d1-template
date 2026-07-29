import { createHash } from "node:crypto";

function requireString(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} is required for idempotency.`);
  }
  return value.trim();
}

export function createEmployeeEntryIdempotencyKey(input) {
  if (!input || typeof input !== "object") {
    throw new TypeError("Idempotency input must be an object.");
  }

  const parts = [
    requireString(input.companyId, "companyId"),
    requireString(input.propertyId, "propertyId"),
    requireString(input.sessionId, "sessionId"),
    requireString(input.operatorId, "operatorId"),
    requireString(input.clientEntryId, "clientEntryId")
  ];

  const canonical = parts.join("\u001f");
  const digest = createHash("sha256").update(canonical, "utf8").digest("hex");

  return {
    scope: {
      companyId: parts[0],
      propertyId: parts[1],
      sessionId: parts[2],
      operatorId: parts[3],
      clientEntryId: parts[4]
    },
    canonical,
    key: `emp_entry_${digest}`
  };
}
