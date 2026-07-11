# OWNER_CONTROLLED_LEGACY_BOOTSTRAP_WRITE_CONTRACT_REVIEW

## A. CONFIRMED_BUSINESS_RULES

- Canonical Archive is the fact source for accepted employee events, owner correction anchors, void/reversal anchors, and future owner bootstrap anchors.
- `stay_context_id` is server-generated, opaque, durable for one continuous stay, and is not derived from bed, card, phone, TTLock metadata, or provider identity.
- Existing active occupants without a durable identity require a one-time `STAY_BOOTSTRAP_ANCHOR`; creation or confirmation requires owner authorization.
- Existing Rent, Deposit, and Arrears events remain immutable; linkage must be explicit.
- TTLock D is the current deposit amount fact. Missing D remains `UNKNOWN / MISSING_D` and is never zero.
- An independent TTLock E/e token is the only physical-vacancy fact. No E/e is `not_marked_vacant`; unavailable, ambiguous, stale, or invalid snapshots must fail closed.
- TTLock MMDD is a month/day value without a year and is not Rent coverage.
- TTLock expiry is a complete current cutoff date and time; its exact API field, unit, and timezone remain `UNKNOWN`.
- Bed 334 is excluded.
- Bed Transfer remains `NOT_VERIFIED / REQUIREMENTS_REVIEW`, write-disabled, and `PRODUCTION_NO_GO`.

## B. CURRENT_CODE_FACTS

- `canonicalStayBedContextGateway` reads bounded rows from active `sessions.entries_json` through `cloudArrearsFetchActiveSessionRows` and separately reads active `stay_contexts` and genesis `stay_event_links`.
- `buildCanonicalStayBedContext` selects canonical genesis facts first, returns canonical identity when registry rows are missing, and uses registry rows only for confirmation/conflict detection.
- Different active `stay_context_id` values for one bed fail closed. Canonical/registry field disagreement and duplicate registry rows fail closed.
- Multiple active genesis anchors carrying the same `stay_context_id` are not independently classified as a conflict; the first candidate is selected.
- Voided sessions are excluded by the gateway query, and direct inactive states/void timestamps are excluded by the pure module.
- The gateway does not parse or apply owner correction anchors. The test named `corrected active canonical anchor remains eligible for confirmation` supplies synthetic `archive_state` values rather than a real correction-anchor session.
- `buildLegacyStayBootstrapCandidate` is a pure one-export module. It creates no ID, performs no DB/network operation, and has no HTTP route or UI.
- The preview accepts one active Rent or Deposit In source anchor, blocks bed 334 and registry conflicts, validates MMDD and full-date expiry, treats missing D as null plus warning, and excludes provider/card identity.
- The preview does not require explicit proof that Access Snapshot is available, non-ambiguous, non-stale, and valid; valid MMDD/expiry inputs can otherwise reach owner-review eligibility without that state proof.
- `prepareStayGenesis` explicitly rejects `legacy_bootstrap`; no bootstrap persistence export or writer exists.
- A separate existing Rent/Deposit In genesis path can server-generate and write a stay only with explicit `stay_action=start` and `DURABLE_STAY_WRITE_APPROVED="true"`. It does not use canonical Bed Context to prove no active stay and no E/e vacancy before creation.
- `/api/employee/bed-transfers` fails closed before D1 access, and the reviewed commits do not change `BED_TRANSFER_WRITE_APPROVED` behavior.

## C. SOURCE_OF_TRUTH_CHECK

- PASS: canonical stay identity is read first from Canonical Archive (`sessions.entries_json`).
- PASS: `stay_contexts` and `stay_event_links` are treated as rebuildable materialized registry data, not the authoritative identity source.
- PASS: canonical/registry disagreement returns `registry_conflict` without selecting either ID.
- PASS: distinct active stay IDs for one bed return conflict.
- BUG_FOUND: correction anchors are not incorporated into canonical active semantics.
- BUG_FOUND: multiple active genesis anchors with the same stay ID are not explicitly failed closed.
- BUG_FOUND: legacy preview eligibility does not require explicit Access Snapshot availability/ambiguity/staleness validity proof.

## D. IDENTITY_FIREWALL_CHECK

- PASS: reviewed pure modules neither read nor emit `tenant_card_id`, `card_id`, `old_ttlock_ref`, provider phone, `phone_99099`, creator phone, card creation time, or provider metadata.
- PASS: provider-only input cannot create a bootstrap candidate or stay identity.
- PASS: server-managed stay identity fields are rejected from employee genesis input, and generated stay IDs are UUID v4 values.
- PASS: bed 334 is hard blocked by the bootstrap preview.
- BUG_FOUND: the existing non-bootstrap genesis route does not prove the source-of-truth occupancy/no-active-stay preconditions before creating identity when its local write flag is enabled.

## E. VOID_CORRECTION_CHECK

