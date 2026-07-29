# Bed Transfer Phase 1 Local E2E Acceptance

## Run identity

- Task: `HOMELINK_BED_TRANSFER_PHASE1_LOCAL_END_TO_END_ACCEPTANCE_012`
- Repository: `C:/Users/Chinalink/Desktop/软件迭代-worktrees/bed-transfer-canonical-write-closure`
- Branch: `fix/bed-transfer-canonical-write-closure`
- HEAD before: `83c85c8ffdab7190abb4c3a367bacbbb39fe3b88`
- Runtime fix commit: `6aa858b5958ff9d7e2057fae99a67805b8696b2e`
- Acceptance/evidence commit: this document's containing commit
- Date: 2026-07-12
- Time zone: Asia/Dubai
- Verification boundary: local fixtures, pure modules, Worker VM/source harnesses; no external system

## Result

`LOCAL_PHASE1_TEST_PASS` / `TEST_PASS`.

The unique Phase 1 inventory selected by the required Bed Transfer, lineage, fee/difference, source-context, TTLock, Owner History/Todo, derived arrears, employee-validation and Owner UI terms contains **111 files and 587 tests**: **587 passed, 0 failed, 0 skipped**.

## Scenario matrix

| Scenario | Status | Local evidence |
| --- | --- | --- |
| A Employee-first + paid fee | PASS | Clean serializer/validate/write path, one canonical transfer anchor, A→B history, AED 50 transfer income and zero rent, TTLock Todo active then derived resolved, retry deduplicated. |
| B Owner-first + waiver | PASS | No TTLock-move Todo, waiver review Todo, additive canonical acknowledgment resolves Todo, zero Finance/Arrears, transfer remains effective, no localStorage fact. |
| C Unpaid AED 50 + AP | PASS | Stable arrears ref, AED 50 open, unified UI adapter, AED 49 rejected, exact AED 50 closes once, Finance repayment once, rent zero, sync remains synced, duplicate AP deduplicated. |
| D Bed difference | PASS | Paid, unpaid, exact full AP and none/zero covered; employee amount is authoritative input, no automatic pricing, separate income/debt, no Rent, mixed/partial rejected, deterministic ref/retry. |
| E A→B→C + multiple arrears | PASS | Same lineage and continuous previous anchor, A/B/C history, unrelated occupant excluded, two prior debts keep distinct refs/original beds/amounts, effective display C, no carryover income/repayment. |
| F Void/correction | PASS | Latest void restores B, standalone void restores A, middle discontinuity fails closed, raw audit retained, effective void excluded, paid income becomes zero without auto-refund, unpaid derived debt disappears, old carried debt remains, replacement counted once. |
| G rejection paths | PASS | Same bed, 334, cross-corpid, ambiguous/discontinuous contexts, invalid vacancy/occupancy states, missing or mismatched TTLock fields, identity/server-field injection, mixed/multiple entries, client timestamp, disabled gate and idempotency conflict fail closed without projection side effects. |

## Runtime defect closed

The Owner UI cloud-arrears normalizer did not read the canonical Gateway field `remaining_arrears`, so a transferred debt could appear with an unknown balance. The minimal runtime fix adds that canonical field to the existing fallback chain. No write behavior, schema, route, deployment configuration or production gate changed.

## Stale/excluded test audit

