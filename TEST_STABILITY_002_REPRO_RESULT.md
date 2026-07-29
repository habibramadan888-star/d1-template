# TEST-STABILITY-002 Repro Result

Generated: 2026-05-25T18:47:14.202Z

Scope: local Worker ECONNRESET reproduction only. No deploy, no migration, no staging D1 write, and no feature flag change was executed.

| Run | Command                                                                             | Result | Port | Notes                                           |
| --: | ----------------------------------------------------------------------------------- | ------ | ---: | ----------------------------------------------- |
|   1 | npm run reproduce:employee-entry-econnreset (missing APP_ENV flag true legacy lock) | PASS   | 9763 | status=200; body.success=true; elapsed_ms=24964 |
|   2 | npm run reproduce:employee-entry-econnreset (production flag true legacy lock)      | PASS   | 9845 | status=200; body.success=true; elapsed_ms=36897 |
|   3 | npm run reproduce:employee-entry-econnreset (test flag true adapter prevalidation)  | PASS   | 9963 | status=200; body.success=true; elapsed_ms=25876 |

Conclusion: ECONNRESET reproduction loop completed without socket reset.
