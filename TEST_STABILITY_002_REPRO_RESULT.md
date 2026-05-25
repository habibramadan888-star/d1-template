# TEST-STABILITY-002 Repro Result

Generated: 2026-05-25T17:18:23.940Z

Scope: local Worker ECONNRESET reproduction only. No deploy, no migration, no staging D1 write, and no feature flag change was executed.

| Run | Command                                                                             | Result | Port | Notes                                           |
| --: | ----------------------------------------------------------------------------------- | ------ | ---: | ----------------------------------------------- |
|   1 | npm run reproduce:employee-entry-econnreset (missing APP_ENV flag true legacy lock) | PASS   | 1472 | status=200; body.success=true; elapsed_ms=20419 |
|   2 | npm run reproduce:employee-entry-econnreset (production flag true legacy lock)      | PASS   | 1563 | status=200; body.success=true; elapsed_ms=17935 |
|   3 | npm run reproduce:employee-entry-econnreset (test flag true adapter prevalidation)  | PASS   | 1648 | status=200; body.success=true; elapsed_ms=18306 |

Conclusion: ECONNRESET reproduction loop completed without socket reset.
