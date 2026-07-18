# Homelink Rent Split Payment V2 QA Handoff

## Scope and baseline

- Task: `HOMELINK_RENT_SPLIT_PAYMENT_V2_QA_IMPLEMENTATION_106B`
- Baseline ancestor: `8ab43ed439e4478855e1974a311ee868b2cc8d00`
- Production version observed before and after QA work: `13a8add3-edcf-40fa-9436-afedd0af64a4` at 100% traffic
- Production D1 counts observed after QA work: sessions `118`, transactions `3192`
- Protected Production ticket `APT-20260715-8P5KK7` / Session `mrme89w804rjs`: one matching session; no write, correction, void, migration, or backfill was performed
- All deployment and mutable test-data activity was restricted to the independent `HL-QA` Worker, D1, and KV resources.

## Contract and implementation

- Contract version: `rent_entry_v2`
- QA gate: `RENT_SPLIT_PAYMENT_V2_ENABLED=true`; Production configuration was not changed.
- One Rent parent Entry owns Due, Paid, Outstanding, Rent Income, canonical identity, History identity, and aggregate transaction identity.
- A mixed Rent stores normalized Cash and Bank payment legs inside the canonical parent Entry.
- Persistence remains one parent Entry, one canonical anchor, one aggregate transaction, and two payment legs; no schema change was needed.
- Finance channel totals derive from payment legs, while Total Received and Rent Income count the parent paid amount once.
- Existing single-method Rent records normalize to one virtual payment leg without rewriting old data.
- The other six Employee event contracts and TTLock call paths are unchanged.

## Automated verification

- Focused split-payment suite: 32/32 passed.
- Comprehensive targeted suite: 240/240 passed.
- Golden Session: passed; 16 scenarios, retry new writes `0`, TTLock external calls `0`.
- QA acceptance platform: passed; formal writes `0`.
- Full matrix: 62 scenarios, including 44 Employee legal records, 18 Negative scenarios, and 18 Recovery scenarios.
- Worker and public-script syntax: passed.
- Secret scan: passed.
- `git diff --check`: passed.
- Wrangler dry-run and reproducible artifact checks: passed.

## Locked QA artifact

- Artifact SHA-256: `abde1abbdf4ab704eb74ccc2f71e3ffdbfa0e653fcf1c355c0b481b43f0c4ca1`
- Bundled Worker SHA-256: `66685c9498ec1ca3b834242379dc5b52705251d346ef5ba8ef810ddcfadab3ef`
- Employee asset SHA-256: `24ac0e6ad8701f1a030f362ac30d08a43262fe7da62b839f86182d24d6edd7c3`
- Owner asset SHA-256: `1590eb3d520aece8e74ec886b3285b3322b3610a5f3bac7b9cafe59d17e63f60`
- Artifact commit: `e9e72d8e553e194ea10f265cc1921bc1d77aab2a`
- QA artifact Worker version recorded by the Run: `214a9bfc-dada-4d65-a3e4-657e6a699605`
- QA authentication secrets were rotated after browser verification; this produced a control-plane-only QA Worker version without rebuilding or changing the locked artifact.

## Final Full QA Run

- QA Run: `QA-20260718-1BC6A134`
- Status: `AUTOMATION_PASS`
- Scenario count: `62`
- Employee record count: `44`
- Unique Entry ID count: `44`
- Validation: `44/44` passed, `0` failed
- Payload hash: `199ad3287d7f6730cda054618c109da01d770291639d54c670d4b7dc6e425dcd`
- Formal write count: `0`
- Run sessions: `0`
- Run transactions: `0`
- TTLock external calls: `0`
- Upload remains locked pending manual Employee acceptance.

The first two QA attempts encountered only stale, previously voided QA fixture shells in the independent QA database. Their evidence was retained. Formal QA cleanup was run, then exactly the already-voided QA session shells were removed from QA so the final Run could validate against a clean QA business namespace. No Production data was accessed for cleanup.

## Mixed Rent acceptance facts

- Mixed Rent Employee record number: `17`
- Due: AED `730`
- Cash: AED `700`
- Bank: AED `30`
- Paid: AED `730`
- Outstanding: AED `0`
- Arrears opened: AED `0`
- Employee card count: `1`
- Session Entry count: `1`
- Canonical anchor count after eventual upload: `1`
- Aggregate transaction count after eventual upload: `1`
- Payment leg count after eventual upload: `2`
- History business-row count after eventual upload: `1`
- Detail business-row count after eventual upload: `1`
- Retry new anchors/transactions/payment legs: `0/0/0`

The live QA Employee Preview showed the mixed parent as `paid 730 cash 700 + bank 30`. The complete Full oracle is Cash `5870`, Bank `2710`, Total Received `8580`, Expenses `1798`, Net Funds `6782`, Cash Net `4871`, Bank Net `1911`, Outstanding/Arrears Opened `370`, Arrears Repaid `160`, Deposit `700`, Transfer Fee `200`, and Rent Income `7520`.

## Human gate

- Task status: `PARTIAL_AWAITING_MANUAL_EMPLOYEE_ACCEPTANCE`
- QA Run status: `AUTOMATION_PASS`
- Manual Employee status: `PENDING`
- Upload was not clicked.
- Owner review and reconciliation were not started.
- Acceptance credentials and one-time handoff codes are intentionally excluded from this evidence and from Git.
- Legacy classification for Production ticket `APT-20260715-8P5KK7` is deferred to task 107.
