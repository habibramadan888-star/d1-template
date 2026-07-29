# Homelink End-to-End QA Acceptance Workflow

The QA platform is available only on the dedicated QA Worker and company `HL-QA`. Production routes fail closed.

## Modes

- **Quick** reuses the 16-scenario task-073 golden engine. Its automated ceiling is `AUTOMATION_PASS`.
- **Full** contains at least 35 legal upload scenarios plus separate validate-only rejection/idempotency boundaries derived from the seven formal event contracts.
- **Recovery** covers aggregate 503/malformed responses, non-string errors, interrupted validation, one failure among 16, 8+8 resume, re-login, duplicate upload, response loss, local state divergence, real 401, and transient non-auth failures.

## Operator flow

1. Build once with `npm run qa:acceptance:build`; preserve the resulting `.qa-artifacts/<sha>` directory.
2. Bootstrap only the dedicated QA D1/KV with `npm run qa:acceptance:bootstrap -- --artifact-dir=<absolute artifact directory>`.
3. Deploy the archived Worker bundle with `--no-bundle` and the archived asset directory. Do not rebuild.
4. Configure QA-only secrets with `npm run qa:acceptance:set-secrets`. Values remain outside Git and evidence.
5. Run `npm run qa:acceptance:run` to create the first Quick run and execute formal aggregate validate-only. It writes no business record.
6. Open the reported Employee URL. The formal Employee page loads the QA drafts into Current Session but never uploads automatically.
7. The user reviews cards and Preview & Copy, then manually selects **Accept Employee Review** in `/qa/acceptance`.
8. The user performs the formal Employee **Upload Session**. The same UI calls aggregate validation, canonical write, and session finalization.
9. The user reviews the official Owner History, Detail, Finance, Arrears, and Today Todo pages, then manually selects **Accept Owner Review**.
10. Run reconciliation. Only exact expected/actual agreement can produce `FINAL_ACCEPTED`.

Neither Codex nor automation may press either manual acceptance button. Task 074 intentionally pauses at the first run's `AUTOMATION_PASS` state.

## Promotion

QA and future Production promotion use the archived bundle and assets with `--no-bundle`. Before any separately authorized Production upload, recompute the candidate manifest SHA and require an exact match with the QA-accepted SHA. Task 074 does not execute Production upload, deployment, migration, or traffic change.

## Evidence and cleanup

Evidence is archived under `docs/evidence/qa-runs/<QA_RUN_ID>/`. It never contains credentials, cookies, tokens, hashes, or Production personal/business data.

Cleanup is explicit and run-scoped. The server revalidates QA environment, hostname, company, D1 identity, KV identity, manager role, and the exact `QA_RUN_ID`. It preserves the run manifest while removing or voiding only that run's QA business projections.
