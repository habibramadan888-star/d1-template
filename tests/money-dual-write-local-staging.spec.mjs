import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDualWriteUpdateSql,
  P0_001E_TABLE_SPECS,
  summarizeLocalStagingDualWriteRows
} from "../scripts/rehearse-money-dual-write-local-staging.mjs";

test("P0-001E table specs target only known local/staging companion fils fields", () => {
  assert.equal(P0_001E_TABLE_SPECS.length >= 5, true);
  for (const spec of P0_001E_TABLE_SPECS) {
    assert.match(spec.table, /^[a-z_]+$/);
    assert.match(spec.key, /^[a-z_]+$/);
    assert.equal(Array.isArray(spec.fields), true);
    for (const field of spec.fields) {
      assert.match(field.legacyField, /^[a-z0-9_]+$/);
      assert.match(field.filsField, /^[a-z0-9_]+_fils$/);
      assert.notEqual(field.legacyField, field.filsField);
    }
  }
});

test("buildDualWriteUpdateSql writes only explicit integer *_fils patch fields", () => {
  const sql = buildDualWriteUpdateSql({
    table: "transactions",
    keyField: "id",
    keyValue: "tx-1",
    patch: { amount_fils: 10050, due_fils: 77000 }
  });

  assert.equal(
    sql,
    `UPDATE "transactions" SET "amount_fils" = 10050, "due_fils" = 77000 WHERE "id" = 'tx-1'`
  );
});

test("buildDualWriteUpdateSql rejects unsafe non-integer patch values", () => {
  assert.throws(
    () =>
      buildDualWriteUpdateSql({
        table: "transactions",
        keyField: "id",
        keyValue: "tx-1",
        patch: { amount_fils: 100.5 }
      }),
    /Unsafe SQL integer value/
  );
});

test("summarizeLocalStagingDualWriteRows separates active, voided, invalid, and written rows", () => {
  const summary = summarizeLocalStagingDualWriteRows([
    { ok: true, voided: false, wrote_patch: true, warning_codes: [] },
    { ok: true, voided: true, wrote_patch: true, warning_codes: ["LEGACY_NUMBER_SOURCE"] },
    { ok: false, voided: false, wrote_patch: false, warning_codes: ["LEGACY_NUMBER_SOURCE"] }
  ]);

  assert.deepEqual(summary, {
    totalRows: 3,
    activeRows: 2,
    voidedRows: 1,
    writtenRows: 2,
    invalidRows: 1,
    warnings: 2
  });
});
