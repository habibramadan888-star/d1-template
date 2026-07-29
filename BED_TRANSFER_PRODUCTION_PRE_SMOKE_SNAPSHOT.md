# Bed Transfer Production Pre-Smoke Snapshot

Date: 2026-06-01 Asia/Dubai

Approved smoke route: `from_bed=144`, `to_bed=122`

## Source Bed Snapshot

| Field | Value |
|---|---|
| from_bed | 144 |
| source arrear task | `task-mpgzu9kp-f150e26f` |
| corpid | `homelink` |
| userid | `abdul` |
| tenant/card anchor | `139780080` |
| tenant display | `144 D200 0101` |
| arrear amount | 50 AED |
| actual received | 0 AED |
| close_status | `VOID` |
| directive_status | `followed_up` |
| original period start | `2026-06-01` |
| original period end | `2026-07-01` |
| active transaction count for bed 144 | 1 |
| active transaction amount for bed 144 | 770 AED |

## Target Bed Snapshot

| Field | Value |
|---|---|
| to_bed | 122 |
| active transaction count | 2 |
| active transaction amount total | 620 AED |
| active tenant/card anchor | none in active rows |
| target bed rent config | 770 AED |

## Rent / Deposit / Arrears Anchors

| Anchor | Value |
|---|---|
| current bed rent config 144 | 770 AED |
| target bed rent config 122 | 770 AED |
| deposit ledger rows for 144/122 | none found |
| original deposit amount carried | 0 AED |
| arrears carried from approved task | 50 AED |

## Existing Smoke Rows Before Write

| Row Type | Count |
|---|---:|
| `bed_transfer_events` with qa tag | 0 |
| audit row for smoke | 0 |
| trace row for smoke | 0 |
| bed transfer transaction rows | 0 |

## Safety Decision

The target bed has active financial rows, but no active tenant/card identity in those rows. The smoke was therefore executed as an event-ledger `pending_review` record only. No occupancy, deposit, arrears, TTLock, transaction, revenue, checkout, or new-tenant row was mutated.
