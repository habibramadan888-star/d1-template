# QA-20260716-4FB51FAF Owner Run Scope and Period Analysis

## Scope

- Task: `HOMELINK_SEVEN_EVENT_COMPLETE_END_TO_END_CLOSURE_083`
- Run: `QA-20260716-4FB51FAF`
- Run state at investigation: `UPLOAD_PASS`
- Employee review: accepted
- Owner review: pending
- Production mutation: none

## First divergence

The first incorrect decision was the Owner Period Analysis import predicate. It treated a row as already imported when either the session-level `anchorId` matched or a content fingerprint matched. Quick Sessions `S01` through `S13` share the legacy session-level anchor `EMPV3-20260716-qa-staff-RRENT`, while their canonical Entry IDs are distinct. The three paid Bed Transfer Sessions have distinct canonical anchors, but equal-date/equal-summary content can collide. The result was two retained rows and fourteen false duplicates.

The corrected identity priority is:

1. canonical Entry ID set;
2. canonical transfer/archive anchor;
3. Session ID;
4. legacy anchor only when no stronger identity exists;
5. content fallback only when no formal identity exists.

The first live QA deployment exposed two downstream read-adapter divergences without changing Run data:

- Run-scoped Session Detail still reconciled each single canonical anchor against a legacy whole-Run Session summary and could select two parsed export rows. Run-scoped Detail now prefers the exact structured `entries_json` anchor and never substitutes export text.
- The Arrears Gateway correctly projected two open items totalling AED 150, but one Owner summary adapter read totals from the outer response wrapper instead of the canonical `projection`. The adapter now unwraps the canonical projection; the Gateway also exposes bounded top-level aggregate fields for compatibility.
- The first QA deployment had already written malformed parsed rows to the Run-namespaced browser analysis cache. Run cache loading now verifies that exactly one canonical Run Entry ID matches each stored card and discards stale parsed rows; server data is never modified.
- Period Analysis used total outflow as a cash-only deduction, so its total net funds were correct while its cash and bank nets diverged from the shared oracle. The presentation calculation now allocates Deposit Out and Expense by their canonical payment method: Cash Net AED 1,421, Bank Net AED 280, Net Funds AED 1,701.
- The active Owner HTML referenced a long-lived script cache key. The cache key is versioned for this closure so authenticated browsers load the verified Run-filter and oracle code instead of a prior QA asset.

## Sixteen import decisions

| Entry ID | Session ID | Event | Canonical anchor | Before | Before reason | After |
|---|---|---|---|---|---|---|
| `QA-20260716-4FB51FAF-E01` | `QA-20260716-4FB51FAF-S01` | rent | `QA-20260716-4FB51FAF-E01` | KEEP | first shared legacy session anchor | KEEP by Entry ID |
| `QA-20260716-4FB51FAF-E02` | `QA-20260716-4FB51FAF-S02` | rent | `QA-20260716-4FB51FAF-E02` | REJECT | false duplicate: shared session anchor | KEEP by Entry ID |
| `QA-20260716-4FB51FAF-E03` | `QA-20260716-4FB51FAF-S03` | rent | `QA-20260716-4FB51FAF-E03` | REJECT | false duplicate: shared session anchor | KEEP by Entry ID |
| `QA-20260716-4FB51FAF-E04` | `QA-20260716-4FB51FAF-S04` | arrears_payment | `QA-20260716-4FB51FAF-E04` | REJECT | false duplicate: shared session anchor | KEEP by Entry ID |
| `QA-20260716-4FB51FAF-E05` | `QA-20260716-4FB51FAF-S05` | arrears_payment | `QA-20260716-4FB51FAF-E05` | REJECT | false duplicate: shared session anchor | KEEP by Entry ID |
| `QA-20260716-4FB51FAF-E06` | `QA-20260716-4FB51FAF-S06` | deposit_in | `QA-20260716-4FB51FAF-E06` | REJECT | false duplicate: shared session anchor | KEEP by Entry ID |
| `QA-20260716-4FB51FAF-E07` | `QA-20260716-4FB51FAF-S07` | deposit_in | `QA-20260716-4FB51FAF-E07` | REJECT | false duplicate: shared session anchor | KEEP by Entry ID |
| `QA-20260716-4FB51FAF-E08` | `QA-20260716-4FB51FAF-S08` | deposit_out | `QA-20260716-4FB51FAF-E08` | REJECT | false duplicate: shared session anchor | KEEP by Entry ID |
| `QA-20260716-4FB51FAF-E09` | `QA-20260716-4FB51FAF-S09` | deposit_out | `QA-20260716-4FB51FAF-E09` | REJECT | false duplicate: shared session anchor | KEEP by Entry ID |
| `QA-20260716-4FB51FAF-E10` | `QA-20260716-4FB51FAF-S10` | checkout | `QA-20260716-4FB51FAF-E10` | REJECT | false duplicate: shared session anchor | KEEP by Entry ID |
| `QA-20260716-4FB51FAF-E11` | `QA-20260716-4FB51FAF-S11` | left_with_arrears | `QA-20260716-4FB51FAF-E11` | REJECT | false duplicate: shared session anchor | KEEP by Entry ID |
| `QA-20260716-4FB51FAF-E12` | `QA-20260716-4FB51FAF-S12` | expense | `QA-20260716-4FB51FAF-E12` | REJECT | false duplicate: shared session anchor | KEEP by Entry ID |
| `QA-20260716-4FB51FAF-E13` | `QA-20260716-4FB51FAF-S13` | expense | `QA-20260716-4FB51FAF-E13` | REJECT | false duplicate: shared session anchor | KEEP by Entry ID |
| `QA-20260716-4FB51FAF-E14` | `QA-20260716-4FB51FAF-S14` | bed_transfer | `0ebecf22-f7e6-416f-88f0-056c9b0f3f40` | KEEP | first equal-summary transfer | KEEP by Entry ID |
| `QA-20260716-4FB51FAF-E15` | `QA-20260716-4FB51FAF-S15` | bed_transfer | `26aa3304-3adc-4d28-8821-140718295add` | REJECT | false duplicate: content fingerprint collision | KEEP by Entry ID |
| `QA-20260716-4FB51FAF-E16` | `QA-20260716-4FB51FAF-S16` | bed_transfer | `f3844436-bd4d-4ff9-8a25-d50139ef54b3` | REJECT | false duplicate: content fingerprint collision | KEEP by Entry ID |

