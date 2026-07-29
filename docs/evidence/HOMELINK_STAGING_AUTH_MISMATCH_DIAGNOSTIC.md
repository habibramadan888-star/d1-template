# Homelink Staging Authentication Mismatch Diagnostic

## Result

- Authorization task: `HOMELINK_STAGING_AUTH_MISMATCH_DIAGNOSTIC_019`
- Repository: `C:/Users/Chinalink/Desktop/软件迭代-worktrees/bed-transfer-canonical-write-closure`
- Branch: `fix/bed-transfer-canonical-write-closure`
- HEAD before: `7f5172e2bc5e8e3f9099fb71038f43e2fef9e401`
- Required staging Worker: `homelink-finance-staging`
- Required/current staging version: fingerprint `cac27a81f324`
- Task status: `COMPLETED`
- Authentication diagnosis: `STAGING_ACCOUNT_NOT_FOUND`

The authorized account-scoped read-only staging query completed with project-locked Wrangler `4.94.0`. It found no case-insensitive match for the supplied employee identifier. This is a staging-only account finding and makes no claim about any production account or password.

## Safety boundary

This run did not:

- request, read, compare, display, or store a password/PIN
- read or output a password hash, salt, secret value, Cookie, or token
- read a production account or production D1/KV
- call a production business endpoint
- change an account, credential, session, secret, Worker, route, or environment variable
- deploy, roll back, or migrate
- write any staging authentication or business row

The employee account identifier entered by the user is not present in this evidence.

## Baseline

| Check | Result |
| --- | --- |
| Repository root | PASS |
| Branch | PASS |
| HEAD | PASS |
| Initial worktree | clean |
| Staging Worker | `homelink-finance-staging` |
| Staging version | fingerprint `cac27a81f324` |
| Project Wrangler | locked `4.94.0` |

## Employee login contract

| Item | Current committed contract |
| --- | --- |
| Route | `POST /auth/employee-login` |
| Identifier field | `employee_id` |
| PIN field | `pin` |
| Portal payload | `{employee_id, pin}` |
| Account table | `employee_users` |
| Active predicate | exact `status='ACTIVE'` |
| Employee roles | `staff` or `employee` |
| Corporate scope | successful session uses staging `CORPID` |

### Identifier normalization

- removes ASCII control characters covered by `cleanText`
- trims leading/trailing whitespace
- limits the identifier to 80 Unicode code points
- converts the supplied identifier to lowercase
- queries `lower(employee_id)`
- does not perform Unicode normalization such as NFC/NFKC
- SQLite `lower()` is not a full Unicode case-folding contract

Therefore ASCII identifiers are case-insensitive after trimming. Visually equivalent Unicode identifiers are not guaranteed to match.

## Credential and lock contract

| Item | Contract |
| --- | --- |
| Hash algorithm | PBKDF2 with SHA-256 |
| Iterations | 100,000 |
| Default derived key size | 256 bits |
| Accepted stored encodings | base64, or hexadecimal 256/512-bit variants selected by stored length |
| Salt/pepper binding | `PW_SALT`, with runtime fallback to `JWT_SECRET` |
| Per-account locked field | none in the committed/current schema contract |
| Login rate limiting | IP-scoped KV counter; 8 attempts per 10 minutes |

The absence of a per-account lock field means `ACCOUNT_LOCKED` can only be reported as `unknown`; this run did not read KV values.

## Error classification contract

| Condition | Formal response |
| --- | --- |
| Invalid JSON | HTTP 400, generic invalid JSON error |
| Missing employee identifier or PIN | HTTP 400, `employee_id_pin_required` |
| Account missing, inactive, or PIN mismatch | HTTP 401, generic `invalid_employee_pin` |
| IP rate limit reached | HTTP 429, `too_many_attempts` |

The endpoint deliberately does not reveal whether the account was missing, inactive, or had a mismatched PIN.

## Current staging binding-name check

Secret values were not read.

| Binding | Status |
| --- | --- |
| `APP_ENV` | configured as staging |
| `DB` | configured |
| `RATE_LIMIT` | configured |
| `PW_SALT` | configured |
| `JWT_SECRET` | configured |
| `USER_ACCOUNTS` | configured |
| `MANAGER_PW_HASH` | configured |
| `STAFF_PW_HASH` | configured |

Employee authentication requires `DB`, `RATE_LIMIT`, a usable `PW_SALT`/fallback, and `JWT_SECRET` for session signing. The binding names required by the current contract are present. This confirms name presence only, not secret-value correctness.

## Account-scoped diagnostic execution

The diagnostic was executed from the repository package root with `npx --no-install wrangler` version `4.94.0`, `deploy-worker/wrangler.toml`, environment `staging`, and binding `DB` in remote read-only mode.

The SQL predicate was limited to the normalized supplied identifier. It returned only aggregate booleans/counts and performed credential-format checks inside D1; it did not return the identifier or any hash value. Cloudflare execution metadata reported `changes=0`, `changed_db=false`, and `rows_written=0` for the result-bearing query.

| Sanitized account fact | Result |
| --- | --- |
| `ACCOUNT_EXISTS` | no |
| `MATCHING_ACCOUNT_COUNT` | 0 |
| `ACCOUNT_ACTIVE` | not applicable |
| `ACCOUNT_LOCKED` | `field_not_present` |
| `ACCOUNT_ROLE_VALID` | not applicable |
| `CORPID_PRESENT` | not applicable |
| `CREDENTIAL_FORMAT_VALID` | not applicable |
| `PASSWORD_HASH_PRESENT` | not applicable |
| `HASH_ALGORITHM_COMPATIBLE` | not applicable |
| `DUPLICATE_ACCOUNT` | no |

No account row or password hash was returned. The account-scoped aggregate result proves that the independently isolated staging employee table has no matching account under the formal case-insensitive login predicate.

## Allowed diagnosis

Final classification: `STAGING_ACCOUNT_NOT_FOUND`.

The formal login endpoint intentionally maps a missing account to the generic `invalid_employee_pin` response. The direct authorized staging-only aggregate distinguishes that generic response without reading a credential. This diagnosis does not state that a production account is absent or that a production password is wrong.

## Next minimal fix

No automatic fix is authorized. Any creation of a dedicated staging employee account is a separate account-provisioning decision and requires explicit authorization; production credentials must not be copied into staging.

## Final safety state

- production account checked: no
- password read or exposed: no
- account data changed: no
- session data changed: no
- staging business data changed: no
- production business endpoint called: no
- production business data changed: no
- deployment: no
- migration applied: no
- production cutover: `PRODUCTION_NO_GO`

## Unresolved blockers

1. Authenticated staging validation cannot proceed with the supplied identifier because no matching staging employee account exists.
2. Creating or changing a staging account is outside this diagnostic authorization.
