import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  createOpaqueStayContextId,
  persistStayGenesis,
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

test("module exports only the three persistence contract interfaces", async () => {
  const exports = await import(modulePath);
  assert.deepEqual(Object.keys(exports).sort(), [
    "createOpaqueStayContextId",
    "persistStayGenesis",
    "validateStayGenesisInput"
  ]);
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

test("required genesis fields fail closed", () => {
  errorCode(() => validateStayGenesisInput(genesis({ corpid: "" })), "STAY_GENESIS_CORPID_REQUIRED");
  errorCode(() => validateStayGenesisInput(genesis({ genesis_anchor_id: "" })), "STAY_GENESIS_ANCHOR_REQUIRED");
  errorCode(() => validateStayGenesisInput(genesis({ genesis_session_id: null })), "STAY_GENESIS_SESSION_REQUIRED");
  errorCode(() => validateStayGenesisInput(genesis({ genesis_event_type: "deposit_in", genesis_entry_id: null })), "STAY_GENESIS_ENTRY_REQUIRED");
});

test("every field outside the allowlist is rejected without echoing values", () => {
  const forbiddenFields = [
    "bed", "room", "current_bed", "original_bed", "tenant_card_id", "tenantCardId", "card_id",
    "cardId", "old_ttlock_ref", "oldTtlockRef", "provider_phone", "providerPhone", "phone_99099",
    "phone99099", "creator_phone", "creatorPhone", "card_creation_time", "cardCreationTime",
    "customer_id", "customer_code", "ttlock_d", "ttlock_e", "ttlock_mmdd", "ttlock_expiry",
    "ttlock_provider_metadata", "ttlockProviderMetadata", "provider_metadata", "providerMetadata"
  ];
  for (const field of forbiddenFields) {
    const value = `sensitive-${field}`;
    assert.throws(
      () => validateStayGenesisInput({ ...genesis(), [field]: value }),
      error => error?.code === "STAY_GENESIS_EXTRA_FIELD" && !String(error?.message).includes(value),
      field
    );
  }
  errorCode(() => validateStayGenesisInput({ ...genesis(), arbitrary_extra: "x" }), "STAY_GENESIS_EXTRA_FIELD");
});

test("validation and legacy-bootstrap rejection perform no database work", async () => {
  const invalid = mockDb();
  await assert.rejects(
    persistStayGenesis(invalid.db, genesis({ corpid: "" }), { randomUUID: () => STAY_UUID, createdAt: "2026-07-11" }),
    error => error?.code === "STAY_GENESIS_CORPID_REQUIRED"
  );
  assert.equal(invalid.calls.prepare.length, 0);
  assert.equal(invalid.calls.batch.length, 0);

  const legacy = mockDb();
  const ids = uuidSequence();
  await assert.rejects(
    persistStayGenesis(legacy.db, genesis({ genesis_event_type: "legacy_bootstrap", genesis_session_id: null, genesis_entry_id: null }), { randomUUID: ids.randomUUID, createdAt: "2026-07-11" }),
    error => error?.code === "LEGACY_BOOTSTRAP_PERSISTENCE_NOT_IMPLEMENTED"
  );
  assert.equal(ids.calls.length, 0);
  assert.equal(legacy.calls.prepare.length, 0);
  assert.equal(legacy.calls.batch.length, 0);
});

for (const genesisEventType of ["rent", "deposit_in"]) {
  test(`${genesisEventType} persistence batches exactly two linked statements`, async () => {
    const { db, calls } = mockDb();
    const ids = uuidSequence();
    const input = genesis({ genesis_event_type: genesisEventType });
    const result = await persistStayGenesis(db, input, {
      randomUUID: ids.randomUUID,
      createdAt: "2026-07-11T13:00:00+04:00"
    });

    assert.deepEqual(ids.calls, [0, 1]);
    assert.equal(calls.prepare.length, 2);
    assert.equal(calls.batch.length, 1);
    assert.equal(calls.batch[0].length, 2);
    const [stay, link] = calls.batch[0];
    assert.match(stay.sql, /INSERT INTO stay_contexts/);
    assert.match(stay.sql, /'active'/);
    assert.match(link.sql, /INSERT INTO stay_event_links/);
    assert.match(link.sql, /'genesis'/);
    assert.equal(stay.values[0], STAY_UUID);
    assert.equal(link.values[0], LINK_UUID);
    assert.equal(stay.values[1], input.corpid);
    assert.equal(link.values[1], input.corpid);
    assert.equal(link.values[2], STAY_UUID);
    assert.equal(stay.values[5], input.genesis_anchor_id);
    assert.equal(link.values[5], input.genesis_anchor_id);
    assert.deepEqual(result, {
      stay_context_id: STAY_UUID,
      stay_event_link_id: LINK_UUID,
      lifecycle_status: "active",
      genesis_event_type: genesisEventType,
      write_attempted: true
    });
  });
}

test("identical generated IDs fail before database preparation and are not retried", async () => {
  const { db, calls } = mockDb();
  const ids = uuidSequence([STAY_UUID, STAY_UUID, LINK_UUID]);
  await assert.rejects(
    persistStayGenesis(db, genesis(), { randomUUID: ids.randomUUID, createdAt: "2026-07-11" }),
    error => error?.code === "STAY_GENESIS_IDS_MUST_DIFFER"
  );
  assert.equal(ids.calls.length, 2);
  assert.equal(calls.prepare.length, 0);
  assert.equal(calls.batch.length, 0);
});

test("database errors propagate without retry or duplicate success", async () => {
  const duplicate = Object.assign(new Error("constraint category"), { code: "SQLITE_CONSTRAINT_UNIQUE" });
  const { db, calls } = mockDb({ batchError: duplicate });
  const ids = uuidSequence();
  await assert.rejects(
    persistStayGenesis(db, genesis(), { randomUUID: ids.randomUUID, createdAt: "2026-07-11" }),
    error => error === duplicate
  );
  assert.equal(ids.calls.length, 2);
  assert.equal(calls.prepare.length, 2);
  assert.equal(calls.batch.length, 1);
});

test("module source has no fallback identity or nondeterministic ID source", async () => {
  const source = await readFile(modulePath, "utf8");
  assert.doesNotMatch(source, /Date\.now|Math\.random/);
  assert.doesNotMatch(source, /tenant_card_id|card_id|old_ttlock_ref|provider_phone|phone_99099|customer_id|customer_code/i);
  assert.doesNotMatch(source, /\.run\s*\(/);
});