- PARTIAL: session-level void exclusion and direct `voided`, `reversed`, and `deleted` state exclusion are implemented and unit tested.
- PARTIAL: a direct row labeled `corrected` remains active in the pure module.
- BUG_FOUND: additive owner correction-anchor sessions are not resolved into effective canonical stay facts by this gateway. Current tests do not cover this real archive representation.
- UNKNOWN: exact owner bootstrap void/reversal business semantics are not locked by the reviewed contract.

## F. FINANCE_ZERO_CHECK

- The two feature commits add a read-only stay gateway and a pure preview. They introduce no Finance write and no bootstrap write.
- The targeted tests observed no bootstrap DB/network path.
- Full Bed Transfer Finance-zero behavior remains `UNKNOWN`; this review does not upgrade it.

## G. IDEMPOTENCY_REQUIREMENTS

Confirmed requirements:

- A retry must not create a second bootstrap anchor, stay context, or registry link.
- Company scope and canonical source-anchor identity must participate in the authoritative uniqueness boundary.
- Exact replay must converge on the same server-generated `stay_context_id`; it must never generate a replacement ID.
- Canonical Archive must be written before any rebuildable registry materialization, and registry failure must not rewrite or delete archive facts.
- Conflicting canonical or registry facts must fail closed.

Still unknown:

- the exact owner-bootstrap idempotency-key fields and storage representation;
- the exact replay HTTP status and response envelope;
- the concurrency/atomicity mechanism for two owner approvals of the same historical stay;
- correction and reversal interaction with a previously accepted bootstrap idempotency key.

## H. OWNER_AUTHORIZATION_REQUIREMENTS

Confirmed requirements:

- bootstrap creation or confirmation requires owner authorization;
- authorization must be company-scoped and tied to the reviewed canonical source and bed evidence;
- the server, not the owner payload, generates `stay_context_id`;
- preview eligibility is not authorization and must not write.

Still unknown:

- the exact owner role/permission predicate;
- the approval payload and signed/recorded authorization fields;
- whether authorization expires when Access Snapshot or archive facts change;
- the required owner audit text/reason and approval version;
- the exact conflict/re-review flow.

## I. STILL_UNKNOWN_GOVERNANCE_DECISIONS

- Exact TTLock expiry API field, data type, timestamp unit, and timezone.
- Snapshot staleness threshold, duplicate-snapshot handling, multiple D, D0, lowercase d, and abnormal MMDD rules.
- Exact owner bootstrap authorization contract.
- Exact bootstrap idempotency and concurrent-approval contract.
- Bootstrap void/reversal and correction semantics.
- Whether and how a bootstrap anchor is replaced or superseded when historical evidence changes.
- Full Bed Transfer Finance-zero behavior, transfer void money refund rules, company-scope closure, and target-bed concurrency remain outside this review and unresolved.

No recommendation in this section is treated as a confirmed decision.

## J. SAFE_IMPLEMENTATION_BOUNDARY

- Continue review-only work and preserve the pure preview as no-write.
- A future implementation milestone may be defined only after the owner authorization, idempotency, snapshot-validity, correction/void semantics, file scope, and acceptance tests are explicitly locked.
- Any future local writer must append one canonical owner bootstrap anchor, use a server-generated opaque ID, preserve source events, materialize registries from that exact ID, fail closed on drift/conflict, remain local-only and default-off, and exclude bed 334 and all provider/card identity.
- The current run makes no runtime, test, migration, UI, endpoint, feature-gate, deployment, or production change.

## K. FORBIDDEN_IMPLEMENTATION

- No legacy bootstrap write, owner bootstrap endpoint, or owner bootstrap UI in this run.
- No inference of stay identity from bed, card, phone, customer fields, TTLock identity, MMDD, expiry, D, E/e, UI, Preview, WhatsApp, cache, or provider metadata.
- No mutation or rewrite of historical Rent, Deposit, Arrears, session, or entry facts.
- No eighth employee event and no bed 334 handling.
- No Finance side effect, Bed Transfer lineage/write, write-gate enablement, migration apply, staging, deployment, production access, production read, or production write.
- No automatic choice for any `UNKNOWN` governance decision.

## L. VERIFICATION_RESULT

- verification level: `BUG_FOUND`
- targeted tests: `66 passed / 0 failed`
- test quality: module behavior is exercised with executable assertions; several integration boundaries are source-regex assertions. The real correction-anchor path and snapshot unavailable/ambiguous/stale cases are not covered.
- controller status: `HUMAN_REVIEW_REQUIRED`
- human gate: `OWNER_CONTROLLED_LEGACY_BOOTSTRAP_WRITE_CONTRACT_REVIEW`
- production called: no
- production business data changed: no
- migration applied to staging: no
- migration applied to production: no
- deployment: no
- Bed Transfer write enabled: no
- Bed Transfer status: `NOT_VERIFIED / REQUIREMENTS_REVIEW`
- production cutover: `PRODUCTION_NO_GO`

The review is complete, but implementation is not authorized. The controller stops after the governance commit.
