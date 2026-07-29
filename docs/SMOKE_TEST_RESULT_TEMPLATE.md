# Smoke Test Result Template

Date: \***\*\_\_\_\*\***

Executor: \***\*\_\_\_\*\***

Environment: [ ] Production-readonly [ ] Staging

Start time: \***\*\_\_\_\*\***

End time: \***\*\_\_\_\*\***

Total duration: **\_** minutes

## Result Summary

| Test # | Category    | Test name                              | Status            | Latency   | Notes |
| -----: | ----------- | -------------------------------------- | ----------------- | --------- | ----- |
|      1 | Auth        | Employee login                         | [ ] PASS [ ] FAIL | \_\_\_ ms |       |
|      2 | Auth        | Owner login                            | [ ] PASS [ ] FAIL | \_\_\_ ms |       |
|      3 | Auth        | Readonly admin login                   | [ ] PASS [ ] FAIL | \_\_\_ ms |       |
|      4 | Auth        | Auth route closure                     | [ ] PASS [ ] FAIL | \_\_\_ ms |       |
|      5 | Employee    | Property list                          | [ ] PASS [ ] FAIL | \_\_\_ ms |       |
|      6 | Employee    | Entries list                           | [ ] PASS [ ] FAIL | \_\_\_ ms |       |
|      7 | Employee    | History                                | [ ] PASS [ ] FAIL | \_\_\_ ms |       |
|      8 | Employee    | Customers                              | [ ] PASS [ ] FAIL | \_\_\_ ms |       |
|      9 | Employee    | Dashboard overview                     | [ ] PASS [ ] FAIL | \_\_\_ ms |       |
|     10 | Employee    | Dashboard totals                       | [ ] PASS [ ] FAIL | \_\_\_ ms |       |
|     11 | Employee    | Arrears modal                          | [ ] PASS [ ] FAIL | \_\_\_ ms |       |
|     12 | Employee    | Search/filter                          | [ ] PASS [ ] FAIL | \_\_\_ ms |       |
|     13 | Owner       | Owner dashboard                        | [ ] PASS [ ] FAIL | \_\_\_ ms |       |
|     14 | Owner       | All properties view                    | [ ] PASS [ ] FAIL | \_\_\_ ms |       |
|     15 | Owner       | Owner totals                           | [ ] PASS [ ] FAIL | \_\_\_ ms |       |
|     16 | Owner       | Owner history                          | [ ] PASS [ ] FAIL | \_\_\_ ms |       |
|     17 | Owner       | Owner arrears                          | [ ] PASS [ ] FAIL | \_\_\_ ms |       |
|     18 | Owner       | Reports                                | [ ] PASS [ ] FAIL | \_\_\_ ms |       |
|     19 | Admin       | Admin dashboard                        | [ ] PASS [ ] FAIL | \_\_\_ ms |       |
|     20 | Admin       | Admin entries without edit             | [ ] PASS [ ] FAIL | \_\_\_ ms |       |
|     21 | Admin       | Admin totals                           | [ ] PASS [ ] FAIL | \_\_\_ ms |       |
|     22 | Admin       | Admin history                          | [ ] PASS [ ] FAIL | \_\_\_ ms |       |
|     23 | Admin       | Admin audit trail                      | [ ] PASS [ ] FAIL | \_\_\_ ms |       |
|     24 | Admin       | Admin permissions return 403 on writes | [ ] PASS [ ] FAIL | \_\_\_ ms |       |
|     25 | Isolation   | Employee cross-property denial         | [ ] PASS [ ] FAIL | \_\_\_ ms |       |
|     26 | Isolation   | Owner cross-tenant denial              | [ ] PASS [ ] FAIL | \_\_\_ ms |       |
|     27 | Isolation   | Readonly admin scope                   | [ ] PASS [ ] FAIL | \_\_\_ ms |       |
|     28 | Performance | System uptime                          | [ ] PASS [ ] FAIL | \_\_\_ ms |       |
|     29 | Performance | Error rate                             | [ ] PASS [ ] FAIL | \_\_\_ %  |       |
|     30 | Performance | Database connectivity                  | [ ] PASS [ ] FAIL | \_\_\_ ms |       |

## Summary Statistics

```text
Total tests: 30
PASS: ___
FAIL: ___
Pass rate: ___%
Average latency: ___ ms
```

## Failure Details

| Test # | Name | Error | Evidence | Root cause | Action |
| -----: | ---- | ----- | -------- | ---------- | ------ |
|        |      |       |          |            |        |

## Go/No-Go Decision

```text
[ ] GO: smoke test passed and Phase 1 can begin
[ ] NO-GO: investigate failures and retest
```

## Sign-Off

QA Lead: **\*\***\_**\*\*** Date: **\_\_\_**

PM Review: **\*\***\_**\*\*** Date: **\_\_\_**