| Exact file and assertion | HEAD 83c85c8 actual | Expected/current contract | Classification | Bed Transfer impact and evidence |
| --- | --- | --- | --- | --- |
| `tests/employee-upload-dry-run-validation.spec.mjs` — `left with arrears dry-run returns required missing fields` | Failed by reading obsolete wrapper/field names. | Read current diagnostic payload and current missing-field contract. | TEST_BUG / CONTRACT_DRIFT | Direct seven-event regression; assertion updated and passes. |
| same file — `employee UI runs dry-run validation before real upload and surfaces backend fields` | Expected legacy `upload_status:SYNCED`. | Current `sync_status:SYNCED` plus `CHECKING_CLOUD` phase. | CONTRACT_DRIFT | Direct employee validation path; updated and passes. |
| same file — `validation failure does not restore done or uploaded success state` | Regex expected an obsolete success-branch marker. | Current `setUploadPhase` state transition. | SCRIPT_BUG / STALE_TEST | Direct employee UI state safety; harness assertion updated and passes. |
| `tests/bed-transfer-production-dry-run-script.spec.mjs` — `script includes all required safe dry-run cases and blocks write calls in executable code` | LF-only regex failed on CRLF source. | Line-ending-neutral `\r?\n` scan. | SCRIPT_BUG | Direct Bed Transfer safety script; test-only fix passes. |
| `tests/owner-arrears-send-directive-ui.spec.mjs` — `send directive UI uses the approved persisted dispatch contract without requested date input` | Asserted superseded dry-run/no-write UI. | Approved gated `POST /api/boss/arrears/directives` contract. | CONTRACT_DRIFT | Bed Transfer derived arrears Owner UI; current route/idempotency asserted and passes. |
| same file — `send directive performs the gated write and refreshes canonical arrears state` | Asserted superseded dry-run behavior. | Gated write followed by canonical refresh. | CONTRACT_DRIFT / STALE_TEST | Bed Transfer derived arrears lifecycle; updated and passes. |
| `tests/owner-overview-comparative-ui-cn.spec.mjs` — `owner comparative panel is Chinese-first and mobile-card based` | Expected old “本月实收/入住净变化” labels. | Current “当前账期实收/Cloud Arrears” contract. | STALE_TEST | Owner UI regression adjacent to transfer projections; updated and passes. |

The 24 tests that asserted the superseded independent `/api/employee/bed-transfers`, `bed_transfer_events` or `entry_events` architecture retain all 45 original `test(...)` cases. Their names are marked `legacy assertion superseded:` and their assertions now prove the committed canonical archive contract. No test was deleted, skipped, marked only, or commented out.

## Source-of-truth assertions

- Physical vacancy is derived only from an independent TTLock E/e token.
- Current deposit is derived only from TTLock D; missing D remains unknown.
- TTLock MMDD is first-check-in month/day and is not Rent coverage.
- TTLock expiry is used as the current full access/rent-period end; card creation time is not used.
- Card ID, 99099 phone and provider metadata are rejected as identity inputs.
- No localStorage, UI text/tag or UI-derived Finance/History/Arrears fact is used.
- The legacy independent Bed Transfer write route is fixed disabled.
- There is no `save_session` bypass and no `bed_transfer_events` fact write.
- `sessions.entries_json` is the sole transfer fact, and all tested projections rebuild from canonical archive fixtures.
- Bed 334 remains hard blocked.

## Test inventory

“Previously targeted” is `YES` only where the filename maps unambiguously to the committed 006–011 targeted suite families; `NOT_CONFIRMED` is not inferred as yes.

