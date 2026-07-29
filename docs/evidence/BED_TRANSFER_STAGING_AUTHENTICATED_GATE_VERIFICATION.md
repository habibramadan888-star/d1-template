# Bed Transfer Staging Authenticated Gate Verification

## Result

- Authorization task: `HOMELINK_STAGING_TEMP_AUTH_AND_GATE_VERIFICATION_016`
- Source HEAD: `69476993dbe2583c1e395960f3abc3fcc3a8d741`
- Repository: `C:/Users/Chinalink/Desktop/软件迭代-worktrees/bed-transfer-canonical-write-closure`
- Branch: `fix/bed-transfer-canonical-write-closure`
- Baseline worktree: clean
- Wrangler: project-locked `4.94.0`
- Required staging Worker: `homelink-finance-staging`
- Task status: `BLOCKED`
- Blocker: `SUPPORTED_STAGING_AUTH_BOOTSTRAP_NOT_AVAILABLE`
- Verification level: `BLOCKED`

The committed repository contains staging account setup scripts, but they do not implement the temporary, run-scoped, reversible employee-and-owner lifecycle required by this authorization. No temporary account, credential, session, secret, deployment, or business record was created or changed.

## Authorization boundary observed

This run performed only:

- local read-only source and contract inspection
- minimal staging D1 schema reads
- aggregate QA-account/session count reads

It did not:

- read any username, phone, email, password hash, session token, cookie, secret value, resident, finance, bed, or business row
- generate or persist temporary credentials
- run `secret bulk`, `secret put`, or `secret delete`
- insert, update, revoke, or delete any staging D1 row
- call a staging or production business endpoint
- deploy or roll back a Worker
- access production D1/KV or a production Worker endpoint
- run a migration or change runtime/config

## Baseline

| Check | Result |
| --- | --- |
| Repository root | PASS |
| Branch | PASS |
| HEAD `69476993dbe2583c1e395960f3abc3fcc3a8d741` | PASS |
| Worktree clean | PASS |
| Wrangler `4.94.0` | PASS |
| Staging target `homelink-finance-staging` | PASS |

## Current authentication contract

### Employee

| Item | Current contract |
| --- | --- |
| Login route | `POST /auth/employee-login` |
| Credential fields | `employee_id`, `pin` (runtime also accepts legacy aliases) |
| Credential source | staging D1 table `employee_users` |
| Password verification | PBKDF2, SHA-256, 100,000 iterations, 256 bits; salt from `PW_SALT` with runtime fallback |
| Role source | `employee_users.role`, default `staff` |
| Corporate scope | runtime `CORPID`; current staging config is `homelink-staging` |
| Active status | `status='ACTIVE'` |

### Owner

| Item | Current contract |
| --- | --- |
| Login route | `POST /auth/login` |
| Credential field | `password` |
| Credential source | `USER_ACCOUNTS` secret; fallback shared manager/staff password hashes |
| Password verification | PBKDF2, SHA-256, 100,000 iterations |
| Owner-capable role | `manager`; read-only admin roles may read but cannot perform owner writes |
| Corporate scope | runtime `CORPID`; current staging config is `homelink-staging` |

There is no D1-backed owner account table or committed temporary owner-account create/delete route.

### Session lifecycle

| Item | Current contract |
| --- | --- |
| Session table | `active_sessions` |
| Session creation | server-generated opaque `sid`, inserted only after formal login |
| Client session | signed HS256 JWT in `__session` cookie |
| Cookie attributes | `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/` |
| Auth check | JWT signature/expiry/role/corpid plus active, non-revoked session row |
| Logout routes | `POST /auth/logout` and `POST /api/logout` |
| Logout behavior | revoke the current `sid` and clear the cookie |

## Supported-bootstrap audit

