# Arrears Directive Production Smoke Task Input Template

Date: 2026-05-31

## Purpose

This template must be filled manually by Ramadan/operator before any production-linked write smoke. Do not auto-select production tasks.

## Production Smoke Task IDs

### existing_arrears_record task

- task_id:
- room_bed:
- customer_code:
- amount:
- reason selected:

### ttlock_expired_unpaid task

Only fill this if ttlock production smoke is explicitly approved and schema supports persisted ttlock task rows.

- task_id:
- room_bed:
- customer_code:
- amount:
- source_ref:
- reason selected:

## Rollback Snapshot

- snapshot method:
- snapshot storage location:
- operator:
- approval timestamp:

## Write Gate

- enable operator:
- disable operator:
- expected open duration:

## Idempotency Keys

- owner directive idempotency key:
- employee follow-up idempotency key:

## QA Tag

- QA tag:

## Safety Confirmation

- Production D1 write already executed by this template: `No`
- Production migration already executed by this template: `No`
- Production write gate already enabled by this template: `No`
- Production cutover status: `PRODUCTION_NO_GO`
