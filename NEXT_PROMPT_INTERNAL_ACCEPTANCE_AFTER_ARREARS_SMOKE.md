# NEXT PROMPT: Internal Acceptance After Arrears Directive Smoke

Enter `TASK INTERNAL-ACCEPTANCE-AFTER-ARREARS-DIRECTIVE-SMOKE-001`.

Current state:

- `existing_arrears_record` production-linked minimum smoke passed.
- Smoke retry commit: `a2bef0d`.
- Write gate is closed.
- Production cutover remains `PRODUCTION_NO_GO`.
- TTLock production smoke was not executed.
- Batch production write was not executed.

Do not execute production writes in this internal acceptance task.

## Acceptance Focus

1. Boss arrears module UI.
2. Employee arrears task display.
3. Employee date / note submission experience in non-production or approved dry-run mode.
4. Boss feedback readability.
5. WhatsApp export.
6. readonly_admin read-only behavior.
7. No batch production write.
8. No TTLock production smoke unless Ramadan separately approves it.

## Strict Boundaries

- Do not enable production write gate.
- Do not run production TTLock smoke.
- Do not run batch production dispatch.
- Do not execute production cutover.
- Do not modify financial formula.
- Do not modify dashboard calculation.
- Do not print password/token/cookie/Set-Cookie.
- Keep commercial launch as `PRODUCTION_NO_GO`.

## Recommended Output

- Internal acceptance checklist results.
- Screenshots or user-observed mobile feedback.
- Any UI regression blockers.
- Explicit statement that no production business write was executed.