| Test file | Count | Result | Module | Previously targeted |
| --- | ---: | --- | --- | --- |
| `tests/bed-transfer-accounting-rules.spec.mjs` | 2 | PASS | Canonical backend / contract | NOT_CONFIRMED |
| `tests/bed-transfer-arrears-payment-finance.spec.mjs` | 2 | PASS | Finance / Arrears | YES |
| `tests/bed-transfer-arrears-payment-integration.spec.mjs` | 2 | PASS | Finance / Arrears | YES |
| `tests/bed-transfer-arrears-payment-sync.spec.mjs` | 2 | PASS | Finance / Arrears | YES |
| `tests/bed-transfer-arrears-projection.spec.mjs` | 7 | PASS | Finance / Arrears | YES |
| `tests/bed-transfer-canonical-archive-write.spec.mjs` | 7 | PASS | Canonical backend / contract | YES |
| `tests/bed-transfer-canonical-link-anchor.spec.mjs` | 14 | PASS | Canonical backend / contract | YES |
| `tests/bed-transfer-canonical-link-validate-integration.spec.mjs` | 3 | PASS | Canonical backend / contract | YES |
| `tests/bed-transfer-canonical-write-closure.spec.mjs` | 8 | PASS | Canonical backend / contract | YES |
| `tests/bed-transfer-canonical-write-integration.spec.mjs` | 8 | PASS | Canonical backend / contract | YES |
| `tests/bed-transfer-current-session-append.spec.mjs` | 2 | PASS | Canonical backend / contract | NOT_CONFIRMED |
| `tests/bed-transfer-derived-arrears-payment.spec.mjs` | 5 | PASS | Finance / Arrears | YES |
| `tests/bed-transfer-employee-save-api.spec.mjs` | 2 | PASS | Employee / 7-event | NOT_CONFIRMED |
| `tests/bed-transfer-employee-ui-save-wiring.spec.mjs` | 2 | PASS | Employee / 7-event | NOT_CONFIRMED |
| `tests/bed-transfer-entry-ledger-save.spec.mjs` | 2 | PASS | Canonical backend / contract | NOT_CONFIRMED |
| `tests/bed-transfer-event-ledger-idempotency.spec.mjs` | 1 | PASS | Canonical backend / contract | NOT_CONFIRMED |
| `tests/bed-transfer-event-selection-normalization.spec.mjs` | 2 | PASS | Canonical backend / contract | NOT_CONFIRMED |
| `tests/bed-transfer-fee-accounting-category.spec.mjs` | 2 | PASS | Canonical backend / contract | NOT_CONFIRMED |
| `tests/bed-transfer-fee-ledger-save.spec.mjs` | 3 | PASS | Canonical backend / contract | NOT_CONFIRMED |
| `tests/bed-transfer-fee-no-mutation.spec.mjs` | 2 | PASS | Canonical backend / contract | NOT_CONFIRMED |
| `tests/bed-transfer-fee-ui.spec.mjs` | 3 | PASS | Canonical backend / contract | NOT_CONFIRMED |
| `tests/bed-transfer-fee-waiver-required.spec.mjs` | 1 | PASS | Canonical backend / contract | NOT_CONFIRMED |
| `tests/bed-transfer-finance-arrears-integration.spec.mjs` | 6 | PASS | Finance / Arrears | YES |
| `tests/bed-transfer-finance-projection.spec.mjs` | 15 | PASS | Finance / Arrears | YES |
| `tests/bed-transfer-input-clearing.spec.mjs` | 2 | PASS | Canonical backend / contract | NOT_CONFIRMED |
| `tests/bed-transfer-lineage-projection.spec.mjs` | 4 | PASS | Canonical backend / contract | NOT_CONFIRMED |
| `tests/bed-transfer-linked-anchor.spec.mjs` | 1 | PASS | Canonical backend / contract | NOT_CONFIRMED |
| `tests/bed-transfer-live-render-path.spec.mjs` | 2 | PASS | Canonical backend / contract | NOT_CONFIRMED |
| `tests/bed-transfer-live-save-final-fix.spec.mjs` | 3 | PASS | Canonical backend / contract | NOT_CONFIRMED |
| `tests/bed-transfer-no-mutation.spec.mjs` | 1 | PASS | Canonical backend / contract | NOT_CONFIRMED |
| `tests/bed-transfer-no-occupancy-mutation.spec.mjs` | 2 | PASS | Employee / 7-event | NOT_CONFIRMED |
| `tests/bed-transfer-no-owner-review.spec.mjs` | 1 | PASS | Canonical backend / contract | NOT_CONFIRMED |
| `tests/bed-transfer-no-transfer-note-required.spec.mjs` | 1 | PASS | Canonical backend / contract | NOT_CONFIRMED |
| `tests/bed-transfer-note-cid-phone-sanitizer.spec.mjs` | 3 | PASS | Canonical backend / contract | NOT_CONFIRMED |
| `tests/bed-transfer-paid-and-waived.spec.mjs` | 2 | PASS | Canonical backend / contract | NOT_CONFIRMED |
| `tests/bed-transfer-phase1-contract.spec.mjs` | 13 | PASS | Canonical backend / contract | YES |
| `tests/bed-transfer-phase1-local-e2e-acceptance.spec.mjs` | 9 | PASS | Canonical backend / contract | YES |
| `tests/bed-transfer-phase1-safety-gate.spec.mjs` | 3 | PASS | Canonical backend / contract | YES |
| `tests/bed-transfer-production-dry-run-script.spec.mjs` | 2 | PASS | Canonical backend / contract | NOT_CONFIRMED |
| `tests/bed-transfer-record-only-anchors.spec.mjs` | 1 | PASS | Canonical backend / contract | NOT_CONFIRMED |
| `tests/bed-transfer-record-only-employee-copy.spec.mjs` | 1 | PASS | Employee / 7-event | NOT_CONFIRMED |
| `tests/bed-transfer-record-only-no-mutation.spec.mjs` | 2 | PASS | Canonical backend / contract | NOT_CONFIRMED |
| `tests/bed-transfer-record-only-owner-view.spec.mjs` | 1 | PASS | Canonical backend / contract | NOT_CONFIRMED |
| `tests/bed-transfer-record-only-save-api.spec.mjs` | 2 | PASS | Canonical backend / contract | NOT_CONFIRMED |
| `tests/bed-transfer-review-flags-non-blocking.spec.mjs` | 2 | PASS | Canonical backend / contract | NOT_CONFIRMED |
| `tests/bed-transfer-save-gated-ui.spec.mjs` | 2 | PASS | Canonical backend / contract | NOT_CONFIRMED |
| `tests/bed-transfer-source-context-resolver.spec.mjs` | 19 | PASS | Canonical backend / contract | YES |
| `tests/bed-transfer-source-of-truth-firewall.spec.mjs` | 6 | PASS | Canonical backend / contract | NOT_CONFIRMED |
| `tests/bed-transfer-state-machine.spec.mjs` | 2 | PASS | Canonical backend / contract | NOT_CONFIRMED |
| `tests/bed-transfer-statistical-anchors.spec.mjs` | 2 | PASS | Canonical backend / contract | NOT_CONFIRMED |
| `tests/bed-transfer-step2-form-render.spec.mjs` | 2 | PASS | Canonical backend / contract | NOT_CONFIRMED |
| `tests/bed-transfer-step3-context-render.spec.mjs` | 2 | PASS | Canonical backend / contract | NOT_CONFIRMED |
| `tests/bed-transfer-step8-summary.spec.mjs` | 2 | PASS | Canonical backend / contract | NOT_CONFIRMED |
| `tests/bed-transfer-traceability.spec.mjs` | 2 | PASS | Canonical backend / contract | NOT_CONFIRMED |
| `tests/bed-transfer-ttlock-migration.spec.mjs` | 2 | PASS | TTLock compatibility | YES |
| `tests/bed-transfer-ttlock-sequence.spec.mjs` | 14 | PASS | TTLock compatibility | YES |
| `tests/bed-transfer-validation-service.spec.mjs` | 3 | PASS | Canonical backend / contract | NOT_CONFIRMED |
| `tests/canonical-finance-projection-gateway.spec.mjs` | 6 | PASS | Finance / Arrears | NOT_CONFIRMED |
| `tests/canonical-occupancy-bed-status-gateway.spec.mjs` | 6 | PASS | Employee / 7-event | NOT_CONFIRMED |
| `tests/durable-stay-genesis-trigger.spec.mjs` | 9 | PASS | Canonical backend / contract | NOT_CONFIRMED |
| `tests/durable-stay-genesis-validate-integration.spec.mjs` | 9 | PASS | Canonical backend / contract | NOT_CONFIRMED |
| `tests/durable-stay-persistence-schema.spec.mjs` | 6 | PASS | Canonical backend / contract | NOT_CONFIRMED |
| `tests/employee-7-event-business-dependency-anchor-model-v1.spec.mjs` | 9 | PASS | Employee / 7-event | NOT_CONFIRMED |
| `tests/employee-7-event-closed-loop-test-matrix-v1.spec.mjs` | 6 | PASS | Employee / 7-event | NOT_CONFIRMED |
| `tests/employee-7-event-source-contract.spec.mjs` | 13 | PASS | Employee / 7-event | NOT_CONFIRMED |
| `tests/employee-bed-transfer-payload-firewall.spec.mjs` | 5 | PASS | Employee / 7-event | YES |
| `tests/employee-bed-transfer-phase1-ui.spec.mjs` | 5 | PASS | Employee / 7-event | YES |
| `tests/employee-bed-transfer-ui-fields.spec.mjs` | 5 | PASS | Employee / 7-event | YES |
| `tests/employee-bed-transfer-validation-flow.spec.mjs` | 5 | PASS | Employee / 7-event | YES |
| `tests/employee-entry-7-event-dispatch-isolation.spec.mjs` | 10 | PASS | Employee / 7-event | NOT_CONFIRMED |
| `tests/employee-entry-anchor-contract.spec.mjs` | 3 | PASS | Employee / 7-event | NOT_CONFIRMED |
| `tests/employee-entry-bed-info-strip.spec.mjs` | 5 | PASS | Employee / 7-event | NOT_CONFIRMED |
| `tests/employee-entry-collapsed-evidence.spec.mjs` | 2 | PASS | Employee / 7-event | NOT_CONFIRMED |
| `tests/employee-entry-event-specific-validator-builder.spec.mjs` | 3 | PASS | Employee / 7-event | NOT_CONFIRMED |
| `tests/employee-entry-repeatable-upload.spec.mjs` | 3 | PASS | Employee / 7-event | NOT_CONFIRMED |
| `tests/employee-entry-seven-template-closure.spec.mjs` | 5 | PASS | Employee / 7-event | NOT_CONFIRMED |
| `tests/employee-entry-structured-anchor-closure.spec.mjs` | 4 | PASS | Employee / 7-event | NOT_CONFIRMED |
| `tests/employee-entry-template-registry.spec.mjs` | 4 | PASS | Employee / 7-event | NOT_CONFIRMED |
| `tests/employee-entry-whatsapp-export-baseline.spec.mjs` | 3 | PASS | Employee / 7-event | NOT_CONFIRMED |
| `tests/employee-source-of-truth-firewall.spec.mjs` | 7 | PASS | Employee / 7-event | NOT_CONFIRMED |
| `tests/expense-evidence-lifecycle-readiness.spec.mjs` | 6 | PASS | Canonical backend / contract | NOT_CONFIRMED |
| `tests/information-anchor-contract-v1.spec.mjs` | 11 | PASS | Canonical backend / contract | NOT_CONFIRMED |
| `tests/information-anchor-step2-plan.spec.mjs` | 7 | PASS | Canonical backend / contract | NOT_CONFIRMED |
| `tests/ledger-parser-balance-continuation.spec.mjs` | 3 | PASS | Canonical backend / contract | NOT_CONFIRMED |
| `tests/occupancy-candidate-attachment-plan-v1.spec.mjs` | 12 | PASS | Employee / 7-event | NOT_CONFIRMED |
| `tests/occupancy-candidate-dry-run-preview-contract-v1.spec.mjs` | 16 | PASS | Employee / 7-event | NOT_CONFIRMED |
| `tests/occupancy-candidate-dry-run-preview-implementation.spec.mjs` | 13 | PASS | Employee / 7-event | NOT_CONFIRMED |
| `tests/occupancy-candidate-metadata-write-implementation.spec.mjs` | 7 | PASS | Employee / 7-event | NOT_CONFIRMED |
| `tests/occupancy-candidate-metadata-write-plan-v1.spec.mjs` | 14 | PASS | Employee / 7-event | NOT_CONFIRMED |
| `tests/occupancy-session-design-v1.spec.mjs` | 15 | PASS | Employee / 7-event | NOT_CONFIRMED |
| `tests/owner-bed-transfer-arrears-ui.spec.mjs` | 6 | PASS | Finance / Arrears | YES |
| `tests/owner-bed-transfer-fee-record-view.spec.mjs` | 1 | PASS | Owner UI | YES |
| `tests/owner-bed-transfer-finance-ui.spec.mjs` | 5 | PASS | Finance / Arrears | YES |
| `tests/owner-bed-transfer-history-ui.spec.mjs` | 6 | PASS | Owner UI | YES |
| `tests/owner-bed-transfer-pending-review-view.spec.mjs` | 2 | PASS | Owner UI | YES |
| `tests/owner-bed-transfer-todo-ui.spec.mjs` | 5 | PASS | Today Todo | YES |
| `tests/owner-bed-transfer-ui-source-firewall.spec.mjs` | 5 | PASS | Owner UI | YES |
| `tests/owner-bed-transfer-waiver-ack.spec.mjs` | 3 | PASS | Owner UI | YES |
| `tests/owner-correction-anchor-implementation-plan-v1.spec.mjs` | 17 | PASS | Canonical backend / contract | NOT_CONFIRMED |
| `tests/owner-correction-void-reversal-plan-v1.spec.mjs` | 15 | PASS | Canonical backend / contract | NOT_CONFIRMED |
| `tests/owner-history-bed-transfer-lineage-integration.spec.mjs` | 7 | PASS | Owner History | YES |
| `tests/owner-history-bed-transfer-lineage.spec.mjs` | 18 | PASS | Owner History | YES |
| `tests/owner-history-employee-entry-decoder.spec.mjs` | 6 | PASS | Owner History | NOT_CONFIRMED |
| `tests/owner-history-response-fields-h4b-plan-v1.spec.mjs` | 14 | PASS | Owner History | NOT_CONFIRMED |
| `tests/owner-occupancy-flow-metrics.spec.mjs` | 1 | PASS | Employee / 7-event | NOT_CONFIRMED |
| `tests/owner-overview-accounting-control.spec.mjs` | 1 | PASS | Owner UI | NOT_CONFIRMED |
| `tests/owner-overview-bed-transfer-fee-separated.spec.mjs` | 1 | PASS | Owner UI | NOT_CONFIRMED |
| `tests/owner-overview-comparative-metric-contract.spec.mjs` | 1 | PASS | Owner UI | NOT_CONFIRMED |
| `tests/owner-today-todo-bed-transfer-integration.spec.mjs` | 4 | PASS | Today Todo | YES |
| `tests/owner-today-todo-bed-transfer.spec.mjs` | 7 | PASS | Today Todo | YES |
| `tests/owner-today-todo-gateway.spec.mjs` | 6 | PASS | Today Todo | NOT_CONFIRMED |

