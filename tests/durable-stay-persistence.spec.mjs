import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  createOpaqueStayContextId,
  persistPreparedStayGenesis,
  prepareStayGenesis,
  validateStayGenesisInput
} from "../modules/employees/durable-stay-persistence.mjs";

const STAY_UUID = "11111111-1111-4111-8111-111111111111";
const LINK_UUID = "22222222-2222-4222-a222-222222222222";
const modulePath = new URL("../modules/employees/durable-stay-persistence.mjs", import.meta.url);

function genesis(overrides = {}) {
  return {
    corpid: "corp-a",
    genesis_event_type: "rent",
    genesis_session_id: "session-1",
    genesis_entry_id: "entry-1",
    genesis_anchor_id: "anchor-1",
    started_at: "2026-07-11T12:00:00+04:00",
    ...overrides
  };
}

function prepared(overrides = {}) {
  return {
    stay_context_id: STAY_UUID,
    ...genesis(),
    lifecycle_status: "active",
    ...overrides
  };
}

function errorCode(fn, code) {
  assert.throws(fn, error => error?.code === code);
}

function mockDb({ batchError } = {}) {
  const calls = { prepare: [], batch: [] };
  const db = {
    prepare(sql) {
      calls.prepare.push(sql);
      return {
        bind(...values) {
          return { sql, values };
        }
      };
    },
    async batch(statements) {
      calls.batch.push(statements);
      if (batchError) throw batchError;
      return statements.map(() => ({ success: true }));
    }
  };
  return { db, calls };
}

function uuidSequence(values = [STAY_UUID, LINK_UUID]) {
  let index = 0;
  const calls = [];
  return {
    calls,
    randomUUID() {
      calls.push(index);
      return values[index++];
    }
  };
}

test("module exports only the canonical-first persistence interfaces", async () => {
  const exports = await import(modulePath);
  assert.deepEqual(Object.keys(exports).sort(), [
    "createOpaqueStayContextId",
    "persistPreparedStayGenesis",
    "prepareStayGenesis",
    "validateStayGenesisInput"
  ]);
  assert.equal("persistStayGenesis" in exports, false);
});

test("opaque IDs come only from the supplied randomUUID function", () => {
  assert.equal(createOpaqueStayContextId(() => STAY_UUID), STAY_UUID);
  assert.equal(createOpaqueStayContextId(() => LINK_UUID.toUpperCase()), LINK_UUID.toUpperCase());
  errorCode(() => createOpaqueStayContextId(), "STAY_RANDOM_UUID_REQUIRED");
  errorCode(() => createOpaqueStayContextId(() => { throw new Error("unsafe detail"); }), "STAY_ID_GENERATION_FAILED");
  for (const invalid of ["", "not-a-uuid", "11111111-1111-3111-8111-111111111111", "11111111-1111-4111-7111-111111111111"]) {
    errorCode(() => createOpaqueStayContextId(() => invalid), "STAY_ID_INVALID_UUID");
  }
});

test("Rent and Deposit In genesis validation accepts exact contract fields", () => {
  assert.deepEqual(validateStayGenesisInput(genesis()), genesis());
  const deposit = genesis({ genesis_event_type: "deposit_in" });
  assert.deepEqual(validateStayGenesisInput(deposit), deposit);
  const legacy = genesis({ genesis_event_type: "legacy_bootstrap", genesis_session_id: null, genesis_entry_id: null });
  assert.deepEqual(validateStayGenesisInput(legacy), legacy);
});

test("required and extra genesis fields fail closed", () => {
  errorCode(() => validateStayGenesisInput(genesis({ corpid: "" })), "STAY_GENESIS_CORPID_REQUIRED");
  errorCode(() => validateStayGenesisInput(genesis({ genesis_anchor_id: "" })), "STAY_GENESIS_ANCHOR_REQUIRED");
  errorCode(() => validateStayGenesisInput(genesis({ genesis_session_id: null })), "STAY_GENESIS_SESSION_REQUIRED");
  errorCode(() => validateStayGenesisInput(genesis({ genesis_event_type: "deposit_in", genesis_entry_id: null })), "STAY_GENESIS_ENTRY_REQUIRED");
  errorCode(() => validateStayGenesisInput({ ...genesis(), arbitrary_extra: "x" }), "STAY_GENESIS_EXTRA_FIELD");
});

test("prepare creates one canonical stay UUID without DB access or input mutation", () => {
  for (const genesis_event_type of ["rent", "deposit_in"]) {
    const input = Object.freeze(genesis({ genesis_event_type }));
    const before = structuredClone(input);
    const ids = uuidSequence([STAY_UUID]);
    const result = prepareStayGenesis(input, { randomUUID: ids.randomUUID });

    assert.deepEqual(ids.calls, [0]);
    assert.deepEqual(input, before);
    assert.deepEqual(result, {
      stay_context_id: STAY_UUID,
      ...before,
      lifecycle_status: "active"
    });
  }
});

test("prepare failures and legacy bootstrap generate no ID", () => {
  for (const input of [
    genesis({ corpid: "" }),
    genesis({ genesis_event_type: "legacy_bootstrap", genesis_session_id: null, genesis_entry_id: null })
  ]) {
    const ids = uuidSequence([STAY_UUID]);
    assert.throws(
      () => prepareStayGenesis(input, { randomUUID: ids.randomUUID }),
      error => ["STAY_GENESIS_CORPID_REQUIRED", "LEGACY_BOOTSTRAP_PERSISTENCE_NOT_IMPLEMENTED"].includes(error?.code)
    );
    assert.equal(ids.calls.length, 0);
  }
});

