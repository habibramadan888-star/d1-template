# HOMELINK Rent Split Payment Feasibility 106A

## 1. Decision

`ARCHITECTURE_DECISION=YELLOW`

The requested business shape is feasible as an additive, versioned Rent contract, but the current runtime does **not** safely support it. Today, a Rent Entry carries one payment method, produces one transaction whose primary key is the Entry ID, and every financial projector assigns the entire paid amount to either Cash or Bank. A second transaction row can satisfy the D1 primary-key constraint only by using another ID, but the current schema and runtime have no durable parent relation that proves both rows belong to the same business Entry.

The minimal safe future design is one canonical Rent parent anchor with a deterministic `payment_legs` array, plus one existing aggregate compatibility transaction row. It requires an additive v2 payload and coordinated changes to several formal projectors, so it is not GREEN. It does not require rewriting old data, changing existing unique-key semantics, or changing the core Finance formula, so it is not RED.

No implementation is authorized or included in this change.

## 2. Scope and immutable production facts

- Repository baseline: `588e5e3c1ffe1df3741eb0057e635f0be6533479` on `fix/bed-transfer-canonical-write-closure`.
- Production version observed: `13a8add3-edcf-40fa-9436-afedd0af64a4`, 100% traffic.
- Production environment observed: `APP_ENV=internal_beta`.
- Production data counts before the local feasibility work: `sessions=118`, `transactions=3192`.
- `APT-20260715-8P5KK7` exists once; its associated real ticket has eight transaction rows.
- The #7210 business fact for this analysis is one Rent of AED 730 funded by Cash AED 700 and Bank AED 30, with Outstanding AED 0 and Arrears AED 0.
- The existing ticket and its projections were read only. It was not uploaded, modified, corrected, voided, or reclassified.
- Production D1/KV binding identifiers matched `deploy-worker/wrangler.toml` at the baseline check. No secret value was read or recorded.

## 3. Current DDL and identity constraints

### Sessions

The current `sessions` table uses `id TEXT PRIMARY KEY`, stores `entries_count`, scalar Cash/Bank/Gross summary columns, and an `entries_json TEXT` archive. `entries_json` can hold a future versioned parent anchor without a schema migration. `entries_count` currently counts canonical business Entries and must continue to count the parent Rent once, not its funding legs.

### Transactions

The current `transactions` table uses `id TEXT PRIMARY KEY` and has `session_id`, `cat`, `amount`, `due`, `paid`, and `pay_type`. It has no `parent_entry_id`, `payment_leg_id`, leg ordinal, or leg contract version. The table permits two different transaction IDs in the same Session at the DDL level, but it cannot prove their common business parent.

Formal Employee write logic currently:

1. derives `entryId` from the Employee Entry;
2. checks idempotency with `transactions.id = entryId`;
3. inserts exactly one transaction with `id: entryId`;
4. persists a single payment channel on that row.

Therefore:

- `CURRENT_ENTRY_ID_CONSTRAINT`: one stable business identity per Employee Entry;
- `CURRENT_TRANSACTION_ID_CONSTRAINT`: transaction primary key is used as the Entry idempotency key;
- `CURRENT_TRANSACTION_MODEL`: one business Entry maps to one transaction row;
- two physical transaction-leg rows are not safely supported by the current runtime even though two distinct primary-key values would be accepted by D1;
- adding physical leg rows would require at least a nullable parent identity plus an index, or a dedicated leg table. That is not the recommended minimal design for this task.

## 4. Thirteen-layer trace

