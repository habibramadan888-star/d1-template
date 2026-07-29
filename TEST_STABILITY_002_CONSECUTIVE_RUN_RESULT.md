# TEST-STABILITY-002 Consecutive Run Result

Generated: 2026-05-25 21:27:38 +04:00

Scope: local employee-entry Worker stability verification only.

## Reproduction Script

| Run | Command                                       | Result | Port    | Notes                                                    |
| --: | --------------------------------------------- | ------ | ------- | -------------------------------------------------------- |
|   1 | `npm run reproduce:employee-entry-econnreset` | PASS   | dynamic | Completed 3 local Worker scenarios without `ECONNRESET`. |
|   2 | `npm run reproduce:employee-entry-econnreset` | PASS   | dynamic | Completed 3 local Worker scenarios without `ECONNRESET`. |
|   3 | `npm run reproduce:employee-entry-econnreset` | PASS   | dynamic | Completed 3 local Worker scenarios without `ECONNRESET`. |

## Targeted Employee-Entry Tests

| Run | Command                                                | Result | Port    | Notes           |
| --: | ------------------------------------------------------ | ------ | ------- | --------------- |
|   1 | `npm run test:employee-entry-production-lock`          | PASS   | dynamic | 3 tests passed. |
|   1 | `npm run test:employee-entry-route-switch`             | PASS   | dynamic | 6 tests passed. |
|   1 | `npm run test:employee-entry-adapter-staging-endpoint` | PASS   | dynamic | 3 tests passed. |
|   2 | `npm run test:employee-entry-production-lock`          | PASS   | dynamic | 3 tests passed. |
|   2 | `npm run test:employee-entry-route-switch`             | PASS   | dynamic | 6 tests passed. |
|   2 | `npm run test:employee-entry-adapter-staging-endpoint` | PASS   | dynamic | 3 tests passed. |
|   3 | `npm run test:employee-entry-production-lock`          | PASS   | dynamic | 3 tests passed. |
|   3 | `npm run test:employee-entry-route-switch`             | PASS   | dynamic | 6 tests passed. |
|   3 | `npm run test:employee-entry-adapter-staging-endpoint` | PASS   | dynamic | 3 tests passed. |

Conclusion: the previous `read ECONNRESET` failure did not recur across reproduction and targeted test loops.
