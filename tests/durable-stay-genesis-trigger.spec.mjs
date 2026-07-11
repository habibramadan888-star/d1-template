import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { evaluateStayGenesisTrigger } from "../modules/employees/durable-stay-genesis-trigger.mjs";

const modulePath = new URL("../modules/employees/durable-stay-genesis-trigger.mjs", import.meta.url);

test("Rent and Deposit In accept only the strict start trigger", () => {
  assert.deepEqual(evaluateStayGenesisTrigger({ event_type: "rent", stay_action: "start" }), {
    requested: true,
    genesis_event_type: "rent"
  });
  assert.deepEqual(evaluateStayGenesisTrigger({ event_type: "deposit_in", stay_action: "start" }), {
    requested: true,
    genesis_event_type: "deposit_in"
  });
});

test("missing stay_action requests no genesis", () => {
  assert.deepEqual(evaluateStayGenesisTrigger({ event_type: "rent" }), {
    requested: false,
    genesis_event_type: null
  });
  assert.deepEqual(evaluateStayGenesisTrigger({}), {
    requested: false,
    genesis_event_type: null
  });
});

test("empty, uppercase, non-string, and unsupported actions reject", () => {
  for (const stay_action of ["", "START", "continue", "renew", "topup", "transfer", "bootstrap", 1, true, null]) {
    assert.deepEqual(evaluateStayGenesisTrigger({ event_type: "rent", stay_action }), {
      error_code: "STAY_ACTION_INVALID",
      forbidden_fields: []
    });
  }
});

test("the other five employee events and unknown events cannot start a stay", () => {
  for (const event_type of ["arrears_payment", "deposit_out", "checkout", "expense", "bed_transfer", "unknown_event"]) {
    assert.deepEqual(evaluateStayGenesisTrigger({ event_type, stay_action: "start" }), {
      error_code: "STAY_GENESIS_EVENT_NOT_ALLOWED",
      forbidden_fields: []
    });
  }
});

test("start requires an explicit event_type and never falls back to Rent", () => {
  for (const input of [{ stay_action: "start" }, { event_type: "", stay_action: "start" }, { event_type: null, stay_action: "start" }]) {
    assert.deepEqual(evaluateStayGenesisTrigger(input), {
      error_code: "STAY_EVENT_TYPE_REQUIRED",
      forbidden_fields: []
    });
  }
});

test("server-managed fields are rejected individually without values", () => {
  for (const field of ["stay_context_id", "stay_event_link_id", "lifecycle_status", "genesis_anchor_id"]) {
    const sensitiveValue = `sensitive-${field}`;
    const result = evaluateStayGenesisTrigger({ event_type: "rent", stay_action: "start", [field]: sensitiveValue });
    assert.deepEqual(result, {
      error_code: "STAY_SERVER_MANAGED_FIELD_FORBIDDEN",
      forbidden_fields: [field]
    });
    assert.equal(JSON.stringify(result).includes(sensitiveValue), false);
  }
});

test("forbidden_fields are sorted and deduplicated", () => {
  const result = evaluateStayGenesisTrigger({
    event_type: "rent",
    stay_action: "start",
    stay_event_link_id: "sensitive-link",
    genesis_anchor_id: "sensitive-anchor",
    lifecycle_status: "sensitive-status",
    stay_context_id: "sensitive-stay"
  });
  assert.deepEqual(result, {
    error_code: "STAY_SERVER_MANAGED_FIELD_FORBIDDEN",
    forbidden_fields: ["genesis_anchor_id", "lifecycle_status", "stay_context_id", "stay_event_link_id"]
  });
  assert.equal(new Set(result.forbidden_fields).size, result.forbidden_fields.length);
  assert.doesNotMatch(JSON.stringify(result), /sensitive-/);
});

test("unknown fields fail closed without echoing values", () => {
  const result = evaluateStayGenesisTrigger({ event_type: "rent", stay_action: "start", arbitrary_context: "sensitive-value" });
  assert.deepEqual(result, {
    error_code: "STAY_TRIGGER_UNKNOWN_FIELD",
    forbidden_fields: ["arbitrary_context"]
  });
  assert.equal(JSON.stringify(result).includes("sensitive-value"), false);
});

test("module is pure and has exactly one export", async () => {
  const exports = await import(modulePath);
  assert.deepEqual(Object.keys(exports), ["evaluateStayGenesisTrigger"]);
  const source = await readFile(modulePath, "utf8");
  assert.doesNotMatch(source, /\bDB\b|database|Date\.now|new Date|Math\.random|crypto|TTLock|localStorage|Preview|WhatsApp/i);
  assert.doesNotMatch(source, /reason_code|\bbed\b|\broom\b|deposit_remaining|deposit_paid/i);
});