test("prepared contract rejects invalid ID, lifecycle, unknown, and provider fields before DB or UUID", async () => {
  const cases = [
    [prepared({ stay_context_id: "not-a-uuid" }), "STAY_PREPARED_STAY_ID_INVALID"],
    [prepared({ lifecycle_status: "closed" }), "STAY_PREPARED_LIFECYCLE_INVALID"],
    [prepared({ unknown_field: "secret" }), "STAY_PREPARED_GENESIS_EXTRA_FIELD"],
    [prepared({ bed: "611" }), "STAY_PREPARED_GENESIS_EXTRA_FIELD"],
    [prepared({ card_id: "secret-card" }), "STAY_PREPARED_GENESIS_EXTRA_FIELD"],
    [prepared({ provider_metadata: { secret: true } }), "STAY_PREPARED_GENESIS_EXTRA_FIELD"]
  ];
  for (const [input, code] of cases) {
    const { db, calls } = mockDb();
    const ids = uuidSequence([LINK_UUID]);
    await assert.rejects(
      persistPreparedStayGenesis(db, input, { randomUUID: ids.randomUUID, createdAt: "2026-07-11" }),
      error => error?.code === code && !String(error?.message).includes("secret")
    );
    assert.equal(ids.calls.length, 0);
    assert.equal(calls.prepare.length, 0);
    assert.equal(calls.batch.length, 0);
  }
});

for (const genesisEventType of ["rent", "deposit_in"]) {
  test(`${genesisEventType} canonical-first flow reuses one stay ID and batches two linked statements`, async () => {
    const { db, calls } = mockDb();
    const ids = uuidSequence([STAY_UUID, LINK_UUID]);
    const input = genesis({ genesis_event_type: genesisEventType });
    const canonicalPrepared = prepareStayGenesis(input, { randomUUID: ids.randomUUID });
    const result = await persistPreparedStayGenesis(db, canonicalPrepared, {
      randomUUID: ids.randomUUID,
      createdAt: "2026-07-11T13:00:00+04:00"
    });

    assert.deepEqual(ids.calls, [0, 1]);
    assert.notEqual(canonicalPrepared.stay_context_id, result.stay_event_link_id);
    assert.equal(calls.prepare.length, 2);
    assert.equal(calls.batch.length, 1);
    assert.equal(calls.batch[0].length, 2);
    const [stay, link] = calls.batch[0];
    assert.match(stay.sql, /INSERT INTO stay_contexts/);
    assert.match(stay.sql, /'active'/);
    assert.match(link.sql, /INSERT INTO stay_event_links/);
    assert.match(link.sql, /'genesis'/);
    assert.equal(stay.values[0], canonicalPrepared.stay_context_id);
    assert.equal(link.values[0], LINK_UUID);
    assert.equal(link.values[2], canonicalPrepared.stay_context_id);
    assert.equal(stay.values[1], input.corpid);
    assert.equal(link.values[1], input.corpid);
    assert.equal(stay.values[5], input.genesis_anchor_id);
    assert.equal(link.values[5], input.genesis_anchor_id);
    assert.deepEqual(result, {
      stay_context_id: canonicalPrepared.stay_context_id,
      stay_event_link_id: LINK_UUID,
      lifecycle_status: "active",
      genesis_event_type: genesisEventType,
      write_attempted: true
    });
  });
}

test("link ID collision fails once before database preparation and never replaces the stay ID", async () => {
  const { db, calls } = mockDb();
  const ids = uuidSequence([STAY_UUID, LINK_UUID]);
  await assert.rejects(
    persistPreparedStayGenesis(db, prepared(), { randomUUID: ids.randomUUID, createdAt: "2026-07-11" }),
    error => error?.code === "STAY_GENESIS_IDS_MUST_DIFFER"
  );
  assert.deepEqual(ids.calls, [0]);
  assert.equal(calls.prepare.length, 0);
  assert.equal(calls.batch.length, 0);
});

test("database constraint errors propagate without retry or stay ID replacement", async () => {
  const duplicate = Object.assign(new Error("constraint category"), { code: "SQLITE_CONSTRAINT_UNIQUE" });
  const { db, calls } = mockDb({ batchError: duplicate });
  const ids = uuidSequence([LINK_UUID, "33333333-3333-4333-a333-333333333333"]);
  await assert.rejects(
    persistPreparedStayGenesis(db, prepared(), { randomUUID: ids.randomUUID, createdAt: "2026-07-11" }),
    error => error === duplicate
  );
  assert.deepEqual(ids.calls, [0]);
  assert.equal(calls.prepare.length, 2);
  assert.equal(calls.batch.length, 1);
});

test("module source has no fallback identity, time read, or provider identity source", async () => {
  const source = await readFile(modulePath, "utf8");
  assert.doesNotMatch(source, /Date\.now|new Date|Math\.random/);
  assert.doesNotMatch(source, /tenant_card_id|card_id|old_ttlock_ref|provider_phone|phone_99099|customer_id|customer_code/i);
  assert.doesNotMatch(source, /export async function persistStayGenesis/);
  assert.doesNotMatch(source, /\.run\s*\(/);
});
