# Homelink Employee Validation 503 Operations Record

Status: `RESOLVED`

Recorded: 2026-08-02, Asia/Dubai

## Scope and production identity

- Employee route: `/employee` -> `/employee-v3`
- Worker: `homelink-finance`
- Fix commit: `a63c958b9423a72f008d98edc52ea2ed0e615669`
- Deployed Worker version: `38361386-71a1-446e-b48d-4f991b11cf2e`
- Change class: Employee Validate transport payload only
- Schema or migration: none
- Owner business logic, projections, TTLock, and amount logic: unchanged

## Incident

An Employee Session containing 26 locally preserved entries could be entered and previewed, but `Validate Session` returned:

```text
Server validation unavailable. Please retry.
SERVER_VALIDATE_HTTP_503
```

The failure occurred before any formal upload. The client correctly retained all drafts and reported that no business write had been attempted. The affected Session contained 23 Rent entries, one Deposit In, one Deposit Out, and one Expense.

The preserved draft totals were:

| Metric | Value |
|---|---:|
| Cash received | AED 13,700.00 |
| Bank received | AED 2,720.00 |
| Total received | AED 16,420.00 |
| Deposit included | AED 100.00 |
| Deposit refund | AED 200.00 |
| Other expense | AED 100.00 |
| Total outflow | AED 300.00 |
| Net funds | AED 16,120.00 |
| Cash net | AED 13,400.00 |

## Root cause

The aggregate validation builder compacted each individual `entry`, but copied the complete Session object into every validation request. The Session object included `export_text`, and that export contained the complete Entry Anchors JSON for all entries.

For a Session with `N` entries, the client therefore sent approximately `N` copies of a Session export that itself contained `N` anchors. Payload growth was effectively quadratic rather than linear. At 26 entries, the request became large enough to fail with HTTP 503 before useful server-side validation could complete.

The recurring nature of the incident came from an earlier incomplete mitigation: entry evidence had been bounded, while the repeated full Session export remained in every request envelope. Repeated UI-state and retry fixes could not remove this transport-level cause.

## Minimum correction

The production Employee validation path now constructs a compact Session envelope containing only:

- `id`
- `session_id`
- `source`
- compact `entries`
- compact `entries_json`

The ordinary production request no longer repeats `export_text` or unrelated Session display data for every entry. The existing QA run contract continues to receive its prior Session fields so the QA path was not silently changed.

The correction did not change:

- any of the seven Employee event types;
- Add to Session behavior;
- formal Upload semantics or idempotency;
- entered amounts, notes, O/N status, or payment methods;
- draft persistence, recovery, or retry behavior;
- raw-held ingestion status or projection isolation;
- Owner APIs or business projections;
- TTLock reads or writes;
- D1 schema or migrations.

## Regression protection

`tests/employee-aggregate-transport-failure.spec.mjs` now supplies a Session with a 200 KB `export_text` and large legacy `entries_json`, then asserts that the aggregate validation request remains below 5 KB and does not contain `export_text`.

Focused command:

```text
node --test tests/employee-aggregate-transport-failure.spec.mjs tests/employee-entry-nonblocking-boundary.spec.mjs tests/employee-seven-event-resume.spec.mjs
```

Result:

- Passed: 11
- Failed: 1
- The single failure was a pre-existing Bed Transfer allowlist assertion concerning `anchor_id`; it was unrelated to the validation transport change and was not modified to make this incident pass.
- `git diff --check`: passed

## Deployment and production verification

After deployment of Worker version `38361386-71a1-446e-b48d-4f991b11cf2e`:

1. The production Employee page loaded the corrected asset.
2. All 26 local drafts were restored without loss or mutation.
3. One whole-Session validation completed.
4. All 26 entries displayed `Validation Passed`.
5. The top HTTP 503 banner disappeared.
6. No upload or cloud write was performed during the Codex validation-only verification.
7. The operator subsequently performed the formal upload and confirmed that upload completed without error.

## Operational result

- Employee entry: pass
- Draft preservation: pass
- Whole-Session validation: 26/26 pass
- Formal upload: operator-confirmed pass
- False success during the failure: none
- Duplicate write introduced by the correction: none observed
- Production schema/data migration: none
- Root cause class: repeated full Session export in aggregate validation transport
- Incident state: closed

## Maintenance rule

Future Employee validation changes must keep aggregate transport proportional to the number of entries. Presentation exports, complete anchor ledgers, Owner-facing summaries, projection state, TTLock business context, and cloud reference values must not be copied into each validation envelope or become Employee Add/Validate/Upload gates.
