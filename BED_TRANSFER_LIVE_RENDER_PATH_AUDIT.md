# Bed Transfer Live Render Path Audit

Date: 2026-06-01, Asia/Dubai

Scope: employee production UI render path for `Bed Transfer / 换床`.

## Findings

| Check | Finding |
|---|---|
| Actual event chip value before fix | `TF` |
| Canonical business event after fix | `bed_transfer` via `normalizedBusinessEvent()` |
| Step 2 active renderer before fix | Generic target grid with single `bed` input remained in Step 2 |
| Bed Transfer fields before fix | Present in asset but rendered later, outside Step 2 |
| Step 3 active renderer before fix | Final `renderContext()` override rendered generic Bed Check context |
| Live asset missing fix? | No; fields existed, but active renderer path was wrong |
| Multiple renderers? | Yes; later `renderContext()` override was the live active renderer |
| CSS hidden/layout blocker? | Partial; `transferFields` was toggled but not mounted into Step 2 |

## Root Cause Classification

| Category | Result |
|---|---|
| EVENT_TYPE_VALUE_MISMATCH | Partial. Legacy `TF` was used; aliases now normalize. |
| GENERIC_BED_RENDERER_STILL_ACTIVE | Yes. Generic Bed field stayed active in Step 2. |
| BED_TRANSFER_RENDERER_NOT_CALLED | Yes for Step 3; generic context renderer was called. |
| LIVE_ASSET_MISSING_FIX | No. The fields existed but were in the wrong active path. |
| MULTIPLE_RENDERERS_WRONG_ONE_FIXED | Yes. The final `renderContext()` override needed the TF branch. |
| CSS_HIDDEN_OR_LAYOUT_BLOCKED | Partial. Dedicated fields were not placed in Step 2. |
| UNKNOWN | No. |

## Required Fix Applied

- Added `bedTransferStep2Mount`.
- Moved `transferFields` into Step 2 through `ensureBedTransferStep2Mount()`.
- Hid the generic single Bed input for `TF`.
- Added event normalization for `TF`, `bed_transfer`, `bed-transfer`, `transfer_bed`, and Chinese labels.
- Added a dedicated `renderBedTransferSystemContext()` branch for Step 3.

No production write, migration, D1 execute, write gate, financial formula change, or dashboard calculation change occurred.

Production cutover remains `PRODUCTION_NO_GO`.