| Mechanism | Current behavior | Compatibility with this task |
| --- | --- | --- |
| Password generation script | generates fixed account identities plus new JWT/password/encryption material in an ignored local file | FAIL: identities are not run-scoped; shared staging secrets would be replaced |
| Staging secret setup script | performs `secret bulk`, including `JWT_SECRET`, `PW_SALT`, shared hashes and `USER_ACCOUNTS` | FAIL: no snapshot/restore or targeted temporary-owner removal mechanism |
| Staging account setup script | inserts one fixed employee identity if absent; owner remains configured through `USER_ACCOUNTS` | FAIL: not a run-scoped employee/owner bootstrap and does not create a D1 owner account |
| Admin create-user route | none found | FAIL |
| Temporary QA cleanup script | none found | FAIL |
| Bootstrap lifecycle test | no create-login-logout-delete-zero-delta test found | FAIL |

The existing setup scripts also write standalone result files in the repository root. They were not executed.

## Staging D1 schema-only inspection

Only `sqlite_master`, `PRAGMA table_info`, `PRAGMA index_list`, and aggregate counts constrained to committed QA naming patterns were queried.

| Check | Result |
| --- | --- |
| `employee_users` present | yes |
| `active_sessions` present | yes |
| Employee primary-key index present | yes |
| Active-session user index present | yes |
| Employee required columns present | yes |
| Active-session required columns present | yes |
| Role enum/check constraint | no |
| Schema compatible with current fixed employee setup script | yes |
| Schema compatible with authorized reversible employee-and-owner lifecycle | no |
| Matching committed QA employee account count | `1` |
| Matching committed QA session count | `31` |
| Cleanup supported by a committed, target-scoped mechanism | no |

Counts do not establish whether sessions are current, revoked, or expired. No session row was read.

## Blocking facts

1. The authorized task requires a random run ID and two distinct temporary identities. The committed generator uses fixed identities.
2. One matching fixed QA employee identity already exists. Reusing or deleting it would not be a safely attributable temporary lifecycle for this run.
3. Matching QA session count is non-zero. The repository has no supported command that distinguishes and cleans only sessions created by this run.
4. Owner authentication is secret-backed. The current script replaces shared staging authentication and encryption secrets instead of adding one isolated temporary owner.
5. No committed mechanism snapshots and restores the exact prior secret-backed owner configuration.
6. No committed cleanup command removes the temporary employee, temporary owner, only their sessions, cookie jar, and credentials, then proves both auth deltas are zero.
7. Direct session construction exists only in unrelated QA harnesses and is explicitly forbidden by this task.

Therefore account creation, login, redeployment, authenticated gate testing, and cleanup were not started.

## Required human steps before retry

1. Approve and commit a staging-only bootstrap contract that accepts a unique run ID and creates distinct synthetic employee and owner identities without replacing shared JWT, salt, encryption, or unrelated account secrets.
2. Provide a committed owner bootstrap path with minimal owner permissions and a targeted removal path; it must not require copying production credentials or editing authentication runtime during the verification run.
3. Provide a committed cleanup command that revokes/deletes only run-owned sessions, removes only run-owned accounts and temporary credentials, deletes the cookie jar, and verifies account/session counts return to their exact pre-run values.
4. Add tests proving create, formal employee login, formal owner login, logout/revoke, targeted deletion, idempotent cleanup, and zero auth/business deltas.
5. Separately review the pre-existing fixed QA account and matching session population. This task did not authorize deleting or modifying them.
6. Re-authorize task 016 against the commit containing that reviewed bootstrap and cleanup mechanism.

## Final safety state

- temporary employee created: no
- temporary owner created: no
- login verified: no
- credential exposed: no
- staging deployment: no
- rollback executed: no; no deployment occurred
- staging business-data delta: `0`
- staging auth-data delta: `0`
- production business endpoint called: no
- production business data changed: no
- staging Bed Transfer write enabled: no
- staging Owner acknowledgment write enabled: no
- production Bed Transfer write enabled: no
- production Owner acknowledgment write enabled: no
- migration applied to staging: no
- migration applied to production: no
- production cutover: `PRODUCTION_NO_GO`
- Bed Transfer status: `NOT_VERIFIED / REQUIREMENTS_REVIEW`
