# Performance Baseline Report

Generated: 2026-05-29
Scope: static baseline plan and source audit. No live load test, no D1 write, no deploy.

## Current Evidence

| Area | Evidence | Status |
|---|---|---|
| History API | Worker `/api/history` parses `limit` and `offset` and appends `LIMIT ? OFFSET ?`. | Pagination supported. |
| History UI | Tests assert skeleton and limited first load. | Frontend source coverage exists. |
| Indexes | Local schema contains indexes on sessions, transactions, arrears, arrear_tasks, entry_events, deposit_ledger. | Index plan exists locally/runtime. |
| Production-scale benchmark | No live production-copy benchmark executed in this task. | Pending. |

## Baseline Targets

| Scenario | Target | Current Result |
|---|---:|---|
| `/api/history?limit=20&offset=0` first page | under 500 ms on production-copy data | Not measured live |
| History skeleton visible | under 300 ms | Source/test covered |
| Arrears modal open | under 500 ms on mobile | Not measured live |
| Dashboard totals | under 300 ms on production-copy data | Not measured live |
| WhatsApp arrears export generation | under 300 ms for current list | Not measured live |

## Required Read-Only Tests

1. Cold cache owner history open on mobile viewport.
2. Warm cache owner history pagination.
3. Arrears modal with at least 15 rows.
4. Dashboard totals against production-copy volume.
5. Network throttle for 4G/3G profile.

## Decision

| Item | Result |
|---|---|
| Pagination source support | Yes |
| Production-scale timing proven | No |
| Real-device baseline complete | No |
| Production cutover | PRODUCTION_NO_GO |
