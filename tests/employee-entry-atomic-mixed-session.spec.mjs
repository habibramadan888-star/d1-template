import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const source = await readFile(
  resolve("deploy-worker", "src", "index.js"),
  "utf8",
);

function functionBlock(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, name);
  const signatureEnd = source.indexOf("){", start);
  assert.notEqual(signatureEnd, -1, `${name}:signature`);
  const brace = signatureEnd + 1;
  let depth = 0;
  let quote = "";
  let escaped = false;
  for (let index = brace; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === "'" || char === '"' || char === "`") {
      quote = char;
      continue;
    }
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error(`FUNCTION_BLOCK_UNTERMINATED:${name}`);
}

const atomicSqlMutates = Function(
  `${functionBlock("employeeEntryAtomicSqlMutates")}; return employeeEntryAtomicSqlMutates;`,
)();
const atomicSchemaAlreadyExists = async (database, sql = "") => {
  const sourceSql = String(sql ?? "");
  const table = sourceSql.match(/^\s*CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+["`[]?([A-Za-z0-9_]+)/iu);
  const index = sourceSql.match(/^\s*CREATE\s+(?:UNIQUE\s+)?INDEX\s+IF\s+NOT\s+EXISTS\s+["`[]?([A-Za-z0-9_]+)/iu);
  const object = table
    ? { type: "table", name: table[1] }
    : index
    ? { type: "index", name: index[1] }
    : undefined;
  if (object === undefined) return false;
  const row = await database.prepare(
    "SELECT name FROM sqlite_master WHERE type=? AND name=? LIMIT 1",
  ).bind(object.type, object.name).first().catch(() => null);
  return String(row?.name ?? "").trim() === object.name;
};
const createPlanner = Function(
  "employeeEntryAtomicSqlMutates",
  "employeeEntryAtomicSchemaAlreadyExists",
  `${functionBlock("createEmployeeEntryAtomicWritePlanner")}; return createEmployeeEntryAtomicWritePlanner;`,
)(atomicSqlMutates, atomicSchemaAlreadyExists);
const commitPlan = Function(
  `${functionBlock("commitEmployeeEntryAtomicWritePlan").replace(/^function /u, "async function ")}; return commitEmployeeEntryAtomicWritePlan;`,
)();
const aggregateEnvelope = Function(
  "cleanId",
  "employeeEntryUploadType",
  "EMPLOYEE_ENTRY_AGGREGATE_ORDINARY_TYPES",
  "employeeEntryAggregateCanonicalSet",
  "cleanText",
  "cleanDate",
  `${functionBlock("employeeEntryAggregateEnvelope")}; return employeeEntryAggregateEnvelope;`,
)(
  (value) => String(value ?? "").trim().replace(/[^A-Za-z0-9_.:-]/gu, ""),
  (row) => ({
    rent: "R",
    arrears_payment: "AP",
    deposit_in: "D",
    deposit_out: "DR",
    checkout: "CO",
    expense: "E",
    bed_transfer: "TF",
  })[String(row?.event_type ?? "")] ?? "",
  new Set(["R", "AP", "D", "DR", "CO", "E"]),
  (rows) => rows.map((row, index) => ({
    event_id: row.id,
    canonical_fingerprint: row.fingerprint ?? `${row.event_type}:${index}`,
  })),
  (value) => String(value ?? "").trim(),
  (value) => String(value ?? "").trim(),
);

function aggregateBody(entries, override = {}) {
  return {
    aggregate_write: true,
    session: {
      id: "session-atomic",
      session_id: "session-atomic",
      entries_count: entries.length,
      entries,
      ...override,
    },
  };
}

test("aggregate envelope accepts one or many ordinary entries without a small cap", () => {
  for (const count of [1, 2, 6, 25]) {
    const entries = Array.from({ length: count }, (_, index) => ({
      id: `entry-${index}`,
      event_type: ["rent", "arrears_payment", "deposit_in", "deposit_out", "checkout", "expense"][index % 6],
    }));
    assert.equal(aggregateEnvelope(aggregateBody(entries), {}).ok, true);
  }
});

test("each ordinary event type and repeated legal types use the same aggregate contract", () => {
  for (const eventType of [
    "rent",
    "arrears_payment",
    "deposit_in",
    "deposit_out",
    "checkout",
    "expense",
  ]) {
    assert.equal(
      aggregateEnvelope(aggregateBody([{ id: `${eventType}-one`, event_type: eventType }]), {}).ok,
      true,
      eventType,
    );
  }
  assert.equal(
    aggregateEnvelope(aggregateBody([
      { id: "expense-one", event_type: "expense", fingerprint: "expense:one" },
      { id: "expense-two", event_type: "expense", fingerprint: "expense:two" },
    ]), {}).ok,
    true,
  );
});

test("aggregate envelope rejects empty, count mismatch and top-level duplicates", () => {
  assert.equal(aggregateEnvelope(aggregateBody([]), {}).error_code, "AGGREGATE_SESSION_EMPTY");
  assert.equal(
    aggregateEnvelope(aggregateBody([{ id: "one", event_type: "rent" }], { entries_count: 2 }), {}).error_code,
    "AGGREGATE_ENTRIES_COUNT_MISMATCH",
  );
  assert.equal(
    aggregateEnvelope({ ...aggregateBody([{ id: "one", event_type: "rent" }]), entry: {} }, {}).error_code,
    "AGGREGATE_TOP_LEVEL_ENTRY_SOURCE_FORBIDDEN",
  );
});

test("aggregate envelope rejects unknown, missing and duplicate identities", () => {
  assert.equal(
    aggregateEnvelope(aggregateBody([{ id: "one", event_type: "unknown" }]), {}).error_code,
    "AGGREGATE_EVENT_TYPE_REJECTED",
  );
  assert.equal(
    aggregateEnvelope(aggregateBody([{ id: "", event_type: "rent" }]), {}).error_code,
    "AGGREGATE_ENTRY_IDENTITY_REQUIRED",
  );
  assert.equal(
    aggregateEnvelope(aggregateBody([
      { id: "same", event_type: "rent" },
      { id: "same", event_type: "expense" },
    ]), {}).error_code,
    "AGGREGATE_DUPLICATE_ENTRY_IDENTITY",
  );
});

test("aggregate envelope rejects Bed Transfer before any write", () => {
  assert.equal(
    aggregateEnvelope(aggregateBody([{ id: "tf", event_type: "bed_transfer" }]), {}).error_code,
    "BED_TRANSFER_SESSION_MUST_BE_SINGLE_ENTRY",
  );
  assert.equal(
    aggregateEnvelope(aggregateBody([
      { id: "rent", event_type: "rent" },
      { id: "tf", event_type: "bed_transfer" },
    ]), {}).error_code,
    "BED_TRANSFER_SESSION_MUST_BE_SINGLE_ENTRY",
  );
  assert.equal(
    aggregateEnvelope(aggregateBody([
      { id: "tf-one", event_type: "bed_transfer" },
      { id: "tf-two", event_type: "bed_transfer" },
    ]), {}).error_code,
    "BED_TRANSFER_SESSION_MUST_BE_SINGLE_ENTRY",
  );
});

test("aggregate envelope rejects mixed session identity and business duplicates", () => {
  assert.equal(
    aggregateEnvelope(aggregateBody([
      { id: "one", session_id: "other", event_type: "rent" },
    ]), {}).error_code,
    "AGGREGATE_SESSION_IDENTITY_MISMATCH",
  );
  assert.equal(
    aggregateEnvelope(aggregateBody([
      { id: "one", event_type: "rent", fingerprint: "same" },
      { id: "two", event_type: "rent", fingerprint: "same" },
    ]), {}).error_code,
    "AGGREGATE_DUPLICATE_BUSINESS_IDENTITY",
  );
});

function fakeDatabase() {
  return {
    prepare(sql) {
      let values = [];
      return {
        sql,
        bind(...next) {
          values = next;
          return this;
        },
        async run() {
          throw new Error("MUTATION_RAN_BEFORE_BATCH");
        },
        async first() {
          return null;
        },
        async all() {
          return { results: [] };
        },
        async raw() {
          return [];
        },
        get values() {
          return values;
        },
      };
    },
  };
}

function fakeSchemaDatabase(existing = []) {
  const names = new Set(existing);
  return {
    prepare(sql) {
      let values = [];
      return {
        sql,
        bind(...next) {
          values = next;
          return this;
        },
        async run() {
          throw new Error("SCHEMA_MUTATION_RAN");
        },
        async first() {
          return sql.includes("sqlite_master") && names.has(values[1])
            ? { name: values[1] }
            : null;
        },
        async all() {
          return { results: [] };
        },
        async raw() {
          return [];
        },
      };
    },
  };
}

test("atomic planner captures mutations and never executes them early", async () => {
  const planner = createPlanner(fakeDatabase());
  await planner.database.prepare("INSERT INTO sessions(id) VALUES (?)").bind("s").run();
  await planner.database.prepare("INSERT INTO transactions(id) VALUES (?)").bind("e").run();
  await planner.database.prepare("UPDATE arrear_tasks SET actual_received=?").bind(10).run();
  assert.equal(planner.statements.length, 3);
});

test("atomic planner collapses repeated canonical session insert only", async () => {
  const planner = createPlanner(fakeDatabase());
  await planner.database.prepare("INSERT OR REPLACE INTO sessions(id) VALUES (?)").bind("s").run();
  await planner.database.prepare("INSERT OR REPLACE INTO sessions(id) VALUES (?)").bind("s").run();
  await planner.database.prepare("INSERT INTO transactions(id) VALUES (?)").bind("one").run();
  await planner.database.prepare("INSERT INTO transactions(id) VALUES (?)").bind("two").run();
  assert.equal(planner.statements.length, 3);
  assert.match(planner.statements[0].sql, /sessions/u);
  assert.equal(planner.statements.filter((row) => /transactions/u.test(row.sql)).length, 2);
});

test("planner preserves nested stay genesis batch inside the outer transaction", async () => {
  const planner = createPlanner(fakeDatabase());
  const stay = planner.database.prepare("INSERT INTO stay_contexts(id) VALUES (?)").bind("stay");
  const link = planner.database.prepare("INSERT INTO stay_event_links(id) VALUES (?)").bind("link");
  await planner.database.batch([stay, link]);
  assert.equal(planner.statements.length, 2);
  assert.match(planner.statements[0].sql, /stay_contexts/u);
  assert.match(planner.statements[1].sql, /stay_event_links/u);
});

test("atomic planner never performs schema mutation and fail-closes missing schema", async () => {
  const ready = createPlanner(fakeSchemaDatabase(["app_settings"]));
  await ready.database.prepare(
    "CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY)",
  ).run();
  assert.equal(ready.statements.length, 0);

  const missing = createPlanner(fakeSchemaDatabase());
  await assert.rejects(
    missing.database.prepare(
      "CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY)",
    ).run(),
    (error) => error?.code === "AGGREGATE_SCHEMA_MUTATION_FORBIDDEN",
  );
  assert.equal(missing.statements.length, 0);
});

test("aggregate handler prevalidates all entries before planning and commits one D1 batch", () => {
  const block = functionBlock("handleEmployeeEntryAggregateWrite");
  const preflight = block.indexOf("validateEmployeeEntryAggregatePreflight");
  const planner = block.indexOf("createEmployeeEntryAtomicWritePlanner");
  const perEntry = block.indexOf("handleEmployeeEntry(request,planningEnv");
  const commit = block.indexOf("commitEmployeeEntryAtomicWritePlan(env.DB,planner.statements)");
  const verify = block.indexOf("AGGREGATE_PERSISTENCE_VERIFICATION_FAILED");
  assert.ok(preflight > 0);
  assert.ok(planner > preflight);
  assert.ok(perEntry > planner);
  assert.ok(commit > perEntry);
  assert.ok(verify > commit);
  assert.equal(block.match(/commitEmployeeEntryAtomicWritePlan\(env\.DB,planner\.statements\)/gu)?.length, 1);
  assert.doesNotMatch(block.slice(0, commit), /env\.DB\.prepare\([^)]*\)\.bind\([^)]*\)\.run\(/u);
});

test("aggregate route admits only authenticated employee/staff company identities", () => {
  const block = functionBlock("handleEmployeeEntryAggregateWrite");
  assert.match(block, /const role=String\(user\?\.role\|\|""\)\.trim\(\)\.toLowerCase\(\)/u);
  assert.match(block, /!\["employee","staff"\]\.includes\(role\)/u);
  assert.match(block, /!cleanText\(user\?\.corpid\|\|"",120\)/u);
  assert.match(block, /return employeeEntryAggregateWriteFailure\("FORBIDDEN"/u);
  assert.doesNotMatch(block, /body\?\.(?:role|corpid|employee_authorized)/u);
});

test("atomic commit helper fail-closes every persistence-stage fault without partial durable state", async () => {
  const stages = [
    "sessions",
    "transactions",
    "deposit_ledger",
    "arrear_tasks",
    "arrears",
    "entry_events",
    "audit_logs",
    "stay_contexts",
    "stay_event_links",
  ];
  for (let failureIndex = 0; failureIndex < stages.length; failureIndex += 1) {
    const durable = [];
    const database = {
      async batch(statements) {
        const transaction = [...durable];
        for (let index = 0; index < statements.length; index += 1) {
          if (index === failureIndex) throw new Error(`fault:${stages[index]}`);
          transaction.push(statements[index].stage);
        }
        durable.splice(0, durable.length, ...transaction);
        return statements.map(() => ({ success: true }));
      },
    };
    await assert.rejects(
      commitPlan(database, stages.map((stage) => ({ stage }))),
      (error) => error?.code === "AGGREGATE_ATOMIC_COMMIT_FAILED",
    );
    assert.deepEqual(durable, [], `stage ${stages[failureIndex]} must roll back`);
  }
});

test("atomic commit helper persists the complete ordered plan exactly once", async () => {
  const durable = [];
  let batchCount = 0;
  const statements = [
    "sessions",
    "transactions",
    "deposit_ledger",
    "entry_events",
    "audit_logs",
  ].map((stage) => ({ stage }));
  const database = {
    async batch(batch) {
      batchCount += 1;
      durable.push(...batch.map((statement) => statement.stage));
      return batch.map(() => ({ success: true }));
    },
  };
  await commitPlan(database, statements);
  assert.equal(batchCount, 1);
  assert.deepEqual(durable, statements.map((statement) => statement.stage));
});

test("aggregate write closure keeps D1 failures rolled back and success explicit", () => {
  const block = functionBlock("handleEmployeeEntryAggregateWrite");
  assert.match(block, /AGGREGATE_ATOMIC_COMMIT_FAILED/u);
  assert.match(block, /committed:true/u);
  assert.match(block, /requested_entry_count:envelope\.rows\.length/u);
  assert.match(block, /persisted_entry_count:persistedRows\.length/u);
  assert.match(block, /transaction_count:txRows\.length/u);
  assert.match(block, /AGGREGATE_PARTIAL_IDEMPOTENCY_CONFLICT/u);
  assert.match(block, /SESSION_IDEMPOTENCY_CONFLICT/u);
  assert.match(block, /idempotent:true/u);
  assert.match(block, /no_write:true/u);
  assert.match(block, /write_attempted:false/u);
  assert.match(block, /employeeEntryAggregateVerifyDerivedPersistence/u);
  const verification = functionBlock("employeeEntryAggregateVerifyDerivedPersistence");
  for (const source of [
    "entry_events",
    "audit_logs",
    "deposit_ledger",
    "arrear_tasks",
    "canonicalArrearsGateway",
    "stay_event_links",
  ]) {
    assert.match(verification, new RegExp(source, "u"), source);
  }
});

test("planned Deposit and Arrears overlays keep same-batch derived state sequential", () => {
  const deposit = functionBlock("empDepositMove");
  const reconcile = functionBlock("empReconcileArrearTask");
  const ensure = functionBlock("empEnsureOpenArrearTaskForPayment");
  assert.match(deposit, /atomic_planned_deposit_deltas/u);
  assert.match(reconcile, /atomic_planned_arrears_payments/u);
  assert.match(ensure, /atomic_planned_arrear_tasks/u);
});

test("Bed Transfer remains on its isolated canonical write path", () => {
  const handler = functionBlock("handleEmployeeEntry");
  assert.match(handler, /employeeBedTransferSingleEntryFailure/u);
  assert.match(handler, /persistEmployeeBedTransferCanonicalArchive/u);
  assert.match(handler, /bedTransferWriteApproved/u);
});