| Layer                                          | Current authority and identity flow                                                                                                                                                                                                                                                  |         Current multi-leg support | Future function impact if implemented                                                                                                                                          |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1. Employee form                               | `#payType` and `employeePaymentMethodValue()` select one `C` or `B`; amount/due/paid are scalar.                                                                                                                                                                                     |                                No | `employeePaymentMethodValue`, Rent form rendering and validation need an additive split selector.                                                                              |
| 2. Employee draft                              | `employeeBaseEntryPayload()` stores one `cat`, `pay_type`, amount, due and paid under one Entry ID.                                                                                                                                                                                  |                                No | `employeeBaseEntryPayload`, draft normalization, and draft restore need `payment_legs` v2 while retaining legacy scalar fields.                                                |
| 3. Preview Ledger                              | `calculateEmployeeSessionSummary()` and `buildEntrySessionLedgerText()` assign the whole received value to one channel.                                                                                                                                                              |                                No | `employeeSessionPaymentMethod`, `calculateEmployeeSessionSummary`, `entryStatementLine`, and `buildEntrySessionLedgerText` must aggregate legs.                                |
| 4. Validate payload                            | `commitSessionAndExport()` sends one Entry and one payment method; formal allowlists contain no `payment_legs`.                                                                                                                                                                      |                                No | Upload request construction needs a versioned, strictly allowlisted `payment_legs` array.                                                                                      |
| 5. Aggregate validation                        | The aggregate route reuses the same per-Entry normalization and Rent validator.                                                                                                                                                                                                      |                                No | `normalizeEmployeeEntryForValidation` and `validateRentUploadFields` must validate leg IDs, allowed methods, positive values and exact sum-to-paid.                            |
| 6. Canonical Entry identity                    | `entry.id`/`event_id`/`anchor_id` resolve to one stable parent identity.                                                                                                                                                                                                             |                       Parent only | Keep this identity unchanged; leg identities are children and must never replace the parent Entry ID.                                                                          |
| 7. Idempotency fingerprint                     | Current Rent fingerprint includes scalar paid/expected/single payment method.                                                                                                                                                                                                        |                                No | Canonical fingerprint must include a sorted stable leg set and exclude timestamps; same parent plus changed legs must conflict.                                                |
| 8. Session                                     | `entries_json` holds one anchor per Entry; `entries_count` is the number of anchors.                                                                                                                                                                                                 |           Structurally extensible | Preserve one parent anchor and `entries_count=1`; use `rent_entry_v2.payment_legs` inside the anchor.                                                                          |
| 9. Transaction row                             | `handleEmployeeEntry()` reads and writes `transactions.id=entryId` once.                                                                                                                                                                                                             |                                No | Recommended: retain one aggregate compatibility row. If physical leg rows are required, add nullable `parent_entry_id`/leg identity and an index in a separate migration task. |
| 10. Session summary                            | `calculateCanonicalSessionSummary()` maps one transaction to one Entry and calls a single-channel Finance projection.                                                                                                                                                                |                                No | Aggregate Cash/Bank from canonical legs, but business Entry and Rent income remain parent-level.                                                                               |
| 11. History                                    | Structured `entries_json` anchors are preferred; business-row count reconciles with `entries_count`.                                                                                                                                                                                 | Parent row yes; split channels no | Keep one parent History row; decorate it with its two funding legs. No standalone leg cards.                                                                                   |
| 12. Detail                                     | `chooseOwnerEmployeeSessionDetailRows()` prefers anchors; `ownerEmployeeDetailRowsTotals()` assumes one method per row.                                                                                                                                                              |                                No | Detail totals must aggregate parent legs while rendering exactly one business row.                                                                                             |
| 13. Finance / Period Analysis / Arrears / Todo | `canonicalFinanceProjectionPaymentMethod()` and `canonicalFinanceProjectionApplyAnchor()` choose one channel. Period Analysis can display Cash+Bank transaction groups but lacks a canonical parent association. Arrears uses due minus paid; Todo is not payment-channel authority. |     No reliable parent-leg parity | Finance/session-summary channel aggregation and Period Analysis identity mapping need leg awareness. Rent income, Outstanding, Arrears and Todo formulas stay unchanged.       |

## 5. Recommended canonical contract

```json
{
  "contract_version": "rent_entry_v2",
  "entry_id": "QA-SPLIT-RENT-E01",
  "anchor_id": "rent-anchor-QA-SPLIT-RENT-E01",
  "event_type": "rent",
  "bed": "7210",
  "due": 730,
  "paid": 730,
  "outstanding": 0,
  "payment_legs": [
    {
      "leg_id": "QA-SPLIT-RENT-E01-BANK",
      "parent_entry_id": "QA-SPLIT-RENT-E01",
      "method": "bank",
      "amount_aed": 30
    },
    {
      "leg_id": "QA-SPLIT-RENT-E01-CASH",
      "parent_entry_id": "QA-SPLIT-RENT-E01",
      "method": "cash",
      "amount_aed": 700
    }
  ]
}
```

Contract invariants:

1. The parent Entry ID and canonical anchor remain the business identity.
2. Leg IDs are server-validated deterministic children of the parent identity.
3. Leg ordering is canonical before fingerprinting.
4. The sum of positive leg amounts must equal `paid` exactly at AED precision.
5. `outstanding = max(due - paid, 0)`; funding channels do not alter Rent or Arrears formulas.
6. History/Detail count the parent once. Finance channels count each leg once.
7. An identical retry returns the existing parent and legs. A changed leg set under the same parent identity fails closed.
8. Server-owned fields, canonical anchor IDs, fingerprints and timestamps remain non-client-authoritative.

