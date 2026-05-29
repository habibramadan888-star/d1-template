# Performance Validation Plan

Date: 2026-05-29

Purpose: define baseline, load, stress, and regression validation before release approval.

## 1. Baseline Targets

Primary targets:

- `GET /api/history?limit=20&offset=0`: p95 below 500 ms.
- `GET /api/arrears`: p95 below 300 ms.
- `GET /api/dashboard/totals`: p95 below 200 ms.
- Handover commit: p95 below 2 seconds.

Allowed regression:

- No endpoint may exceed baseline plus 20 percent.
- No endpoint may exceed 5 seconds.

## 2. Test Profiles

### Smoke Performance

Purpose: quick validation after each staging deploy.

Load:

- 1 user.
- 10 requests per key endpoint.

Pass:

- No errors.
- Latency roughly matches baseline.

### Representative Load

Purpose: validate normal usage.

Load:

- 25 concurrent users.
- 5 minutes.
- Mixed employee and owner flows.

Pass:

- Error rate below 0.1 percent.
- p95 within baseline plus 20 percent.

### Stress Load

Purpose: identify breaking point.

Load:

- 100 concurrent users.
- 5 minutes.
- Includes history, dashboard, arrears, and handover rehearsal.

Pass:

- System remains responsive.
- No data corruption.
- No partial handover.

## 3. Data Volumes

Minimum data volumes:

- 1000 entries.
- 500 customers.
- 100 open receivables.
- 50 handover candidate rows.
- 3 tenants.
- 6 properties.

## 4. Measurements

Capture:

- p50 latency.
- p95 latency.
- p99 latency.
- Error rate.
- D1 query time.
- Worker CPU time where available.
- Response size.
- Memory trend where available.

## 5. Performance Go/No-Go

Go criteria:

- All primary targets pass.
- No sustained latency regression over 20 percent.
- No N+1 query evidence.
- Pagination works for history.

No-go criteria:

- Any critical endpoint exceeds 5 seconds.
- Error rate reaches 0.1 percent or higher.
- Load test causes partial writes or inconsistent data.
- Query plan shows missing required index for production-scale paths.
