# Handover Staging Manual Commands

Generated: 2026-05-24T11:28:11.803Z

Scope: P0-002D local/staging manual validation helper. It executed safe local scenarios and generated copyable PowerShell examples with redacted cookies. No production Worker, remote D1, production migration, live employee flow switch, live dashboard change, or legacy financial table write was performed.

## Automated Local Results

| Test ID     | Purpose                  | Expected                     | Actual                       | Result | Notes                                                              |
| ----------- | ------------------------ | ---------------------------- | ---------------------------- | ------ | ------------------------------------------------------------------ |
| MAN-HSC-001 | production disabled      | 404                          | 404 NOT_FOUND                | PASS   | Production must hide the staging endpoint.                         |
| MAN-HSC-002 | feature flag off         | 403 FEATURE_DISABLED         | 403 FEATURE_DISABLED         | PASS   | Non-production route must still require the explicit feature flag. |
| MAN-HSC-003 | employee valid submit    | 201                          | 201 ACCEPTED                 | PASS   | Writes staging tables only.                                        |
| MAN-HSC-004 | idempotent replay        | 200                          | 200 IDEMPOTENT_REPLAY        | PASS   | Weak-network retry should replay without duplicate rows.           |
| MAN-HSC-005 | frontend totals mismatch | 422 FRONTEND_TOTALS_MISMATCH | 422 FRONTEND_TOTALS_MISMATCH | PASS   | Staging policy must reject mismatched frontend totals.             |
| MAN-HSC-006 | voided row reject        | 422 VOIDED_REJECTED          | 422 VOIDED_REJECTED          | PASS   | Voided rows cannot be recommitted as active handover rows.         |
| MAN-HSC-007 | owner submit reject      | 403                          | 403 FORBIDDEN                | PASS   | Owner/manager/admin roles must not submit employee handover.       |

## Cookie Handling

The script logs in with local dev credentials from `deploy-worker/.dev.vars` but does not print actual cookies or secrets. Replace `<EMPLOYEE_COOKIE>` with a manually obtained local employee session cookie when using the commands below.

## Copyable PowerShell Commands

### Valid employee submit

```powershell
$body = @'
{
  "session_id": "manual-hsc-session-001",
  "idempotency_key": "manual-hsc-key-001",
  "employee_id": "abdul",
  "property_id": "HL-MANUAL",
  "submitted_at": "2026-05-24T00:00:00.000Z",
  "rows": [
    {
      "client_entry_id": "manual-rent-001",
      "event_type": "R",
      "payment_method": "C",
      "amount": "100.00",
      "bed": "144",
      "tenant": "144 D200 0101"
    },
    {
      "client_entry_id": "manual-bank-001",
      "event_type": "D",
      "payment_method": "B",
      "amount": "200.00",
      "bed": "144",
      "tenant": "144 D200 0101"
    }
  ],
  "frontend_totals": {
    "cash_handover": "100.00",
    "bank_transfer_total": "200.00",
    "bank_transfer_count": 1,
    "gross_received": "300.00",
    "session_total": "300.00"
  }
}
'@
Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:8903/api/staging/handover/commit" -Headers @{ Cookie = "<EMPLOYEE_COOKIE>" } -ContentType "application/json" -Body $body
```

### Replay same idempotency key

```powershell
$body = @'
{
  "session_id": "manual-hsc-session-001",
  "idempotency_key": "manual-hsc-key-001",
  "employee_id": "abdul",
  "property_id": "HL-MANUAL",
  "submitted_at": "2026-05-24T00:00:00.000Z",
  "rows": [
    {
      "client_entry_id": "manual-rent-001",
      "event_type": "R",
      "payment_method": "C",
      "amount": "100.00",
      "bed": "144",
      "tenant": "144 D200 0101"
    },
    {
      "client_entry_id": "manual-bank-001",
      "event_type": "D",
      "payment_method": "B",
      "amount": "200.00",
      "bed": "144",
      "tenant": "144 D200 0101"
    }
  ],
  "frontend_totals": {
    "cash_handover": "100.00",
    "bank_transfer_total": "200.00",
    "bank_transfer_count": 1,
    "gross_received": "300.00",
    "session_total": "300.00"
  }
}
'@
Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:8903/api/staging/handover/commit" -Headers @{ Cookie = "<EMPLOYEE_COOKIE>" } -ContentType "application/json" -Body $body
```

### Frontend totals tampered

```powershell
$body = @'
{
  "session_id": "manual-hsc-session-tampered",
  "idempotency_key": "manual-hsc-key-tampered",
  "employee_id": "abdul",
  "property_id": "HL-MANUAL",
  "submitted_at": "2026-05-24T00:00:00.000Z",
  "rows": [
    {
      "client_entry_id": "manual-rent-001",
      "event_type": "R",
      "payment_method": "C",
      "amount": "100.00",
      "bed": "144",
      "tenant": "144 D200 0101"
    },
    {
      "client_entry_id": "manual-bank-001",
      "event_type": "D",
      "payment_method": "B",
      "amount": "200.00",
      "bed": "144",
      "tenant": "144 D200 0101"
    }
  ],
  "frontend_totals": {
    "cash_handover": "101.00",
    "bank_transfer_total": "200.00",
    "bank_transfer_count": 1,
    "gross_received": "301.00",
    "session_total": "301.00"
  }
}
'@
Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:8903/api/staging/handover/commit" -Headers @{ Cookie = "<EMPLOYEE_COOKIE>" } -ContentType "application/json" -Body $body
```

### Voided row rejection

```powershell
$body = @'
{
  "session_id": "manual-hsc-session-voided",
  "idempotency_key": "manual-hsc-key-voided",
  "employee_id": "abdul",
  "property_id": "HL-MANUAL",
  "submitted_at": "2026-05-24T00:00:00.000Z",
  "rows": [
    {
      "client_entry_id": "manual-rent-001",
      "event_type": "R",
      "payment_method": "C",
      "amount": "100.00",
      "bed": "144",
      "tenant": "144 D200 0101",
      "status": "VOIDED"
    }
  ],
  "frontend_totals": {
    "cash_handover": "100.00",
    "bank_transfer_total": "0.00",
    "bank_transfer_count": 0,
    "gross_received": "100.00",
    "session_total": "100.00"
  }
}
'@
Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:8903/api/staging/handover/commit" -Headers @{ Cookie = "<EMPLOYEE_COOKIE>" } -ContentType "application/json" -Body $body
```

## Manual Follow-up

Run `npm run verify:dashboard-unchanged` and `npm run verify:handover-legacy-unchanged` after manual command testing to confirm live owner surfaces and legacy financial tables remain unchanged.