## 6. Backward compatibility and persistence choice

Legacy Rent anchors remain immutable. At read time, a legacy scalar `payment_method + paid` is normalized in memory into one synthesized leg. No old row is rewritten or backfilled.

The recommended minimal persistence is:

- canonical source of truth: one v2 parent anchor with its leg array in `sessions.entries_json`;
- compatibility projection: the existing single aggregate `transactions` row keyed by the parent Entry ID;
- Session business count: one;
- History/Detail business count: one.

This choice needs no Production schema migration, new column, new index, unique-constraint change, or backfill. If reporting requirements later mandate two physical rows in `transactions`, that is a different YELLOW design requiring an explicit nullable parent field and index. It must not be approximated by writing two unrelated transaction IDs.

## 7. Local isolated proof

`tests/rent-split-payment-feasibility.spec.mjs` is a test-only in-memory model with no runtime import and no remote connection. It proves:

- parent Entry count: 1;
- canonical anchor count: 1;
- deterministic payment legs: 2;
- Cash: AED 700;
- Bank: AED 30;
- Rent income and Total Received: AED 730;
- Outstanding and Arrears Opened: AED 0;
- History and Detail business rows: 1 each;
- identical retry leaves one anchor and two legs;
- changed funding content under the same parent identity conflicts;
- an old single-channel Rent normalizes to one synthesized leg without backfill.

The model proves the proposed contract's internal consistency. It does not prove the unchanged production runtime supports split payment; the source-audit test deliberately locks the current one-method/one-transaction assumptions.

## 8. Exact implementation impact if separately authorized

### Runtime files

- `deploy-worker/public/employee-v3.html`
- `deploy-worker/src/index.js`
- `deploy-worker/public/index-51-main.js`

### Principal functions

- Employee: `employeePaymentMethodValue`, `employeeBaseEntryPayload`, `applyEntryAnchors`, `normalizeEntryAnchor`, `calculateEmployeeSessionSummary`, `entryStatementLine`, `buildEntrySessionLedgerText`, `commitSessionAndExport`.
- Worker validation/persistence: `normalizeEmployeeEntryForValidation`, `validateRentUploadFields`, Rent fingerprint construction inside Employee validation, `normalizeEntryAnchor`, `handleEmployeeEntry`.
- Server summary/Finance: `canonicalFinanceProjectionPaymentMethod`, `canonicalFinanceProjectionApplyAnchor`, `canonicalSessionSummaryEntryIdentity`, `calculateCanonicalSessionSummary`.
- Owner: `chooseOwnerEmployeeSessionDetailRows`, `ownerEmployeeDetailRowsTotals`, History/Period Analysis import and row grouping in `deploy-worker/public/index-51-main.js`.

### Impact classification

- Employee: additive UI/draft/Preview/Copy behavior for Rent only.
- Worker: additive payload v2 validation, canonical fingerprinting and parent/leg persistence.
- Finance: channel aggregation changes; the core formula `Total Received - Expenses = Net Funds` and Rent income formula do not change.
- Owner: targeted projection changes, not a rewrite.
- Other six Employee event contracts: no field or behavior change is required; regression coverage is mandatory.
- Tests: single-channel Rent, split Rent, all seven events, Golden Session, Finance oracle, History/Detail parity, idempotent retry, response-loss recovery and resumable upload.

## 9. Risks, rollback and limits

Maximum risk: one leg being counted as a second business Entry or the parent amount being counted again beside its legs, causing duplicate History rows or double Finance. This is why a leg must never be persisted as an unparented ordinary transaction.

Rollback for a future implementation is feature-gate rollback to the legacy scalar Rent contract before any split Entry is accepted. Once split v2 Entries exist, readers must remain backward- and forward-compatible; rolling back only the writer is safe, but rolling back readers that cannot understand v2 is not.

Without implementation, Homelink cannot faithfully represent a single Rent funded by both Cash and Bank. The operator must continue using the existing single-channel contract; creating a fake Arrears Payment or two Rent business Entries would be semantically incorrect and is not recommended.

## 10. Required follow-up boundary

- `RECOMMENDED_NEXT_ACTION`: create a separately authorized v2 contract and projector implementation task with Full/Negative/Recovery QA before any deployment.
- `LEGACY_CLASSIFICATION_TASK=DEFERRED_TO_SEPARATE_107`
- `PRODUCTION_CORRECTION_EXECUTED=no`
- `RUNTIME_FILES_CHANGED=0`
- `PRODUCTION_BUSINESS_WRITE_COUNT=0`
- `FORMAL_WRITE_COUNT=0`