## Commands and exact results

1. Syntax checks for changed runtime/test JavaScript: PASS.
2. `node --test tests/bed-transfer-phase1-local-e2e-acceptance.spec.mjs`: 9/9 PASS.
3. Required-term unique file inventory, executed one file at a time with `node --test <file>`: 587/587 PASS, 0 FAIL, 0 SKIPPED across 111 files.
4. Superseded independent-write contract files: 45/45 PASS with original test count retained.
5. Seven-event dispatch/firewall regression group: 50/50 PASS.
6. Owner History/Finance/Arrears/Todo/Owner UI regression group: 127/127 PASS.
7. Additional structured seven-event closure recheck: 9/9 PASS.
8. `git diff --check`: PASS before acceptance commit.

Counts in commands 2 and 4–7 overlap the unique inventory and therefore are not added together.

## Not run

- `tests/durable-stay-genesis-local-vertical-slice.spec.mjs`: `INTENTIONALLY_NOT_APPLICABLE / NOT_RUN_WITH_REASON` for the final acceptance suite because it exercises migration 008 / `stay_contexts` Durable Stay genesis, explicitly forbidden by this task. It was encountered during initial inventory only against an ephemeral local SQLite harness; no migration was applied and no external data changed.
- Repository-wide `npm test`: `NOT_RUN_WITH_REASON`. The available command includes the prohibited migration 008/Durable Stay vertical slice. Reporting a full-suite PASS would therefore be false.

## Safety and remaining blockers

- production_called=no
- production_business_data_changed=no
- migration_created=no
- migration_applied_to_staging=no
- migration_applied_to_production=no
- deployment=no
- bed_transfer_write_enabled_in_production=no
- bed_transfer_status=NOT_VERIFIED / REQUIREMENTS_REVIEW
- production_cutover=PRODUCTION_NO_GO
- Remaining local Phase 1 acceptance blockers: none.
- Production/staging/live verification remains outside this result and is not claimed.
