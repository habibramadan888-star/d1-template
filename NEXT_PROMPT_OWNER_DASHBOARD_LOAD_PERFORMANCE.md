# NEXT PROMPT: Owner Dashboard Load Performance

Goal: profile and optimize owner dashboard read-only initial loading without
changing dashboard formulas or financial calculations.

Restrictions:

1. Do not execute production migration.
2. Do not write production D1.
3. Do not execute D1 export/import/execute.
4. Do not modify dashboard calculation formulas.
5. Do not modify financial formulas.
6. Do not submit employee entry, handover, void/delete, or settings changes.
7. Keep commercial launch status `PRODUCTION_NO_GO`.

Tasks:

1. Measure owner shell first paint, `/api/me`, `/api/customers`, `/api/arrears`,
   and room config load timing.
2. Identify slow read-only endpoints.
3. Propose staged loading/skeleton improvements.
4. Add tests that protect formula behavior.
5. Run format/check/security/gate tests.
