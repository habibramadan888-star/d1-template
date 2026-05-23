# Manual Test Plan

Date: 2026-05-23  
Purpose: commercial pre-launch validation checklist  
Production data: do not use

| ID    | Module             | Steps                                                   | Input Data                             | Expected Result                                 | Actual Result                | Pass | Risk |
| ----- | ------------------ | ------------------------------------------------------- | -------------------------------------- | ----------------------------------------------- | ---------------------------- | ---- | ---- |
| M-001 | Worker             | Start `wrangler dev --config wrangler.toml --port 8793` | none                                   | Worker ready on 8793                            | PASS in V2                   | Yes  | P1   |
| M-002 | Smoke              | Run `npm run smoke`                                     | local Worker running                   | employee 200, owner 200, `/api/me` 401          | PASS in V2                   | Yes  | P1   |
| M-003 | Employee auth      | Login employee locally                                  | local `.dev.vars` employee credentials | login succeeds, cookie set                      | BLOCKED missing secrets      | No   | P0   |
| M-004 | Owner auth         | Login owner locally                                     | local `.dev.vars` owner credentials    | login succeeds, manager role returned           | BLOCKED missing secrets      | No   | P0   |
| M-005 | Staff permission   | Employee calls `/api/history`                           | employee session                       | 403 forbidden                                   | Not run                      | No   | P0   |
| M-006 | Owner permission   | Owner calls `/api/history`                              | owner session                          | 200 list                                        | Not run                      | No   | P1   |
| M-007 | Rent short pay     | Submit 770 due, 80 paid                                 | bed with rent config                   | transaction + 690 arrear task                   | Not run                      | No   | P0   |
| M-008 | Arrear payment     | Pay 100 against arrear                                  | linked task                            | task actual_received increases                  | Not run                      | No   | P0   |
| M-009 | Deposit in         | Submit deposit collection                               | CID + amount                           | deposit ledger increases                        | Not run                      | No   | P0   |
| M-010 | Deposit refund     | Submit refund                                           | CID + amount                           | deposit ledger decreases, cannot exceed balance | Not run                      | No   | P0   |
| M-011 | Duplicate submit   | Submit same entry twice                                 | same entry id                          | idempotent duplicate response                   | Not run                      | No   | P1   |
| M-012 | Owner dashboard    | Load dashboard after seeded test data                   | local test dataset                     | backend and UI totals reconcile                 | Not run                      | No   | P0   |
| M-013 | Session delete     | Attempt delete on test data                             | local only                             | should become void, not hard delete             | Current code hard deletes    | No   | P0   |
| M-014 | Mobile employee    | Open employee page at mobile width                      | browser viewport                       | usable layout, no overlap                       | Not run                      | No   | P2   |
| M-015 | Mobile owner       | Open owner page at mobile width                         | browser viewport                       | dashboard usable                                | Not run                      | No   | P2   |
| M-016 | API failure state  | Stop Worker after page load                             | none                                   | UI shows clear error                            | Not run                      | No   | P1   |
| M-017 | Export             | Export handover after entries                           | local test entries                     | backend accepted text and local copy match      | Not run                      | No   | P0   |
| M-018 | TTLock failure     | Missing TTLock credentials                              | none                                   | controlled error, no crash                      | Not run                      | No   | P1   |
| M-019 | D1 clean bootstrap | New local D1 state                                      | migration only                         | all required tables created                     | Current bootstrap incomplete | No   | P0   |
| M-020 | Audit trail        | Update arrear task                                      | employee and owner                     | before/after event recorded                     | Not run                      | No   | P1   |
