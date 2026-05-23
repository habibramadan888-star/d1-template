import { createEmployeeEntryCommercialRentPlan } from "./employee-entry-commercial-adapter.mjs";
import { executeD1WritePlan } from "./d1-write-plan-executor.mjs";

const ALLOWED_ROLES = new Set(["employee", "owner", "manager", "admin"]);

function requireObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
  return value;
}

function normalizeRole(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function isActiveMembership(auth) {
  if (auth.hasPropertyMembership === true) return true;
  return (
    String(auth.propertyMembershipStatus || "")
      .trim()
      .toUpperCase() === "ACTIVE"
  );
}

function response(status, body) {
  return { status, body };
}

export async function handleEmployeeCommercialRentEntry(input) {
  const options = requireObject(input, "commercial handler input");
  const auth = requireObject(options.auth, "auth");
  const role = normalizeRole(auth.actorRole);

  if (!ALLOWED_ROLES.has(role)) {
    return response(403, { success: false, error: "forbidden_role" });
  }
  if (!isActiveMembership(auth)) {
    return response(403, { success: false, error: "property_membership_required" });
  }

  const adapterResult = createEmployeeEntryCommercialRentPlan({
    body: options.body,
    auth: { ...auth, actorRole: role },
    resolved: options.resolved,
    ids: options.ids,
    sessionId: options.sessionId,
    clientEntryId: options.clientEntryId,
    settlementDate: options.settlementDate
  });

  const executor = options.executor || executeD1WritePlan;
  const execution = await executor(options.db, adapterResult.writePlan);

  if (execution?.success === true) {
    return response(200, {
      ...adapterResult.response,
      accepted: true,
      entry_id: options.ids.transactionId,
      session_id: adapterResult.response.session_id
    });
  }

  if (execution?.reason === "IDEMPOTENCY_CONFLICT") {
    if (typeof options.loadExistingResult === "function") {
      const existing = await options.loadExistingResult(
        adapterResult.idempotency.key,
        adapterResult
      );
      if (existing) {
        return response(200, {
          success: true,
          duplicate: true,
          idempotency_key: adapterResult.idempotency.key,
          ...existing
        });
      }
    }

    return response(409, {
      success: false,
      error: "entry_already_accepted",
      idempotency_key: adapterResult.idempotency.key
    });
  }

  return response(500, { success: false, error: "entry_write_failed" });
}
