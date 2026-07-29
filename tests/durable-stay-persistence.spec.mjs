import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  createOpaqueStayContextId,
  materializePreparedStayGenesis,
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

function contextRow(input = prepared()) {
  return {
    stay_context_id: input.stay_context_id,
    corpid: input.corpid,
    lifecycle_status: input.lifecycle_status,
    genesis_event_type: input.genesis_event_type,
    genesis_session_id: input.genesis_session_id,
    genesis_entry_id: input.genesis_entry_id,
    genesis_anchor_id: input.genesis_anchor_id,
    started_at: input.started_at
  };
}

function linkRow(input = prepared(), stay_event_link_id = LINK_UUID) {
  return {
    stay_event_link_id,
    corpid: input.corpid,
    stay_context_id: input.stay_context_id,
    session_id: input.genesis_session_id,
    entry_id: input.genesis_entry_id,
    anchor_id: input.genesis_anchor_id,
    event_type: input.genesis_event_type,
    link_role: "genesis",
    occurred_at: input.started_at
  };
}

function mockDb({ context = null, link = null, batchError = null, onBatchError = null } = {}) {
  const state = { context, link };
  const calls = { prepare: [], first: [], batch: [] };
  const db = {
    prepare(sql) {
      calls.prepare.push(sql);
      return {
        bind(...values) {
          return {
            sql,
            values,
            async first() {
              calls.first.push({ sql, values });
              if (/FROM stay_contexts/i.test(sql)) return state.context;
              if (/FROM stay_event_links/i.test(sql)) return state.link;
              return null;
            }
          };
        }
      };
    },
    async batch(statements) {
      calls.batch.push(statements);
      if (batchError) {
        onBatchError?.(state, statements);
        throw batchError;
      }
      for (const statement of statements) {
        if (/INSERT INTO stay_contexts/i.test(statement.sql)) {
          const v = statement.values;
          state.context = contextRow({
            stay_context_id: v[0], corpid: v[1], lifecycle_status: "active",
            genesis_event_type: v[2], genesis_session_id: v[3], genesis_entry_id: v[4],
            genesis_anchor_id: v[5], started_at: v[6]
          });
        }
        if (/INSERT INTO stay_event_links/i.test(statement.sql)) {
          const v = statement.values;
          state.link = linkRow({
            stay_context_id: v[2], corpid: v[1], lifecycle_status: "active",
            genesis_event_type: v[6], genesis_session_id: v[3], genesis_entry_id: v[4],
            genesis_anchor_id: v[5], started_at: v[7]
          }, v[0]);
        }
      }
      return statements.map(() => ({ success: true }));
    }
  };
  return { db, calls, state };
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

test("module exports only canonical-first preparation and materialization interfaces", async () => {
  const exports = await import(modulePath);
  assert.deepEqual(Object.keys(exports).sort(), [
    "createOpaqueStayContextId",
    "materializePreparedStayGenesis",
    "prepareStayGenesis",
    "validateStayGenesisInput"
  ]);
  assert.equal("persistPreparedStayGenesis" in exports, false);
  assert.equal("persistStayGenesis" in exports, false);
});

test("opaque IDs require strict UUID v4 values", () => {
  assert.equal(createOpaqueStayContextId(() => STAY_UUID), STAY_UUID);
  assert.throws(() => createOpaqueStayContextId(), error => error?.code === "STAY_RANDOM_UUID_REQUIRED");
  for (const invalid of ["", "not-a-uuid", "11111111-1111-3111-8111-111111111111", "11111111-1111-4111-7111-111111111111"]) {
    assert.throws(() => createOpaqueStayContextId(() => invalid), error => error?.code === "STAY_ID_INVALID_UUID");
  }
});

test("prepare validates Rent and Deposit In, generates one ID, and does not mutate input", () => {
  for (const genesis_event_type of ["rent", "deposit_in"]) {
    const input = Object.freeze(genesis({ genesis_event_type }));
    const before = structuredClone(input);
    const ids = uuidSequence([STAY_UUID]);
    assert.deepEqual(validateStayGenesisInput(input), before);
    assert.deepEqual(prepareStayGenesis(input, { randomUUID: ids.randomUUID }), {
      stay_context_id: STAY_UUID,
      ...before,
      lifecycle_status: "active"
    });
    assert.deepEqual(input, before);
    assert.deepEqual(ids.calls, [0]);
  }
});

test("prepare failures and legacy bootstrap generate no ID", () => {
  for (const input of [genesis({ corpid: "" }), genesis({ genesis_event_type: "legacy_bootstrap", genesis_session_id: null, genesis_entry_id: null })]) {
    const ids = uuidSequence([STAY_UUID]);
    assert.throws(() => prepareStayGenesis(input, { randomUUID: ids.randomUUID }));
    assert.equal(ids.calls.length, 0);
  }
});

test("invalid prepared fields fail before registry reads or UUID generation", async () => {
  const cases = [
    prepared({ stay_context_id: "invalid" }),
    prepared({ lifecycle_status: "closed" }),
    prepared({ unknown_field: "secret" }),
    prepared({ bed: "611" }),
    prepared({ card_id: "secret-card" }),
    prepared({ provider_metadata: { secret: true } })
  ];
  for (const input of cases) {
    const { db, calls } = mockDb();
    const ids = uuidSequence([LINK_UUID]);
    await assert.rejects(materializePreparedStayGenesis(db, input, { randomUUID: ids.randomUUID, createdAt: "2026-07-11" }));
    assert.equal(ids.calls.length, 0);
    assert.equal(calls.prepare.length, 0);
    assert.equal(calls.batch.length, 0);
  }
});

test("new canonical genesis creates context and link in one batch with one link UUID", async () => {
  const { db, calls, state } = mockDb();
  const ids = uuidSequence([LINK_UUID]);
  const result = await materializePreparedStayGenesis(db, prepared(), { randomUUID: ids.randomUUID, createdAt: "2026-07-11" });
  assert.deepEqual(ids.calls, [0]);
  assert.equal(calls.batch.length, 1);
  assert.equal(calls.batch[0].length, 2);
  assert.deepEqual(state.context, contextRow());
  assert.deepEqual(state.link, linkRow());
  assert.deepEqual(result, {
    stay_context_id: STAY_UUID,
    lifecycle_status: "active",
    genesis_event_type: "rent",
    status: "created",
    write_attempted: true
  });
});

test("exact materialization is read-only and generates no UUID", async () => {
  const { db, calls } = mockDb({ context: contextRow(), link: linkRow() });
  const ids = uuidSequence([LINK_UUID]);
  const result = await materializePreparedStayGenesis(db, prepared(), { randomUUID: ids.randomUUID, createdAt: "2026-07-11" });
  assert.equal(ids.calls.length, 0);
  assert.equal(calls.batch.length, 0);
  assert.equal(result.status, "already_materialized");
  assert.equal(result.write_attempted, false);
});

test("missing link is repaired without rewriting context", async () => {
  const { db, calls, state } = mockDb({ context: contextRow() });
  const ids = uuidSequence([LINK_UUID]);
  const result = await materializePreparedStayGenesis(db, prepared(), { randomUUID: ids.randomUUID, createdAt: "2026-07-11" });
  assert.deepEqual(ids.calls, [0]);
  assert.equal(calls.batch.length, 1);
  assert.equal(calls.batch[0].length, 1);
  assert.match(calls.batch[0][0].sql, /INSERT INTO stay_event_links/);
  assert.deepEqual(state.context, contextRow());
  assert.deepEqual(state.link, linkRow());
  assert.equal(result.status, "link_repaired");
});

test("orphan link and canonical mismatches fail closed without UUID or writes", async () => {
  const cases = [
    [{ link: linkRow() }, "STAY_REGISTRY_ORPHAN_LINK_CONFLICT"],
    [{ context: contextRow(prepared({ stay_context_id: "33333333-3333-4333-a333-333333333333" })) }, "STAY_GENESIS_ANCHOR_CONFLICT"],
    [{ context: contextRow(), link: linkRow(prepared({ genesis_entry_id: "different-entry" })) }, "STAY_GENESIS_ANCHOR_CONFLICT"]
  ];
  for (const [state, code] of cases) {
    const { db, calls } = mockDb(state);
    const ids = uuidSequence([LINK_UUID]);
    await assert.rejects(
      materializePreparedStayGenesis(db, prepared(), { randomUUID: ids.randomUUID, createdAt: "2026-07-11" }),
      error => error?.code === code && !String(error?.message).includes("different-entry")
    );
    assert.equal(ids.calls.length, 0);
    assert.equal(calls.batch.length, 0);
  }
});

test("unique race rereads once and converges when canonical fields match", async () => {
  const duplicate = Object.assign(new Error("UNIQUE constraint"), { code: "D1_ERROR" });
  const { db, calls } = mockDb({
    batchError: duplicate,
    onBatchError(state) {
      state.context = contextRow();
      state.link = linkRow();
    }
  });
  const ids = uuidSequence([LINK_UUID]);
  const result = await materializePreparedStayGenesis(db, prepared(), { randomUUID: ids.randomUUID, createdAt: "2026-07-11" });
  assert.deepEqual(ids.calls, [0]);
  assert.equal(calls.batch.length, 1);
  assert.equal(calls.first.length, 4);
  assert.equal(result.status, "already_materialized");
});

test("unique race rereads once and fails closed when canonical fields differ", async () => {
  const duplicate = Object.assign(new Error("constraint"), { code: "SQLITE_CONSTRAINT_UNIQUE" });
  const { db, calls } = mockDb({
    batchError: duplicate,
    onBatchError(state) {
      state.context = contextRow(prepared({ genesis_entry_id: "racing-entry" }));
      state.link = linkRow(prepared({ genesis_entry_id: "racing-entry" }));
    }
  });
  const ids = uuidSequence([LINK_UUID]);
  await assert.rejects(
    materializePreparedStayGenesis(db, prepared(), { randomUUID: ids.randomUUID, createdAt: "2026-07-11" }),
    error => error?.code === "STAY_GENESIS_ANCHOR_CONFLICT"
  );
  assert.deepEqual(ids.calls, [0]);
  assert.equal(calls.batch.length, 1);
  assert.equal(calls.first.length, 4);
});

test("temporary database failure propagates without retry or ID replacement", async () => {
  const temporary = Object.assign(new Error("temporary unavailable"), { code: "D1_TEMPORARY" });
  const { db, calls } = mockDb({ batchError: temporary });
  const ids = uuidSequence([LINK_UUID, "33333333-3333-4333-a333-333333333333"]);
  await assert.rejects(
    materializePreparedStayGenesis(db, prepared(), { randomUUID: ids.randomUUID, createdAt: "2026-07-11" }),
    error => error === temporary
  );
  assert.deepEqual(ids.calls, [0]);
  assert.equal(calls.batch.length, 1);
  assert.equal(calls.first.length, 2);
});

test("module source has no provider identity, time inference, or legacy persistence export", async () => {
  const source = await readFile(modulePath, "utf8");
  assert.doesNotMatch(source, /Date\.now|new Date|Math\.random/);
  assert.doesNotMatch(source, /tenant_card_id|card_id|old_ttlock_ref|provider_phone|phone_99099|customer_id|customer_code/i);
  assert.doesNotMatch(source, /persistPreparedStayGenesis|persistStayGenesis/);
  assert.doesNotMatch(source, /\bbed\b|\broom\b/);
  assert.doesNotMatch(source, /\.run\s*\(/);
});
