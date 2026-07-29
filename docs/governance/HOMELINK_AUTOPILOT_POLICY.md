# HOMELINK_AUTOPILOT_POLICY

## Controller identity

- controller: `HOMELINK_AUTOPILOT_CONTROLLER`
- repository root: `C:/Users/Chinalink/Desktop/软件迭代-worktrees/bed-transfer-canonical-write-closure`
- branch: `fix/bed-transfer-canonical-write-closure`
- governance source: `docs/governance/HOMELINK_GOVERNANCE_V2_COMPLETE_HANDOFF_PACKAGE.md`
- governance SHA-256: `9f1fe20ccfeb5c6c5c1fb0addbf436dded55174426dd3d6cd33c6868793c4d4d`

## Authority order

1. The latest explicit user decision in the Homelink governance conversation.
2. The V2 business dictionary, source-of-truth constitution, and safety boundaries.
3. The latest committed business contracts and design documents.
4. Current Git and source facts.
5. Historical Codex output.

V2 sections P and Q are historical snapshots. Current branch, HEAD, worktree, implementation, commits, tests, and migration files must be read from Git. Unknown facts remain `UNKNOWN`.

## Run protocol

Each planned run reads the V2 governance source, state, current Git facts, recent commits, and prior evidence in that order. It independently reviews the previous milestone before considering one next local milestone. At most one minimal fix is permitted within a milestone, followed by only directly relevant targeted tests and one atomic commit.

The controller may enter implementation only when the previous verification level is `TEST_PASS`, the business contract, source-of-truth boundary, file scope, and acceptance tests are explicit, and no production access, deployment, migration apply, secrets/config, owner business decision, source conflict, Git anomaly, or scope expansion is involved.

## Stop protocol

`HUMAN_REVIEW_REQUIRED`, `BLOCKED`, and `COMPLETED` are stopping states. In a stopping state a later run checks only the state file and Git drift, does not modify code, does not rerun broad tests, does not duplicate evidence, and does not clear `human_gate` without explicit user approval.

Human approval is required for unclear business rules, new or changed facts of record, any staging or production migration, deployment, production access or URL, real production read or write, remote Cloudflare/Wrangler commands, secrets/config, an unlocked owner-write contract, unclear void/reversal semantics, scope expansion, unrelated modules, a second failed repair attempt, Git anomalies, unauthorized files, bed 334, an eighth employee event, provider/card identity, Bed Transfer write enablement, or production cutover changes.

## Fixed safety invariants

- TTLock D is the only fact source for the current deposit amount; missing D is `UNKNOWN / MISSING_D`, never zero.
- An independent TTLock E/e token is the only physical-vacancy fact; no token is `not_marked_vacant`, not proof from another source.
- TTLock MMDD is the first Homelink move-in month/day without a year and is not Rent coverage.
- TTLock expiry is the full current access/rent cutoff date and time.
- Canonical Archive is the fact source for employee events, owner corrections, and owner bootstrap anchors.
- `stay_context_id` is an opaque, durable, server-generated stay identity and is never derived from bed, card, phone, or provider metadata.
- Stay registries are rebuildable materializations of Canonical Archive.
- Today Todo is derived and is not a fact source.
- Bed 334 is excluded.
- Bed Transfer remains `NOT_VERIFIED / REQUIREMENTS_REVIEW`.
- `production_cutover` remains `PRODUCTION_NO_GO` unless the user explicitly changes it.

## Verification levels

The controller uses only `TEST_PASS`, `PARTIAL_PASS`, `BUG_FOUND`, `BLOCKED`, `PRODUCTION_DRY_RUN_VERIFIED`, `PRODUCTION_READ_VERIFIED`, and `LIVE_VERIFIED`. Local source and local tests can establish only the first four. Deployment is not business verification, dry-run is not live verification, and a script rollup failure is not automatically a runtime failure.

## Phase 1 legacy bootstrap decision

- Human decision: `LEGACY_BOOTSTRAP = REJECTED_FOR_PHASE1`.
- Previous human gate: `OWNER_CONTROLLED_LEGACY_BOOTSTRAP_WRITE_CONTRACT_REVIEW = REJECTED_FOR_PHASE1`.
- Bed Transfer Phase 1 handles only new Bed Transfer events created after the feature is enabled.
- Phase 1 does not reconstruct old resident identities, backfill historical transfers, create legacy stay contexts, migrate old Bed Transfer records, infer resident identity from bed/provider/card/phone metadata, automatically merge old bed history, or introduce owner-controlled legacy bootstrap writes.
- Legacy or uncertain historical context remains `UNKNOWN` or `OWNER_REVIEW_REQUIRED` and does not authorize legacy writes.
- The single canonical write path is `POST /api/employee/entry` with `event_type = bed_transfer`, writing to `sessions.entries_json`.
- `POST /api/employee/bed-transfers` remains disabled or fail-closed.
- TTLock changes remain manual: source becomes E/e; target receives source D, MMDD, and expiry.
- A Bed Transfer event itself creates no Rent income, Deposit In, Deposit Out, Arrears repayment, or Expense.
- Original historical events remain immutable; bed 334 remains deferred and excluded.
- Bed Transfer writes remain disabled, status remains `NOT_VERIFIED / REQUIREMENTS_REVIEW`, and production cutover remains `PRODUCTION_NO_GO`.
- Explicitly authorized ready status after this decision: `READY_FOR_NEXT_MINIMAL_TASK`.
- Current milestone: `SIMPLIFIED_PHASE1_CANONICAL_BED_TRANSFER_WRITE_CLOSURE`.
- Next minimal runtime task: `CLOSE_INDEPENDENT_BED_TRANSFER_WRITE_PATH_AND_KEEP_SINGLE_CANONICAL_ENTRY_PATH`.
