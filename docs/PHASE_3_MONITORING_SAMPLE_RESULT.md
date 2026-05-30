# Phase 3 Monitoring Sample Result

Generated: 2026-05-30T08:28:06.049Z

Decision: MANUAL_REQUIRED

Production status: `PRODUCTION_NO_GO`.

## Scope

This script samples a production-copy URL only when `PHASE3_MONITOR_NETWORK_APPROVED=YES` and `PHASE3_PRODUCTION_COPY_BASE_URL` are set.

## Results

| Check | Path | Result          | Status | Latency | Error                              |
| ----- | ---- | --------------- | -----: | ------: | ---------------------------------- |
| n/a   | n/a  | MANUAL_REQUIRED |    n/a |     n/a | Network sampling was not approved. |

## Warnings

- Set PHASE3_PRODUCTION_COPY_BASE_URL and PHASE3_MONITOR_NETWORK_APPROVED=YES to sample production-copy.

## Failures

- None

## Thresholds

| Threshold               | Value |
| ----------------------- | ----: |
| Health latency warning  | 200ms |
| Health latency rollback | 300ms |
| Error rate warning      | 0.001 |
| Error rate rollback     |  0.01 |