## Server Run filtering

The five Owner read gateways now accept `qa_run_id` only when all of these are true: QA acceptance is enabled, the request host is the configured QA hostname, the authenticated role is Owner/Manager, and the company is `HL-QA`. The server resolves the persisted Run matrix, constructs the exact Session and Entry ID sets, and reads only those Sessions. Production cannot activate this filter.

- History: exact Run Sessions only; baseline rows excluded.
- Session Detail: requested Session must belong to the Run; otherwise controlled 404.
- Finance: canonical projection uses the exact Run Session snapshot.
- Arrears: canonical projection uses the exact Run Session snapshot and does not mix global follow-up rows.
- Today Todo: derives only from the Run Session snapshot plus the frozen QA TTLock snapshot; no live TTLock fetch.

## Write safety

- Period Analysis for a QA Run is read-only and Run-namespaced in browser storage.
- Period Analysis does not call `/api/save_session` for a QA Run.
- No upload, cleanup, reconciliation, or manual acceptance action is part of this change.
- No Production path, binding, data, or traffic is changed.

## Local verification

- Combined QA/Owner/Finance/Arrears/Todo/TTLock/Exit Event regression: `198/198 PASS`.
- QA acceptance platform verification: `PASS`.
- Secret hygiene: `PASS`.
- Worker and Owner scripts: syntax `PASS`.
- Git diff check: `PASS`.

## Live QA verification

### Credential and session safety

- The QA Owner temporary password, signing material, and QA account credential were rotated in the QA environment only.
- The prior QA Owner browser session and prior password were invalidated; the stale session returned a real `401`.
- No credential value is present in this evidence, Git, screenshots, or command output.
- Production authentication, accounts, sessions, secrets, and bindings were not accessed or changed.

### Locked QA deployment

- Current QA artifact SHA-256: `f81ecc993782350dec281eaf5a73c54302cefb6d66a218d9b6be6fd33f0bfa70`.
- Current QA Worker version: `37c4546d-4ae9-44a7-8d58-065ad62fa878` at `100%` QA traffic.
- Run-reviewed artifact remains immutable: `a49ac3590b25a8567a6bf8362cf7968fdf17f4cabae476218eb437342113b304`.
- Run state remains `UPLOAD_PASS`; Employee review is accepted and Owner review is pending.
- This closure performed `0` formal business writes, no upload, no cleanup, no reconciliation, and no manual acceptance action.

### Exact server identity contract

- Expected Entry IDs: `16`.
- Expected canonical anchors: `16`.
- Expected Session IDs: `16`.
- Expected transaction legs: `13`.
- Expected Period Analysis business rows: `16`.
- Imported Entry IDs: the exact same `16` expected IDs.
- Missing Entry IDs: `[]`.
- Extra Entry IDs: `[]`.
- Duplicate Entry IDs: `[]`.
- Duplicate anchor IDs: `[]`.
- Misgrouped Session IDs: `[]`.
- Orphan transaction IDs: `[]`.
- Server set equality: `true`.
- First divergence function: `client.loadAnalysis`.
- First divergence field: `analysis_cache_namespace`.

Every row uses importer source `session_detail:structured_entries_json`, duplicate and rendered identity `entry:<Entry ID>`, and import decision `KEEP`. The versioned cache namespace contains the QA Run ID, current artifact SHA, Worker version, data version `649d217eca6be3a407ed4fdb7f52be9edd734263a94dacf593cf968eb7c4f155`, and Run update time `2026-07-16T20:42:15.479Z` before the row identity.

