# NEXT PROMPT: Owner Dashboard Load Performance Review

Use only after the UI unification commit is reviewed.

## Goal

Profile and improve owner dashboard perceived load time without changing dashboard calculations, financial formulas, D1 data, business rules, or production status.

## Strict Prohibitions

1. Do not execute production migration.
2. Do not write production D1.
3. Do not execute D1 export/import/execute.
4. Do not modify dashboard calculation formulas.
5. Do not modify financial formulas.
6. Do not submit employee entry.
7. Do not submit handover.
8. Do not execute void/delete_session.
9. Do not change settings.
10. Do not mark commercial launch GO.

## Required Work

1. Measure owner dashboard auth check timing.
2. Measure first shell paint timing.
3. Identify slow API/data loading after auth.
4. Add progressive loading states where safe.
5. Keep `/api/me` as authority.
6. Keep production cutover `PRODUCTION_NO_GO`.
7. Add tests proving calculations are unchanged.
