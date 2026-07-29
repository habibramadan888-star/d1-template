# Tenant Scope Staging Backfill Dry-Run Plan

Date: 2026-05-26, Asia/Dubai

This plan defines a no-write staging dry-run for future tenant-scope backfill.
It reads staging table schema/count evidence, classifies rows by scope readiness,
and stops before any write command.

## Target

| Item          | Expected                               | Result                                             |
| ------------- | -------------------------------------- | -------------------------------------------------- |
| D1 name       | `homelink-finance-staging`             | Must match before any SELECT.                      |
| D1 id         | `4ff78bfc-3855-436b-aefb-6b492145d79c` | Must match before any SELECT.                      |
| Production D1 | excluded                               | No production command is allowed.                  |
| Command type  | SELECT only                            | No INSERT, UPDATE, DELETE, CREATE, ALTER, or DROP. |

## Classification Rules

| Table Shape                                                | Dry-Run Classification | Draft Update Plan                               | Notes                                      |
| ---------------------------------------------------------- | ---------------------- | ----------------------------------------------- | ------------------------------------------ |
| Has `company_id` and `property_id`, no missing scoped rows | PASS                   | `NO_UPDATE_REQUIRED`                            | Candidate already scoped for this dry-run. |
| Has `company_id` / `property_id`, but missing values       | MANUAL_REQUIRED        | `MANUAL_REVIEW_REQUIRED_BEFORE_BACKFILL`        | Needs mapping review before any write.     |
| Has legacy `corpid` only                                   | LEGACY_WARNING         | `DRAFT_BACKFILL_REQUIRED_AFTER_SCHEMA_APPROVAL` | Needs approved schema/backfill task.       |
| Has rows but no explicit scope signal                      | MANUAL_REQUIRED        | `MANUAL_REVIEW_REQUIRED_BEFORE_BACKFILL`        | Cannot infer tenant scope safely.          |

## Command Draft

SAFE_TO_RUN_NOW: yes, read-only only

NEEDS_HUMAN_APPROVAL_FOR_WRITE: yes

WRITES_SCHEMA: no

WRITES_DATA: no

PRODUCTION_FORBIDDEN: yes

```powershell
npm run dry-run:tenant-scope-staging-backfill
```

## Current Dry-Run Summary

| Metric                           | Result |
| -------------------------------- | -----: |
| Tables reviewed                  |     13 |
| Blocked tables                   |      0 |
| Manual-required tables           |      0 |
| Legacy-warning tables            |      9 |
| Draft write-plan classifications |      9 |

## NO-GO Conditions For Any Future Write

- Target D1 name or id cannot be confirmed.
- Any row lacks a human-reviewed `company_id` / `property_id` mapping.
- Any write plan would infer tenant/property from free text.
- Backup is missing.
- Rollback is not accepted.
- Production URL, Worker, or D1 is involved.
- Legacy `CORPID` fallback would be removed before compatibility is reviewed.