| Entry ID | Session ID | Canonical anchor | Event | Transaction IDs |
|---|---|---|---|---|
| `QA-20260716-4FB51FAF-E01` | `QA-20260716-4FB51FAF-S01` | `QA-20260716-4FB51FAF-E01` | rent | `QA-20260716-4FB51FAF-E01` |
| `QA-20260716-4FB51FAF-E02` | `QA-20260716-4FB51FAF-S02` | `QA-20260716-4FB51FAF-E02` | rent | `QA-20260716-4FB51FAF-E02` |
| `QA-20260716-4FB51FAF-E03` | `QA-20260716-4FB51FAF-S03` | `QA-20260716-4FB51FAF-E03` | rent | `QA-20260716-4FB51FAF-E03` |
| `QA-20260716-4FB51FAF-E04` | `QA-20260716-4FB51FAF-S04` | `QA-20260716-4FB51FAF-E04` | arrears_payment | `QA-20260716-4FB51FAF-E04` |
| `QA-20260716-4FB51FAF-E05` | `QA-20260716-4FB51FAF-S05` | `QA-20260716-4FB51FAF-E05` | arrears_payment | `QA-20260716-4FB51FAF-E05` |
| `QA-20260716-4FB51FAF-E06` | `QA-20260716-4FB51FAF-S06` | `QA-20260716-4FB51FAF-E06` | deposit_in | `QA-20260716-4FB51FAF-E06` |
| `QA-20260716-4FB51FAF-E07` | `QA-20260716-4FB51FAF-S07` | `QA-20260716-4FB51FAF-E07` | deposit_in | `QA-20260716-4FB51FAF-E07` |
| `QA-20260716-4FB51FAF-E08` | `QA-20260716-4FB51FAF-S08` | `QA-20260716-4FB51FAF-E08` | deposit_out | `QA-20260716-4FB51FAF-E08` |
| `QA-20260716-4FB51FAF-E09` | `QA-20260716-4FB51FAF-S09` | `QA-20260716-4FB51FAF-E09` | deposit_out | `QA-20260716-4FB51FAF-E09` |
| `QA-20260716-4FB51FAF-E10` | `QA-20260716-4FB51FAF-S10` | `QA-20260716-4FB51FAF-E10` | checkout | `QA-20260716-4FB51FAF-E10` |
| `QA-20260716-4FB51FAF-E11` | `QA-20260716-4FB51FAF-S11` | `QA-20260716-4FB51FAF-E11` | left_with_arrears | `QA-20260716-4FB51FAF-E11` |
| `QA-20260716-4FB51FAF-E12` | `QA-20260716-4FB51FAF-S12` | `QA-20260716-4FB51FAF-E12` | expense | `QA-20260716-4FB51FAF-E12` |
| `QA-20260716-4FB51FAF-E13` | `QA-20260716-4FB51FAF-S13` | `QA-20260716-4FB51FAF-E13` | expense | `QA-20260716-4FB51FAF-E13` |
| `QA-20260716-4FB51FAF-E14` | `QA-20260716-4FB51FAF-S14` | `0ebecf22-f7e6-416f-88f0-056c9b0f3f40` | bed_transfer | `[]` |
| `QA-20260716-4FB51FAF-E15` | `QA-20260716-4FB51FAF-S15` | `26aa3304-3adc-4d28-8821-140718295add` | bed_transfer | `[]` |
| `QA-20260716-4FB51FAF-E16` | `QA-20260716-4FB51FAF-S16` | `f3844436-bd4d-4ff9-8a25-d50139ef54b3` | bed_transfer | `[]` |

### Authenticated mobile Owner verification

A fresh QA Owner context at `390 x 844` loaded the versioned QA asset without relying on a browser cache-clear dialog.

- History: `16/16` business records and `16` Detail actions; no baseline rows.
- Session Detail: the selected canonical Bed Transfer rendered its structured anchor and Audit Trail with no `Detail Render Mismatch`.
- Period Analysis: History selector `16`, selected `16/16`, import success `16`, failure `0`, loaded `16/16` Sessions and `16` business transactions.
- Period Analysis finance: Cash `AED 1,620`, Bank `AED 880`, Total received `AED 2,500`, other expenses `AED 599`, Deposit Out `AED 200`, Cash Net `AED 1,421`, Bank Net `AED 280`, Net Funds `AED 1,701`.
- Finance projection: Rent `AED 2,130`, Bed Transfer fee `AED 100`, generic arrears repaid `AED 70`.
- Arrears: exactly two Run records, `AED 70 + AED 80 = AED 150`.
- Today Todo: exactly `13` Run-derived items.
- Mobile width: History body `375 <= 390`; Period/Overview body `390 <= 390`; no horizontal overflow.
- Core Owner pages returned controlled application UI with no `503` or Cloudflare HTML.
- TTLock external calls: `0`.

Screenshot evidence:

- `screenshots/owner-history-083a.png`
- `screenshots/owner-detail-083a.png`
- `screenshots/owner-period-analysis-083a.png`

### Production invariants

- Production version before and after: `84ee2023-f550-47e0-9e4f-3caa161a3431` at `100%`.
- Production traffic changed: no.
- Production business data changed: no.
- Production migration applied: no.
- Production authentication changed: no.

The correct pause state is `PARTIAL_AWAITING_MANUAL_OWNER_ACCEPTANCE`. Owner manual acceptance remains pending and must be performed by the user. Full, Negative, and Recovery Runs have not started.
