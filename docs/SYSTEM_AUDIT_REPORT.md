# System Comprehensive Audit Report

Generated: 2026-05-29T10:53:52.900Z
Repository: C:\Users\Chinalink\Desktop\软件迭代
Branch: fix/auth-closure-001
Scope: read-only source/config/test audit. No deploy, no D1 write, no migration, no business-write test.
Password/token/cookie values were not read from secret files and are not printed.


## Executive Summary

- Package: homelink-finance@0.1.0.
- Current branch: fix/auth-closure-001.
- Working tree before report generation: dirty (expected report creation only).
- Frontend architecture: Static HTML/JS assets under deploy-worker/public.
- Backend/runtime: Cloudflare Worker with Wrangler.
- Worker entrypoint: `deploy-worker/src/index.js`.
- Static assets: `deploy-worker/public`.
- API inventory route rows: 46.
- Test files under tests/: 98.
- readonly admin references: 57.
- local/session role cache references: 2.
- Worker pagination evidence matches: 3.
- CREATE INDEX references: 91.
- Production cutover remains controlled by `npm run gate:commercial-launch` and must stay `PRODUCTION_NO_GO`.


## 1. Project Structure And Tech Stack


### 1.1 Root Directory Structure

Command: `powershell -NoProfile -Command "Get-ChildItem -Force | Where-Object { $_.Name -ne 'node_modules' } | Select-Object Mode,Length,LastWriteTime,Name | Format-Table -AutoSize | Out-String"`


```text

Mode   Length LastWriteTime      Name                                                                                  
----   ------ -------------      ----                                                                                  
d--h--        2026/5/29 14:53:50 .git                                                                                  
d-----        2026/5/23 19:41:22 .github                                                                               
d-----        2026/5/29 13:23:51 .tmp                                                                                  
d-----        2026/5/23 3:21:12  .wrangler                                                                             
d-----        2026/5/25 12:09:13 .wrangler-dryrun                                                                      
d-----        2026/5/27 10:24:35 backups                                                                               
d-----        2026/5/24 20:07:54 deploy-worker                                                                         
d-----        2026/5/29 14:51:44 docs                                                                                  
d-----        2026/5/26 12:02:55 migration-drafts                                                                      
d-----        2026/5/24 1:20:27  migrations                                                                            
d-----        2026/5/26 17:26:52 modules                                                                               
d-----        2026/5/23 13:11:09 reconciliation-output                                                                 
d-----        2026/5/23 13:00:35 reconciliation-templates                                                              
d-----        2026/5/26 19:42:57 scripts                                                                               
d-----        2026/5/29 14:38:27 tests                                                                                 
d-----        2026/5/23 3:18:48  tools                                                                                 
-a---- 1395   2026/5/23 23:18:19 .env.example                                                                          
-a---- 1079   2026/5/23 23:07:16 .env.local.example                                                                    
-a---- 940    2026/5/25 14:02:39 .gitignore                                                                            
-a---- 108    2026/5/23 3:18:48  .prettierignore                                                                       
-a---- 118    2026/5/23 3:18:48  .prettierrc                                                                           
-a---- 5383   2026/5/23 3:10:05  AI_CONTRACT.md                                                                        
-a---- 39624  2026/5/29 14:08:37 API_INVENTORY.md                                                                      
-a---- 767    2026/5/25 9:44:30  API_PERMISSION_AUDIT_RESULT.md                                                        
-a---- 20498  2026/5/25 9:44:30  API_PERMISSION_MATRIX.md                                                              
-a---- 6955   2026/5/23 3:11:32  ARCHITECTURE.md                                                                       
-a---- 879    2026/5/29 10:06:01 ARREARS_DETAIL_MODAL_COMPACT_MOBILE_RESULT.md                                         
-a---- 1188   2026/5/29 14:39:39 ARREARS_EXPORT_FORMAT_FIX_RESULT.md                                                   
-a---- 839    2026/5/29 14:39:13 ARREARS_EXPORT_FORMAT_REDESIGN.md                                                     
-a---- 6119   2026/5/26 19:20:25 AUDIT_ENTRY_EVENTS_SCOPE_MATRIX.md                                                    
-a---- 10765  2026/5/25 9:44:31  AUDIT_LOG_COVERAGE_MATRIX.md                                                          
-a---- 632    2026/5/25 9:44:31  AUDIT_LOG_COVERAGE_RESULT.md                                                          
-a---- 2091   2026/5/29 1:21:58  AUTH_LOGOUT_LOCK_ICON_FIX_RESULT.md                                                   
-a---- 1727   2026/5/29 2:48:03  AUTH_LOGOUT_TO_UNIFIED_LOGIN_FIX_RESULT.md                                            
-a---- 6369   2026/5/29 13:01:05 AUTH_ROUTING_ARCHITECTURE_AUDIT.md                                                    
-a---- 7145   2026/5/29 1:21:58  AUTH_ROUTING_LEGACY_LOGIN_AUDIT.md                                                    
-a---- 1950   2026/5/29 1:21:58  AUTH_ROUTING_SINGLE_LOGIN_ENTRY_FIX.md                                                
-a---- 5452   2026/5/29 2:13:23  AUTH_ROUTING_STABILIZATION_DEPLOY_RESULT.md                                           
-a---- 5537   2026/5/29 2:13:23  AUTH_ROUTING_STABILIZATION_LIVE_SMOKE_RESULT.md                                       
-a---- 1711   2026/5/29 3:04:09  AUTH_SINGLE_ENTRY_ROUTING_FINAL_FIX.md                                                
-a---- 3492   2026/5/23 11:51:42 AUTH_TENANCY_AUDIT.md                                                                 
-a---- 4241   2026/5/29 3:04:09  AUTH_UI_LEGACY_LOGIN_VISIBLE_ENTRY_AUDIT.md                                           
-a---- 2234   2026/5/29 3:10:49  AUTH_UI_STABILIZATION_LIVE_DEPLOY_RESULT.md                                           
-a---- 2794   2026/5/29 3:10:50  AUTH_UI_STABILIZATION_LIVE_SMOKE_RESULT.md                                            
-a---- 5417   2026/5/24 3:44:56  BACKEND_TOTALS_AUTHORITY_AUDIT.md                                                     
-a---- 4727   2026/5/24 11:41:31 BACKEND_TOTALS_AUTHORITY_GATE.md                                                      
-a---- 2505   2026/5/25 20:21:44 BACKEND_TOTALS_AUTHORITY_REHEARSAL_RESULT.md                                          
-a---- 4753   2026/5/24 11:41:31 BACKEND_TOTALS_EDGE_CASE_REPORT.md                                                    
-a---- 3247   2026/5/25 3:51:36  BACKEND_TOTALS_LIVE_AUTHORITY_GATE_RESULT.md                                          
-a---- 78964  2026/5/24 11:39:16 BACKEND_TOTALS_SHADOW_RESULT.md                                                       
-a---- 7222   2026/5/24 11:41:31 BACKEND_TOTALS_SOURCE_OF_TRUTH.md                                                     
-a---- 2446   2026/5/25 18:32:29 BACKEND_TOTALS_STAGING_FEATURE_FLAG_AND_ROLLBACK_PLAN.md                              
-a---- 4956   2026/5/25 20:21:45 BACKEND_TOTALS_STAGING_SWITCH_REHEARSAL_RESULT.md                                     
-a---- 3722   2026/5/27 21:51:01 BATCH_1_DOCUMENT_SIGNOFF_CLOSURE_REVIEW.md                                            
-a---- 19806  2026/5/27 13:57:54 BLOCKER_REPORT.md                                                                     
-a---- 9134   2026/5/29 13:00:05 BUG_REPORT_TEMPLATE.md                                                                
-a---- 713725 2026/5/22 0:43:23  cf-assets-manifest.json                                                               
-a---- 3037   2026/5/24 1:31:27  CLEAN_D1_BOOTSTRAP_RESULT.md                                                          
-a---- 2195   2026/5/25 11:22:57 CLOUDFLARE_D1_DISCOVERY.md                                                            
-a---- 2656   2026/5/25 11:22:57 CLOUDFLARE_KV_DISCOVERY.md                                                            
-a---- 4894   2026/5/25 11:22:57 CLOUDFLARE_WORKER_DISCOVERY.md                                                        
-a---- 89144  2026/5/27 22:12:26 COMMERCIALIZATION_BACKLOG.md                                                          
-a---- 9605   2026/5/23 21:28:02 COMMERCIAL_ENTRY_WRITE_CONTRACT.md                                                    
-a---- 3287   2026/5/27 21:05:53 COMMERCIAL_LAUNCH_APPROVAL_DEPENDENCY_GRAPH.md                                        
-a---- 3204   2026/5/26 23:42:25 COMMERCIAL_LAUNCH_APPROVAL_MATRIX.md                                                  
-a---- 2938   2026/5/27 16:02:32 COMMERCIAL_LAUNCH_APPROVAL_RESPONSIBILITY_MATRIX.md                                   
-a---- 16222  2026/5/27 21:51:01 COMMERCIAL_LAUNCH_HUMAN_SIGNOFF_TRACKER.md                                            
-a---- 2992   2026/5/27 15:42:38 COMMERCIAL_LAUNCH_MANUAL_SIGNOFF_INSTRUCTIONS.md                                      
-a---- 13645  2026/5/27 21:51:43 COMMERCIAL_LAUNCH_MISSING_SIGNOFF_LIST.md                                             
-a---- 5061   2026/5/26 23:42:25 COMMERCIAL_LAUNCH_P0_STATUS_SUMMARY.md                                                
-a---- 2966   2026/5/26 23:42:25 COMMERCIAL_LAUNCH_PRODUCTION_NO_GO_REASONS.md                                         
-a---- 5582   2026/5/29 14:45:04 COMMERCIAL_LAUNCH_READINESS_MATRIX.md                                                 
-a---- 636    2026/5/29 14:45:04 COMMERCIAL_LAUNCH_READINESS_RESULT.md                                                 
-a---- 8317   2026/5/27 19:29:00 COMMERCIAL_LAUNCH_REMAINING_SIGNOFF_CLASSIFICATION.md                                 
-a---- 3360   2026/5/26 23:58:04 COMMERCIAL_LAUNCH_REVIEW_002_STARTING_CONTEXT.md                                      
-a---- 2720   2026/5/27 1:03:10  COMMERCIAL_LAUNCH_REVIEW_004_STARTING_CONTEXT.md                                      
-a---- 4043   2026/5/27 2:11:21  COMMERCIAL_LAUNCH_REVIEW_006_STARTING_CONTEXT.md                                      
-a---- 2315   2026/5/27 13:15:12 COMMERCIAL_LAUNCH_REVIEW_009_APPROVAL_BLOCKER.md                                      
-a---- 4818   2026/5/27 14:35:21 COMMERCIAL_LAUNCH_REVIEW_010_FINAL_PRODUCTION_APPROVAL_PACKET.md                      
-a---- 2510   2026/5/27 14:35:21 COMMERCIAL_LAUNCH_REVIEW_010_REMAINING_NO_GO_BLOCKERS.md                              
-a---- 3732   2026/5/27 15:29:35 COMMERCIAL_LAUNCH_REVIEW_011_STARTING_CONTEXT.md                                      
-a---- 4226   2026/5/27 16:27:20 COMMERCIAL_LAUNCH_REVIEW_012_STARTING_CONTEXT.md                                      
-a---- 3452   2026/5/27 16:47:06 COMMERCIAL_LAUNCH_REVIEW_013_STARTING_CONTEXT.md                                      
-a---- 3839   2026/5/27 17:46:37 COMMERCIAL_LAUNCH_REVIEW_014_STARTING_CONTEXT.md                                      
-a---- 7164   2026/5/27 18:14:20 COMMERCIAL_LAUNCH_REVIEW_015_STARTING_CONTEXT.md                                      
-a---- 4314   2026/5/27 19:29:00 COMMERCIAL_LAUNCH_REVIEW_016_SIGNOFF_UPDATE_RESULT.md                                 
-a---- 3691   2026/5/27 19:29:00 COMMERCIAL_LAUNCH_REVIEW_016_STARTING_CONTEXT.md                                      
-a---- 3141   2026/5/27 20:08:03 COMMERCIAL_LAUNCH_REVIEW_018_SIGNOFF_UPDATE_RESULT.md                                 
-a---- 6518   2026/5/27 20:08:02 COMMERCIAL_LAUNCH_REVIEW_018_STARTING_CONTEXT.md                                      
-a---- 3015   2026/5/27 20:36:32 COMMERCIAL_LAUNCH_REVIEW_019_SIGNOFF_UPDATE_RESULT.md                                 
-a---- 4501   2026/5/27 20:36:32 COMMERCIAL_LAUNCH_REVIEW_019_STARTING_CONTEXT.md                                      
-a---- 6120   2026/5/27 21:05:53 COMMERCIAL_LAUNCH_REVIEW_020_STARTING_CONTEXT.md                                      
-a---- 1660   2026/5/27 21:51:01 COMMERCIAL_LAUNCH_REVIEW_021A_REMAINING_BLOCKERS.md                                   
-a---- 2920   2026/5/27 21:51:01 COMMERCIAL_LAUNCH_REVIEW_021A_SIGNOFF_UPDATE_RESULT.md                                
-a---- 4397   2026/5/27 21:51:01 COMMERCIAL_LAUNCH_REVIEW_021A_STARTING_CONTEXT.md                                     
-a---- 5235   2026/5/27 21:26:25 COMMERCIAL_LAUNCH_REVIEW_021_STARTING_CONTEXT.md                                      
-a---- 7089   2026/5/27 16:27:20 COMMERCIAL_LAUNCH_SIGNOFF_EVIDENCE_REVIEW.md                                          
-a---- 968    2026/5/27 16:27:20 COMMERCIAL_LAUNCH_SIGNOFF_STATUS_UPDATE_RESULT.md                                     
-a---- 2795   2026/5/27 16:02:32 COMMERCIAL_LAUNCH_SINGLE_OWNER_SIGNOFF_MODEL.md                                       
-a---- 8110   2026/5/24 1:31:27  D1_BOOTSTRAP_AUDIT.md                                                                 
-a---- 3422   2026/5/24 1:31:27  D1_CLEAN_BOOTSTRAP_FIX_REPORT.md                                                      
-a---- 3901   2026/5/24 2:16:11  D1_CLEAN_BOOTSTRAP_STABILITY_RESULT.md                                                
-a---- 3211   2026/5/24 1:31:27  D1_MIGRATION_ORDER.md                                                                 
-a---- 4867   2026/5/24 1:31:27  D1_MINIMUM_SCHEMA_PLAN.md                                                             
-a---- 4922   2026/5/24 2:16:11  D1_WINDOWS_LOCK_DIAGNOSIS.md                                                          
-a---- 6319   2026/5/23 18:53:10 DATABASE_AUDIT.md                                                                     
-a---- 17810  2026/5/29 14:09:25 DATABASE_STATIC_SCAN.md                                                               
-a---- 14752  2026/5/25 9:44:31  DB_TABLE_COMMERCIAL_READINESS_MATRIX.md                                               
-a---- 848    2026/5/25 9:44:31  DB_TABLE_READINESS_AUDIT_RESULT.md                                                    
-a---- 6321   2026/5/23 23:51:14 DELETE_SESSION_AUDIT.md                                                               
-a---- 3831   2026/5/23 23:51:15 DELETE_SESSION_MIGRATION_PLAN.md                                                      
-a---- 3465   2026/5/23 23:51:14 DELETE_SESSION_VOID_DESIGN.md                                                         
-a---- 2892   2026/5/24 0:28:24  DELETE_SQL_SCAN.md                                                                    
-a---- 3079   2026/5/24 20:21:26 DEPLOY_ARTIFACT_GO_NO_GO_GATE.md                                                      
-a---- 2242   2026/5/22 0:20:45  DEPLOY_EMPLOYEE.md                                                                    
-a---- 4473   2026/5/24 18:10:05 DEPLOY_ENTRYPOINT_REVIEW.md                                                           
-a---- 3599   2026/5/23 3:20:36  DIRECTORY_GOVERNANCE.md                                                               
... [truncated 713 more lines]
```


### 1.2 Source Directories

Command: `powershell -NoProfile -Command "Get-ChildItem -Directory -Recurse -Depth 2 -Force | Where-Object { $_.FullName -notmatch '\\node_modules|\\.git|\\.wrangler|\\backups' } | Select-Object -First 100 -ExpandProperty FullName"`


```text
C:\Users\Chinalink\Desktop\软件迭代\.tmp
C:\Users\Chinalink\Desktop\软件迭代\deploy-worker
C:\Users\Chinalink\Desktop\软件迭代\docs
C:\Users\Chinalink\Desktop\软件迭代\migration-drafts
C:\Users\Chinalink\Desktop\软件迭代\migrations
C:\Users\Chinalink\Desktop\软件迭代\modules
C:\Users\Chinalink\Desktop\软件迭代\reconciliation-output
C:\Users\Chinalink\Desktop\软件迭代\reconciliation-templates
C:\Users\Chinalink\Desktop\软件迭代\scripts
C:\Users\Chinalink\Desktop\软件迭代\tests
C:\Users\Chinalink\Desktop\软件迭代\tools
C:\Users\Chinalink\Desktop\软件迭代\.tmp\embedded-worker-backups
C:\Users\Chinalink\Desktop\软件迭代\.tmp\embedded-worker-configs
C:\Users\Chinalink\Desktop\软件迭代\.tmp\embedded-worker-dry-run
C:\Users\Chinalink\Desktop\软件迭代\.tmp\embedded-worker-env-overrides
C:\Users\Chinalink\Desktop\软件迭代\.tmp\gate-restore-session-handoff-baseline
C:\Users\Chinalink\Desktop\软件迭代\.tmp\gate-restore-session-handoff-final
C:\Users\Chinalink\Desktop\软件迭代\.tmp\gate-restore-unified-login
C:\Users\Chinalink\Desktop\软件迭代\.tmp\gate-restore-unified-login-final
C:\Users\Chinalink\Desktop\软件迭代\.tmp\pending-cleanup
C:\Users\Chinalink\Desktop\软件迭代\.tmp\qa-restore-session-handoff-baseline
C:\Users\Chinalink\Desktop\软件迭代\.tmp\qa-restore-session-handoff-final
C:\Users\Chinalink\Desktop\软件迭代\.tmp\qa-restore-unified-login
C:\Users\Chinalink\Desktop\软件迭代\.tmp\qa-restore-unified-login-final
C:\Users\Chinalink\Desktop\软件迭代\.tmp\qa-restore-unified-login-fix-003-final
C:\Users\Chinalink\Desktop\软件迭代\.tmp\readonly-admin
C:\Users\Chinalink\Desktop\软件迭代\.tmp\staging-secrets
C:\Users\Chinalink\Desktop\软件迭代\.tmp\system-audit
C:\Users\Chinalink\Desktop\软件迭代\.tmp\wrangler-session-handoff-dry-run
C:\Users\Chinalink\Desktop\软件迭代\.tmp\wrangler-unified-login-live-dry-run
C:\Users\Chinalink\Desktop\软件迭代\.tmp\wrangler-unified-login-live-dry-run-explicit-top-level
C:\Users\Chinalink\Desktop\软件迭代\deploy-worker\public
C:\Users\Chinalink\Desktop\软件迭代\deploy-worker\scripts
C:\Users\Chinalink\Desktop\软件迭代\deploy-worker\src
C:\Users\Chinalink\Desktop\软件迭代\migrations\local
C:\Users\Chinalink\Desktop\软件迭代\modules\auth
C:\Users\Chinalink\Desktop\软件迭代\modules\employees
C:\Users\Chinalink\Desktop\软件迭代\modules\finance
C:\Users\Chinalink\Desktop\软件迭代\modules\properties
C:\Users\Chinalink\Desktop\软件迭代\modules\tenant
C:\Users\Chinalink\Desktop\软件迭代\modules\worker
C:\Users\Chinalink\Desktop\软件迭代\tests\fixtures
C:\Users\Chinalink\Desktop\软件迭代\tests\helpers
C:\Users\Chinalink\Desktop\软件迭代\tests\fixtures\backend-totals
C:\Users\Chinalink\Desktop\软件迭代\tests\fixtures\handover-atomic
C:\Users\Chinalink\Desktop\软件迭代\tests\fixtures\receivables
C:\Users\Chinalink\Desktop\软件迭代\tests\fixtures\tenant-scope
```


### 1.3 Key Project Files

Command: `powershell -NoProfile -Command "Get-ChildItem -File -Recurse -Depth 2 -Include package.json,*.toml,*.mjs,*.js,*.html,*.sql | Where-Object { $_.FullName -notmatch '\\node_modules|\\.git|\\.wrangler|\\backups|\\.tmp' } | Select-Object -First 100 -ExpandProperty FullName"`


```text
C:\Users\Chinalink\Desktop\软件迭代\deploy-worker\public\employee-v2.html
C:\Users\Chinalink\Desktop\软件迭代\deploy-worker\public\employee-v3.html
C:\Users\Chinalink\Desktop\软件迭代\deploy-worker\public\employee.html
C:\Users\Chinalink\Desktop\软件迭代\deploy-worker\public\index-51-cp.js
C:\Users\Chinalink\Desktop\软件迭代\deploy-worker\public\index-51-main.js
C:\Users\Chinalink\Desktop\软件迭代\deploy-worker\public\index-51.html
C:\Users\Chinalink\Desktop\软件迭代\deploy-worker\public\index.html
C:\Users\Chinalink\Desktop\软件迭代\deploy-worker\public\portal.html
C:\Users\Chinalink\Desktop\软件迭代\deploy-worker\public\unified-login.html
C:\Users\Chinalink\Desktop\软件迭代\deploy-worker\scripts\build-embedded-worker.js
C:\Users\Chinalink\Desktop\软件迭代\deploy-worker\src\index.embedded.js
C:\Users\Chinalink\Desktop\软件迭代\deploy-worker\src\index.js
C:\Users\Chinalink\Desktop\软件迭代\deploy-worker\employee-patch-fragment.js
C:\Users\Chinalink\Desktop\软件迭代\deploy-worker\wrangler.embedded.toml
C:\Users\Chinalink\Desktop\软件迭代\deploy-worker\wrangler.toml
C:\Users\Chinalink\Desktop\软件迭代\migration-drafts\002_commercial_bootstrap.sql
C:\Users\Chinalink\Desktop\软件迭代\migration-drafts\003_delete_session_void_fields.sql
C:\Users\Chinalink\Desktop\软件迭代\migration-drafts\004_receivables_model_draft.sql
C:\Users\Chinalink\Desktop\软件迭代\migration-drafts\005_money_minor_units_dual_write_draft.sql
C:\Users\Chinalink\Desktop\软件迭代\migration-drafts\handover_atomic_commit_draft.sql
C:\Users\Chinalink\Desktop\软件迭代\migration-drafts\receivables_local_staging_rehearsal_draft.sql
C:\Users\Chinalink\Desktop\软件迭代\migration-drafts\tenant_scope_staging_compatibility_columns_draft.sql
C:\Users\Chinalink\Desktop\软件迭代\migrations\local\001_clean_legacy_bootstrap.sql
C:\Users\Chinalink\Desktop\软件迭代\migrations\local\002_handover_atomic_staging.sql
C:\Users\Chinalink\Desktop\软件迭代\migrations\001_employee_anchor_schema.sql
C:\Users\Chinalink\Desktop\软件迭代\modules\auth\tenant-claims.mjs
C:\Users\Chinalink\Desktop\软件迭代\modules\auth\unified-login-routing.mjs
C:\Users\Chinalink\Desktop\软件迭代\modules\employees\entry-draft.mjs
C:\Users\Chinalink\Desktop\软件迭代\modules\employees\handover-atomic-contract.mjs
C:\Users\Chinalink\Desktop\软件迭代\modules\employees\idempotency.mjs
C:\Users\Chinalink\Desktop\软件迭代\modules\employees\rent-write-plan.mjs
C:\Users\Chinalink\Desktop\软件迭代\modules\finance\backend-totals.mjs
C:\Users\Chinalink\Desktop\软件迭代\modules\finance\dubai-business-date.mjs
C:\Users\Chinalink\Desktop\软件迭代\modules\finance\handover-atomic.mjs
C:\Users\Chinalink\Desktop\软件迭代\modules\finance\handover.mjs
C:\Users\Chinalink\Desktop\软件迭代\modules\finance\money-dual-write.mjs
C:\Users\Chinalink\Desktop\软件迭代\modules\finance\money.mjs
C:\Users\Chinalink\Desktop\软件迭代\modules\finance\periods.mjs
C:\Users\Chinalink\Desktop\软件迭代\modules\finance\receivables.mjs
C:\Users\Chinalink\Desktop\软件迭代\modules\finance\shadow-totals.mjs
C:\Users\Chinalink\Desktop\软件迭代\modules\properties\ttlock-remark.mjs
C:\Users\Chinalink\Desktop\软件迭代\modules\tenant\scope.mjs
C:\Users\Chinalink\Desktop\软件迭代\modules\worker\d1-write-plan-executor.mjs
C:\Users\Chinalink\Desktop\软件迭代\modules\worker\employee-entry-commercial-adapter.mjs
C:\Users\Chinalink\Desktop\软件迭代\modules\worker\employee-entry-commercial-handler.mjs
C:\Users\Chinalink\Desktop\软件迭代\modules\worker\employee-entry-live-write-adapter.mjs
C:\Users\Chinalink\Desktop\软件迭代\scripts\audit-api-permissions.mjs
C:\Users\Chinalink\Desktop\软件迭代\scripts\audit-api.mjs
C:\Users\Chinalink\Desktop\软件迭代\scripts\audit-audit-log-coverage.mjs
C:\Users\Chinalink\Desktop\软件迭代\scripts\audit-backend-totals.mjs
C:\Users\Chinalink\Desktop\软件迭代\scripts\audit-db-table-readiness.mjs
C:\Users\Chinalink\Desktop\软件迭代\scripts\audit-db.mjs
C:\Users\Chinalink\Desktop\软件迭代\scripts\audit-environment-separation.mjs
C:\Users\Chinalink\Desktop\软件迭代\scripts\audit-legacy-backfill.mjs
C:\Users\Chinalink\Desktop\软件迭代\scripts\audit-money-fields.mjs
C:\Users\Chinalink\Desktop\软件迭代\scripts\audit-money-live-write-paths.mjs
C:\Users\Chinalink\Desktop\软件迭代\scripts\audit-observability-readiness.mjs
C:\Users\Chinalink\Desktop\软件迭代\scripts\audit-rollback-readiness.mjs
C:\Users\Chinalink\Desktop\软件迭代\scripts\audit-runtime-ddl.mjs
C:\Users\Chinalink\Desktop\软件迭代\scripts\audit-worker-entrypoint-drift.mjs
C:\Users\Chinalink\Desktop\软件迭代\scripts\check-secrets.mjs
C:\Users\Chinalink\Desktop\软件迭代\scripts\check-syntax.mjs
C:\Users\Chinalink\Desktop\软件迭代\scripts\compare-employee-entry-legacy-vs-adapter.mjs
C:\Users\Chinalink\Desktop\软件迭代\scripts\compare-staging-backend-totals.mjs
C:\Users\Chinalink\Desktop\软件迭代\scripts\compare-staging-receivables-shadow.mjs
C:\Users\Chinalink\Desktop\软件迭代\scripts\compare-staging-tenant-scope-shadow.mjs
C:\Users\Chinalink\Desktop\软件迭代\scripts\db-local-bootstrap-utils.mjs
C:\Users\Chinalink\Desktop\软件迭代\scripts\db-local-bootstrap.mjs
C:\Users\Chinalink\Desktop\软件迭代\scripts\db-local-migrate.mjs
C:\Users\Chinalink\Desktop\软件迭代\scripts\db-local-reset.mjs
C:\Users\Chinalink\Desktop\软件迭代\scripts\db-local-seed.mjs
C:\Users\Chinalink\Desktop\软件迭代\scripts\dev-worker.mjs
C:\Users\Chinalink\Desktop\软件迭代\scripts\dry-run-tenant-scope-staging-backfill.mjs
C:\Users\Chinalink\Desktop\软件迭代\scripts\gate-backend-totals-live-authority.mjs
C:\Users\Chinalink\Desktop\软件迭代\scripts\gate-commercial-launch-readiness.mjs
C:\Users\Chinalink\Desktop\软件迭代\scripts\gate-receivables-readiness.mjs
C:\Users\Chinalink\Desktop\软件迭代\scripts\gate-receivables-staging-authority-switch.mjs
C:\Users\Chinalink\Desktop\软件迭代\scripts\gate-runtime-ddl-removal.mjs
C:\Users\Chinalink\Desktop\软件迭代\scripts\gate-tenant-scope-backfill-reconciliation.mjs
C:\Users\Chinalink\Desktop\软件迭代\scripts\gate-tenant-scope-dashboard-history-query.mjs
C:\Users\Chinalink\Desktop\软件迭代\scripts\gate-tenant-scope-readiness.mjs
C:\Users\Chinalink\Desktop\软件迭代\scripts\gate-tenant-scope-staging-route-enforcement.mjs
C:\Users\Chinalink\Desktop\软件迭代\scripts\gate-tenant-scope-staging-wiring-readiness.mjs
C:\Users\Chinalink\Desktop\软件迭代\scripts\generate-dev-secrets.mjs
C:\Users\Chinalink\Desktop\软件迭代\scripts\generate-embedded-worker-dry-run.mjs
C:\Users\Chinalink\Desktop\软件迭代\scripts\generate-reconciliation-template.mjs
C:\Users\Chinalink\Desktop\软件迭代\scripts\generate-staging-test-passwords.mjs
C:\Users\Chinalink\Desktop\软件迭代\scripts\handover-staging-validation-utils.mjs
C:\Users\Chinalink\Desktop\软件迭代\scripts\local-worker-utils.mjs
C:\Users\Chinalink\Desktop\软件迭代\scripts\manual-handover-staging-validation.mjs
C:\Users\Chinalink\Desktop\软件迭代\scripts\money-shadow-reconcile.mjs
C:\Users\Chinalink\Desktop\软件迭代\scripts\probe-clean-worker-bootstrap.mjs
C:\Users\Chinalink\Desktop\软件迭代\scripts\qa-employee-entry-real-staging.mjs
C:\Users\Chinalink\Desktop\软件迭代\scripts\reconcile-legacy-dry-run.mjs
C:\Users\Chinalink\Desktop\软件迭代\scripts\reconcile-money-dual-write-gate.mjs
C:\Users\Chinalink\Desktop\软件迭代\scripts\rehearse-backend-totals-authority.mjs
C:\Users\Chinalink\Desktop\软件迭代\scripts\rehearse-backend-totals-staging-switch.mjs
C:\Users\Chinalink\Desktop\软件迭代\scripts\rehearse-employee-entry-adapter-staging-endpoint.mjs
C:\Users\Chinalink\Desktop\软件迭代\scripts\rehearse-employee-entry-live-write-adapter.mjs
C:\Users\Chinalink\Desktop\软件迭代\scripts\rehearse-employee-entry-rollback.mjs
```


### 1.4 package.json

File: `package.json`


```text
{
  "name": "homelink-finance",
  "version": "0.1.0",
  "private": true,
  "description": "Commercial governance and validation tooling for the Homelink finance system.",
  "scripts": {
    "build": "npm run build:worker:assets && npm run build:worker:embedded",
    "build:worker:assets": "cd deploy-worker && wrangler deploy --config wrangler.toml --dry-run --outdir ../.wrangler-dryrun/assets",
    "build:worker:embedded": "cd deploy-worker && wrangler deploy --config wrangler.embedded.toml --dry-run --outdir ../.wrangler-dryrun/embedded",
    "lint": "eslint deploy-worker/src/index.js deploy-worker/scripts/**/*.js index-51-main.js",
    "format:check": "prettier --check \"*.md\" \"tools/**/*.cjs\" \"scripts/**/*.mjs\" \"tests/**/*.mjs\" \"modules/**/*.mjs\"",
    "typecheck": "node scripts/check-syntax.mjs",
    "governance:check": "node tools/check-governance.cjs",
    "security:secrets": "node scripts/check-secrets.mjs",
    "audit:api": "node scripts/audit-api.mjs",
    "audit:api:check": "node scripts/audit-api.mjs --check",
    "audit:api-permissions": "node scripts/audit-api-permissions.mjs",
    "audit:db": "node scripts/audit-db.mjs",
    "audit:db:check": "node scripts/audit-db.mjs --check",
    "audit:db-readiness": "node scripts/audit-db-table-readiness.mjs",
    "audit:worker-drift": "node scripts/audit-worker-entrypoint-drift.mjs",
    "audit:observability": "node scripts/audit-observability-readiness.mjs",
    "audit:env-separation": "node scripts/audit-environment-separation.mjs",
    "audit:audit-logs": "node scripts/audit-audit-log-coverage.mjs",
    "audit:rollback-readiness": "node scripts/audit-rollback-readiness.mjs",
    "gate:commercial-launch": "node scripts/gate-commercial-launch-readiness.mjs",
    "verify:embedded-worker": "node scripts/verify-embedded-worker-freshness.mjs",
    "build:embedded:dry-run": "node scripts/generate-embedded-worker-dry-run.mjs",
    "build:embedded:write": "node scripts/write-embedded-worker-controlled.mjs",
    "smoke:embedded-with-worker": "node scripts/smoke-embedded-with-worker.mjs",
    "audit:money": "node scripts/audit-money-fields.mjs",
    "triage:money": "node scripts/triage-money-audit.mjs",
    "audit:money-live-writes": "node scripts/audit-money-live-write-paths.mjs",
    "gate:money-reconciliation": "node scripts/reconcile-money-dual-write-gate.mjs",
    "audit:backend-totals": "node scripts/audit-backend-totals.mjs",
    "gate:backend-totals-live": "node scripts/gate-backend-totals-live-authority.mjs",
    "compare:staging-backend-totals": "node scripts/compare-staging-backend-totals.mjs",
    "gate:receivables": "node scripts/gate-receivables-readiness.mjs",
    "gate:tenant-scope": "node scripts/gate-tenant-scope-readiness.mjs",
    "test:tenant-scope": "node --test tests/tenant-scope-local-staging.spec.mjs",
    "rehearse:tenant-scope": "node scripts/rehearse-tenant-scope-local-staging.mjs",
    "test:tenant-scope-staging-shadow": "node --test tests/tenant-scope-staging-shadow-gate.spec.mjs",
    "compare:staging-tenant-scope": "node scripts/compare-staging-tenant-scope-shadow.mjs",
    "test:tenant-scope-route-gate": "node --test tests/tenant-scope-staging-route-enforcement-gate.spec.mjs",
    "gate:tenant-scope-route-enforcement": "node scripts/gate-tenant-scope-staging-route-enforcement.mjs",
    "test:tenant-scope-query-gate": "node --test tests/tenant-scope-staging-dashboard-history-query-gate.spec.mjs",
    "gate:tenant-scope-dashboard-history-query": "node scripts/gate-tenant-scope-dashboard-history-query.mjs",
    "test:tenant-scope-wiring-gate": "node --test tests/tenant-scope-staging-wiring-gate.spec.mjs",
    "gate:tenant-scope-staging-wiring": "node scripts/gate-tenant-scope-staging-wiring-readiness.mjs",
    "test:tenant-scope-wiring-rehearsal": "node --test tests/tenant-scope-staging-wiring-rehearsal.spec.mjs",
    "rehearse:tenant-scope-staging-wiring": "node scripts/rehearse-tenant-scope-staging-wiring.mjs",
    "test:tenant-claims": "node --test tests/tenant-scope-auth-claims.spec.mjs",
    "rehearse:tenant-claims": "node scripts/rehearse-tenant-scope-auth-claims.mjs",
    "test:tenant-claims-staging": "node --test tests/tenant-scope-auth-claim-staging-rehearsal.spec.mjs",
    "rehearse:tenant-claims-staging": "node scripts/rehearse-tenant-scope-auth-claim-staging.mjs",
    "test:tenant-access-matrix": "node --test tests/tenant-scope-access-matrix.spec.mjs",
    "rehearse:tenant-access-matrix": "node scripts/rehearse-tenant-scope-access-matrix.mjs",
    "test:tenant-access-matrix-staging": "node --test tests/tenant-scope-staging-access-matrix-rehearsal.spec.mjs",
    "rehearse:tenant-access-matrix-staging": "node scripts/rehearse-tenant-scope-staging-access-matrix.mjs",
    "test:tenant-audit-events": "node --test tests/tenant-scope-audit-entry-events.spec.mjs",
    "rehearse:tenant-audit-events": "node scripts/rehearse-tenant-scope-audit-entry-events.mjs",
    "seed:tenant-audit-events": "node scripts/seed-tenant-audit-event-evidence.mjs",
    "test:tenant-scope-backfill-gate": "node --test tests/tenant-scope-backfill-reconciliation-gate.spec.mjs",
    "gate:tenant-scope-backfill-reconciliation": "node scripts/gate-tenant-scope-backfill-reconciliation.mjs",
    "test:tenant-scope-staging-backfill-dry-run": "node --test tests/tenant-scope-staging-backfill-dry-run.spec.mjs",
    "dry-run:tenant-scope-staging-backfill": "node scripts/dry-run-tenant-scope-staging-backfill.mjs",
    "audit:runtime-ddl": "node scripts/audit-runtime-ddl.mjs",
    "gate:runtime-ddl-removal": "node scripts/gate-runtime-ddl-removal.mjs",
    "reconcile:money": "node scripts/money-shadow-reconcile.mjs",
    "audit:legacy-backfill": "node scripts/audit-legacy-backfill.mjs",
    "dev:secrets": "node scripts/generate-dev-secrets.mjs",
    "dev:worker": "node scripts/dev-worker.mjs",
    "wait:worker": "node scripts/wait-for-worker.mjs",
    "db:local:reset": "node scripts/db-local-reset.mjs",
    "db:local:migrate": "node scripts/db-local-migrate.mjs",
    "db:local:seed": "node scripts/db-local-seed.mjs",
    "db:local:bootstrap": "node scripts/db-local-bootstrap.mjs",
    "db:local:verify": "node scripts/verify-clean-d1.mjs",
    "verify:clean-d1": "node scripts/verify-clean-d1.mjs",
    "reconciliation:template": "node scripts/generate-reconciliation-template.mjs",
    "reconciliation:dry-run": "node scripts/reconcile-legacy-dry-run.mjs",
    "migration:rehearse": "node scripts/rehearse-migration.mjs",
    "rehearsal:rent-write-plan": "node scripts/rehearse-rent-write-plan.mjs",
    "probe:clean-bootstrap": "node scripts/probe-clean-worker-bootstrap.mjs",
    "smoke": "node scripts/smoke-worker.mjs",
    "smoke:auth": "node scripts/smoke-auth.mjs",
    "smoke:employee-auth": "node scripts/smoke-employee-auth.mjs",
    "smoke:owner-auth": "node scripts/smoke-owner-auth.mjs",
    "smoke:with-worker": "node scripts/smoke-with-worker.mjs",
    "smoke:core": "node scripts/smoke-core-flows.mjs",
    "smoke:employee-entry": "node scripts/smoke-employee-entry.mjs",
    "test:delete-session": "node scripts/test-delete-session-void.mjs",
    "test:money": "node --test tests/money.spec.mjs",
    "test:money-shadow": "node --test tests/money-shadow.spec.mjs",
    "test:money-dual-write": "node --test tests/money-dual-write.spec.mjs",
    "test:receivables": "node --test tests/receivables.spec.mjs",
    "rehearse:receivables": "node scripts/rehearse-receivables-local-staging.mjs",
    "test:receivables-staging-shadow": "node --test tests/receivables-staging-shadow-gate.spec.mjs",
    "test:receivables-staging-rehearsal": "node --test tests/receivables-staging-shadow-rehearsal.spec.mjs",
    "test:receivables-staging-authority-switch": "node --test tests/receivables-staging-authority-switch-gate.spec.mjs",
    "test:receivables-staging-authority-rehearsal": "node --test tests/receivables-staging-authority-switch-rehearsal.spec.mjs",
    "compare:staging-receivables": "node scripts/compare-staging-receivables-shadow.mjs",
    "gate:receivables-staging-authority-switch": "node scripts/gate-receivables-staging-authority-switch.mjs",
    "rehearse:receivables-staging-authority-switch": "node scripts/rehearse-receivables-staging-authority-switch.mjs",
    "seed:receivables-staging-shadow": "node scripts/seed-receivables-staging-shadow-data.mjs",
    "rehearse:money-dual-write": "node scripts/rehearse-money-dual-write.mjs",
    "test:money-dual-write-local-staging": "node --test tests/money-dual-write-local-staging.spec.mjs",
    "rehearse:money-dual-write-local-staging": "node scripts/rehearse-money-dual-write-local-staging.mjs",
    "test:employee-entry-live-write-adapter": "node --test tests/employee-entry-live-write-adapter.spec.mjs",
    "rehearse:employee-entry-live-write-adapter": "node scripts/rehearse-employee-entry-live-write-adapter.mjs",
    "test:employee-entry-adapter-staging-endpoint": "node --test tests/employee-entry-adapter-staging-endpoint.spec.mjs",
    "rehearse:employee-entry-adapter-staging-endpoint": "node scripts/rehearse-employee-entry-adapter-staging-endpoint.mjs",
    "test:employee-entry-route-switch": "node --test tests/employee-entry-route-switch-rehearsal.spec.mjs",
    "rehearse:employee-entry-route-switch": "node scripts/rehearse-employee-entry-route-switch.mjs",
    "compare:employee-entry-routes": "node scripts/compare-employee-entry-legacy-vs-adapter.mjs",
    "rehearse:employee-entry-rollback": "node scripts/rehearse-employee-entry-rollback.mjs",
    "test:employee-entry-production-lock": "node --test tests/employee-entry-production-behavior-lock.spec.mjs",
    "reproduce:employee-entry-econnreset": "node scripts/reproduce-employee-entry-econnreset.mjs",
    "test:feature-flag-matrix": "node --test tests/feature-flag-production-lock-matrix.spec.mjs",
    "test:unified-login": "node --test tests/unified-login-role-routing.spec.mjs",
    "test:unified-login-session-handoff": "node --test tests/unified-login-session-handoff.spec.mjs",
    "test:unified-login-auth-guard": "node --test tests/unified-login-auth-guard.spec.mjs",
    "test:unified-login-owner-ux": "node --test tests/unified-login-owner-ux.spec.mjs",
    "test:unified-login-single-entry": "node --test tests/unified-login-single-entry.spec.mjs",
    "test:unified-login-visual-match": "node --test tests/unified-login-visual-match.spec.mjs",
    "test:unified-login-minimal-ui": "node --test tests/unified-login-minimal-ui.spec.mjs",
    "test:owner-ui": "node --test tests/owner-ui-design-alignment.spec.mjs",
    "test:owner-mobile-ui": "node --test tests/owner-mobile-ui-alignment.spec.mjs",
    "test:owner-mobile-nav": "node --test tests/owner-mobile-nav-layout.spec.mjs",
    "test:owner-nav-ia": "node --test tests/owner-nav-information-architecture.spec.mjs",
    "test:owner-client-credit-ui": "node --test tests/owner-client-credit-ui.spec.mjs",
    "test:owner-real-screenshot-regression": "node --test tests/owner-real-screenshot-regression.spec.mjs",
    "test:visual-shell-alignment": "node --test tests/owner-employee-visual-shell-alignment.spec.mjs",
    "test:owner-header-match": "node --test tests/owner-header-match-employee.spec.mjs",
    "test:owner-nav-match": "node --test tests/owner-nav-match-employee.spec.mjs",
    "test:owner-card-system": "node --test tests/owner-card-system-match-employee.spec.mjs",
    "test:unified-login-minimal-regression": "node --test tests/unified-login-minimal-regression.spec.mjs",
    "test:unified-login-remember-account": "node --test tests/unified-login-remember-account.spec.mjs",
    "test:owner-topbar": "node --test tests/owner-topbar-simplification.spec.mjs",
    "test:owner-overview-value": "node --test tests/owner-overview-business-value.spec.mjs",
... [truncated 62 more lines]
```


### 1.5 deploy-worker/wrangler.toml

File: `deploy-worker/wrangler.toml`


```text
name = "homelink-finance"
main = "src/index.js"
compatibility_date = "2024-09-23"

[assets]
directory = "./public"
binding = "ASSETS"
run_worker_first = true

[[d1_databases]]
binding = "DB"
database_name = "homelink"
database_id = "562aa079-1cca-4176-ba3b-7276a65f98fb"

[[kv_namespaces]]
binding = "RATE_LIMIT"
id = "c7c64d522d964baba2e72454e7262da9"

[vars]
APP_NAME = "Homelink Finance"
APP_VERSION = "2.0.0"
CORPID = "homelink"

[env.staging]
name = "homelink-finance-staging"
main = "src/index.js"

[env.staging.vars]
APP_NAME = "Homelink Finance"
APP_VERSION = "2.0.0"
APP_ENV = "staging"
CORPID = "homelink-staging"
ENABLE_EMPLOYEE_ENTRY_ADAPTER_LIVE_ROUTE = "false"
ENABLE_HANDOVER_ATOMIC_STAGING = "false"

[[env.staging.d1_databases]]
binding = "DB"
database_name = "homelink-finance-staging"
database_id = "4ff78bfc-3855-436b-aefb-6b492145d79c"

[[env.staging.kv_namespaces]]
binding = "RATE_LIMIT"
id = "9e84150246204f01b3fd8c184761303e"
```


### 1.6 deploy-worker/wrangler.embedded.toml

File: `deploy-worker/wrangler.embedded.toml`


```text
name = "homelink-finance"
main = "src/index.embedded.js"
compatibility_date = "2024-09-23"

[[d1_databases]]
binding = "DB"
database_name = "homelink"
database_id = "562aa079-1cca-4176-ba3b-7276a65f98fb"

[[kv_namespaces]]
binding = "RATE_LIMIT"
id = "c7c64d522d964baba2e72454e7262da9"

[vars]
APP_NAME = "Homelink Finance"
APP_VERSION = "2.0.0"
CORPID = "homelink"
```


### 1.7 Framework Detection

Command: `rg -n "react|vue|wrangler|cloudflare|eslint|prettier|node --test" package.json`


```text
8:    "build:worker:assets": "cd deploy-worker && wrangler deploy --config wrangler.toml --dry-run --outdir ../.wrangler-dryrun/assets",
9:    "build:worker:embedded": "cd deploy-worker && wrangler deploy --config wrangler.embedded.toml --dry-run --outdir ../.wrangler-dryrun/embedded",
10:    "lint": "eslint deploy-worker/src/index.js deploy-worker/scripts/**/*.js index-51-main.js",
11:    "format:check": "prettier --check \"*.md\" \"tools/**/*.cjs\" \"scripts/**/*.mjs\" \"tests/**/*.mjs\" \"modules/**/*.mjs\"",
40:    "test:tenant-scope": "node --test tests/tenant-scope-local-staging.spec.mjs",
42:    "test:tenant-scope-staging-shadow": "node --test tests/tenant-scope-staging-shadow-gate.spec.mjs",
44:    "test:tenant-scope-route-gate": "node --test tests/tenant-scope-staging-route-enforcement-gate.spec.mjs",
46:    "test:tenant-scope-query-gate": "node --test tests/tenant-scope-staging-dashboard-history-query-gate.spec.mjs",
48:    "test:tenant-scope-wiring-gate": "node --test tests/tenant-scope-staging-wiring-gate.spec.mjs",
50:    "test:tenant-scope-wiring-rehearsal": "node --test tests/tenant-scope-staging-wiring-rehearsal.spec.mjs",
52:    "test:tenant-claims": "node --test tests/tenant-scope-auth-claims.spec.mjs",
54:    "test:tenant-claims-staging": "node --test tests/tenant-scope-auth-claim-staging-rehearsal.spec.mjs",
56:    "test:tenant-access-matrix": "node --test tests/tenant-scope-access-matrix.spec.mjs",
58:    "test:tenant-access-matrix-staging": "node --test tests/tenant-scope-staging-access-matrix-rehearsal.spec.mjs",
60:    "test:tenant-audit-events": "node --test tests/tenant-scope-audit-entry-events.spec.mjs",
63:    "test:tenant-scope-backfill-gate": "node --test tests/tenant-scope-backfill-reconciliation-gate.spec.mjs",
65:    "test:tenant-scope-staging-backfill-dry-run": "node --test tests/tenant-scope-staging-backfill-dry-run.spec.mjs",
93:    "test:money": "node --test tests/money.spec.mjs",
94:    "test:money-shadow": "node --test tests/money-shadow.spec.mjs",
95:    "test:money-dual-write": "node --test tests/money-dual-write.spec.mjs",
96:    "test:receivables": "node --test tests/receivables.spec.mjs",
98:    "test:receivables-staging-shadow": "node --test tests/receivables-staging-shadow-gate.spec.mjs",
99:    "test:receivables-staging-rehearsal": "node --test tests/receivables-staging-shadow-rehearsal.spec.mjs",
100:    "test:receivables-staging-authority-switch": "node --test tests/receivables-staging-authority-switch-gate.spec.mjs",
101:    "test:receivables-staging-authority-rehearsal": "node --test tests/receivables-staging-authority-switch-rehearsal.spec.mjs",
107:    "test:money-dual-write-local-staging": "node --test tests/money-dual-write-local-staging.spec.mjs",
109:    "test:employee-entry-live-write-adapter": "node --test tests/employee-entry-live-write-adapter.spec.mjs",
111:    "test:employee-entry-adapter-staging-endpoint": "node --test tests/employee-entry-adapter-staging-endpoint.spec.mjs",
113:    "test:employee-entry-route-switch": "node --test tests/employee-entry-route-switch-rehearsal.spec.mjs",
117:    "test:employee-entry-production-lock": "node --test tests/employee-entry-production-behavior-lock.spec.mjs",
119:    "test:feature-flag-matrix": "node --test tests/feature-flag-production-lock-matrix.spec.mjs",
120:    "test:unified-login": "node --test tests/unified-login-role-routing.spec.mjs",
121:    "test:unified-login-session-handoff": "node --test tests/unified-login-session-handoff.spec.mjs",
122:    "test:unified-login-auth-guard": "node --test tests/unified-login-auth-guard.spec.mjs",
123:    "test:unified-login-owner-ux": "node --test tests/unified-login-owner-ux.spec.mjs",
124:    "test:unified-login-single-entry": "node --test tests/unified-login-single-entry.spec.mjs",
125:    "test:unified-login-visual-match": "node --test tests/unified-login-visual-match.spec.mjs",
126:    "test:unified-login-minimal-ui": "node --test tests/unified-login-minimal-ui.spec.mjs",
127:    "test:owner-ui": "node --test tests/owner-ui-design-alignment.spec.mjs",
128:    "test:owner-mobile-ui": "node --test tests/owner-mobile-ui-alignment.spec.mjs",
129:    "test:owner-mobile-nav": "node --test tests/owner-mobile-nav-layout.spec.mjs",
130:    "test:owner-nav-ia": "node --test tests/owner-nav-information-architecture.spec.mjs",
131:    "test:owner-client-credit-ui": "node --test tests/owner-client-credit-ui.spec.mjs",
132:    "test:owner-real-screenshot-regression": "node --test tests/owner-real-screenshot-regression.spec.mjs",
133:    "test:visual-shell-alignment": "node --test tests/owner-employee-visual-shell-alignment.spec.mjs",
134:    "test:owner-header-match": "node --test tests/owner-header-match-employee.spec.mjs",
135:    "test:owner-nav-match": "node --test tests/owner-nav-match-employee.spec.mjs",
136:    "test:owner-card-system": "node --test tests/owner-card-system-match-employee.spec.mjs",
137:    "test:unified-login-minimal-regression": "node --test tests/unified-login-minimal-regression.spec.mjs",
138:    "test:unified-login-remember-account": "node --test tests/unified-login-remember-account.spec.mjs",
139:    "test:owner-topbar": "node --test tests/owner-topbar-simplification.spec.mjs",
140:    "test:owner-overview-value": "node --test tests/owner-overview-business-value.spec.mjs",
141:    "test:owner-history-performance": "node --test tests/owner-history-performance.spec.mjs tests/owner-history-load-performance.spec.mjs",
142:    "test:owner-mobile-density": "node --test tests/owner-mobile-density.spec.mjs",
143:    "test:auth-single-entry": "node --test tests/auth-single-entry-routing.spec.mjs",
144:    "test:logout-routing": "node --test tests/logout-lock-icon-routing.spec.mjs",
145:    "test:employee-identity": "node --test tests/employee-identity-display.spec.mjs",
146:    "test:owner-network-entry": "node --test tests/owner-network-control-entry.spec.mjs",
147:    "test:owner-history-load-performance": "node --test tests/owner-history-load-performance.spec.mjs",
148:    "test:legacy-login-flash": "node --test tests/legacy-login-flash-regression.spec.mjs",
149:    "test:no-legacy-login": "node --test tests/no-legacy-login-visible.spec.mjs",
150:    "test:logout-unified": "node --test tests/logout-always-unified-login.spec.mjs",
151:    "test:employee-display-name": "node --test tests/employee-display-name.spec.mjs",
152:    "test:employee-top-nav": "node --test tests/employee-top-nav-consistency.spec.mjs",
153:    "test:owner-control-panel-layout": "node --test tests/owner-control-panel-layout.spec.mjs",
154:    "test:owner-arrears-modal": "node --test tests/owner-arrears-modal-layout.spec.mjs",
155:    "test:owner-network-wifi-entry": "node --test tests/owner-network-wifi-entry.spec.mjs",
156:    "test:employee-script-error": "node --test tests/employee-script-error-regression.spec.mjs",
157:    "test:arrears-export-format": "node --test tests/arrears-export-format.spec.mjs",
158:    "test:arrears-modal-compact": "node --test tests/arrears-modal-compact-mobile.spec.mjs",
159:    "test:unified-login-password-manager": "node --test tests/unified-login-password-manager.spec.mjs",
160:    "test:readonly-admin-role": "node --test tests/readonly-admin-role.spec.mjs",
161:    "test:readonly-admin-unified-login": "node --test tests/readonly-admin-unified-login.spec.mjs",
162:    "test:auth-route-closure": "node --test tests/auth-route-closure.spec.mjs",
163:    "test:three-portal": "node --test tests/three-portal-entry.spec.mjs",
164:    "test:route-normalization": "node --test tests/route-normalization.spec.mjs",
165:    "test:legacy-login-hidden": "node --test tests/legacy-login-hidden.spec.mjs",
166:    "test:logout-to-root": "node --test tests/logout-to-root-entry.spec.mjs",
167:    "test:role-guard-closure": "node --test tests/role-guard-closure.spec.mjs",
168:    "test:readonly-admin-portal": "node --test tests/readonly-admin-portal.spec.mjs",
169:    "test:employee-identity-display": "node --test tests/employee-identity-display.spec.mjs",
174:    "test:backend-totals-shadow": "node --test tests/backend-totals-shadow.spec.mjs",
175:    "test:backend-totals": "node --test tests/backend-totals-authority.spec.mjs",
176:    "test:backend-totals-staging-gate": "node --test tests/backend-totals-staging-switch-gate.spec.mjs",
177:    "test:backend-totals-staging-switch": "node --test tests/backend-totals-staging-switch-rehearsal.spec.mjs",
180:    "test:handover-atomic-design": "node --test tests/handover-atomic.design.spec.mjs",
181:    "test:handover-atomic": "node --test tests/handover-atomic-rehearsal.spec.mjs",
183:    "test:handover-staging-endpoint": "node --test tests/handover-staging-endpoint.spec.mjs",
188:    "test:timezone": "node --test tests/dubai-business-date.spec.mjs",
189:    "test": "node --test --test-concurrency=1 tests/**/*.spec.mjs",
193:    "@eslint/js": "^9.0.0",
194:    "eslint": "^9.0.0",
195:    "prettier": "^3.0.0",
196:    "wrangler": "^4.0.0"
```


## 2. Frontend Architecture


### 2.1 Static Assets

Command: `powershell -NoProfile -Command "Get-ChildItem deploy-worker/public -File -Include *.html,*.js,*.css | Select-Object Name,Length,LastWriteTime | Format-Table -AutoSize | Out-String"`


```text

```


### 2.2 Portal Entry Asset Excerpt

File: `deploy-worker/public/portal.html`


```text
<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Homelink</title>
<style>
:root{
  --green:#05a857;
  --green-2:#18c46b;
  --ink:#111827;
  --muted:#64748b;
  --line:rgba(148,163,184,.24);
  --card:rgba(255,255,255,.78);
  --shadow:0 26px 80px rgba(15,23,42,.14);
  font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI","Microsoft YaHei",sans-serif;
}
*{box-sizing:border-box}
body{
  margin:0;
  min-height:100vh;
  color:var(--ink);
  background:
    radial-gradient(circle at 78% 12%,rgba(21,196,107,.2),transparent 34%),
    radial-gradient(circle at 15% 84%,rgba(21,196,107,.18),transparent 30%),
    linear-gradient(135deg,#f8fffb 0%,#eef8f4 52%,#eaf4f0 100%);
  display:grid;
  place-items:center;
  padding:22px;
}
.shell{
  width:min(430px,100%);
  border:1px solid rgba(255,255,255,.72);
  border-radius:30px;
  background:var(--card);
  box-shadow:var(--shadow);
  backdrop-filter:blur(20px) saturate(160%);
  padding:28px;
}
.brand{display:flex;align-items:center;gap:14px;margin-bottom:24px}
.logo{
  width:58px;height:58px;border-radius:18px;
  display:grid;place-items:center;
  background:linear-gradient(180deg,var(--green-2),var(--green));
  color:white;font-weight:900;line-height:.82;letter-spacing:-.04em;
  box-shadow:0 16px 32px rgba(5,168,87,.28);
}
.logo small{display:block;font-size:10px;letter-spacing:.08em}
h1{font-size:34px;line-height:1;margin:0;font-weight:900;letter-spacing:-.04em}
.sub{margin:6px 0 0;color:var(--muted);font-size:12px;font-weight:800;letter-spacing:.22em;text-transform:uppercase}
.prompt{font-size:18px;font-weight:850;margin:0 0 16px}
.doors{display:grid;gap:12px}
.door{
  width:100%;
  border:1px solid var(--line);
  border-radius:22px;
  background:rgba(255,255,255,.72);
  padding:18px 20px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  color:var(--ink);
  font:inherit;
  cursor:pointer;
  box-shadow:0 14px 30px rgba(15,23,42,.06);
}
.door strong{display:block;font-size:22px;letter-spacing:-.03em}
.door span{display:block;margin-top:2px;color:var(--muted);font-size:11px;font-weight:850;letter-spacing:.18em;text-transform:uppercase}
.door.active{background:linear-gradient(180deg,var(--green-2),var(--green));color:#fff;border-color:transparent}
.door.active span{color:rgba(255,255,255,.76)}
.form{display:none;margin-top:18px}
.form.active{display:block}
.field{margin-bottom:14px}
label{display:block;margin:0 0 8px;font-size:13px;font-weight:850;color:#334155}
input{
  width:100%;
  min-height:56px;
  border:1.5px solid rgba(148,163,184,.34);
  border-radius:18px;
  padding:0 17px;
  background:rgba(255,255,255,.78);
  font-size:17px;
  color:var(--ink);
  outline:none;
}
input:focus{border-color:rgba(5,168,87,.76);box-shadow:0 0 0 5px rgba(5,168,87,.12)}
.actions{display:grid;gap:10px;margin-top:18px}
.primary,.ghost{
  border:0;
  border-radius:19px;
  min-height:58px;
  font:inherit;
  font-weight:900;
  cursor:pointer;
}
.primary{background:linear-gradient(180deg,var(--green-2),var(--green));color:white;box-shadow:0 16px 32px rgba(5,168,87,.28)}
.ghost{background:rgba(255,255,255,.58);color:#334155;border:1px solid var(--line);min-height:48px}
.status{min-height:20px;margin-top:12px;color:var(--muted);font-size:13px;font-weight:750;text-align:center}
.status.error{color:#dc2626}
.hidden{display:none!important}
@media(max-width:420px){
  body{padding:18px}
  .shell{padding:24px;border-radius:28px}
  h1{font-size:30px}
  .logo{width:52px;height:52px}
  .door{padding:16px 18px}
  .door strong{font-size:20px}
}
</style>
</head>
<body>
<main class="shell" aria-label="Homelink entry">
  <section class="brand">
    <div class="logo">HOME<small>LINK.</small></div>
    <div>
      <h1>Homelink</h1>
      <p class="sub">Finance Ledger</p>
    </div>
  </section>
  <p class="prompt">请选择入口</p>
  <section class="doors" aria-label="Portal choices">
    <button class="door" type="button" data-portal="employee"><span><strong>员工</strong>Employee</span></button>
    <button class="door" type="button" data-portal="owner"><span><strong>老板</strong>Owner</span></button>
    <button class="door" type="button" data-portal="admin"><span><strong>管理员</strong>Admin</span></button>
  </section>
  <form class="form" id="loginForm">
    <input class="hidden" id="browserUsername" name="username" autocomplete="username" value="homelink-owner">
    <div class="field" id="accountField">
      <label id="accountLabel" for="accountInput">用户名</label>
      <input id="accountInput" name="accountInput" autocomplete="username" placeholder="用户名">
    </div>
    <div class="field">
      <label id="passwordLabel" for="passwordInput">密码</label>
      <input id="passwordInput" name="password" type="password" autocomplete="current-password" placeholder="密码" required>
    </div>
    <div class="actions">
      <button class="primary" id="loginButton" type="submit">登录</button>
      <button class="ghost" id="logoutButton" type="button">退出当前会话</button>
    </div>
    <div class="status" id="status" role="status" aria-live="polite"></div>
... [truncated 123 more lines]
```


### 2.3 Owner Asset Excerpt

File: `deploy-worker/public/index.html`


```text
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<title>Homelink · 流水管理</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="./shared-design-tokens.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js" integrity="sha384-DhxhYObIMeMNGyAG7iK11OHzBIKyEIeRL0ad1iFPAOwZB8iirUlTT0O/WJJUk8+o" crossorigin="anonymous" referrerpolicy="no-referrer"></script>
<style>
:root{
  --bg:#f4f6f8;--surface:#ffffff;--surface2:#f0f2f4;--surface3:#e8eaec;
  --border:#e0e3e8;--border2:#c8cdd5;
  --text:#1a1d23;--text2:#5a6170;--text3:#9ba3b0;
  --accent:#1a9e3f;--accent-dim:rgba(26,158,63,0.09);--accent-b:rgba(26,158,63,0.28);
  --hl-yellow:#c8b800;--hl-yellow-dim:rgba(200,184,0,0.1);
  --green:#1a8a4a;--green-dim:rgba(26,138,74,0.1);
  --red:#d93025;--red-dim:rgba(217,48,37,0.08);
  --blue:#1a73e8;--blue-dim:rgba(26,115,232,0.1);
  --orange:#e06c00;--orange-dim:rgba(224,108,0,0.1);
  --r:10px;--r2:16px;--shadow:0 1px 3px rgba(0,0,0,0.08),0 4px 16px rgba(0,0,0,0.06);
}
*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
html,body{background:var(--bg);color:var(--text);font-family:'Inter',system-ui,sans-serif;min-height:100vh;font-size:14px;line-height:1.5;overflow-x:hidden}
.mono{font-family:JetBrains Mono,monospace}
/* TOPBAR */
.topbar{position:sticky;top:0;z-index:50;background:rgba(244,246,248,0.96);backdrop-filter:blur(20px);border-bottom:3px solid #1a9e3f;padding:0}
.topbar-row1{display:flex;align-items:center;justify-content:space-between;padding:8px 14px;gap:8px}
.topbar-row2{display:flex;align-items:center;gap:6px;padding:0 14px 8px;border-top:1px solid var(--border)}
.brand{display:flex;align-items:center;gap:8px;flex-shrink:0}
.brand-icon{width:34px;height:34px;border-radius:8px;display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0}
.brand-name{font-size:16px;font-weight:900;white-space:nowrap;letter-spacing:0;line-height:1}
.brand-sub{display:none}
.topbar-right{display:flex;align-items:center;gap:6px}
.role-badge.staff{background:var(--blue-dim);color:var(--blue);border:1px solid rgba(26,115,232,0.2)}
.role-badge.manager{background:var(--accent-dim);color:var(--accent);border:1px solid var(--accent-b)}
.role-badge{font-size:10px;padding:3px 9px;border-radius:20px;font-family:JetBrains Mono,monospace;font-weight:600;white-space:nowrap}
.role-badge.staff{background:var(--blue-dim);color:var(--blue);border:1px solid rgba(86,204,242,0.2)}
.role-badge.manager{background:var(--accent-dim);color:var(--accent);border:1px solid var(--accent-b)}
/* NAV */
.nav{display:flex;gap:2px;background:var(--surface2);border-radius:8px;padding:3px;border:1px solid var(--border);flex:1}
.nav-btn{background:transparent;border:none;color:var(--text2);cursor:pointer;padding:7px 0;border-radius:6px;font-size:13px;font-family:inherit;font-weight:500;display:flex;align-items:center;justify-content:center;gap:5px;transition:all 0.15s;flex:1}
.nav-btn:hover{color:var(--text);background:var(--surface3)}
.nav-btn.active{background:var(--accent);color:#ffffff;font-weight:700}
.nav-btn.locked{opacity:0.3;cursor:not-allowed;pointer-events:none}
.nav-btn .ico{width:13px;height:13px}
/* LAYOUT */
.container{max-width:1280px;margin:0 auto;padding:14px 12px 80px}
.main-grid{display:grid;grid-template-columns:1fr;gap:14px}
@media(min-width:1024px){.main-grid{grid-template-columns:340px 1fr}}
.hidden{display:none!important}
.view{animation:up 0.2s ease}
@keyframes up{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
@keyframes pulse{0%{background-position:180% 0}100%{background-position:-180% 0}}
/* CARDS */
.card{background:var(--surface);border:1px solid var(--border);border-radius:var(--r2)}
.card-head{padding:16px 18px 12px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
.card-title{font-size:14px;font-weight:700;color:var(--text);display:flex;align-items:center;gap:7px}
.card-sub{font-size:10px;color:var(--text3);font-family:JetBrains Mono,monospace;margin-top:2px;letter-spacing:0.02em}
.card-body{padding:18px}
/* KPI STRIP */
.kpi-strip{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:14px}
@media(min-width:480px){.kpi-strip{grid-template-columns:repeat(3,1fr)}}
@media(min-width:800px){.kpi-strip{grid-template-columns:repeat(6,1fr)}}
.kpi{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:12px 12px}
.kpi.hi{border-color:var(--accent-b);background:var(--accent-dim)}
.kpi.span2{grid-column:1/-1}
.kpi-lbl{font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:0.06em;font-family:JetBrains Mono,monospace;margin-bottom:5px}
.kpi-val{font-family:JetBrains Mono,monospace;font-size:15px;font-weight:700;line-height:1;word-break:break-all}
/* CAT TABS */
.cat-tabs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin-bottom:14px;overflow-x:auto}
.cat-tab{padding:9px 4px;border-radius:var(--r);border:1px solid var(--border);background:var(--surface2);color:var(--text2);cursor:pointer;font-family:inherit;font-size:10px;display:flex;flex-direction:column;align-items:center;gap:3px;transition:all 0.15s}
.cat-tab:hover{border-color:var(--border2);color:var(--text)}
.cat-tab.active{border-color:var(--accent-b);background:var(--accent-dim);color:var(--text)}
.cat-tab .em{font-size:16px;line-height:1}
.cat-tab .nm{font-weight:600;font-size:10px;text-align:center;line-height:1.2}
.cat-tab .ct{font-family:JetBrains Mono,monospace;font-size:9px;color:inherit}
/* FORM */
.form-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px}
.form-row.full{grid-template-columns:1fr}
/* ══ MOBILE LAYOUT FIX - 一次性修复所有手机排版问题 ══ */

/* 防止横向溢出 */
body { overflow-x: hidden; max-width: 100vw; }
.main-grid, .card, .card-body { max-width: 100%; min-width: 0; }
* { box-sizing: border-box; }

/* Cat tabs: 超出时横向滚动，不让页面变宽 */
.cat-tabs {
  overflow-x: auto;
... [truncated 1797 more lines]
```


### 2.4 Employee Asset Excerpt

File: `deploy-worker/public/employee-v3.html`


```text
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Homelink 员工端 v3</title>
<link rel="stylesheet" href="./shared-design-tokens.css">
<style>
:root{
  --bg:#f4f6f8;--surface:#fff;--surface2:#f7faf8;--line:#dfe5e8;--line2:#cfd8dc;
  --text:#111827;--muted:#5f6877;--soft:#8a94a3;--green:#09a64f;--green2:#078d42;
  --green-bg:rgba(9,166,79,.10);--orange:#e16b00;--red:#d93025;--blue:#1a73e8;
  --shadow:0 16px 38px rgba(20,32,51,.10);--r:22px;--r2:30px;
}
*{box-sizing:border-box}html{background:var(--bg)}
body{margin:0;min-height:100vh;overflow-x:hidden;color:var(--text);font-family:Inter,"Microsoft YaHei","PingFang SC","Noto Sans SC",system-ui,sans-serif;background:
  radial-gradient(circle at 86% 8%,rgba(9,166,79,.18),transparent 24rem),
  linear-gradient(180deg,#fff 0,#f2faf7 19rem,#eef3f1 100%)}
button,input,select,textarea{font:inherit}
.appbar{height:68px;background:#fff;display:flex;align-items:center;justify-content:space-between;padding:0 24px;border-bottom:1px solid #edf0f2}
.appbar strong{font-size:26px;font-weight:500}.appbar span{font-size:36px;line-height:1}
.top{position:sticky;top:0;z-index:5;background:linear-gradient(100deg,rgba(255,255,255,.97),rgba(237,250,244,.95));backdrop-filter:blur(18px);border-bottom:1px solid rgba(177,204,191,.55);box-shadow:0 2px 14px rgba(20,32,51,.06)}
.brand{max-width:980px;margin:0 auto;padding:22px 28px;display:flex;justify-content:space-between;gap:16px;align-items:center}
.logo{display:flex;align-items:center;gap:16px}.badge{width:70px;height:70px;border-radius:17px;background:linear-gradient(145deg,#0bb25b,#078d42);color:#fff;display:grid;place-items:center;font-weight:950;line-height:1.05;box-shadow:inset 0 -10px 20px rgba(0,0,0,.08)}.badge small{display:block;color:#f1d800;font-size:12px}.word{font-size:32px;font-weight:950;letter-spacing:-.04em}.word .g{color:var(--green)}.word .dot,.word i{color:#d5c100}.word i{font-style:normal}.word em{display:inline-block;margin-left:10px;color:#142033;font-size:.72em;font-style:normal;font-weight:760;letter-spacing:-.04em}
.actions{display:flex;align-items:center;gap:12px}.pill{border:1.5px solid rgba(9,166,79,.24);color:var(--green2);background:#fff;border-radius:999px;padding:11px 18px;font-weight:950}.pill.main{background:linear-gradient(180deg,#10ad5a,#078d42);color:#fff;border:0}
.operator{display:flex;align-items:center;gap:8px;color:var(--muted);font-size:12px;font-weight:900}.operator input{width:92px;border:1px solid var(--line);border-radius:12px;padding:8px 10px;text-align:center}.employee-identity-label{display:none!important}
.tabs{max-width:980px;margin:0 auto;padding:0 28px 20px;display:flex;overflow-x:auto;scrollbar-width:none}.tabs::-webkit-scrollbar{display:none}
.tab{min-width:190px;height:86px;border:1px solid var(--line);border-right:0;background:rgba(255,255,255,.94);cursor:pointer;color:#243044;font-size:25px;font-weight:950;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;letter-spacing:.05em;text-align:center}
.tab:first-child{border-radius:27px 0 0 27px}.tab:last-child{border-right:1px solid var(--line);border-radius:0 27px 27px 0}.tab.active{background:linear-gradient(180deg,#10ad5a,#078d42);color:#fff;border-color:rgba(9,166,79,.7);box-shadow:0 12px 26px rgba(9,166,79,.24)}.en{font-family:Consolas,"JetBrains Mono",monospace;font-size:13px;font-weight:700;letter-spacing:.08em;opacity:.78}
.tab .tab-cn{display:block;line-height:1.05}
.tab .en{display:block;white-space:nowrap;overflow:visible;text-overflow:clip;max-width:none}
.wrap{max-width:980px;margin:0 auto;padding:52px 28px 110px}.page-title{font-size:50px;font-weight:950;letter-spacing:-.04em;margin:0 0 12px}.page-title .en{display:block;color:#697386;font-size:23px;margin-top:14px}.page-sub{font-size:22px;line-height:1.45;color:#586273;font-weight:850;margin-bottom:30px}
.card{background:rgba(255,255,255,.94);border:1px solid var(--line);border-radius:var(--r2);box-shadow:var(--shadow);margin-bottom:24px;overflow:hidden}.head{padding:22px 26px;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;gap:12px}.title{font-size:26px;font-weight:950}.body{padding:26px}
.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.grid3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.field{margin-bottom:16px}label{display:block;color:#435168;font-size:14px;font-weight:900;margin-bottom:8px}input,select,textarea{width:100%;border:1.5px solid #d4dde0;border-radius:16px;padding:16px 17px;background:#fff;color:var(--text);outline:none}textarea{min-height:104px;resize:vertical}input:focus,select:focus,textarea:focus{border-color:var(--green);box-shadow:0 0 0 4px rgba(9,166,79,.12)}input[readonly],select:disabled{background:#f2f6f4;color:#607086;border-style:dashed;cursor:not-allowed}
.hint{font-size:14px;color:#566174;line-height:1.75;background:rgba(255,255,255,.75);border:1px dashed #d7e3dd;border-radius:18px;padding:16px 18px;margin-bottom:20px}.ctx{display:grid;grid-template-columns:repeat(6,1fr);gap:10px;margin-bottom:20px}.ctx div{background:linear-gradient(180deg,#f9fcfb,#f4f8f6);border:1px solid var(--line);border-radius:17px;padding:14px}.ctx span{display:block;color:#697386;font-size:12px;font-weight:850}.ctx b{display:block;margin-top:6px;font-family:Consolas,"JetBrains Mono",monospace;font-size:13px;word-break:break-all}
.btn{border:1px solid var(--line);border-radius:17px;padding:16px 20px;font-weight:950;cursor:pointer;background:#fff;color:#263246;box-shadow:0 8px 22px rgba(20,32,51,.07)}.btn.primary{background:linear-gradient(180deg,#10ad5a,#078d42);color:#fff;border-color:transparent}.btn.danger{background:#fff0ee;color:var(--red)}.row{display:flex;gap:12px;flex-wrap:wrap}.row .btn{flex:1}.hidden{display:none!important}.warn{color:var(--orange);font-weight:900}.bad{color:var(--red);font-weight:900}
.step{border:1px solid rgba(207,216,220,.85);border-radius:24px;padding:20px;margin-bottom:18px;background:rgba(255,255,255,.72)}.step-title{display:flex;align-items:center;gap:10px;margin-bottom:14px;color:#142033;font-size:18px;font-weight:950}.step-title span{display:grid;place-items:center;width:30px;height:30px;border-radius:999px;background:var(--green);color:#fff;font-family:Consolas,monospace;font-size:15px}.event-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.event-chip{border:1.5px solid var(--line);border-radius:18px;padding:18px 14px;background:#fff;color:#263246;font-size:17px;font-weight:950;cursor:pointer;box-shadow:0 8px 20px rgba(20,32,51,.06)}.event-chip.active{background:linear-gradient(180deg,#10ad5a,#078d42);color:#fff;border-color:transparent}.context-note{border:1px solid #dbe7df;border-radius:18px;background:#f8fcfa;padding:14px 16px;margin:0 0 16px;color:#445063;font-size:14px;line-height:1.7}.context-note strong{color:#142033}.kpi-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px}.kpi-card{background:rgba(255,255,255,.88);border:1px solid var(--line);border-radius:20px;padding:18px;box-shadow:0 10px 24px rgba(20,32,51,.06)}.kpi-card span{display:block;color:#516176;font-size:12px;font-weight:950}.kpi-card small{display:block;color:#7b8797;font-family:Consolas,monospace;font-size:10px;margin-top:2px}.kpi-card b{display:block;margin-top:8px;font-family:Consolas,"JetBrains Mono",monospace;font-size:20px;color:var(--green)}.kpi-card b.orange{color:var(--orange)}.kpi-card b.red{color:var(--red)}.kpi-card b.blue{color:var(--blue)}.summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.summary div{border:1px solid var(--line);border-radius:16px;background:#f8fbfa;padding:13px}.summary span{display:block;color:#697386;font-size:12px;font-weight:900}.summary b{display:block;margin-top:5px;font-family:Consolas,"JetBrains Mono",monospace;font-size:14px;word-break:break-word}.diffbox{border-left:5px solid var(--orange);background:#fffaf2}.preview-list{min-height:190px}.preview-empty{height:190px;display:grid;place-items:center;text-align:center;color:#617086}.preview-entry{border:1px solid var(--line);border-radius:18px;padding:14px;margin-bottom:10px;background:#fff;display:grid;grid-template-columns:1fr auto;gap:10px}.preview-entry b{font-family:Consolas,"JetBrains Mono",monospace}.preview-entry .amt{font-family:Consolas,"JetBrains Mono",monospace;font-weight:950;color:var(--green)}.preview-entry .amt.red{color:var(--red)}.preview-tools{display:flex;gap:8px;justify-content:flex-end;align-items:center;margin-top:8px}.mini-btn{border:1px solid var(--line);border-radius:999px;background:#fff;padding:6px 10px;font-size:12px;font-weight:900;color:#435168;cursor:pointer}.mini-btn.danger{color:var(--red);background:#fff7f6}.status-pill{display:inline-block;border-radius:999px;padding:2px 8px;font-size:11px;font-weight:900;background:#eef8f2;color:var(--green2)}.status-pill.local{background:#fff7e8;color:var(--orange)}
.task{border:1px solid var(--line);border-left:5px solid #aab4c2;border-radius:21px;padding:20px;margin-bottom:14px;background:#fff}.task-top{display:flex;justify-content:space-between;gap:12px}.bed{font-size:24px;font-weight:950;font-family:Consolas,"JetBrains Mono",monospace}.money{font-family:Consolas,"JetBrains Mono",monospace;font-size:20px;font-weight:950;color:var(--orange)}.small{font-size:14px;color:var(--muted);line-height:1.75}.toast{position:fixed;left:24px;right:24px;bottom:22px;background:#142033;color:#fff;padding:17px 20px;border-radius:20px;display:none;z-index:20;font-weight:900;box-shadow:var(--shadow)}
.preview-modal{position:fixed;inset:0;z-index:40;display:none;align-items:center;justify-content:center;padding:28px;background:rgba(226,236,232,.48);backdrop-filter:blur(26px) saturate(170%);-webkit-backdrop-filter:blur(26px) saturate(170%)}
.preview-modal.show{display:flex}
.preview-panel{width:min(1080px,96vw);max-height:88vh;overflow:hidden;border-radius:34px;background:linear-gradient(145deg,rgba(255,255,255,.72),rgba(255,255,255,.42));border:1px solid rgba(255,255,255,.78);box-shadow:0 36px 110px rgba(15,23,42,.20),inset 0 1px 0 rgba(255,255,255,.92)}
.preview-panel-head{display:flex;justify-content:space-between;align-items:center;gap:14px;padding:22px 24px;border-bottom:1px solid rgba(203,213,225,.52)}
.preview-panel-title{color:#111827;font-size:24px;font-weight:780}.preview-panel-title small{display:block;margin-top:4px;color:#7b8797;font-size:10px;letter-spacing:.12em}
.preview-panel-body{padding:22px;max-height:calc(88vh - 92px);overflow:auto}
.preview-anchor-row{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-bottom:16px}
.preview-anchor{padding:15px 16px;border-radius:20px;background:rgba(255,255,255,.56);border:1px solid rgba(255,255,255,.74)}
.preview-anchor span{display:block;color:#657287;font-size:12px;font-weight:650}.preview-anchor b{display:block;margin-top:7px;color:#0b1220;font-size:23px;font-weight:760}
.preview-detail-card{margin-bottom:12px;padding:16px;border-radius:22px;background:rgba(255,255,255,.58);border:1px solid rgba(255,255,255,.74);box-shadow:inset 0 1px 0 rgba(255,255,255,.85)}
.preview-detail-top{display:flex;justify-content:space-between;gap:14px;margin-bottom:12px}.preview-detail-top b{font-size:20px;color:#111827}.preview-detail-top .money{color:#059447;white-space:nowrap}
.preview-detail-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.preview-field{padding:10px 12px;border-radius:16px;background:rgba(255,255,255,.46)}
.preview-field span{display:block;color:#7b8797;font-size:11px;font-weight:650}.preview-field b{display:block;margin-top:5px;color:#172033;font-size:14px;word-break:break-word}
@media(max-width:720px){.preview-modal{padding:12px}.preview-panel{border-radius:26px;max-height:92vh}.preview-anchor-row,.preview-detail-grid{grid-template-columns:1fr}.preview-detail-top{display:block}}
pre{white-space:pre-wrap;background:#111827;color:#e5e7eb;padding:22px;border-radius:22px;max-height:440px;overflow:auto;font-family:Consolas,"JetBrains Mono",monospace}
@media(max-width:720px){.appbar{height:58px;padding:0 16px}.appbar strong{font-size:22px}.brand{padding:16px}.badge{width:56px;height:56px}.word{font-size:26px}.actions{gap:8px}.operator{position:absolute;right:16px;top:70px;background:rgba(255,255,255,.9);border:1px solid var(--line);border-radius:14px;padding:7px}.pill{font-size:14px;padding:10px 13px}.tabs{padding:0 16px 14px}.tab{min-width:124px;height:70px;font-size:20px}.tab .en{font-size:10px}.wrap{padding:38px 16px 90px}.page-title{font-size:38px}.page-title .en{font-size:16px}.page-sub{font-size:17px}.grid,.grid3,.event-grid,.summary,.kpi-grid{grid-template-columns:1fr}.ctx{grid-template-columns:1fr 1fr}.body{padding:18px}.head{padding:18px}.title{font-size:21px}.preview-entry{grid-template-columns:1fr}}
/* Responsive premium layer: desktop, foldable/tablet, phone */
:root{
  --glass:rgba(255,255,255,.66);
  --glass-strong:rgba(255,255,255,.78);
  --glass-line:rgba(255,255,255,.72);
  --ink:#111827;
  --halo:0 24px 70px rgba(31,41,55,.14);
  --inner:inset 0 1px 0 rgba(255,255,255,.88);
}
body{
  font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","SF Pro Text","PingFang SC","Microsoft YaHei",sans-serif;
  background:
    radial-gradient(circle at 10% -8%,rgba(255,255,255,.95),transparent 30rem),
    radial-gradient(circle at 86% 6%,rgba(18,183,106,.22),transparent 28rem),
    radial-gradient(circle at 12% 72%,rgba(26,115,232,.12),transparent 24rem),
    linear-gradient(145deg,#f7fbf9 0%,#eef7f3 42%,#e9f0ef 100%);
}
body:before{
  content:"";
  position:fixed;
  inset:0;
  pointer-events:none;
  z-index:-1;
  background:
    linear-gradient(90deg,rgba(255,255,255,.28) 1px,transparent 1px),
    linear-gradient(180deg,rgba(255,255,255,.20) 1px,transparent 1px);
  background-size:44px 44px;
  mask-image:linear-gradient(180deg,rgba(0,0,0,.45),transparent 70%);
}
.top,.card,.step,.kpi-card,.ctx div,.context-note,.preview-entry,.task,.hint{
  backdrop-filter:blur(28px) saturate(170%);
  -webkit-backdrop-filter:blur(28px) saturate(170%);
  box-shadow:var(--halo),var(--inner);
}
.top{
  background:linear-gradient(120deg,rgba(255,255,255,.76),rgba(239,250,246,.68));
... [truncated 3201 more lines]
```


### 2.5 Frontend Auth And Storage References

Command: `rg -n "localStorage|sessionStorage|/api/me|/auth/login|logout|readonly_admin|admin_readonly|role" deploy-worker/public --glob "*.{html,js}"`


```text
deploy-worker/public\unified-login.html:302:        <button class="btn ghost" id="logoutButton" type="button">清除会话</button>
deploy-worker/public\unified-login.html:305:    <div class="status" id="status" role="status" hidden></div>
deploy-worker/public\unified-login.html:314:const OWNER_ROLES = new Set(["owner", "manager", "admin", "admin_readonly", "readonly_admin"]);
deploy-worker/public\unified-login.html:315:const OWNER_ACCOUNT_IDS = new Set(["owner", "manager", "admin", "admin_readonly", "readonly_admin"]);
deploy-worker/public\unified-login.html:325:const logoutButton = document.getElementById("logoutButton");
deploy-worker/public\unified-login.html:345:function destinationForRole(role) {
deploy-worker/public\unified-login.html:346:  const normalized = String(role || "").trim().toLowerCase();
deploy-worker/public\unified-login.html:358:  const remembered = localStorage.getItem(REMEMBER_ACCOUNT_KEY) || "";
deploy-worker/public\unified-login.html:367:  if (rememberAccount.checked && account) localStorage.setItem(REMEMBER_ACCOUNT_KEY, account);
deploy-worker/public\unified-login.html:368:  else localStorage.removeItem(REMEMBER_ACCOUNT_KEY);
deploy-worker/public\unified-login.html:374:  const token = localStorage.getItem("homelink:cloud_token");
deploy-worker/public\unified-login.html:386:  const { response, body } = await requestJson("/api/me", { method: "GET" });
deploy-worker/public\unified-login.html:393:  const destination = destinationForRole(me?.role);
deploy-worker/public\unified-login.html:436:      authResult = await requestJson("/auth/login", {
deploy-worker/public\unified-login.html:450:    // Do not trust the login response role. /api/me is the routing authority.
deploy-worker/public\unified-login.html:464:  logoutButton.disabled = true;
deploy-worker/public\unified-login.html:466:    await requestJson("/auth/logout", { method: "POST" });
deploy-worker/public\unified-login.html:470:    "homelink:role",
deploy-worker/public\unified-login.html:472:    "owner:role",
deploy-worker/public\unified-login.html:482:    localStorage.removeItem(key);
deploy-worker/public\unified-login.html:483:    sessionStorage.removeItem(key);
deploy-worker/public\unified-login.html:485:  if (rememberAccount.checked) accountId.value = localStorage.getItem(REMEMBER_ACCOUNT_KEY) || accountId.value;
deploy-worker/public\unified-login.html:487:    localStorage.removeItem(REMEMBER_ACCOUNT_KEY);
deploy-worker/public\unified-login.html:493:  logoutButton.disabled = false;
deploy-worker/public\unified-login.html:498:  if (!rememberAccount.checked) localStorage.removeItem(REMEMBER_ACCOUNT_KEY);
deploy-worker/public\unified-login.html:500:logoutButton.addEventListener("click", clearSession);
deploy-worker/public\portal.html:138:      <button class="ghost" id="logoutButton" type="button">退出当前会话</button>
deploy-worker/public\portal.html:140:    <div class="status" id="status" role="status" aria-live="polite"></div>
deploy-worker/public\portal.html:146:const ADMIN_ROLES=new Set(["readonly_admin","admin_readonly"]);
deploy-worker/public\portal.html:156:const logoutButton=document.getElementById("logoutButton");
deploy-worker/public\portal.html:164:function destinationForRole(role){
deploy-worker/public\portal.html:165:  const r=String(role||"").trim().toLowerCase();
deploy-worker/public\portal.html:173:  const token=localStorage.getItem("homelink:cloud_token");
deploy-worker/public\portal.html:180:  const{response,body}=await requestJson("/api/me",{method:"GET"});
deploy-worker/public\portal.html:186:  const target=destinationForRole(me?.role);
deploy-worker/public\portal.html:232:      : await requestJson("/auth/login",{method:"POST",body:JSON.stringify({username:account||browserUsername.value,password})});
deploy-worker/public\portal.html:244:async function logout(){
deploy-worker/public\portal.html:245:  logoutButton.disabled=true;
deploy-worker/public\portal.html:246:  try{await requestJson("/auth/logout",{method:"POST"})}catch{}
deploy-worker/public\portal.html:247:  ["homelink:cloud_token","homelink:role","owner:role","empv3:user","empv3:operator"].forEach(key=>{
deploy-worker/public\portal.html:248:    localStorage.removeItem(key);
deploy-worker/public\portal.html:249:    sessionStorage.removeItem(key);
deploy-worker/public\portal.html:253:  logoutButton.disabled=false;
deploy-worker/public\portal.html:257:logoutButton.addEventListener("click",logout);
deploy-worker/public\index.html:35:.role-badge.staff{background:var(--blue-dim);color:var(--blue);border:1px solid rgba(26,115,232,0.2)}
deploy-worker/public\index.html:36:.role-badge.manager{background:var(--accent-dim);color:var(--accent);border:1px solid var(--accent-b)}
deploy-worker/public\index.html:37:.role-badge{font-size:10px;padding:3px 9px;border-radius:20px;font-family:JetBrains Mono,monospace;font-weight:600;white-space:nowrap}
deploy-worker/public\index.html:38:.role-badge.staff{background:var(--blue-dim);color:var(--blue);border:1px solid rgba(86,204,242,0.2)}
deploy-worker/public\index.html:39:.role-badge.manager{background:var(--accent-dim);color:var(--accent);border:1px solid var(--accent-b)}
deploy-worker/public\index.html:640:.role-badge{
deploy-worker/public\index.html:811:.mono,.role-badge,.card-sub,.kpi-lbl,.field label,.inp,.ta,.hist-anchor,.hist-toolbar,.hist-month-meta,.hist-month-chip,.hist-order,.ana-kpi-lbl,.detail-row .room,.tx-table thead th,.chip,.hint,footer,.page-sub,.code-inp{
deploy-worker/public\index.html:861:  .role-badge{font-size:12px;padding:6px 12px}
deploy-worker/public\index.html:1142:.owner-ui-unified .role-badge{
deploy-worker/public\index.html:1354:  .owner-ui-unified .role-badge{display:none!important}
deploy-worker/public\index.html:1459:      <span class="role-badge" id="roleBadge" hidden aria-hidden="true"></span>
deploy-worker/public\index.html:1461:      <button class="btn btn-ghost" style="padding:6px 10px;font-size:12px" onclick="logout()" title="退出登录"><svg class="ico"><use href="#i-lock"/></svg></button>
deploy-worker/public\index-51.html:35:.role-badge.staff{background:var(--blue-dim);color:var(--blue);border:1px solid rgba(26,115,232,0.2)}
deploy-worker/public\index-51.html:36:.role-badge.manager{background:var(--accent-dim);color:var(--accent);border:1px solid var(--accent-b)}
deploy-worker/public\index-51.html:37:.role-badge{font-size:10px;padding:3px 9px;border-radius:20px;font-family:JetBrains Mono,monospace;font-weight:600;white-space:nowrap}
deploy-worker/public\index-51.html:38:.role-badge.staff{background:var(--blue-dim);color:var(--blue);border:1px solid rgba(86,204,242,0.2)}
deploy-worker/public\index-51.html:39:.role-badge.manager{background:var(--accent-dim);color:var(--accent);border:1px solid var(--accent-b)}
deploy-worker/public\index-51.html:640:.role-badge{
deploy-worker/public\index-51.html:811:.mono,.role-badge,.card-sub,.kpi-lbl,.field label,.inp,.ta,.hist-anchor,.hist-toolbar,.hist-month-meta,.hist-month-chip,.hist-order,.ana-kpi-lbl,.detail-row .room,.tx-table thead th,.chip,.hint,footer,.page-sub,.code-inp{
deploy-worker/public\index-51.html:861:  .role-badge{font-size:12px;padding:6px 12px}
deploy-worker/public\index-51.html:1142:.owner-ui-unified .role-badge{
deploy-worker/public\index-51.html:1354:  .owner-ui-unified .role-badge{display:none!important}
deploy-worker/public\index-51.html:1459:      <span class="role-badge" id="roleBadge" hidden aria-hidden="true"></span>
deploy-worker/public\index-51.html:1461:      <button class="btn btn-ghost" style="padding:6px 10px;font-size:12px" onclick="logout()" title="退出登录"><svg class="ico"><use href="#i-lock"/></svg></button>
deploy-worker/public\employee-v2.html:27:.top-actions{display:flex;align-items:center;gap:14px}.role-pill{border:1.5px solid rgba(9,166,79,.23);color:var(--accent2);background:#fff;border-radius:999px;padding:13px 22px;font-size:20px;font-weight:900;box-shadow:var(--soft)}.control-pill{border:0;color:#fff;background:linear-gradient(180deg,#10ad5a,#078d42);border-radius:999px;padding:15px 28px;font-size:20px;font-weight:900;box-shadow:0 10px 24px rgba(9,166,79,.22)}.lock-pill{width:70px;height:62px;border:1.5px solid var(--border);background:#fff;border-radius:24px;color:#2f3948;font-size:28px;display:grid;place-items:center;box-shadow:var(--soft)}
deploy-worker/public\employee-v2.html:50:@media(max-width:720px){.mobile-appbar{height:58px;padding:0 16px}.mobile-appbar strong{font-size:22px}.mobile-appbar .back,.mobile-appbar .dots{font-size:30px}.brand{padding:16px}.logo-badge{width:56px;height:56px;border-radius:14px;font-size:13px}.logo-badge .sm{font-size:10px}.logo-text{font-size:26px}.top-actions{gap:8px}.role-pill,.control-pill{font-size:14px;padding:10px 13px}.lock-pill{display:none}.operator{position:absolute;right:16px;top:72px;background:rgba(255,255,255,.86);border:1px solid var(--border);border-radius:14px;padding:7px}.tabs{padding:0 16px 14px}.tab{min-width:132px;height:72px;font-size:21px;gap:8px}.tab .en-sub{font-size:11px}.wrap{padding:42px 16px 90px}.page-title{font-size:40px}.page-title .en-sub{font-size:17px;margin-top:14px}.page-sub{font-size:18px;margin-bottom:24px}.head{padding:18px 18px}.title{font-size:21px}.body{padding:18px}.grid2{grid-template-columns:1fr}.ctx{grid-template-columns:1fr 1fr}.card{border-radius:24px}.btn{padding:15px 16px}}
deploy-worker/public\employee-v2.html:67:      <span class="role-pill">员工</span>
deploy-worker/public\employee-v2.html:148:const state={lockCards:[],drafts:JSON.parse(localStorage.getItem('emp:drafts')||'[]'),tasks:[],currentBed:null};
deploy-worker/public\employee-v2.html:152:function saveDrafts(){localStorage.setItem('emp:drafts',JSON.stringify(state.drafts))}
deploy-worker/public\employee-v2.html:153:function operatorId(){return $('operatorId').value.trim()||localStorage.getItem('emp:operator')||'EMP'}
deploy-worker/public\employee-v2.html:154:function setOperator(v){localStorage.setItem('emp:operator',v||'EMP')}
deploy-worker/public\employee-v2.html:351:  localStorage.setItem('emp:task_updates',JSON.stringify(state.tasks));
deploy-worker/public\employee-v2.html:361:$('operatorId').value=localStorage.getItem('emp:operator')||'';
deploy-worker/public\employee-v3.html:1908:    const scoped=JSON.parse(localStorage.getItem(key)||'[]')||[];
deploy-worker/public\employee-v3.html:1910:    const legacy=JSON.parse(localStorage.getItem('empv3:drafts')||'[]')||[];
deploy-worker/public\employee-v3.html:1911:    if(legacy.length&&!localStorage.getItem('empv3:legacyDraftsMigrated')){
deploy-worker/public\employee-v3.html:1912:      localStorage.setItem(key,JSON.stringify(legacy));
deploy-worker/public\employee-v3.html:1913:      localStorage.setItem('empv3:legacyDraftsMigrated',userid);
deploy-worker/public\employee-v3.html:1920:  try{return localStorage.getItem(employeeStorageKey('empv3:sessionId',userid))||''}
deploy-worker/public\employee-v3.html:1931:  const r=await apiFetch('/api/me',{method:'GET'});
deploy-worker/public\employee-v3.html:1937:  ['empv3:user','empv3:operator','homelink:cloud_token','homelink:role','homelink:user','owner:role','owner:user'].forEach(k=>{
deploy-worker/public\employee-v3.html:1938:    try{localStorage.removeItem(k)}catch{}
deploy-worker/public\employee-v3.html:1939:    try{sessionStorage.removeItem(k)}catch{}
deploy-worker/public\employee-v3.html:1989:function operatorId(){return state.user?.userid||$('operatorId').value.trim()||localStorage.getItem('empv3:operator')||'EMP'}
deploy-worker/public\employee-v3.html:1991:function setOperator(v){try{localStorage.setItem('empv3:operator',v||'EMP')}catch{}}
deploy-worker/public\employee-v3.html:1995:    localStorage.setItem(employeeStorageKey('empv3:drafts'),JSON.stringify(state.drafts));
deploy-worker/public\employee-v3.html:1996:    if(state.sessionId)localStorage.setItem(employeeStorageKey('empv3:sessionId'),state.sessionId);
deploy-worker/public\employee-v3.html:2005:    try{localStorage.setItem(employeeStorageKey('empv3:sessionId'),state.sessionId)}catch{}
deploy-worker/public\employee-v3.html:2041:    try{localStorage.setItem('empv3:lastEmployeeId',user.userid||'')}catch{}
deploy-worker/public\employee-v3.html:2053:    try{localStorage.removeItem('empv3:user')}catch{}
deploy-worker/public\employee-v3.html:2054:    try{localStorage.removeItem('empv3:operator')}catch{}
deploy-worker/public\employee-v3.html:2062:    const cached=JSON.parse(localStorage.getItem('empv3:user')||'null');
deploy-worker/public\employee-v3.html:2063:    const last=localStorage.getItem('empv3:lastEmployeeId')||cached?.userid||localStorage.getItem('empv3:operator')||'';
deploy-worker/public\employee-v3.html:2065:    localStorage.removeItem('empv3:user');
deploy-worker/public\employee-v3.html:2081:    applyEmployeeUser({userid:data.userid,employee_name:data.employee_name||data.userid,role:data.role});
deploy-worker/public\employee-v3.html:2666:  try{localStorage.removeItem(employeeStorageKey('empv3:sessionId'))}catch{}
deploy-worker/public\employee-v3.html:3076:$('bed').addEventListener('input',lookupBed);$('tenantCardId').addEventListener('change',e=>{state.depositBalance=null;if(e.target.value.trim())loadDepositBalance(e.target.value.trim());else renderContext();});$('btnLoadLock').onclick=loadLock;$('btnSaveEntry').onclick=saveEntry;$('btnReset').onclick=()=>{resetForm();showStatus('表单已清空。');toast('表单已清空')};$('btnRefreshTasks').onclick=refreshFollowup;$('btnBuildExport').onclick=commitSessionAndExport;$('btnCopyExport').onclick=async()=>{try{await navigator.clipboard.writeText($('exportText').textContent);showStatus('导出文本已复制。');toast('已复制')}catch{showStatus('复制失败，请手动选择导出文本。','warn');toast('复制失败，请手动选择文本',6000)}};$('btnClearLocal').onclick=()=>{if(hasLocalOnly()){showStatus('仍有云端未确认记录，不能清空。','warn');toast('仍有云端未确认记录，不能清空',6000);return}if(confirm('清空本机草稿？')){state.drafts=[];saveDrafts();buildExport();refreshSessionViews();showStatus('本机草稿已清空。');toast('已清空')}};$('btnNewSessionTop').onclick=newSession;$('btnPreviewSession').onclick=previewSession;$('btnExportSession').onclick=commitSessionAndExport;$('operatorId').value=localStorage.getItem('empv3:operator')||'';$('operatorId').onchange=e=>{setOperator(e.target.value.trim());refreshSessionViews();showStatus('员工编号已更新。')};
deploy-worker/public\employee-v3.html:3251:    const cached=JSON.parse(localStorage.getItem('empv3:user')||'null');
deploy-worker/public\employee-v3.html:3252:    const last=localStorage.getItem('empv3:lastEmployeeId')||cached?.userid||localStorage.getItem('empv3:operator')||'';
deploy-worker/public\employee-v3.html:3254:    localStorage.removeItem('empv3:user');
deploy-worker/public\employee-v3.html:3261:    if(isEmployeeAuthRole(me.role)){
deploy-worker/public\employee-v3.html:3269:        role:me.role
deploy-worker/public\employee-v3.html:3274:    if(isOwnerAuthRole(me.role)){
deploy-worker/public\employee-v3.html:3278:    redirectToUnifiedLogin('employee_role_denied');
deploy-worker/public\index-51-main.js:58:function isReadonlyAdminRole(r){return ['admin_readonly','readonly_admin'].includes(normalizeAuthRole(r));}
deploy-worker/public\index-51-main.js:59:function isOwnerAppRole(r){return ['manager','owner','admin','admin_readonly','readonly_admin'].includes(normalizeAuthRole(r));}
deploy-worker/public\index-51-main.js:61:function toOwnerSpaRole(r){return isReadonlyAdminRole(r)?'readonly_admin':isOwnerAppRole(r)?'manager':normalizeAuthRole(r);}
deploy-worker/public\index-51-main.js:62:function isOwnerShellRole(){return role==='manager'||role==='readonly_admin';}
deploy-worker/public\index-51-main.js:63:function isOwnerWriteRole(){return role==='manager';}
deploy-worker/public\index-51-main.js:68:    'homelink:role',
deploy-worker/public\index-51-main.js:70:    'owner:role',
deploy-worker/public\index-51-main.js:81:    try{localStorage.removeItem(k)}catch{}
deploy-worker/public\index-51-main.js:82:    try{sessionStorage.removeItem(k)}catch{}
deploy-worker/public\index-51-main.js:90:  const r=await apiFetch('/api/me',{method:'GET'});
deploy-worker/public\index-51-main.js:133:  document.body.classList.toggle('readonly-admin',appRole==='readonly_admin');
deploy-worker/public\index-51-main.js:137:  const badge=document.getElementById('roleBadge');
deploy-worker/public\index-51-main.js:139:  const canReadOwner=appRole==='manager'||appRole==='readonly_admin';
deploy-worker/public\index-51-main.js:158:  if(role!=='readonly_admin')return false;
deploy-worker/public\index-51-main.js:163:  const readonly=role==='readonly_admin';
deploy-worker/public\index-51-main.js:191:    if(isOwnerAppRole(me.role)){
deploy-worker/public\index-51-main.js:192:      await enterAs(toOwnerSpaRole(me.role));
deploy-worker/public\index-51-main.js:195:    if(isEmployeeAppRole(me.role)){
deploy-worker/public\index-51-main.js:199:    console.warn('[UnifiedLogin] unsupported role for owner app');
deploy-worker/public\index-51-main.js:200:    redirectToUnifiedLogin('owner_role_denied');
deploy-worker/public\index-51-main.js:210:  role=null;
deploy-worker/public\index-51-main.js:233:        let v=sessionStorage.getItem(k);
deploy-worker/public\index-51-main.js:235:          v=localStorage.getItem(k);
deploy-worker/public\index-51-main.js:236:          if(v!=null){sessionStorage.setItem(k,v);localStorage.removeItem(k);}
deploy-worker/public\index-51-main.js:240:      return localStorage.getItem(k);
deploy-worker/public\index-51-main.js:243:  set(k,v){try{if(isSensitiveStorageKey(k)){sessionStorage.setItem(k,v);localStorage.removeItem(k);}else localStorage.setItem(k,v)}catch{}},
deploy-worker/public\index-51-main.js:244:  del(k){try{sessionStorage.removeItem(k);localStorage.removeItem(k)}catch{}},
deploy-worker/public\index-51-main.js:248:      if(isSensitiveStorageKey(p)||p==='session:'||p==='anchor:')Object.keys(sessionStorage).forEach(k=>{if(k.startsWith(p))ks.add(k)});
deploy-worker/public\index-51-main.js:249:      Object.keys(localStorage).forEach(k=>{if(k.startsWith(p)){if(isSensitiveStorageKey(k)){const v=localStorage.getItem(k);if(v!=null)sessionStorage.setItem(k,v);localStorage.removeItem(k);ks.add(k);}else ks.add(k);}});
deploy-worker/public\index-51-main.js:269:let role=null;
deploy-worker/public\index-51-main.js:274:  role=toOwnerSpaRole(r);
deploy-worker/public\index-51-main.js:275:  showOwnerAppShell(role);
deploy-worker/public\index-51-main.js:285:async function logout(){
deploy-worker/public\index-51-main.js:288:    const logoutUrl=apiUrl('/auth/logout');
deploy-worker/public\index-51-main.js:291:    await fetch(logoutUrl,{method:'POST',headers,credentials:'include'});
deploy-worker/public\index-51-main.js:298:  role=null;
deploy-worker/public\index-51-main.js:340:        if(r.ok&&d.role==='manager'){ov.remove();resolve(true);}
deploy-worker/public\index-51-main.js:644:  // Load customers from authenticated cloud storage first; keep sessionStorage only as a short-lived fallback.
deploy-worker/public\index-51-main.js:660:  // 欠款：从云端 API 加载（优先），失败则降级 localStorage
deploy-worker/public\index-51-main.js:931:    saveArrears();        // 同步到本地 localStorage
deploy-worker/public\index-51-main.js:2860:  if(denyReadonlyAdminWrite())throw new Error('readonly_admin_denied');
deploy-worker/public\index-51-main.js:3538:  if(denyReadonlyAdminWrite())return{ok:0,fail:sessions?.length||0,errors:['readonly_admin_denied']};
deploy-worker/public\index-51-main.js:4678:  if(role==='staff'&&(v==='overview'||v==='history'||v==='analysis'||v==='clients'||v==='wifi')){toast('员工账户无此权限','err');return;}
deploy-worker/public\index-51-main.js:4706:  document.querySelector('.topbar-right .btn-ghost')?.addEventListener('click',e=>{e.preventDefault();logout();});
deploy-worker/public\index-51-main.js:4779:  'submitCode','openPanel','logout','showSettings','switchImportTab','calcDeficit','calcDepDeficit','ccRender','ccShowAddCustomer',
```


### 2.6 Route And Location References

Command: `rg -n "location\.|window\.location|href=|/employee-v3.html|/unified-login.html|/index.html|/owner|/employee|/admin" deploy-worker/public --glob "*.{html,js}"`


```text
deploy-worker/public\unified-login.html:7:<link rel="stylesheet" href="./shared-design-tokens.css">
deploy-worker/public\unified-login.html:311:const EMPLOYEE_DESTINATION = "./employee-v3.html";
deploy-worker/public\unified-login.html:312:const OWNER_DESTINATION = "./index.html";
deploy-worker/public\unified-login.html:330:  const servedOverHttp = location.protocol === "http:" || location.protocol === "https:";
deploy-worker/public\unified-login.html:342:  return new URLSearchParams(location.search).get("auto") === "1";
deploy-worker/public\unified-login.html:399:  const nav = options.replace ? location.replace.bind(location) : location.assign.bind(location);
deploy-worker/public\unified-login.html:441:      authResult = await requestJson("/auth/employee-login", {
deploy-worker/public\portal.html:166:  if(EMPLOYEE_ROLES.has(r))return"/employee";
deploy-worker/public\portal.html:167:  if(ADMIN_ROLES.has(r))return"/admin";
deploy-worker/public\portal.html:168:  if(OWNER_ROLES.has(r))return"/owner";
deploy-worker/public\portal.html:188:  location.replace(target);
deploy-worker/public\portal.html:231:      ? await requestJson("/auth/employee-login",{method:"POST",body:JSON.stringify({employee_id:account,pin:password})})
deploy-worker/public\portal.html:258:const initialPortal=new URLSearchParams(location.search).get("portal");
deploy-worker/public\index.html:7:<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
deploy-worker/public\index.html:8:<link rel="stylesheet" href="./shared-design-tokens.css">
deploy-worker/public\index.html:1460:      <button class="btn btn-primary owner-dashboard-btn" id="btnDashboard" style="display:none" onclick="openPanel()" aria-label="打开控制台"><svg class="ico"><use href="#i-chart"/></svg><span class="btn-label">控制台</span></button>
deploy-worker/public\index.html:1461:      <button class="btn btn-ghost" style="padding:6px 10px;font-size:12px" onclick="logout()" title="退出登录"><svg class="ico"><use href="#i-lock"/></svg></button>
deploy-worker/public\index.html:1467:      <button class="nav-btn active" data-view="overview" id="navOverview"><svg class="ico"><use href="#i-chart"/></svg>总览<span class="en-sub">OVERVIEW</span></button>
deploy-worker/public\index.html:1468:      <button class="nav-btn" data-view="history" id="navHistory"><svg class="ico"><use href="#i-history"/></svg>历史<span class="en-sub">HISTORY</span></button>
deploy-worker/public\index.html:1469:      <button class="nav-btn locked" data-view="analysis" id="navAnalysis"><svg class="ico"><use href="#i-trend"/></svg>分析<span class="en-sub">ANALYTICS</span></button>
deploy-worker/public\index.html:1470:      <button class="nav-btn locked" data-view="clients" id="navClients"><svg class="ico"><use href="#i-users"/></svg>客户<span class="en-sub">CLIENTS</span></button>
deploy-worker/public\index.html:1471:      <button class="nav-btn locked" data-view="wifi" id="navWifi"><svg class="ico"><use href="#i-spark"/></svg>网络<span class="en-sub">NETWORK</span></button>
deploy-worker/public\index.html:1579:            <button class="btn btn-primary btn-block" id="btnAdd"><svg class="ico"><use href="#i-plus"/></svg><span id="btnAddText">添加记录</span></button>
deploy-worker/public\index.html:1588:            <button class="btn btn-ghost" id="btnPreview"><svg class="ico"><use href="#i-eye"/></svg>预览<span class="en-sub">PREVIEW</span></button>
deploy-worker/public\index.html:1589:            <button class="btn btn-ghost" id="btnNewSession"><svg class="ico"><use href="#i-plus"/></svg>新会话<span class="en-sub">NEW SESSION</span></button>
deploy-worker/public\index.html:1590:            <button class="btn btn-primary" id="btnExport"><svg class="ico"><use href="#i-download"/></svg>导出交接<span class="en-sub">EXPORT</span></button>
deploy-worker/public\index.html:1708:      <button class="btn btn-ghost hl-button hl-button-secondary cc-refresh-btn" onclick="ccRender(true)"><svg class="ico"><use href="#i-refresh"/></svg>刷新</button>
deploy-worker/public\index-51.html:7:<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
deploy-worker/public\index-51.html:8:<link rel="stylesheet" href="./shared-design-tokens.css">
deploy-worker/public\index-51.html:1460:      <button class="btn btn-primary owner-dashboard-btn" id="btnDashboard" style="display:none" onclick="openPanel()" aria-label="打开控制台"><svg class="ico"><use href="#i-chart"/></svg><span class="btn-label">控制台</span></button>
deploy-worker/public\index-51.html:1461:      <button class="btn btn-ghost" style="padding:6px 10px;font-size:12px" onclick="logout()" title="退出登录"><svg class="ico"><use href="#i-lock"/></svg></button>
deploy-worker/public\index-51.html:1467:      <button class="nav-btn active" data-view="overview" id="navOverview"><svg class="ico"><use href="#i-chart"/></svg>总览<span class="en-sub">OVERVIEW</span></button>
deploy-worker/public\index-51.html:1468:      <button class="nav-btn" data-view="history" id="navHistory"><svg class="ico"><use href="#i-history"/></svg>历史<span class="en-sub">HISTORY</span></button>
deploy-worker/public\index-51.html:1469:      <button class="nav-btn locked" data-view="analysis" id="navAnalysis"><svg class="ico"><use href="#i-trend"/></svg>分析<span class="en-sub">ANALYTICS</span></button>
deploy-worker/public\index-51.html:1470:      <button class="nav-btn locked" data-view="clients" id="navClients"><svg class="ico"><use href="#i-users"/></svg>客户<span class="en-sub">CLIENTS</span></button>
deploy-worker/public\index-51.html:1471:      <button class="nav-btn locked" data-view="wifi" id="navWifi"><svg class="ico"><use href="#i-spark"/></svg>网络<span class="en-sub">NETWORK</span></button>
deploy-worker/public\index-51.html:1579:            <button class="btn btn-primary btn-block" id="btnAdd"><svg class="ico"><use href="#i-plus"/></svg><span id="btnAddText">添加记录</span></button>
deploy-worker/public\index-51.html:1588:            <button class="btn btn-ghost" id="btnPreview"><svg class="ico"><use href="#i-eye"/></svg>预览<span class="en-sub">PREVIEW</span></button>
deploy-worker/public\index-51.html:1589:            <button class="btn btn-ghost" id="btnNewSession"><svg class="ico"><use href="#i-plus"/></svg>新会话<span class="en-sub">NEW SESSION</span></button>
deploy-worker/public\index-51.html:1590:            <button class="btn btn-primary" id="btnExport"><svg class="ico"><use href="#i-download"/></svg>导出交接<span class="en-sub">EXPORT</span></button>
deploy-worker/public\index-51.html:1708:      <button class="btn btn-ghost hl-button hl-button-secondary cc-refresh-btn" onclick="ccRender(true)"><svg class="ico"><use href="#i-refresh"/></svg>刷新</button>
deploy-worker/public\index-51-main.js:38:  const sameWorker=location.protocol!=='file:'&&location.host==='homelink-finance.habibramadan888.workers.dev';
deploy-worker/public\index-51-main.js:87:  location.replace(target);
deploy-worker/public\index-51-main.js:196:      location.replace('/employee');
deploy-worker/public\index-51-main.js:1122:  return `<div class="entry-row" data-id="${item.id}" style="display:flex;align-items:flex-start;gap:8px;padding:10px 12px"><div style="flex-shrink:0;padding-top:1px">${badges}</div><div style="flex:1;min-width:0"><div style="display:flex;align-items:baseline"><span style="font-weight:700;font-size:15px;font-family:JetBrains Mono,monospace">${roomStr}</span>${amtSub}</div>${info}</div><div style="flex-shrink:0;text-align:right;padding-top:1px">${amtMain}<div class="entry-actions" style="margin-top:4px;justify-content:flex-end"><button class="icon-btn danger" data-action="del"><svg class="ico"><use href="#i-trash"/></svg></button></div></div></div>`;
deploy-worker/public\index-51-main.js:1430:  row.outerHTML=`<div class="row-edit" data-id="${id}"><input class="inp mono" data-f="room" value="${esc(item.room)}" placeholder="房号"><input class="inp mono" data-f="amount" value="${esc(item.amount)}" placeholder="金额">${!isExp?`<select class="sel" data-f="tag"><option${item.tag==='Old'?' selected':''}>Old</option><option${item.tag==='New'?' selected':''}>New</option></select>`:'<div></div>'}<input class="inp" data-f="note" value="${esc(item.note||'')}" placeholder="备注"><div class="row-edit-actions"><button class="icon-btn save" data-action="save"><svg class="ico"><use href="#i-check"/></svg></button><button class="icon-btn" data-action="cancel"><svg class="ico"><use href="#i-x"/></svg></button></div></div>`;
deploy-worker/public\index-51-main.js:1475:  const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;
deploy-worker/public\index-51-main.js:1493:  bg.innerHTML=`<div class="modal"><div class="modal-head"><div><div class="card-title">${esc(title)}</div><div class="card-sub">${esc(sub)}</div></div><div style="display:flex;gap:7px;flex-wrap:wrap">${actions.map((a,i)=>`<button class="btn btn-ghost" data-act="${i}"><svg class="ico"><use href="#${a.icon}"/></svg>${esc(a.label)}</button>`).join('')}<button class="icon-btn" data-act="close"><svg class="ico"><use href="#i-x"/></svg></button></div></div><div class="modal-body">${sanitizeHtml(html)}</div></div>`;
deploy-worker/public\index-51-main.js:1533:    wrap.innerHTML=`<button class="btn btn-ghost" id="btnHistBack" style="margin-bottom:14px"><svg class="ico"><use href="#i-back"/></svg>返回历史</button>
deploy-worker/public\index-51-main.js:1534:    <div class="card"><div class="card-head"><div>${s.anchorId?`<div class="card-sub" style="color:var(--accent);margin-bottom:3px">🔐 ${esc(s.anchorId)}</div>`:''}<div class="card-title">${esc((s.date||'').slice(0,10))}</div><div class="card-sub">${cnt} 笔记录</div></div><div style="display:flex;gap:7px"><button class="btn btn-ghost" id="btnHistCopy"><svg class="ico"><use href="#i-copy"/></svg>复制</button><button class="btn btn-primary" id="btnHistDl"><svg class="ico"><use href="#i-download"/></svg>下载</button></div></div><div class="card-body"><pre style="background:var(--surface2);padding:14px;border-radius:8px;max-height:60vh;overflow:auto;line-height:1.7;font-size:12px;color:var(--text2);border:1px solid var(--border)">${esc(txt)}</pre></div></div>`;
deploy-worker/public\index-51-main.js:1537:    document.getElementById('btnHistDl').onclick=()=>{const blob=new Blob([txt],{type:'text/plain;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`财务交接_${(s.date||'').split(' ')[0].replace(/-/g,'')}.txt`;a.click();URL.revokeObjectURL(url);};
deploy-worker/public\index-51-main.js:1610:        <button class="btn btn-ghost" data-act="view"><svg class="ico"><use href="#i-eye"/></svg>查看</button>
deploy-worker/public\index-51-main.js:1611:        ${isOwnerWriteRole()?`<button class="btn btn-danger" data-act="del"><svg class="ico"><use href="#i-trash"/></svg></button>`:''}
deploy-worker/public\index-51-main.js:1729:    return `<span class="chip${inf?'':' dim'}" data-anchor="${esc(s.anchorId)}">${esc((s.date||'').slice(0,10))} · ${s.entries.length}笔${s.isLegacy?' 旧':''}<button class="chip-x" data-act="rm"><svg class="ico" style="width:11px;height:11px"><use href="#i-x"/></svg></button></span>`;
deploy-worker/public\index-51-main.js:1730:  }).join('')+`<button class="btn btn-ghost" id="btnClearAna" style="margin-left:auto;padding:5px 10px;font-size:11px"><svg class="ico"><use href="#i-trash"/></svg>清空</button>`;
deploy-worker/public\index-51-main.js:3362:  const txBody=`<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:10px"><select class="sel" id="txCF" style="padding:7px 10px;font-size:12px;width:auto"><option value="all">全部</option><option value="cash">C 现金</option><option value="bank">B 银行</option><option value="refund">R 退款</option><option value="expense">E 支出</option><option value="tag:New">N 新入住</option><option value="tag:Transfer">T 换床位</option><option value="tag:Old">O 老租客</option><option value="ptype:discount">折扣</option><option value="ptype:installment">分期</option></select><div class="search-wrap"><svg class="ico"><use href="#i-search"/></svg><input class="inp" id="txS" placeholder="床位/备注" style="padding:7px 10px 7px 28px;font-size:12px;width:150px"></div><span id="txCounter" style="font-size:11px;color:var(--text3)"></span></div><div class="table-wrap" id="txWrap"></div>`;
deploy-worker/public\index-51-main.js:3381:  return `<div class="card"><div class="card-head"><div class="card-title"><svg class="ico" style="color:var(--accent)"><use href="#${icon}"/></svg>${title}</div><span style="font-size:11px;color:var(--text3)">${items.length}笔</span></div><div class="card-body">${items.length===0?`<div style="text-align:center;color:var(--text3);font-size:12px;padding:22px">${empty}</div>`:`<div class="detail-list">${items.map(e=>`<div class="detail-row">${rowFn(e)}</div>`).join('')}</div>`}</div></div>`;
deploy-worker/public\index-51-cp.js:281:  a.href=URL.createObjectURL(blob);
deploy-worker/public\index-51-cp.js:525:  const a=document.createElement('a');a.href=URL.createObjectURL(blob);
deploy-worker/public\employee.html:9:    location.replace("/?portal=employee");
deploy-worker/public\employee.html:14:  <p><a href="/?portal=employee">Open Homelink</a></p>
deploy-worker/public\employee-v2.html:149:function apiUrl(path){return location.protocol!=='file:'&&location.host.includes('workers.dev')?path:API_ORIGIN+path}
deploy-worker/public\employee-v2.html:248:    const r=await apiFetch('/api/employee/lock/cards');
deploy-worker/public\employee-v2.html:297:    let r=await apiFetch('/api/employee/entry',{method:'POST',body:JSON.stringify({entry:e,session})});
deploy-worker/public\employee-v3.html:7:<link rel="stylesheet" href="./shared-design-tokens.css">
deploy-worker/public\employee-v3.html:1924:function apiUrl(path){return location.protocol!=='file:'&&location.host.includes('workers.dev')?path:API_ORIGIN+path}
deploy-worker/public\employee-v3.html:1945:  location.replace(target);
deploy-worker/public\employee-v3.html:2078:    const r=await apiFetch('/auth/employee-login',{method:'POST',body:JSON.stringify({employee_id,pin})});
deploy-worker/public\employee-v3.html:2239:    const r=await apiFetch('/api/employee/deposit?cid='+encodeURIComponent(cid));
deploy-worker/public\employee-v3.html:2253:  try{const r=await apiFetch('/api/employee/lock/cards');if(!r.ok)throw new Error('HTTP '+r.status);const data=await r.json();const list=data.roomsData?Object.entries(data.roomsData).flatMap(([room,cards])=>(cards||[]).map(card=>({...card,room}))):[];state.lockCards=list.map(normalizeCard).filter(x=>x.bed);toast('已抓取通通锁 '+state.lockCards.length+' 条');lookupBed();return true}catch(e){toast('抓取失败，可继续手动录入');return false}
deploy-worker/public\employee-v3.html:3039:      const r=await apiFetch('/api/employee/entry',{method:'POST',body:JSON.stringify({entry:e,session:sessionForEntry})});
deploy-worker/public\employee-v3.html:3275:      location.replace('/owner');
```


## 3. Backend Architecture (Cloudflare Worker)


### 3.1 Worker Entrypoint Excerpt

File: `deploy-worker/src/index.js`


```text
﻿var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

import { createEmployeeEntryLiveWriteAdapterDraft } from "../../modules/worker/employee-entry-live-write-adapter.mjs";

// src/lib/jwt.js
var ALGO = { name: "HMAC", hash: "SHA-256" };
var DEFAULT_TTL_SECONDS = 8 * 60 * 60;
var READONLY_ADMIN_ROLES = /* @__PURE__ */ new Set(["admin_readonly", "readonly_admin"]);
function normalizeRoleValue(role) {
  return String(role || "").trim().toLowerCase();
}
__name(normalizeRoleValue, "normalizeRoleValue");
function isReadonlyAdminRoleValue(role) {
  return READONLY_ADMIN_ROLES.has(normalizeRoleValue(role));
}
__name(isReadonlyAdminRoleValue, "isReadonlyAdminRoleValue");
function isManagerRoleValue(role) {
  return normalizeRoleValue(role) === "manager";
}
__name(isManagerRoleValue, "isManagerRoleValue");
function isStaffRoleValue(role) {
  return ["staff", "employee"].includes(normalizeRoleValue(role));
}
__name(isStaffRoleValue, "isStaffRoleValue");
function isAllowedAuthRole(role) {
  return isManagerRoleValue(role) || isStaffRoleValue(role) || isReadonlyAdminRoleValue(role);
}
__name(isAllowedAuthRole, "isAllowedAuthRole");
function canReadOwnerData(user) {
  return isManagerRoleValue(user?.role) || isReadonlyAdminRoleValue(user?.role);
}
__name(canReadOwnerData, "canReadOwnerData");
function canWriteOwnerData(user) {
  return isManagerRoleValue(user?.role);
}
__name(canWriteOwnerData, "canWriteOwnerData");
function bytesToB64url(bytes) {
  let binary = "";
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.slice(i, i + chunk));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
__name(bytesToB64url, "bytesToB64url");
function b64urlToBytes(str) {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4;
  const binary = atob(pad ? padded + "=".repeat(4 - pad) : padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}
__name(b64urlToBytes, "b64urlToBytes");
function toB64url(str) {
  return bytesToB64url(new TextEncoder().encode(str));
}
__name(toB64url, "toB64url");
function fromB64url(str) {
  return new TextDecoder().decode(b64urlToBytes(str));
}
__name(fromB64url, "fromB64url");
async function importKey(secret, usage) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    ALGO,
    false,
    [usage]
  );
}
__name(importKey, "importKey");
async function signJWT(payload, secret, ttl = DEFAULT_TTL_SECONDS) {
  if (!secret) throw new Error("jwt_secret_missing");
  const now = Math.floor(Date.now() / 1e3);
  const header = toB64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const claims = toB64url(JSON.stringify({ ...payload, iat: now, exp: now + ttl }));
  const unsigned = `${header}.${claims}`;
  const key = await importKey(secret, "sign");
  const sigBuffer = await crypto.subtle.sign(ALGO, key, new TextEncoder().encode(unsigned));
  const sig = bytesToB64url(new Uint8Array(sigBuffer));
  return `${unsigned}.${sig}`;
}
__name(signJWT, "signJWT");
async function verifyJWT(token, secret, options = {}) {
  if (!secret) {
    throw new Error("jwt_secret_missing");
  }
  if (!token || typeof token !== "string") {
    throw new Error("malformed_token");
  }
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("malformed_token");
  let header;
  try {
    header = JSON.parse(fromB64url(parts[0]));
  } catch {
    throw new Error("malformed_token");
  }
  if (header.alg !== "HS256" || header.typ !== "JWT") {
    throw new Error("malformed_token");
  }
  const key = await importKey(secret, "verify");
  const sigBytes = b64urlToBytes(parts[2]);
  const isValid = await crypto.subtle.verify(
    ALGO,
    key,
    sigBytes,
    new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
  );
  if (!isValid) throw new Error("invalid_signature");
  let payload;
  try {
    payload = JSON.parse(fromB64url(parts[1]));
  } catch {
    throw new Error("malformed_token");
  }
  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1e3)) {
    throw new Error("token_expired");
  }
  if (!isAllowedAuthRole(payload.role) || !payload.corpid) {
    throw new Error("malformed_token");
  }
  return payload;
}
__name(verifyJWT, "verifyJWT");

// src/lib/password.js
var ITERATIONS = 1e5;
var KEY_BITS = 256;
async function hashPassword(password, salt) {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: new TextEncoder().encode(salt),
      iterations: ITERATIONS,
      hash: "SHA-256"
    },
    keyMaterial,
    KEY_BITS
  );
  return btoa(String.fromCharCode(...new Uint8Array(bits)));
}
__name(hashPassword, "hashPassword");
function bytesToHex(bytes) {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(bytesToHex, "bytesToHex");
async function hashPasswordHex(password, salt, keyBits = KEY_BITS) {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
... [truncated 2995 more lines]
```


### 3.2 Worker Function Anchors

Command: `rg -n "^function |^async function |const .* = async|export default|__name" deploy-worker/src/index.js`


```text
2:var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
10:function normalizeRoleValue(role) {
13:__name(normalizeRoleValue, "normalizeRoleValue");
14:function isReadonlyAdminRoleValue(role) {
17:__name(isReadonlyAdminRoleValue, "isReadonlyAdminRoleValue");
18:function isManagerRoleValue(role) {
21:__name(isManagerRoleValue, "isManagerRoleValue");
22:function isStaffRoleValue(role) {
25:__name(isStaffRoleValue, "isStaffRoleValue");
26:function isAllowedAuthRole(role) {
29:__name(isAllowedAuthRole, "isAllowedAuthRole");
30:function canReadOwnerData(user) {
33:__name(canReadOwnerData, "canReadOwnerData");
34:function canWriteOwnerData(user) {
37:__name(canWriteOwnerData, "canWriteOwnerData");
38:function bytesToB64url(bytes) {
46:__name(bytesToB64url, "bytesToB64url");
47:function b64urlToBytes(str) {
53:__name(b64urlToBytes, "b64urlToBytes");
54:function toB64url(str) {
57:__name(toB64url, "toB64url");
58:function fromB64url(str) {
61:__name(fromB64url, "fromB64url");
62:async function importKey(secret, usage) {
71:__name(importKey, "importKey");
72:async function signJWT(payload, secret, ttl = DEFAULT_TTL_SECONDS) {
83:__name(signJWT, "signJWT");
84:async function verifyJWT(token, secret, options = {}) {
125:__name(verifyJWT, "verifyJWT");
130:async function hashPassword(password, salt) {
150:__name(hashPassword, "hashPassword");
151:function bytesToHex(bytes) {
154:__name(bytesToHex, "bytesToHex");
155:async function hashPasswordHex(password, salt, keyBits = KEY_BITS) {
175:__name(hashPasswordHex, "hashPasswordHex");
176:function constantTimeEqual(a, b) {
190:__name(constantTimeEqual, "constantTimeEqual");
191:async function verifyPassword(inputPassword, storedHash, salt) {
201:__name(verifyPassword, "verifyPassword");
205:function getCookie(request, name = SESSION_COOKIE) {
210:__name(getCookie, "getCookie");
211:function getBearerToken(request) {
216:__name(getBearerToken, "getBearerToken");
217:function makeSessionCookie(token, maxAge = 8 * 60 * 60) {
227:__name(makeSessionCookie, "makeSessionCookie");
228:function clearSessionCookie() {
231:__name(clearSessionCookie, "clearSessionCookie");
232:async function requireAuth(request, env, requiredRole = null) {
279:__name(requireAuth, "requireAuth");
280:function requestOrigin(request) {
287:__name(requestOrigin, "requestOrigin");
288:function configuredOrigins(request, env = {}) {
300:__name(configuredOrigins, "configuredOrigins");
301:function isOriginValueAllowed(origin, request, env = {}) {
305:__name(isOriginValueAllowed, "isOriginValueAllowed");
306:function enforceTrustedOrigin(request, env = {}) {
324:__name(enforceTrustedOrigin, "enforceTrustedOrigin");
325:function corsOrigin(request, env = {}) {
329:__name(corsOrigin, "corsOrigin");
330:function makeNonce() {
336:__name(makeNonce, "makeNonce");
337:function securityHeaders(request, env = {}, nonce = "") {
366:__name(securityHeaders, "securityHeaders");
367:function applyCors(headers, request, env = {}) {
381:__name(applyCors, "applyCors");
382:function isHtmlResponse(headers) {
385:__name(isHtmlResponse, "isHtmlResponse");
386:async function withSecurityHeaders(response, request, env = {}) {
409:__name(withSecurityHeaders, "withSecurityHeaders");
410:function corsPreflightResponse(request, env = {}) {
420:__name(corsPreflightResponse, "corsPreflightResponse");
427:function json(data, status = 200, extraHeaders = {}) {
433:__name(json, "json");
434:function unauthorized(message = "unauthenticated") {
437:__name(unauthorized, "unauthorized");
438:function forbidden(message = "forbidden") {
441:__name(forbidden, "forbidden");
442:function badRequest(message = "bad_request") {
445:__name(badRequest, "badRequest");
446:function tooManyRequests(message = "too_many_attempts") {
449:__name(tooManyRequests, "tooManyRequests");
454:function clientIp(request) {
457:__name(clientIp, "clientIp");
458:async function checkRateLimit(request, env) {
466:__name(checkRateLimit, "checkRateLimit");
467:async function clearRateLimit(request, env) {
473:__name(clearRateLimit, "clearRateLimit");
474:async function ensureSessionTable(env) {
489:__name(ensureSessionTable, "ensureSessionTable");
490:async function createSession(request, env, user, ttlSeconds = 8 * 60 * 60) {
508:__name(createSession, "createSession");
509:async function revokeSession(request, env) {
522:__name(revokeSession, "revokeSession");
523:function parseUserAccounts(env) {
540:__name(parseUserAccounts, "parseUserAccounts");
541:async function resolveRole(password, env) {
552:__name(resolveRole, "resolveRole");
553:async function handleLogin(request, env) {
591:__name(handleLogin, "handleLogin");
592:async function ensureEmployeeUsers(env){
619:__name(ensureEmployeeUsers,"ensureEmployeeUsers");
620:async function handleEmployeePinLogin(request,env){
648:__name(handleEmployeePinLogin,"handleEmployeePinLogin");
649:async function handleConfirmManager(request, env) {
676:__name(handleConfirmManager, "handleConfirmManager");
677:async function handleLogout(request, env) {
690:__name(handleLogout, "handleLogout");
696:function bytesToB64(bytes) {
701:__name(bytesToB64, "bytesToB64");
702:function b64ToBytes(value) {
705:__name(b64ToBytes, "b64ToBytes");
706:async function encryptionKey(env = {}) {
712:__name(encryptionKey, "encryptionKey");
713:function isEncryptedSecret(value) {
716:__name(isEncryptedSecret, "isEncryptedSecret");
717:async function encryptSecret(value, env = {}) {
725:__name(encryptSecret, "encryptSecret");
726:async function decryptSecret(value, env = {}) {
743:__name(decryptSecret, "decryptSecret");
755:function requireManager(user) {
758:__name(requireManager, "requireManager");
759:async function audit(env, user, action, target = "", detail = {}) {
789:__name(audit, "audit");
790:function cleanText(value, max = MAX_TEXT) {
800:__name(cleanText, "cleanText");
801:function cleanId(value, max = 80) {
805:__name(cleanId, "cleanId");
806:function cleanDate(value) {
809:__name(cleanDate, "cleanDate");
810:function cleanMoney(value, min = 0, max = MAX_MONEY) {
815:__name(cleanMoney, "cleanMoney");
816:function cleanEnum(value, allowed, fallback = "") {
820:__name(cleanEnum, "cleanEnum");
821:function sanitizeEntry(entry) {
848:__name(sanitizeEntry, "sanitizeEntry");
849:function sanitizeArrear(arrear, sessionId, validEntryIds) {
864:__name(sanitizeArrear, "sanitizeArrear");
865:function sanitizeCustomer(customer) {
884:__name(sanitizeCustomer, "sanitizeCustomer");
885:async function decryptWifiAccounts(accounts, env) {
896:__name(decryptWifiAccounts, "decryptWifiAccounts");
897:async function encryptWifiAccounts(accounts, env) {
908:__name(encryptWifiAccounts, "encryptWifiAccounts");
909:function hasPlainWifiPasswords(accounts) {
915:__name(hasPlainWifiPasswords, "hasPlainWifiPasswords");
916:async function fetchJson(url, init) {
934:__name(fetchJson, "fetchJson");
935:async function fetchJsonOrNull(url, init) {
945:__name(fetchJsonOrNull, "fetchJsonOrNull");
946:async function loadLockCards(env) {
1031:__name(loadLockCards, "loadLockCards");
1063:async function empTableColumns(env, table){
1067:__name(empTableColumns,"empTableColumns");
1068:async function empTableExists(env, table){
1072:__name(empTableExists,"empTableExists");
1073:async function empAddColumn(env, table, col, ddl){
1079:__name(empAddColumn,"empAddColumn");
1080:async function empAddVoidColumns(env, table){
1086:__name(empAddVoidColumns,"empAddVoidColumns");
1087:async function empEnsureSchema(env){
1229:__name(empEnsureSchema,"empEnsureSchema");
1230:function empId(prefix){return prefix+"-"+Date.now().toString(36)+"-"+crypto.randomUUID().slice(0,8);}
1231:__name(empId,"empId");
1232:function empNow(){return new Date().toISOString();}
1233:__name(empNow,"empNow");
1234:function empDateParts(value){
1242:__name(empDateParts,"empDateParts");
1243:function empDateMs(value){
1247:__name(empDateMs,"empDateMs");
1248:function empFormatDate(dt){
1252:__name(empFormatDate,"empFormatDate");
1253:function empAddDays(dateStr,days){
1260:__name(empAddDays,"empAddDays");
1261:function empAddMonths(dateStr,months){
1270:__name(empAddMonths,"empAddMonths");
1271:function empTodayDubai(){
1280:__name(empTodayDubai,"empTodayDubai");
1281:function empDaysBetween(a,b){
1286:__name(empDaysBetween,"empDaysBetween");
1287:async function empInsertDynamic(env, table, values, allowed){
1298:__name(empInsertDynamic,"empInsertDynamic");
1299:async function empEvent(env,user,event){
1306:__name(empEvent,"empEvent");
1307:async function empDepositBalance(env, corpid, tenantCardId){
1313:__name(empDepositBalance,"empDepositBalance");
1314:async function empDepositMove(env,user,move){
1332:__name(empDepositMove,"empDepositMove");
1333:async function empReconcileArrearTask(env,user,taskId,operatorId,now){
1376:__name(empReconcileArrearTask,"empReconcileArrearTask");
1377:async function empEnsureOpenArrearTaskForPayment(env,user,taskId,operatorId,now){
1404:__name(empEnsureOpenArrearTaskForPayment,"empEnsureOpenArrearTaskForPayment");
1405:async function empRentConfig(env, corpid){
1417:__name(empRentConfig,"empRentConfig");
1418:async function empRentForBed(env, corpid, bed){
1424:__name(empRentForBed,"empRentForBed");
1425:async function handleEmployeeDeposit(request,env,user){
1433:__name(handleEmployeeDeposit,"handleEmployeeDeposit");
1434:async function handleEmployeeMigrate(request,env,user){
1440:__name(handleEmployeeMigrate,"handleEmployeeMigrate");
1441:async function handleEmployeeLockCards(request,env,user){
1447:__name(handleEmployeeLockCards,"handleEmployeeLockCards");
1448:async function handleEmployeeEntry(request,env,user){
1715:__name(handleEmployeeEntry,"handleEmployeeEntry");
1716:function empCloseStatusIsOpen(status){
1723:__name(empCloseStatusIsOpen,"empCloseStatusIsOpen");
1724:function empTaskRemaining(task){
1727:__name(empTaskRemaining,"empTaskRemaining");
1728:function empLegacyArrearToTask(a){
1740:__name(empLegacyArrearToTask,"empLegacyArrearToTask");
1741:function empTaskToBossArrear(t){
1768:__name(empTaskToBossArrear,"empTaskToBossArrear");
1769:async function empListMergedArrearTasks(env,user){
1800:__name(empListMergedArrearTasks,"empListMergedArrearTasks");
1801:async function handleBossArrears(request,env,user){
1805:__name(handleBossArrears,"handleBossArrears");
1806:async function empCloseArrearEverywhere(env,user,id,now){
1831:__name(empCloseArrearEverywhere,"empCloseArrearEverywhere");
1832:async function handleArrearTasks(request,env,user){
1836:__name(handleArrearTasks,"handleArrearTasks");
1837:async function handleArrearTaskUpdate(request,env,user){
... [truncated 76 more lines]
```


### 3.3 API Route Conditions

Command: `rg -n "path === \"/api/|path\.startsWith\(\"/api/|/auth/login|/api/me|method === \"POST\"|method === \"PUT\"|method === \"DELETE\"" deploy-worker/src/index.js`


```text

```


### 3.4 Auth / Role / Permission Implementation

Command: `rg -n "requireAuth|readRouteClaim|readSession|handleLogin|handleLogout|canWriteOwnerData|requireManager|readonly_admin|admin_readonly|canWrite|Set-Cookie|httpOnly|SameSite|Bearer" deploy-worker/src/index.js`


```text
9:var READONLY_ADMIN_ROLES = /* @__PURE__ */ new Set(["admin_readonly", "readonly_admin"]);
34:function canWriteOwnerData(user) {
37:__name(canWriteOwnerData, "canWriteOwnerData");
211:function getBearerToken(request) {
213:  const match = header.match(/^Bearer\s+(.+)$/i);
216:__name(getBearerToken, "getBearerToken");
224:    "SameSite=Strict"
229:  return `${SESSION_COOKIE}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Strict`;
232:async function requireAuth(request, env, requiredRole = null) {
233:  const token = getBearerToken(request) || getCookie(request);
279:__name(requireAuth, "requireAuth");
553:async function handleLogin(request, env) {
587:      "Set-Cookie": makeSessionCookie(token)
591:__name(handleLogin, "handleLogin");
644:      "Set-Cookie":makeSessionCookie(token,employeeTtl)
677:async function handleLogout(request, env) {
686:      "Set-Cookie": clearSessionCookie()
690:__name(handleLogout, "handleLogout");
755:function requireManager(user) {
756:  return canWriteOwnerData(user);
758:__name(requireManager, "requireManager");
1435:  if(!requireManager(user))return forbidden();
1844:  const isManager=requireManager(user);
1955:    if(!requireManager(user))return forbidden();
2281:  const auth=await requireAuth(request,env);
2480:  const auth=await requireAuth(request,env);
2525:async function readRouteClaim(request, env) {
2526:  const token = getBearerToken(request) || getCookie(request);
2534:__name(readRouteClaim, "readRouteClaim");
2560:  const claim = await readRouteClaim(request, env);
2593:    return handleLogin(request, env);
2599:    const auth = await requireAuth(request, env);
2604:    return handleLogout(request, env);
2613:    const auth = await requireAuth(request, env);
2634:        canWrite: canWriteOwnerData(user)
2641:      if (!requireManager(user)) return forbidden();
2666:        if (canWriteOwnerData(user)) await audit(env, user, "lock.cards.load", "", { locksCount: result.locksCount });
2674:      if (canWriteOwnerData(user)) {
2701:      if (hasPlainWifiPasswords(accounts) && canWriteOwnerData(user)) {
2718:      if (!requireManager(user)) return forbidden();
2764:      if (canWriteOwnerData(user)) {
2799:      if (!requireManager(user)) return forbidden();
2831:      if (canWriteOwnerData(user)) {
2861:      if (!requireManager(user)) return forbidden();
2895:      if (!requireManager(user)) return forbidden();
2996:      if (!requireManager(user)) return forbidden();
3095:      if (!requireManager(user)) return forbidden();
```


### 3.5 /api/me Evidence

Command: `rg -n "/api/me|function userResponse|canWrite" deploy-worker/src/index.js -C 6`


```text
28-}
29-__name(isAllowedAuthRole, "isAllowedAuthRole");
30-function canReadOwnerData(user) {
31-  return isManagerRoleValue(user?.role) || isReadonlyAdminRoleValue(user?.role);
32-}
33-__name(canReadOwnerData, "canReadOwnerData");
34:function canWriteOwnerData(user) {
35-  return isManagerRoleValue(user?.role);
36-}
37:__name(canWriteOwnerData, "canWriteOwnerData");
38-function bytesToB64url(bytes) {
39-  let binary = "";
40-  const chunk = 8192;
41-  for (let i = 0; i < bytes.length; i += chunk) {
42-    binary += String.fromCharCode(...bytes.slice(i, i + chunk));
43-  }
--
750-var MAX_SESSION_ENTRIES = 800;
751-var VALID_CATS = /* @__PURE__ */ new Set(["cash", "bank", "refund", "expense"]);
752-var VALID_TAGS = /* @__PURE__ */ new Set(["Old", "New", "Transfer"]);
753-var VALID_PAY_TYPES = /* @__PURE__ */ new Set(["", "full", "partial"]);
754-var VALID_ARREAR_TYPES = /* @__PURE__ */ new Set(["rent", "deposit"]);
755-function requireManager(user) {
756:  return canWriteOwnerData(user);
757-}
758-__name(requireManager, "requireManager");
759-async function audit(env, user, action, target = "", detail = {}) {
760-  try {
761-    await env.DB.prepare(
762-      `CREATE TABLE IF NOT EXISTS audit_logs (
--
1961-  if(path==="/api/arrear_tasks"&&request.method==="GET")return handleArrearTasks(request,env,user);
1962-  if(path==="/api/arrear_tasks/update"&&request.method==="POST")return handleArrearTaskUpdate(request,env,user);
1963-  return null;
1964-}
1965-__name(handleEmployeeApi,"handleEmployeeApi");
1966-function allowStaffApi(path,method){
1967:  if(path==="/api/me"&&method==="GET")return true;
1968-  if(path==="/api/rent_config"&&method==="GET")return true;
1969-  return false;
1970-}
1971-__name(allowStaffApi,"allowStaffApi");
1972-const HSC_ALLOWED_APP_ENVS = new Set(["development","dev","local","test","staging"]);
1973-const HSC_EMPLOYEE_ROLES = new Set(["staff","employee"]);
--
2616-      if (auth.status === 403) return forbidden();
2617-      return unauthorized();
2618-    }
2619-    const user = auth.payload;
2620-    const employeeApiResponse = await handleEmployeeApi(request, env, user);
2621-    if (employeeApiResponse) return employeeApiResponse;
2622:    if (path === "/api/me") {
2623-      const displayName = user.employee_name && user.employee_name !== user.role ? user.employee_name : user.userid;
2624-      return json({
2625-        userid: user.userid,
2626-        username: user.userid,
2627-        employee_id: user.userid,
2628-        display_name: displayName,
2629-        employee_name: displayName,
2630-        corpid: user.corpid,
2631-        role: user.role,
2632-        isManager: isManagerRoleValue(user.role),
2633-        isReadonlyAdmin: isReadonlyAdminRoleValue(user.role),
2634:        canWrite: canWriteOwnerData(user)
2635-      });
2636-    }
2637-    if (!canReadOwnerData(user) && !allowStaffApi(path, method)) {
2638-      return forbidden();
2639-    }
2640-    if (path === "/api/security/revoke_sessions" && method === "POST") {
--
2660-    }
2661-    if (path === "/api/lock/cards" && method === "GET") {
2662-      if (!canReadOwnerData(user)) return forbidden();
2663-      try {
2664-        const result = await loadLockCards(env);
2665-        if (result.error) return json({ error: result.error }, result.status || 500);
2666:        if (canWriteOwnerData(user)) await audit(env, user, "lock.cards.load", "", { locksCount: result.locksCount });
2667-        return json(result);
2668-      } catch (e) {
2669-        return json({ error: e?.message || "ttlock_failed" }, 502);
2670-      }
2671-    }
2672-    if (path === "/api/wifi/accounts" && method === "GET") {
2673-      if (!canReadOwnerData(user)) return forbidden();
2674:      if (canWriteOwnerData(user)) {
2675-        await env.DB.prepare(
2676-          `CREATE TABLE IF NOT EXISTS app_settings (
2677-            corpid TEXT NOT NULL,
2678-            key TEXT NOT NULL,
2679-            value TEXT DEFAULT '{}',
2680-            updated_by TEXT DEFAULT '',
--
2695-      let accounts = {};
2696-      try {
2697-        accounts = row?.value ? JSON.parse(row.value) : {};
2698-      } catch {
2699-        accounts = {};
2700-      }
2701:      if (hasPlainWifiPasswords(accounts) && canWriteOwnerData(user)) {
2702-        const encrypted = await encryptWifiAccounts(accounts, env);
2703-        await env.DB.prepare(
2704-          `INSERT INTO app_settings (corpid, key, value, updated_by, updated_at)
2705-             VALUES (?, ?, ?, ?, datetime("now"))
2706-             ON CONFLICT(corpid, key) DO UPDATE SET
2707-               value=excluded.value,
--
2758-      return json({ success: true, count: Object.keys(clean).length });
2759-    }
2760-    if (path === "/api/arrears" && method === "GET") {
2761-      return handleBossArrears(request, env, user);
2762-    }
2763-    if (path === "/api/customers" && method === "GET") {
2764:      if (canWriteOwnerData(user)) {
2765-        await env.DB.prepare(
2766-          `CREATE TABLE IF NOT EXISTS app_settings (
2767-            corpid TEXT NOT NULL,
2768-            key TEXT NOT NULL,
2769-            value TEXT DEFAULT '{}',
2770-            updated_by TEXT DEFAULT '',
--
2825-             updated_at=datetime("now")`
2826-      ).bind(user.corpid, "client_credit", JSON.stringify(customers), user.userid).run();
2827-      await audit(env, user, "customers.save", "client_credit", { count: customers.length });
2828-      return json({ success: true, count: customers.length });
2829-    }
2830-    if (path === "/api/rent_config" && method === "GET") {
2831:      if (canWriteOwnerData(user)) {
2832-        await env.DB.prepare(
2833-          `CREATE TABLE IF NOT EXISTS app_settings (
2834-            corpid TEXT NOT NULL,
2835-            key TEXT NOT NULL,
2836-            value TEXT DEFAULT '{}',
2837-            updated_by TEXT DEFAULT '',
```


### 3.6 Write Endpoint Evidence

Command: `rg -n "method === \"POST\"|method === \"PUT\"|method === \"DELETE\"|INSERT INTO|UPDATE |DELETE FROM|voided_at|audit_logs" deploy-worker/src/index.js`


```text
495:    `INSERT INTO active_sessions (sid, corpid, userid, role, user_agent, ip, expires_at)
517:      "UPDATE active_sessions SET revoked=1 WHERE sid=? AND corpid=?"
762:      `CREATE TABLE IF NOT EXISTS audit_logs (
774:      `INSERT INTO audit_logs (id, corpid, userid, role, action, target, detail)
1042:  "voided_at","voided_by","void_reason","void_source"
1048:  "voided_at","voided_by","void_reason","void_source"
1054:  "voided_at","voided_by","void_reason","void_source"
1061:  "balance_after","note","operator_id","ts","voided_at","voided_by","void_reason","void_source"
1081:  await empAddColumn(env,table,"voided_at","TEXT");
1309:  const row=await env.DB.prepare("SELECT COALESCE(SUM(delta),0) AS balance FROM deposit_ledger WHERE corpid=? AND tenant_card_id=? AND COALESCE(voided_at,'')=''")
1317:      WHERE corpid=? AND tenant_card_id=? AND entry_id=? AND type=? AND COALESCE(voided_at,'')='' LIMIT 1`)
1346:  await env.DB.prepare(`UPDATE arrear_tasks
1359:    await env.DB.prepare(`UPDATE arrears
1661:        await env.DB.prepare(`UPDATE arrear_tasks
1687:      await env.DB.prepare("UPDATE arrear_tasks SET close_status='PAID', followup_status='已结清', actual_received=?, updated_by=?, updated_at=? WHERE task_id=? AND corpid=?")
1780:    const legacy=await env.DB.prepare("SELECT * FROM arrears WHERE corpid=? AND cleared=0 AND COALESCE(voided_at,'')='' ORDER BY created_at DESC").bind(user.corpid).all();
1811:      `UPDATE arrears
1820:      `UPDATE arrear_tasks
1941:  await env.DB.prepare(`UPDATE arrear_tasks SET ${updates.join(",")} WHERE task_id=? AND corpid=?`).bind(...vals).run();
2075:  if(row.voided_at||row.session_voided_at||row.transaction_voided_at)return true;
2254:      voided_at:row?.voided_at??row?.session_voided_at??row?.transaction_voided_at??"",
2271:  await env.DB.prepare(`INSERT INTO handover_audit_events
2344:    env.DB.prepare(`INSERT INTO handover_commits (
2363:    env.DB.prepare(`INSERT INTO handover_idempotency_keys
2367:    env.DB.prepare(`INSERT INTO handover_audit_events
2371:    env.DB.prepare(`INSERT INTO entry_events
2377:    statements.push(env.DB.prepare(`INSERT INTO handover_commit_rows
2592:  if (path === "/auth/login" && method === "POST") {
2595:  if (path === "/auth/employee-login" && method === "POST") {
2598:  if (path === "/auth/confirm-manager" && method === "POST") {
2603:  if (path === "/auth/logout" && method === "POST") {
2606:  if (path === "/api/staging/handover/commit" && method === "POST") {
2609:  if (path === "/api/staging/employee-entry/adapter-draft" && method === "POST") {
2640:    if (path === "/api/security/revoke_sessions" && method === "POST") {
2656:        "UPDATE active_sessions SET revoked=1 WHERE corpid=? AND sid<>?"
2704:          `INSERT INTO app_settings (corpid, key, value, updated_by, updated_at)
2706:             ON CONFLICT(corpid, key) DO UPDATE SET
2717:    if (path === "/api/wifi/accounts" && method === "POST") {
2750:        `INSERT INTO app_settings (corpid, key, value, updated_by, updated_at)
2752:           ON CONFLICT(corpid, key) DO UPDATE SET
2798:    if (path === "/api/customers" && method === "POST") {
2820:        `INSERT INTO app_settings (corpid, key, value, updated_by, updated_at)
2822:           ON CONFLICT(corpid, key) DO UPDATE SET
2860:    if (path === "/api/rent_config" && method === "POST") {
2884:        `INSERT INTO app_settings (corpid, key, value, updated_by, updated_at)
2886:           ON CONFLICT(corpid, key) DO UPDATE SET
2894:    if (path === "/api/save_session" && method === "POST") {
2995:    if (path === "/api/delete_session" && method === "POST") {
3011:        "SELECT id, voided_at FROM sessions WHERE id=? AND corpid=? LIMIT 1"
3015:      if (existing.voided_at) {
3020:        env.DB.prepare(`UPDATE sessions
3021:          SET voided_at=?,
3026:          WHERE id=? AND corpid=? AND COALESCE(voided_at,'')=''`).bind(
3038:          env.DB.prepare(`UPDATE arrear_tasks
3042:                voided_at=?,
3053:          env.DB.prepare(`UPDATE deposit_ledger
3054:            SET voided_at=?,
3059:              AND COALESCE(voided_at,'')=''
3061:          env.DB.prepare(`UPDATE transactions
3063:                voided_at=?,
3067:            WHERE session_id=? AND corpid=? AND COALESCE(voided_at,'')=''`).bind(now, user.userid, voidReason, voidSource, id, user.corpid)
3072:          env.DB.prepare(`UPDATE arrears
3073:            SET voided_at=?,
3077:            WHERE session_id=? AND corpid=? AND COALESCE(voided_at,'')=''`).bind(now, user.userid, voidReason, voidSource, id, user.corpid)
3085:        field_name:"voided_at",
3087:        new_value:JSON.stringify({voided_at:now,voided_by:user.userid,void_reason:voidReason,void_source:voidSource,request_id:requestId}),
3092:      return json({ success: true, sessionId: id, voided: true, voided_at: now });
3094:    if (path === "/api/clear_arrear" && method === "POST") {
3112:        : "SELECT * FROM sessions WHERE corpid=? AND COALESCE(voided_at,'')='' AND COALESCE(handover_status,'')<>'VOID' ORDER BY created_at DESC";
3130:          : "SELECT * FROM transactions WHERE session_id=? AND corpid=? AND COALESCE(voided_at,'')='' AND COALESCE(status,'ACTIVE')<>'VOID' ORDER BY created_at ASC"
```


## 4. Database Architecture


### 4.1 D1 Configuration References

Command: `rg -n "d1_databases|database_name|database_id|env\.DB|D1|sqlite" deploy-worker/wrangler.toml deploy-worker/wrangler.embedded.toml package.json deploy-worker/src/index.js`


```text
deploy-worker/wrangler.toml:10:[[d1_databases]]
deploy-worker/wrangler.toml:12:database_name = "homelink"
deploy-worker/wrangler.toml:13:database_id = "562aa079-1cca-4176-ba3b-7276a65f98fb"
deploy-worker/wrangler.toml:36:[[env.staging.d1_databases]]
deploy-worker/wrangler.toml:38:database_name = "homelink-finance-staging"
deploy-worker/wrangler.toml:39:database_id = "4ff78bfc-3855-436b-aefb-6b492145d79c"
deploy-worker/wrangler.embedded.toml:5:[[d1_databases]]
deploy-worker/wrangler.embedded.toml:7:database_name = "homelink"
deploy-worker/wrangler.embedded.toml:8:database_id = "562aa079-1cca-4176-ba3b-7276a65f98fb"
deploy-worker/src/index.js:243:  if (!payload.sid || !env.DB) {
deploy-worker/src/index.js:247:    await env.DB.prepare(
deploy-worker/src/index.js:260:    const active = await env.DB.prepare(
deploy-worker/src/index.js:475:  await env.DB.prepare(
deploy-worker/src/index.js:494:  await env.DB.prepare(
deploy-worker/src/index.js:514:    if (!payload.sid || !env.DB) return;
deploy-worker/src/index.js:516:    await env.DB.prepare(
deploy-worker/src/index.js:593:  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS employee_users (
deploy-worker/src/index.js:609:  const row=await env.DB.prepare("SELECT employee_id FROM employee_users WHERE lower(employee_id)=? LIMIT 1").bind(seedEmployeeId).first();
deploy-worker/src/index.js:613:    await env.DB.prepare(`INSERT OR REPLACE INTO employee_users
deploy-worker/src/index.js:629:  const row=await env.DB.prepare("SELECT * FROM employee_users WHERE lower(employee_id)=? AND status='ACTIVE' LIMIT 1").bind(employeeId).first();
deploy-worker/src/index.js:761:    await env.DB.prepare(
deploy-worker/src/index.js:773:    await env.DB.prepare(
deploy-worker/src/index.js:1064:  const r=await env.DB.prepare(`PRAGMA table_info(${table})`).all();
deploy-worker/src/index.js:1069:  const r=await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").bind(table).first();
deploy-worker/src/index.js:1076:  await env.DB.prepare(`ALTER TABLE ${table} ADD COLUMN ${col} ${ddl}`).run();
deploy-worker/src/index.js:1088:  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS sessions (
deploy-worker/src/index.js:1157:  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS arrear_tasks (
deploy-worker/src/index.js:1175:  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS entry_events (
deploy-worker/src/index.js:1188:  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS deposit_ledger (
deploy-worker/src/index.js:1221:  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_transactions_period ON transactions(corpid, period_start, period_end)").run().catch(()=>{});
deploy-worker/src/index.js:1222:  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_transactions_operator ON transactions(corpid, operator_id)").run().catch(()=>{});
deploy-worker/src/index.js:1223:  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_transactions_cid_period ON transactions(corpid, tenant_card_id, period_start, period_end)").run().catch(()=>{});
deploy-worker/src/index.js:1224:  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_arrear_tasks_status ON arrear_tasks(corpid, followup_status, promise_date)").run();
deploy-worker/src/index.js:1225:  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_arrear_tasks_cid_period ON arrear_tasks(corpid, tenant_card_id, original_period_start, original_period_end)").run().catch(()=>{});
deploy-worker/src/index.js:1226:  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_entry_events_ref ON entry_events(corpid, ref_type, ref_id, ts)").run();
deploy-worker/src/index.js:1227:  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_deposit_ledger_cid ON deposit_ledger(corpid, tenant_card_id, ts)").run();
deploy-worker/src/index.js:1295:  await env.DB.prepare(`INSERT OR REPLACE INTO ${table} (${names.join(",")}) VALUES (${names.map(()=>"?").join(",")})`).bind(...vals).run();
deploy-worker/src/index.js:1309:  const row=await env.DB.prepare("SELECT COALESCE(SUM(delta),0) AS balance FROM deposit_ledger WHERE corpid=? AND tenant_card_id=? AND COALESCE(voided_at,'')=''")
deploy-worker/src/index.js:1316:    const existing=await env.DB.prepare(`SELECT ledger_id,balance_after,delta FROM deposit_ledger
deploy-worker/src/index.js:1336:  const task=await env.DB.prepare(`SELECT * FROM arrear_tasks
deploy-worker/src/index.js:1340:  const paidRow=await env.DB.prepare(`SELECT COALESCE(SUM(amount),0) AS total_paid FROM transactions
deploy-worker/src/index.js:1346:  await env.DB.prepare(`UPDATE arrear_tasks
deploy-worker/src/index.js:1359:    await env.DB.prepare(`UPDATE arrears
deploy-worker/src/index.js:1380:  const existing=await env.DB.prepare(`SELECT * FROM arrear_tasks
deploy-worker/src/index.js:1386:  const legacy=await env.DB.prepare("SELECT * FROM arrears WHERE id=? AND corpid=? AND cleared=0 LIMIT 1")
deploy-worker/src/index.js:1406:  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS app_settings (
deploy-worker/src/index.js:1414:  const row=await env.DB.prepare("SELECT value FROM app_settings WHERE corpid=? AND key=? LIMIT 1").bind(corpid,"rent_ref_room").first();
deploy-worker/src/index.js:1484:  const existingTx=await env.DB.prepare("SELECT id,session_id,type,linked_task_id FROM transactions WHERE id=? AND corpid=? LIMIT 1").bind(entryId,user.corpid).first();
deploy-worker/src/index.js:1651:    const paidRow=await env.DB.prepare(`SELECT COALESCE(SUM(paid),0) AS total_paid FROM transactions
deploy-worker/src/index.js:1656:    const existing=await env.DB.prepare(`SELECT task_id FROM arrear_tasks
deploy-worker/src/index.js:1661:        await env.DB.prepare(`UPDATE arrear_tasks
deploy-worker/src/index.js:1687:      await env.DB.prepare("UPDATE arrear_tasks SET close_status='PAID', followup_status='已结清', actual_received=?, updated_by=?, updated_at=? WHERE task_id=? AND corpid=?")
deploy-worker/src/index.js:1771:  const taskRows=await env.DB.prepare("SELECT * FROM arrear_tasks WHERE corpid=? ORDER BY COALESCE(updated_at,created_at) DESC").bind(user.corpid).all();
deploy-worker/src/index.js:1780:    const legacy=await env.DB.prepare("SELECT * FROM arrears WHERE corpid=? AND cleared=0 AND COALESCE(voided_at,'')='' ORDER BY created_at DESC").bind(user.corpid).all();
deploy-worker/src/index.js:1810:    await env.DB.prepare(
deploy-worker/src/index.js:1817:  const task=await env.DB.prepare("SELECT * FROM arrear_tasks WHERE task_id=? AND corpid=? LIMIT 1").bind(id,user.corpid).first();
deploy-worker/src/index.js:1819:    await env.DB.prepare(
deploy-worker/src/index.js:1857:  let old=await env.DB.prepare("SELECT * FROM arrear_tasks WHERE task_id=? AND corpid=? LIMIT 1").bind(taskId,user.corpid).first();
deploy-worker/src/index.js:1866:    const fallback=await env.DB.prepare("SELECT * FROM arrears WHERE id=? AND corpid=? LIMIT 1").bind(taskId,user.corpid).first().catch(()=>null);
deploy-worker/src/index.js:1941:  await env.DB.prepare(`UPDATE arrear_tasks SET ${updates.join(",")} WHERE task_id=? AND corpid=?`).bind(...vals).run();
deploy-worker/src/index.js:2271:  await env.DB.prepare(`INSERT INTO handover_audit_events
deploy-worker/src/index.js:2300:  const existingKey=await env.DB.prepare("SELECT * FROM handover_idempotency_keys WHERE company_id=? AND property_id=? AND idempotency_key=? LIMIT 1")
deploy-worker/src/index.js:2304:      const commit=await env.DB.prepare("SELECT * FROM handover_commits WHERE commit_id=? LIMIT 1").bind(existingKey.commit_id||"").first().catch(()=>null);
deploy-worker/src/index.js:2309:  const duplicateFingerprint=await env.DB.prepare("SELECT * FROM handover_idempotency_keys WHERE company_id=? AND property_id=? AND request_fingerprint=? LIMIT 1")
deploy-worker/src/index.js:2312:  const duplicateSession=await env.DB.prepare("SELECT * FROM handover_commits WHERE company_id=? AND property_id=? AND session_id=? AND status='ACCEPTED' LIMIT 1")
deploy-worker/src/index.js:2344:    env.DB.prepare(`INSERT INTO handover_commits (
deploy-worker/src/index.js:2363:    env.DB.prepare(`INSERT INTO handover_idempotency_keys
deploy-worker/src/index.js:2367:    env.DB.prepare(`INSERT INTO handover_audit_events
deploy-worker/src/index.js:2371:    env.DB.prepare(`INSERT INTO entry_events
deploy-worker/src/index.js:2377:    statements.push(env.DB.prepare(`INSERT INTO handover_commit_rows
deploy-worker/src/index.js:2382:  await env.DB.batch(statements);
deploy-worker/src/index.js:2642:      await env.DB.prepare(
deploy-worker/src/index.js:2655:      await env.DB.prepare(
deploy-worker/src/index.js:2675:        await env.DB.prepare(
deploy-worker/src/index.js:2688:        row = await env.DB.prepare(
deploy-worker/src/index.js:2703:        await env.DB.prepare(
deploy-worker/src/index.js:2739:      await env.DB.prepare(
deploy-worker/src/index.js:2749:      await env.DB.prepare(
deploy-worker/src/index.js:2765:        await env.DB.prepare(
deploy-worker/src/index.js:2778:        row = await env.DB.prepare(
deploy-worker/src/index.js:2809:      await env.DB.prepare(
deploy-worker/src/index.js:2819:      await env.DB.prepare(
deploy-worker/src/index.js:2832:        await env.DB.prepare(
deploy-worker/src/index.js:2845:        row = await env.DB.prepare(
deploy-worker/src/index.js:2862:      await env.DB.prepare(
deploy-worker/src/index.js:2883:      await env.DB.prepare(
deploy-worker/src/index.js:2918:      batch.push(env.DB.prepare(
deploy-worker/src/index.js:2935:        batch.push(env.DB.prepare(
deploy-worker/src/index.js:2973:          batch.push(env.DB.prepare(
deploy-worker/src/index.js:2992:      await env.DB.batch(batch);
deploy-worker/src/index.js:3010:      const existing = await env.DB.prepare(
deploy-worker/src/index.js:3020:        env.DB.prepare(`UPDATE sessions
deploy-worker/src/index.js:3038:          env.DB.prepare(`UPDATE arrear_tasks
deploy-worker/src/index.js:3053:          env.DB.prepare(`UPDATE deposit_ledger
deploy-worker/src/index.js:3061:          env.DB.prepare(`UPDATE transactions
deploy-worker/src/index.js:3072:          env.DB.prepare(`UPDATE arrears
deploy-worker/src/index.js:3080:      await env.DB.batch(batch);
deploy-worker/src/index.js:3114:        const { results } = await env.DB.prepare(`${baseSql} LIMIT ? OFFSET ?`).bind(user.corpid, limit, offset).all();
deploy-worker/src/index.js:3117:      const { results } = await env.DB.prepare(
deploy-worker/src/index.js:3127:      const { results } = await env.DB.prepare(
```


### 4.2 SQL And Migration Files

Command: `powershell -NoProfile -Command "Get-ChildItem -Recurse -File -Include *.sql,*schema*,*migration* | Where-Object { $_.FullName -notmatch '\\node_modules|\\.git|\\.wrangler|\\backups|\\.tmp' } | Select-Object -First 140 -ExpandProperty FullName"`


```text
C:\Users\Chinalink\Desktop\软件迭代\migration-drafts\002_commercial_bootstrap.sql
C:\Users\Chinalink\Desktop\软件迭代\migration-drafts\003_delete_session_void_fields.sql
C:\Users\Chinalink\Desktop\软件迭代\migration-drafts\004_receivables_model_draft.sql
C:\Users\Chinalink\Desktop\软件迭代\migration-drafts\005_money_minor_units_dual_write_draft.sql
C:\Users\Chinalink\Desktop\软件迭代\migration-drafts\handover_atomic_commit_draft.sql
C:\Users\Chinalink\Desktop\软件迭代\migration-drafts\receivables_local_staging_rehearsal_draft.sql
C:\Users\Chinalink\Desktop\软件迭代\migration-drafts\tenant_scope_staging_compatibility_columns_draft.sql
C:\Users\Chinalink\Desktop\软件迭代\migrations\local\001_clean_legacy_bootstrap.sql
C:\Users\Chinalink\Desktop\软件迭代\migrations\local\002_handover_atomic_staging.sql
C:\Users\Chinalink\Desktop\软件迭代\migrations\001_employee_anchor_schema.sql
C:\Users\Chinalink\Desktop\软件迭代\scripts\rehearse-migration.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\migration-draft.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\D1_MIGRATION_ORDER.md
C:\Users\Chinalink\Desktop\软件迭代\D1_MINIMUM_SCHEMA_PLAN.md
C:\Users\Chinalink\Desktop\软件迭代\DELETE_SESSION_MIGRATION_PLAN.md
C:\Users\Chinalink\Desktop\软件迭代\EMPLOYEE_ENTRY_WORKER_MIGRATION_PLAN.md
C:\Users\Chinalink\Desktop\软件迭代\HANDOVER_ATOMIC_MIGRATION_PLAN.md
C:\Users\Chinalink\Desktop\软件迭代\HANDOVER_ATOMIC_MIGRATION_REVIEW.md
C:\Users\Chinalink\Desktop\软件迭代\MIGRATION_BOOTSTRAP_PLAN.md
C:\Users\Chinalink\Desktop\软件迭代\MIGRATION_PROMOTION_CHECKLIST.md
C:\Users\Chinalink\Desktop\软件迭代\MIGRATION_SCHEMA_CONTRACT.md
C:\Users\Chinalink\Desktop\软件迭代\MONEY_DUAL_WRITE_MIGRATION_REVIEW.md
C:\Users\Chinalink\Desktop\软件迭代\MONEY_MIGRATION_PLAN.md
C:\Users\Chinalink\Desktop\软件迭代\NEXT_PROMPT_P0_006I1_APPLY_STAGING_COMPATIBILITY_SCHEMA.md
C:\Users\Chinalink\Desktop\软件迭代\NEXT_PROMPT_STAGING_DB_001_SCHEMA_BOOTSTRAP_PREFLIGHT.md
C:\Users\Chinalink\Desktop\软件迭代\NEXT_PROMPT_STAGING_DB_002_APPLY_STAGING_MIGRATIONS.md
C:\Users\Chinalink\Desktop\软件迭代\P0_006I1_POST_SCHEMA_BACKFILL_DRY_RUN_RESULT.md
C:\Users\Chinalink\Desktop\软件迭代\P0_006I1_POST_SCHEMA_SNAPSHOT.md
C:\Users\Chinalink\Desktop\软件迭代\P0_006I1_SCHEMA_MIGRATION_APPLY_RESULT.md
C:\Users\Chinalink\Desktop\软件迭代\P0_006I1_SCHEMA_MIGRATION_SQL_REVIEW.md
C:\Users\Chinalink\Desktop\软件迭代\P0_006I_SCHEMA_COMPATIBILITY_BACKUP_ROLLBACK_CHECKLIST.md
C:\Users\Chinalink\Desktop\软件迭代\P0_006I_SCHEMA_COMPATIBILITY_GO_NO_GO.md
C:\Users\Chinalink\Desktop\软件迭代\P0_006Q2_AUDIT_EVENT_SCHEMA_REVIEW.md
C:\Users\Chinalink\Desktop\软件迭代\PRODUCTION_COPY_MIGRATION_BACKFILL_DRY_RUN_MATRIX.md
C:\Users\Chinalink\Desktop\软件迭代\PRODUCTION_MIGRATION_BACKFILL_OWNER_SIGNOFF_LIST.md
C:\Users\Chinalink\Desktop\软件迭代\PRODUCTION_MIGRATION_ROLLBACK_REVIEW_PACKET.md
C:\Users\Chinalink\Desktop\软件迭代\RECEIVABLES_MIGRATION_DRAFT_REVIEW.md
C:\Users\Chinalink\Desktop\软件迭代\RUNTIME_DDL_MIGRATION_PLAN.md
C:\Users\Chinalink\Desktop\软件迭代\STAGING_D1_BACKUP_BEFORE_MIGRATION_PLAN.md
C:\Users\Chinalink\Desktop\软件迭代\STAGING_D1_CURRENT_SCHEMA_SNAPSHOT.md
C:\Users\Chinalink\Desktop\软件迭代\STAGING_D1_MIGRATION_APPLY_PLAN.md
C:\Users\Chinalink\Desktop\软件迭代\STAGING_D1_SCHEMA_GAP_ANALYSIS.md
C:\Users\Chinalink\Desktop\软件迭代\STAGING_D1_SCHEMA_PREFLIGHT_PLAN.md
C:\Users\Chinalink\Desktop\软件迭代\STAGING_DB_001_LOCAL_SCHEMA_SOURCE_REVIEW.md
C:\Users\Chinalink\Desktop\软件迭代\STAGING_DB_002_MIGRATION_APPLY_RESULT.md
C:\Users\Chinalink\Desktop\软件迭代\STAGING_DB_002_MIGRATION_EXECUTION_METHOD.md
C:\Users\Chinalink\Desktop\软件迭代\STAGING_DB_002_MIGRATION_SQL_REVIEW.md
C:\Users\Chinalink\Desktop\软件迭代\STAGING_DB_002_POST_MIGRATION_SCHEMA_SNAPSHOT.md
C:\Users\Chinalink\Desktop\软件迭代\STAGING_DB_002_QA_DRY_RUN_AFTER_SCHEMA_RESULT.md
C:\Users\Chinalink\Desktop\软件迭代\TENANCY_MIGRATION_PLAN.md
C:\Users\Chinalink\Desktop\软件迭代\TENANT_SCOPE_STAGING_SCHEMA_MIGRATION_PLAN.md
```


### 4.3 CREATE TABLE / CREATE INDEX Evidence

Command: `rg -n "CREATE TABLE|CREATE INDEX" deploy-worker/src migrations migration-drafts modules scripts --glob "*.{js,mjs,sql,md}"`


```text
migration-drafts\receivables_local_staging_rehearsal_draft.sql:8:CREATE TABLE IF NOT EXISTS receivables (
migration-drafts\receivables_local_staging_rehearsal_draft.sql:31:CREATE INDEX IF NOT EXISTS idx_receivables_status_due
migration-drafts\receivables_local_staging_rehearsal_draft.sql:34:CREATE INDEX IF NOT EXISTS idx_receivables_scope_due
migration-drafts\receivables_local_staging_rehearsal_draft.sql:37:CREATE TABLE IF NOT EXISTS receivable_events (
migration-drafts\receivables_local_staging_rehearsal_draft.sql:49:CREATE INDEX IF NOT EXISTS idx_receivable_events_receivable
migration-drafts\receivables_local_staging_rehearsal_draft.sql:52:CREATE TABLE IF NOT EXISTS payment_allocations (
migration-drafts\receivables_local_staging_rehearsal_draft.sql:64:CREATE INDEX IF NOT EXISTS idx_payment_allocations_receivable
migration-drafts\receivables_local_staging_rehearsal_draft.sql:67:CREATE TABLE IF NOT EXISTS receivable_adjustments (
migration-drafts\receivables_local_staging_rehearsal_draft.sql:78:CREATE INDEX IF NOT EXISTS idx_receivable_adjustments_receivable
deploy-worker/src\index.js:248:      `CREATE TABLE IF NOT EXISTS active_sessions (
deploy-worker/src\index.js:476:    `CREATE TABLE IF NOT EXISTS active_sessions (
deploy-worker/src\index.js:593:  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS employee_users (
deploy-worker/src\index.js:762:      `CREATE TABLE IF NOT EXISTS audit_logs (
deploy-worker/src\index.js:1088:  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS sessions (
deploy-worker/src\index.js:1157:  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS arrear_tasks (
deploy-worker/src\index.js:1175:  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS entry_events (
deploy-worker/src\index.js:1188:  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS deposit_ledger (
deploy-worker/src\index.js:1221:  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_transactions_period ON transactions(corpid, period_start, period_end)").run().catch(()=>{});
deploy-worker/src\index.js:1222:  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_transactions_operator ON transactions(corpid, operator_id)").run().catch(()=>{});
deploy-worker/src\index.js:1223:  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_transactions_cid_period ON transactions(corpid, tenant_card_id, period_start, period_end)").run().catch(()=>{});
deploy-worker/src\index.js:1224:  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_arrear_tasks_status ON arrear_tasks(corpid, followup_status, promise_date)").run();
deploy-worker/src\index.js:1225:  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_arrear_tasks_cid_period ON arrear_tasks(corpid, tenant_card_id, original_period_start, original_period_end)").run().catch(()=>{});
deploy-worker/src\index.js:1226:  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_entry_events_ref ON entry_events(corpid, ref_type, ref_id, ts)").run();
deploy-worker/src\index.js:1227:  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_deposit_ledger_cid ON deposit_ledger(corpid, tenant_card_id, ts)").run();
deploy-worker/src\index.js:1406:  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS app_settings (
deploy-worker/src\index.js:2643:        `CREATE TABLE IF NOT EXISTS active_sessions (
deploy-worker/src\index.js:2676:          `CREATE TABLE IF NOT EXISTS app_settings (
deploy-worker/src\index.js:2740:        `CREATE TABLE IF NOT EXISTS app_settings (
deploy-worker/src\index.js:2766:          `CREATE TABLE IF NOT EXISTS app_settings (
deploy-worker/src\index.js:2810:        `CREATE TABLE IF NOT EXISTS app_settings (
deploy-worker/src\index.js:2833:          `CREATE TABLE IF NOT EXISTS app_settings (
deploy-worker/src\index.js:2863:        `CREATE TABLE IF NOT EXISTS app_settings (
migration-drafts\handover_atomic_commit_draft.sql:5:CREATE TABLE IF NOT EXISTS handover_commits (
migration-drafts\handover_atomic_commit_draft.sql:43:CREATE TABLE IF NOT EXISTS handover_commit_rows (
migration-drafts\handover_atomic_commit_draft.sql:62:CREATE TABLE IF NOT EXISTS handover_idempotency_keys (
migration-drafts\handover_atomic_commit_draft.sql:77:CREATE TABLE IF NOT EXISTS handover_audit_events (
migrations\local\002_handover_atomic_staging.sql:6:CREATE TABLE IF NOT EXISTS handover_commits (
migrations\local\002_handover_atomic_staging.sql:50:CREATE INDEX IF NOT EXISTS idx_handover_commits_company_status
migrations\local\002_handover_atomic_staging.sql:53:CREATE INDEX IF NOT EXISTS idx_handover_commits_employee
migrations\local\002_handover_atomic_staging.sql:56:CREATE TABLE IF NOT EXISTS handover_commit_rows (
migrations\local\002_handover_atomic_staging.sql:77:CREATE INDEX IF NOT EXISTS idx_handover_commit_rows_commit
migrations\local\002_handover_atomic_staging.sql:80:CREATE TABLE IF NOT EXISTS handover_idempotency_keys (
migrations\local\002_handover_atomic_staging.sql:95:CREATE INDEX IF NOT EXISTS idx_handover_idempotency_fingerprint
migrations\local\002_handover_atomic_staging.sql:98:CREATE TABLE IF NOT EXISTS handover_audit_events (
migrations\local\002_handover_atomic_staging.sql:112:CREATE INDEX IF NOT EXISTS idx_handover_audit_events_commit
migration-drafts\005_money_minor_units_dual_write_draft.sql:46:CREATE INDEX IF NOT EXISTS idx_transactions_amount_fils
migration-drafts\005_money_minor_units_dual_write_draft.sql:49:CREATE INDEX IF NOT EXISTS idx_deposit_ledger_balance_fils
migration-drafts\005_money_minor_units_dual_write_draft.sql:52:CREATE INDEX IF NOT EXISTS idx_arrear_tasks_amount_fils
migrations\local\001_clean_legacy_bootstrap.sql:12:CREATE TABLE IF NOT EXISTS active_sessions (
migrations\local\001_clean_legacy_bootstrap.sql:24:CREATE INDEX IF NOT EXISTS idx_active_sessions_user
migrations\local\001_clean_legacy_bootstrap.sql:27:CREATE TABLE IF NOT EXISTS employee_users (
migrations\local\001_clean_legacy_bootstrap.sql:38:CREATE TABLE IF NOT EXISTS audit_logs (
migrations\local\001_clean_legacy_bootstrap.sql:49:CREATE INDEX IF NOT EXISTS idx_audit_logs_target
migrations\local\001_clean_legacy_bootstrap.sql:52:CREATE TABLE IF NOT EXISTS app_settings (
migrations\local\001_clean_legacy_bootstrap.sql:61:CREATE TABLE IF NOT EXISTS sessions (
migrations\local\001_clean_legacy_bootstrap.sql:85:CREATE INDEX IF NOT EXISTS idx_sessions_corpid_created
migrations\local\001_clean_legacy_bootstrap.sql:88:CREATE TABLE IF NOT EXISTS transactions (
migrations\local\001_clean_legacy_bootstrap.sql:163:CREATE INDEX IF NOT EXISTS idx_transactions_session
migrations\local\001_clean_legacy_bootstrap.sql:166:CREATE INDEX IF NOT EXISTS idx_transactions_period
migrations\local\001_clean_legacy_bootstrap.sql:169:CREATE INDEX IF NOT EXISTS idx_transactions_operator
migrations\local\001_clean_legacy_bootstrap.sql:172:CREATE INDEX IF NOT EXISTS idx_transactions_cid_period
migrations\local\001_clean_legacy_bootstrap.sql:175:CREATE TABLE IF NOT EXISTS arrears (
migrations\local\001_clean_legacy_bootstrap.sql:196:CREATE INDEX IF NOT EXISTS idx_arrears_open
migrations\local\001_clean_legacy_bootstrap.sql:199:CREATE TABLE IF NOT EXISTS arrear_tasks (
migrations\local\001_clean_legacy_bootstrap.sql:234:CREATE INDEX IF NOT EXISTS idx_arrear_tasks_bed
migrations\local\001_clean_legacy_bootstrap.sql:237:CREATE INDEX IF NOT EXISTS idx_arrear_tasks_status
migrations\local\001_clean_legacy_bootstrap.sql:240:CREATE INDEX IF NOT EXISTS idx_arrear_tasks_cid_period
migrations\local\001_clean_legacy_bootstrap.sql:243:CREATE TABLE IF NOT EXISTS entry_events (
migrations\local\001_clean_legacy_bootstrap.sql:257:CREATE INDEX IF NOT EXISTS idx_entry_events_ref
migrations\local\001_clean_legacy_bootstrap.sql:260:CREATE TABLE IF NOT EXISTS deposit_ledger (
migrations\local\001_clean_legacy_bootstrap.sql:281:CREATE INDEX IF NOT EXISTS idx_deposit_ledger_cid
migration-drafts\004_receivables_model_draft.sql:6:CREATE TABLE IF NOT EXISTS receivables (
migration-drafts\004_receivables_model_draft.sql:31:CREATE INDEX IF NOT EXISTS idx_receivables_scope_status
migration-drafts\004_receivables_model_draft.sql:34:CREATE INDEX IF NOT EXISTS idx_receivables_bed_period
migration-drafts\004_receivables_model_draft.sql:37:CREATE TABLE IF NOT EXISTS receivable_events (
migration-drafts\004_receivables_model_draft.sql:52:CREATE INDEX IF NOT EXISTS idx_receivable_events_receivable
migration-drafts\004_receivables_model_draft.sql:55:CREATE TABLE IF NOT EXISTS payment_allocations (
migration-drafts\004_receivables_model_draft.sql:74:CREATE INDEX IF NOT EXISTS idx_payment_allocations_receivable
migration-drafts\004_receivables_model_draft.sql:77:CREATE TABLE IF NOT EXISTS receivable_adjustments (
migration-drafts\004_receivables_model_draft.sql:93:CREATE INDEX IF NOT EXISTS idx_receivable_adjustments_receivable
migrations\001_employee_anchor_schema.sql:16:CREATE TABLE IF NOT EXISTS arrear_tasks (
migrations\001_employee_anchor_schema.sql:39:CREATE TABLE IF NOT EXISTS entry_events (
migrations\001_employee_anchor_schema.sql:53:CREATE INDEX IF NOT EXISTS idx_transactions_period ON transactions(corpid, period_start, period_end);
migrations\001_employee_anchor_schema.sql:54:CREATE INDEX IF NOT EXISTS idx_transactions_operator ON transactions(corpid, operator_id);
migrations\001_employee_anchor_schema.sql:55:CREATE INDEX IF NOT EXISTS idx_arrear_tasks_bed ON arrear_tasks(corpid, bed);
migrations\001_employee_anchor_schema.sql:56:CREATE INDEX IF NOT EXISTS idx_arrear_tasks_status ON arrear_tasks(corpid, followup_status, promise_date);
migrations\001_employee_anchor_schema.sql:57:CREATE INDEX IF NOT EXISTS idx_entry_events_ref ON entry_events(corpid, ref_type, ref_id, ts);
migration-drafts\002_commercial_bootstrap.sql:7:CREATE TABLE IF NOT EXISTS schema_migrations (
migration-drafts\002_commercial_bootstrap.sql:14:CREATE TABLE IF NOT EXISTS companies (
migration-drafts\002_commercial_bootstrap.sql:22:CREATE TABLE IF NOT EXISTS properties (
migration-drafts\002_commercial_bootstrap.sql:33:CREATE INDEX IF NOT EXISTS idx_properties_company ON properties(company_id, status);
migration-drafts\002_commercial_bootstrap.sql:35:CREATE TABLE IF NOT EXISTS users (
migration-drafts\002_commercial_bootstrap.sql:46:CREATE INDEX IF NOT EXISTS idx_users_company_role ON users(company_id, role, status);
migration-drafts\002_commercial_bootstrap.sql:48:CREATE TABLE IF NOT EXISTS property_memberships (
migration-drafts\002_commercial_bootstrap.sql:62:CREATE TABLE IF NOT EXISTS beds (
migration-drafts\002_commercial_bootstrap.sql:78:CREATE TABLE IF NOT EXISTS bed_rent_config_versions (
migration-drafts\002_commercial_bootstrap.sql:92:CREATE INDEX IF NOT EXISTS idx_bed_rent_versions_active
migration-drafts\002_commercial_bootstrap.sql:95:CREATE TABLE IF NOT EXISTS handover_sessions (
migration-drafts\002_commercial_bootstrap.sql:118:CREATE INDEX IF NOT EXISTS idx_handover_property_date
migration-drafts\002_commercial_bootstrap.sql:121:CREATE TABLE IF NOT EXISTS transactions (
migration-drafts\002_commercial_bootstrap.sql:151:CREATE INDEX IF NOT EXISTS idx_transactions_session
migration-drafts\002_commercial_bootstrap.sql:157:CREATE INDEX IF NOT EXISTS idx_transactions_bed_period
migration-drafts\002_commercial_bootstrap.sql:160:CREATE INDEX IF NOT EXISTS idx_transactions_card_period
migration-drafts\002_commercial_bootstrap.sql:163:CREATE TABLE IF NOT EXISTS receivables (
migration-drafts\002_commercial_bootstrap.sql:182:CREATE INDEX IF NOT EXISTS idx_receivables_status
migration-drafts\002_commercial_bootstrap.sql:185:CREATE INDEX IF NOT EXISTS idx_receivables_bed_period
migration-drafts\002_commercial_bootstrap.sql:188:CREATE TABLE IF NOT EXISTS payments (
migration-drafts\002_commercial_bootstrap.sql:204:CREATE INDEX IF NOT EXISTS idx_payments_receivable
migration-drafts\002_commercial_bootstrap.sql:207:CREATE TABLE IF NOT EXISTS arrear_tasks (
migration-drafts\002_commercial_bootstrap.sql:226:CREATE INDEX IF NOT EXISTS idx_arrear_tasks_status
migration-drafts\002_commercial_bootstrap.sql:229:CREATE INDEX IF NOT EXISTS idx_arrear_tasks_receivable
migration-drafts\002_commercial_bootstrap.sql:232:CREATE TABLE IF NOT EXISTS deposit_ledger (
migration-drafts\002_commercial_bootstrap.sql:248:CREATE INDEX IF NOT EXISTS idx_deposit_ledger_card
migration-drafts\002_commercial_bootstrap.sql:251:CREATE TABLE IF NOT EXISTS audit_events (
migration-drafts\002_commercial_bootstrap.sql:266:CREATE INDEX IF NOT EXISTS idx_audit_events_entity
migration-drafts\002_commercial_bootstrap.sql:269:CREATE INDEX IF NOT EXISTS idx_audit_events_actor
scripts\audit-legacy-backfill.mjs:86:  "CREATE TABLE IF NOT EXISTS sessions",
scripts\audit-db.mjs:60:          "Runtime CREATE TABLE appears in Worker source",
scripts\audit-db.mjs:133:    ...(tableRows.length ? tableRows : ["| n/a | No CREATE TABLE statements detected. |"]),
scripts\audit-worker-entrypoint-drift.mjs:113:    patterns: ["CREATE TABLE IF NOT EXISTS", "ALTER TABLE", "empEnsureSchema"],
deploy-worker/src\index.embedded.js:233:      `CREATE TABLE IF NOT EXISTS active_sessions (
deploy-worker/src\index.embedded.js:461:    `CREATE TABLE IF NOT EXISTS active_sessions (
deploy-worker/src\index.embedded.js:577:  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS employee_users (
deploy-worker/src\index.embedded.js:746:      `CREATE TABLE IF NOT EXISTS audit_logs (
deploy-worker/src\index.embedded.js:1072:  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS sessions (
deploy-worker/src\index.embedded.js:1141:  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS arrear_tasks (
deploy-worker/src\index.embedded.js:1159:  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS entry_events (
deploy-worker/src\index.embedded.js:1172:  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS deposit_ledger (
deploy-worker/src\index.embedded.js:1205:  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_transactions_period ON transactions(corpid, period_start, period_end)").run().catch(()=>{});
deploy-worker/src\index.embedded.js:1206:  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_transactions_operator ON transactions(corpid, operator_id)").run().catch(()=>{});
deploy-worker/src\index.embedded.js:1207:  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_transactions_cid_period ON transactions(corpid, tenant_card_id, period_start, period_end)").run().catch(()=>{});
deploy-worker/src\index.embedded.js:1208:  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_arrear_tasks_status ON arrear_tasks(corpid, followup_status, promise_date)").run();
deploy-worker/src\index.embedded.js:1209:  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_arrear_tasks_cid_period ON arrear_tasks(corpid, tenant_card_id, original_period_start, original_period_end)").run().catch(()=>{});
deploy-worker/src\index.embedded.js:1210:  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_entry_events_ref ON entry_events(corpid, ref_type, ref_id, ts)").run();
deploy-worker/src\index.embedded.js:1211:  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_deposit_ledger_cid ON deposit_ledger(corpid, tenant_card_id, ts)").run();
deploy-worker/src\index.embedded.js:1390:  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS app_settings (
deploy-worker/src\index.embedded.js:2555:        `CREATE TABLE IF NOT EXISTS active_sessions (
deploy-worker/src\index.embedded.js:2587:        `CREATE TABLE IF NOT EXISTS app_settings (
deploy-worker/src\index.embedded.js:2644:        `CREATE TABLE IF NOT EXISTS app_settings (
deploy-worker/src\index.embedded.js:2669:        `CREATE TABLE IF NOT EXISTS app_settings (
deploy-worker/src\index.embedded.js:2705:        `CREATE TABLE IF NOT EXISTS app_settings (
deploy-worker/src\index.embedded.js:2727:        `CREATE TABLE IF NOT EXISTS app_settings (
deploy-worker/src\index.embedded.js:2750:        `CREATE TABLE IF NOT EXISTS app_settings (
scripts\test-delete-session-void.mjs:116:CREATE TABLE sessions (
scripts\test-delete-session-void.mjs:126:CREATE TABLE transactions (
scripts\test-delete-session-void.mjs:142:CREATE TABLE arrears (
scripts\test-delete-session-void.mjs:156:CREATE TABLE deposit_ledger (
```


### 4.4 Table Mutation References

Command: `rg -n "FROM |INSERT INTO|UPDATE |DELETE FROM" deploy-worker/src/index.js`


```text
261:      `SELECT sid FROM active_sessions
495:    `INSERT INTO active_sessions (sid, corpid, userid, role, user_agent, ip, expires_at)
517:      "UPDATE active_sessions SET revoked=1 WHERE sid=? AND corpid=?"
609:  const row=await env.DB.prepare("SELECT employee_id FROM employee_users WHERE lower(employee_id)=? LIMIT 1").bind(seedEmployeeId).first();
629:  const row=await env.DB.prepare("SELECT * FROM employee_users WHERE lower(employee_id)=? AND status='ACTIVE' LIMIT 1").bind(employeeId).first();
774:      `INSERT INTO audit_logs (id, corpid, userid, role, action, target, detail)
1069:  const r=await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").bind(table).first();
1309:  const row=await env.DB.prepare("SELECT COALESCE(SUM(delta),0) AS balance FROM deposit_ledger WHERE corpid=? AND tenant_card_id=? AND COALESCE(voided_at,'')=''")
1316:    const existing=await env.DB.prepare(`SELECT ledger_id,balance_after,delta FROM deposit_ledger
1336:  const task=await env.DB.prepare(`SELECT * FROM arrear_tasks
1340:  const paidRow=await env.DB.prepare(`SELECT COALESCE(SUM(amount),0) AS total_paid FROM transactions
1346:  await env.DB.prepare(`UPDATE arrear_tasks
1359:    await env.DB.prepare(`UPDATE arrears
1380:  const existing=await env.DB.prepare(`SELECT * FROM arrear_tasks
1386:  const legacy=await env.DB.prepare("SELECT * FROM arrears WHERE id=? AND corpid=? AND cleared=0 LIMIT 1")
1414:  const row=await env.DB.prepare("SELECT value FROM app_settings WHERE corpid=? AND key=? LIMIT 1").bind(corpid,"rent_ref_room").first();
1484:  const existingTx=await env.DB.prepare("SELECT id,session_id,type,linked_task_id FROM transactions WHERE id=? AND corpid=? LIMIT 1").bind(entryId,user.corpid).first();
1651:    const paidRow=await env.DB.prepare(`SELECT COALESCE(SUM(paid),0) AS total_paid FROM transactions
1656:    const existing=await env.DB.prepare(`SELECT task_id FROM arrear_tasks
1661:        await env.DB.prepare(`UPDATE arrear_tasks
1687:      await env.DB.prepare("UPDATE arrear_tasks SET close_status='PAID', followup_status='已结清', actual_received=?, updated_by=?, updated_at=? WHERE task_id=? AND corpid=?")
1771:  const taskRows=await env.DB.prepare("SELECT * FROM arrear_tasks WHERE corpid=? ORDER BY COALESCE(updated_at,created_at) DESC").bind(user.corpid).all();
1780:    const legacy=await env.DB.prepare("SELECT * FROM arrears WHERE corpid=? AND cleared=0 AND COALESCE(voided_at,'')='' ORDER BY created_at DESC").bind(user.corpid).all();
1811:      `UPDATE arrears
1817:  const task=await env.DB.prepare("SELECT * FROM arrear_tasks WHERE task_id=? AND corpid=? LIMIT 1").bind(id,user.corpid).first();
1820:      `UPDATE arrear_tasks
1857:  let old=await env.DB.prepare("SELECT * FROM arrear_tasks WHERE task_id=? AND corpid=? LIMIT 1").bind(taskId,user.corpid).first();
1866:    const fallback=await env.DB.prepare("SELECT * FROM arrears WHERE id=? AND corpid=? LIMIT 1").bind(taskId,user.corpid).first().catch(()=>null);
1941:  await env.DB.prepare(`UPDATE arrear_tasks SET ${updates.join(",")} WHERE task_id=? AND corpid=?`).bind(...vals).run();
2271:  await env.DB.prepare(`INSERT INTO handover_audit_events
2300:  const existingKey=await env.DB.prepare("SELECT * FROM handover_idempotency_keys WHERE company_id=? AND property_id=? AND idempotency_key=? LIMIT 1")
2304:      const commit=await env.DB.prepare("SELECT * FROM handover_commits WHERE commit_id=? LIMIT 1").bind(existingKey.commit_id||"").first().catch(()=>null);
2309:  const duplicateFingerprint=await env.DB.prepare("SELECT * FROM handover_idempotency_keys WHERE company_id=? AND property_id=? AND request_fingerprint=? LIMIT 1")
2312:  const duplicateSession=await env.DB.prepare("SELECT * FROM handover_commits WHERE company_id=? AND property_id=? AND session_id=? AND status='ACCEPTED' LIMIT 1")
2344:    env.DB.prepare(`INSERT INTO handover_commits (
2363:    env.DB.prepare(`INSERT INTO handover_idempotency_keys
2367:    env.DB.prepare(`INSERT INTO handover_audit_events
2371:    env.DB.prepare(`INSERT INTO entry_events
2377:    statements.push(env.DB.prepare(`INSERT INTO handover_commit_rows
2656:        "UPDATE active_sessions SET revoked=1 WHERE corpid=? AND sid<>?"
2689:          "SELECT value, updated_by, updated_at FROM app_settings WHERE corpid=? AND key=? LIMIT 1"
2704:          `INSERT INTO app_settings (corpid, key, value, updated_by, updated_at)
2706:             ON CONFLICT(corpid, key) DO UPDATE SET
2750:        `INSERT INTO app_settings (corpid, key, value, updated_by, updated_at)
2752:           ON CONFLICT(corpid, key) DO UPDATE SET
2779:          "SELECT value, updated_by, updated_at FROM app_settings WHERE corpid=? AND key=? LIMIT 1"
2820:        `INSERT INTO app_settings (corpid, key, value, updated_by, updated_at)
2822:           ON CONFLICT(corpid, key) DO UPDATE SET
2846:          "SELECT value, updated_by, updated_at FROM app_settings WHERE corpid=? AND key=? LIMIT 1"
2884:        `INSERT INTO app_settings (corpid, key, value, updated_by, updated_at)
2886:           ON CONFLICT(corpid, key) DO UPDATE SET
3011:        "SELECT id, voided_at FROM sessions WHERE id=? AND corpid=? LIMIT 1"
3020:        env.DB.prepare(`UPDATE sessions
3038:          env.DB.prepare(`UPDATE arrear_tasks
3050:                entry_id IN (SELECT id FROM transactions WHERE session_id=? AND corpid=?)
3051:                OR original_entry_id IN (SELECT id FROM transactions WHERE session_id=? AND corpid=?)
3053:          env.DB.prepare(`UPDATE deposit_ledger
3060:              AND entry_id IN (SELECT id FROM transactions WHERE session_id=? AND corpid=?)`).bind(now, user.userid, voidReason, voidSource, user.corpid, id, user.corpid),
3061:          env.DB.prepare(`UPDATE transactions
3072:          env.DB.prepare(`UPDATE arrears
3111:        ? "SELECT * FROM sessions WHERE corpid=? ORDER BY created_at DESC"
3112:        : "SELECT * FROM sessions WHERE corpid=? AND COALESCE(voided_at,'')='' AND COALESCE(handover_status,'')<>'VOID' ORDER BY created_at DESC";
3129:          ? "SELECT * FROM transactions WHERE session_id=? AND corpid=? ORDER BY created_at ASC"
3130:          : "SELECT * FROM transactions WHERE session_id=? AND corpid=? AND COALESCE(voided_at,'')='' AND COALESCE(status,'ACTIVE')<>'VOID' ORDER BY created_at ASC"
```


## 5. API Inventory And Authorization Snapshot


### 5.1 API_INVENTORY.md Excerpt

File: `API_INVENTORY.md`


```text
# API Inventory

Date: 2026-05-23
Source: generated from `deploy-worker/src/index.js` by `scripts/audit-api.mjs`
Production calls: none

## Summary

- Total routes found by scan: 46
- Method counts: ANY=19, GET=11, POST=16
- Auth model: public auth routes, then `requireAuth`, then staff allowlist / manager checks
- Tenant scope currently uses `corpid`
- Future SaaS scope still needs `tenant_id/company_id/property_id`
- Drift gate: `npm run audit:api:check` fails if route metadata does not match Worker source

## Inventory

| Method | Path                                        | Purpose                                                                                                                    | Login | Roles                                                                             | Tenant Scope                                         | Reads                                                            | Writes                                                                                                                           | Financial | Delete         | Audit                 | Risk | Notes                                                                                                                                                                  |
| ------ | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ----- | --------------------------------------------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | --------- | -------------- | --------------------- | ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ANY    | `/`                                         | three-portal static entry                                                                                                  | No    | public                                                                            | none                                                 | static asset                                                     | none                                                                                                                             | No        | No             | No                    | P2   | Formal user entry; Worker handler serves static portal only for GET.                                                                                                   |
| ANY    | `/admin`                                    | readonly admin business page                                                                                               | Yes   | readonly_admin                                                                    | session `corpid`                                     | session, static asset                                            | none                                                                                                                             | No        | No             | No                    | P2   | Serves owner asset in read-only mode after readonly admin role check.                                                                                                  |
| ANY    | `/admin-login`                              | readonly admin portal alias                                                                                                | No    | public                                                                            | none                                                 | none                                                             | none                                                                                                                             | No        | No             | No                    | P2   | Redirects to root entry with admin portal selection.                                                                                                                   |
| GET    | `/api/arrear_tasks`                         | list arrear follow-up tasks                                                                                                | Yes   | employee, owner                                                                   | `corpid` filter                                      | `arrear_tasks`, legacy `arrears`                                 | none                                                                                                                             | Yes       | No             | No                    | P1   | Receivables model is still missing.                                                                                                                                    |
| POST   | `/api/arrear_tasks/update`                  | update arrear follow-up task                                                                                               | Yes   | employee limited, owner broader                                                   | `corpid` filter                                      | `arrear_tasks`, legacy `arrears`                                 | `arrear_tasks`, `entry_events`, `audit_logs`                                                                                     | Yes       | No             | Yes                   | P0   | Needs stricter lifecycle tests and receivable linkage.                                                                                                                 |
| GET    | `/api/arrears`                              | owner arrears view                                                                                                         | Yes   | owner                                                                             | `corpid` filter                                      | arrear sources                                                   | none                                                                                                                             | Yes       | No             | No                    | P1   | Must be backed by receivables before commercial reporting.                                                                                                             |
| POST   | `/api/clear_arrear`                         | manager clear arrear                                                                                                       | Yes   | owner                                                                             | `corpid` filter                                      | arrear sources                                                   | `arrears`, `arrear_tasks`, `audit_logs`                                                                                          | Yes       | No             | Yes                   | P0   | Requires full before/after audit and receivable application.                                                                                                           |
| GET    | `/api/customers`                            | read customer credit data                                                                                                  | Yes   | owner                                                                             | `corpid` filter                                      | `app_settings`                                                   | runtime schema creation in request path                                                                                          | Indirect  | No             | No                    | P1   | JSON settings store is not enough for SaaS analytics.                                                                                                                  |
| POST   | `/api/customers`                            | save customer credit data                                                                                                  | Yes   | owner                                                                             | `corpid` filter                                      | request body                                                     | `app_settings`, `audit_logs`                                                                                                     | Indirect  | No             | Yes                   | P1   | Needs normalized customer model before commercial multi-property use.                                                                                                  |
| POST   | `/api/delete_session`                       | void session                                                                                                               | Yes   | owner                                                                             | `corpid` filter                                      | `sessions`, `transactions`                                       | voids `sessions`, `transactions`, `deposit_ledger`, legacy `arrears`, and `arrear_tasks`; writes `audit_logs` and `entry_events` | Yes       | No hard delete | Yes                   | P1   | Normal business flow preserves rows; production migration discipline remains required.                                                                                 |
| GET    | `/api/employee/deposit`                     | employee deposit balance lookup                                                                                            | Yes   | employee, owner                                                                   | `corpid` filter                                      | `deposit_ledger`                                                 | none                                                                                                                             | Yes       | No             | No                    | P1   | Deposit ledger is not yet integer-fils commercial schema.                                                                                                              |
| POST   | `/api/employee/entry`                       | employee transaction entry; local/staging adapter pre-validation rehearsal behind ENABLE_EMPLOYEE_ENTRY_ADAPTER_LIVE_ROUTE | Yes   | legacy employee/owner behavior; adapter rehearsal mode allows employee/staff only | `corpid` write                                       | `transactions`, `arrear_tasks`, `deposit_ledger`, `app_settings` | `sessions`, `transactions`, `arrear_tasks`, `deposit_ledger`, `entry_events`, `audit_logs`                                       | Yes       | No             | Yes                   | P0   | Production and feature-flag-off behavior remain legacy. Local/staging adapter rehearsal pre-validates minor-unit plans before legacy write and rejects invalid drafts. |
| GET    | `/api/employee/lock/cards`                  | employee TTLock context                                                                                                    | Yes   | employee, owner                                                                   | session `corpid`                                     | TTLock API                                                       | `audit_logs`                                                                                                                     | Indirect  | No             | Yes                   | P1   | External lock-card data becomes an accounting anchor.                                                                                                                  |
| POST   | `/api/employee/migrate`                     | employee schema migration endpoint                                                                                         | Yes   | owner                                                                             | `corpid`                                             | schema                                                           | schema                                                                                                                           | Yes       | No             | Yes                   | P1   | Request-path migration must move to migration pipeline.                                                                                                                |
| ANY    | `/api/history`                              | list sessions                                                                                                              | Yes   | owner                                                                             | `corpid` filter                                      | `sessions`                                                       | none                                                                                                                             | Yes       | No             | No                    | P1   | Source currently accepts any HTTP method for this path.                                                                                                                |
| GET    | `/api/lock/cards`                           | owner TTLock load                                                                                                          | Yes   | owner                                                                             | session `corpid`                                     | TTLock API                                                       | `audit_logs`                                                                                                                     | Indirect  | No             | Yes                   | P1   | External data should be snapshotted before accounting use.                                                                                                             |
| ANY    | `/api/me`                                   | current user identity                                                                                                      | Yes   | owner, employee                                                                   | session `corpid`                                     | session                                                          | none                                                                                                                             | No        | No             | No                    | P1   | Source currently accepts any HTTP method for this path.                                                                                                                |
| GET    | `/api/me`                                   | staff allowlist declaration for identity route                                                                             | Yes   | employee, owner                                                                   | session `corpid`                                     | session                                                          | none                                                                                                                             | No        | No             | No                    | P2   | Allowlist says GET, but route handler also contains `ANY /api/me`.                                                                                                     |
| GET    | `/api/rent_config`                          | read rent reference config                                                                                                 | Yes   | employee, owner                                                                   | `corpid` filter                                      | `app_settings`                                                   | runtime schema creation in request path                                                                                          | Yes       | No             | No                    | P1   | Rent config needs versioning and migration-owned schema.                                                                                                               |
| POST   | `/api/rent_config`                          | update rent reference config                                                                                               | Yes   | owner                                                                             | `corpid` filter                                      | request body                                                     | `app_settings`, `audit_logs`                                                                                                     | Yes       | No             | Yes                   | P0   | Affects future receivables; requires effective-date model before SaaS.                                                                                                 |
| POST   | `/api/save_session`                         | owner legacy session save                                                                                                  | Yes   | owner                                                                             | `corpid` write                                       | request body                                                     | `sessions`, `transactions`, legacy `arrears`                                                                                     | Yes       | No             | No direct route audit | P0   | Legacy financial write path lacks backend-owned handover validation.                                                                                                   |
| POST   | `/api/security/revoke_sessions`             | revoke other sessions                                                                                                      | Yes   | owner                                                                             | `corpid` filter                                      | `active_sessions`                                                | `active_sessions`, `audit_logs`                                                                                                  | No        | No             | Yes                   | P1   | Runtime schema creation remains in request path.                                                                                                                       |
| GET    | `/api/session_detail`                       | session transaction detail                                                                                                 | Yes   | owner                                                                             | `corpid` filter                                      | `transactions`                                                   | none                                                                                                                             | Yes       | No             | No                    | P1   | Reads legacy decimal transaction rows.                                                                                                                                 |
| POST   | `/api/staging/employee-entry/adapter-draft` | local/staging-only employee entry live write adapter draft endpoint                                                        | Yes   | employee only                                                                     | session `corpid` plus request/resolved `property_id` | request body only                                                | none                                                                                                                             | Yes       | No             | Planned only          | P0   | Feature-flagged local/staging endpoint only; returns adapter write plans and does not write legacy live financial tables.                                              |
| POST   | `/api/staging/handover/commit`              | local/staging-only atomic employee handover commit rehearsal endpoint                                                      | Yes   | employee only                                                                     | session `corpid` plus request `property_id`          | `handover_idempotency_keys`, `handover_commits`                  | `handover_commits`, `handover_commit_rows`, `handover_idempotency_keys`, `handover_audit_events`, `audit_logs`, `entry_events`   | Yes       | No             | Yes                   | P0   | Feature-flagged local/staging endpoint only; production returns 404 and live handover flow remains unchanged.                                                          |
| GET    | `/api/wifi/accounts`                        | read WiFi accounts                                                                                                         | Yes   | owner                                                                             | `corpid` filter                                      | `app_settings`                                                   | possible encrypted migration to `app_settings`, `audit_logs`                                                                     | No        | No             | Conditional           | P1   | Read path can mutate encrypted storage.                                                                                                                                |
| POST   | `/api/wifi/accounts`                        | save WiFi accounts                                                                                                         | Yes   | owner                                                                             | `corpid` filter                                      | request body                                                     | `app_settings`, `audit_logs`                                                                                                     | No        | No             | Yes                   | P1   | Sensitive secrets require production key rotation process.                                                                                                             |
| POST   | `/auth/confirm-manager`                     | confirm manager credential                                                                                                 | Yes   | authenticated                                                                     | session `corpid`                                     | environment manager secret                                       | none                                                                                                                             | No        | No             | No                    | P2   | Requires authenticated session before manager confirmation.                                                                                                            |
| POST   | `/auth/employee-login`                      | employee PIN login                                                                                                         | No    | public                                                                            | env `CORPID`                                         | `employee_users`                                                 | `active_sessions`                                                                                                                | No        | No             | No                    | P1   | Employee identity is not tenant/property-scoped enough for SaaS.                                                                                                       |
| POST   | `/auth/login`                               | owner/staff password login                                                                                                 | No    | public                                                                            | env `CORPID`                                         | environment credentials                                          | `active_sessions`                                                                                                                | No        | No             | No                    | P1   | Public credential route; production secret management required.                                                                                                        |
| POST   | `/auth/logout`                              | clear browser session cookie                                                                                               | No    | public                                                                            | none                                                 | cookie                                                           | cookie only                                                                                                                      | No        | No             | No                    | P2   | Does not revoke server-side session by itself.                                                                                                                         |
| ANY    | `/employee`                                 | employee business page                                                                                                     | Yes   | employee                                                                          | session `corpid`                                     | session, static asset                                            | none                                                                                                                             | No        | No             | No                    | P2   | Serves employee asset only after server role check.                                                                                                                    |
| ANY    | `/employee-login`                           | employee portal alias                                                                                                      | No    | public                                                                            | none                                                 | none                                                             | none                                                                                                                             | No        | No             | No                    | P2   | Redirects to root entry with employee portal selection.                                                                                                                |
| ANY    | `/employee-v2.html`                         | legacy employee business asset alias                                                                                       | Yes   | employee                                                                          | session `corpid`                                     | session                                                          | none                                                                                                                             | No        | No             | No                    | P3   | Redirects to canonical `/employee`; no business write occurs.                                                                                                          |
| ANY    | `/employee-v3.html`                         | legacy employee business asset alias                                                                                       | Yes   | employee                                                                          | session `corpid`                                     | session                                                          | none                                                                                                                             | No        | No             | No                    | P2   | Redirects to canonical `/employee`; no business write occurs.                                                                                                          |
| ANY    | `/employee.html`                            | legacy employee login asset alias                                                                                          | No    | public                                                                            | none                                                 | none                                                             | none                                                                                                                             | No        | No             | No                    | P2   | Redirects to root entry with employee portal selection.                                                                                                                |
| GET    | `/favicon.ico`                              | favicon response                                                                                                           | No    | public                                                                            | none                                                 | none                                                             | none                                                                                                                             | No        | No             | No                    | P3   | Static browser route.                                                                                                                                                  |
| ANY    | `/home`                                     | three-portal static entry alias                                                                                            | No    | public                                                                            | none                                                 | static asset                                                     | none                                                                                                                             | No        | No             | No                    | P3   | Alias to root entry; Worker handler serves static portal only for GET.                                                                                                 |
| ANY    | `/index-51.html`                            | legacy owner business asset alias                                                                                          | Yes   | owner                                                                             | session `corpid`                                     | session                                                          | none                                                                                                                             | No        | No             | No                    | P3   | Redirects to canonical `/owner`; no business write occurs.                                                                                                             |
| ANY    | `/index.html`                               | legacy owner business asset alias                                                                                          | Yes   | owner                                                                             | session `corpid`                                     | session                                                          | none                                                                                                                             | No        | No             | No                    | P2   | Redirects to canonical `/owner`; no business write occurs.                                                                                                             |
| ANY    | `/login`                                    | legacy login alias                                                                                                         | No    | public                                                                            | none                                                 | none                                                             | none                                                                                                                             | No        | No             | No                    | P2   | Redirects to root entry; no credentials processed on this path.                                                                                                        |
| ANY    | `/owner`                                    | owner business page                                                                                                        | Yes   | owner                                                                             | session `corpid`                                     | session, static asset                                            | none                                                                                                                             | No        | No             | No                    | P2   | Serves owner asset only after server role check.                                                                                                                       |
| ANY    | `/owner-login`                              | owner portal alias                                                                                                         | No    | public                                                                            | none                                                 | none                                                             | none                                                                                                                             | No        | No             | No                    | P2   | Redirects to root entry with owner portal selection.                                                                                                                   |
| ANY    | `/owner.html`                               | legacy owner business asset alias                                                                                          | Yes   | owner                                                                             | session `corpid`                                     | session                                                          | none                                                                                                                             | No        | No             | No                    | P3   | Redirects to canonical `/owner`; no business write occurs.                                                                                                             |
| ANY    | `/staff-login`                              | staff portal alias                                                                                                         | No    | public                                                                            | none                                                 | none                                                             | none                                                                                                                             | No        | No             | No                    | P3   | Redirects to root entry with employee portal selection.                                                                                                                |
| ANY    | `/unified-login.html`                       | legacy unified login alias                                                                                                 | No    | public                                                                            | none                                                 | none                                                             | none                                                                                                                             | No        | No             | No                    | P2   | Redirects to root entry; kept for compatibility only.                                                                                                                  |

## P0 API Risks

- `POST /api/arrear_tasks/update`: Needs stricter lifecycle tests and receivable linkage.
- `POST /api/clear_arrear`: Requires full before/after audit and receivable application.
- `POST /api/employee/entry`: Production and feature-flag-off behavior remain legacy. Local/staging adapter rehearsal pre-validates minor-unit plans before legacy write and rejects invalid drafts.
- `POST /api/rent_config`: Affects future receivables; requires effective-date model before SaaS.
- `POST /api/save_session`: Legacy financial write path lacks backend-owned handover validation.
- `POST /api/staging/employee-entry/adapter-draft`: Feature-flagged local/staging endpoint only; returns adapter write plans and does not write legacy live financial tables.
- `POST /api/staging/handover/commit`: Feature-flagged local/staging endpoint only; production returns 404 and live handover flow remains unchanged.

## P1 API Risks

- `GET /api/arrear_tasks`: Receivables model is still missing.
- `GET /api/arrears`: Must be backed by receivables before commercial reporting.
- `GET /api/customers`: JSON settings store is not enough for SaaS analytics.
- `POST /api/customers`: Needs normalized customer model before commercial multi-property use.
- `POST /api/delete_session`: Normal business flow preserves rows; production migration discipline remains required.
- `GET /api/employee/deposit`: Deposit ledger is not yet integer-fils commercial schema.
- `GET /api/employee/lock/cards`: External lock-card data becomes an accounting anchor.
- `POST /api/employee/migrate`: Request-path migration must move to migration pipeline.
- `ANY /api/history`: Source currently accepts any HTTP method for this path.
- `GET /api/lock/cards`: External data should be snapshotted before accounting use.
- `ANY /api/me`: Source currently accepts any HTTP method for this path.
- `GET /api/rent_config`: Rent config needs versioning and migration-owned schema.
- `POST /api/security/revoke_sessions`: Runtime schema creation remains in request path.
- `GET /api/session_detail`: Reads legacy decimal transaction rows.
- `GET /api/wifi/accounts`: Read path can mutate encrypted storage.
- `POST /api/wifi/accounts`: Sensitive secrets require production key rotation process.
- `POST /auth/employee-login`: Employee identity is not tenant/property-scoped enough for SaaS.
- `POST /auth/login`: Public credential route; production secret management required.

## Next API Work

1. Add route-level tests for unauthenticated, employee, owner, and future admin cases.
2. Keep `/api/delete_session` void behavior covered by regression tests and audited migration discipline.
3. Introduce tenant/property scope model before multi-customer SaaS rollout.
4. Keep frontend hidden buttons as UX only; server checks remain mandatory.
```


### 5.2 API_PERMISSION_MATRIX.md Excerpt

File: `API_PERMISSION_MATRIX.md`


```text
# API Permission Matrix

Generated: 2026-05-25T05:44:30.259Z

Scope: static API-by-API permission audit. This script is read-only and does not call APIs, deploy, migrate, or modify Worker routes.

| Method | Path | Login                                       | Roles | Tenant Scope                                                                      | Financial                                            | Enforcement Evidence | Warnings                                                                                                                                                                 | Status                                                                                                                                                   |
| ------ | ---- | ------------------------------------------- | ----- | --------------------------------------------------------------------------------- | ---------------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | --- |
|        | GET  | `/api/arrear_tasks`                         | Yes   | employee, owner                                                                   | `corpid` filter                                      | Yes                  | global /api requireAuth gate<br>manager guard present in Worker source<br>employee/staff guard or allowlist present                                                      | financial route lacks direct audit evidence in inventory<br>tenant scope remains deployment corpid based                                                 | MANUAL_REVIEW |     |
|        | POST | `/api/arrear_tasks/update`                  | Yes   | employee limited, owner broader                                                   | `corpid` filter                                      | Yes                  | global /api requireAuth gate<br>manager guard present in Worker source<br>employee/staff guard or allowlist present                                                      | tenant scope remains deployment corpid based                                                                                                             | MANUAL_REVIEW |     |
|        | GET  | `/api/arrears`                              | Yes   | owner                                                                             | `corpid` filter                                      | Yes                  | global /api requireAuth gate<br>manager guard present in Worker source                                                                                                   | financial route lacks direct audit evidence in inventory<br>tenant scope remains deployment corpid based                                                 | MANUAL_REVIEW |     |
|        | POST | `/api/clear_arrear`                         | Yes   | owner                                                                             | `corpid` filter                                      | Yes                  | global /api requireAuth gate<br>manager guard present in Worker source                                                                                                   | tenant scope remains deployment corpid based                                                                                                             | MANUAL_REVIEW |     |
|        | GET  | `/api/customers`                            | Yes   | owner                                                                             | `corpid` filter                                      | Indirect             | global /api requireAuth gate<br>manager guard present in Worker source                                                                                                   | tenant scope remains deployment corpid based                                                                                                             | MANUAL_REVIEW |     |
|        | POST | `/api/customers`                            | Yes   | owner                                                                             | `corpid` filter                                      | Indirect             | global /api requireAuth gate<br>manager guard present in Worker source                                                                                                   | tenant scope remains deployment corpid based                                                                                                             | MANUAL_REVIEW |     |
|        | POST | `/api/delete_session`                       | Yes   | owner                                                                             | `corpid` filter                                      | Yes                  | global /api requireAuth gate<br>manager guard present in Worker source                                                                                                   | tenant scope remains deployment corpid based                                                                                                             | MANUAL_REVIEW |     |
|        | GET  | `/api/employee/deposit`                     | Yes   | employee, owner                                                                   | `corpid` filter                                      | Yes                  | global /api requireAuth gate<br>manager guard present in Worker source<br>employee/staff guard or allowlist present                                                      | financial route lacks direct audit evidence in inventory<br>tenant scope remains deployment corpid based                                                 | MANUAL_REVIEW |     |
|        | POST | `/api/employee/entry`                       | Yes   | legacy employee/owner behavior; adapter rehearsal mode allows employee/staff only | `corpid` write                                       | Yes                  | global /api requireAuth gate<br>manager guard present in Worker source<br>employee/staff guard or allowlist present                                                      | tenant scope remains deployment corpid based                                                                                                             | MANUAL_REVIEW |     |
|        | GET  | `/api/employee/lock/cards`                  | Yes   | employee, owner                                                                   | session `corpid`                                     | Indirect             | global /api requireAuth gate<br>manager guard present in Worker source<br>employee/staff guard or allowlist present                                                      | tenant scope remains deployment corpid based                                                                                                             | MANUAL_REVIEW |     |
|        | POST | `/api/employee/migrate`                     | Yes   | owner                                                                             | `corpid`                                             | Yes                  | global /api requireAuth gate<br>manager guard present in Worker source                                                                                                   | tenant scope remains deployment corpid based                                                                                                             | MANUAL_REVIEW |     |
|        | ANY  | `/api/history`                              | Yes   | owner                                                                             | `corpid` filter                                      | Yes                  | global /api requireAuth gate<br>manager guard present in Worker source                                                                                                   | route accepts ANY method in source inventory<br>financial route lacks direct audit evidence in inventory<br>tenant scope remains deployment corpid based | MANUAL_REVIEW |     |
|        | GET  | `/api/lock/cards`                           | Yes   | owner                                                                             | session `corpid`                                     | Indirect             | global /api requireAuth gate<br>manager guard present in Worker source                                                                                                   | tenant scope remains deployment corpid based                                                                                                             | MANUAL_REVIEW |     |
|        | ANY  | `/api/me`                                   | Yes   | owner, employee                                                                   | session `corpid`                                     | No                   | global /api requireAuth gate<br>manager guard present in Worker source<br>employee/staff guard or allowlist present                                                      | route accepts ANY method in source inventory<br>tenant scope remains deployment corpid based                                                             | MANUAL_REVIEW |     |
|        | GET  | `/api/me`                                   | Yes   | employee, owner                                                                   | session `corpid`                                     | No                   | global /api requireAuth gate<br>manager guard present in Worker source<br>employee/staff guard or allowlist present                                                      | tenant scope remains deployment corpid based                                                                                                             | MANUAL_REVIEW |     |
|        | GET  | `/api/rent_config`                          | Yes   | employee, owner                                                                   | `corpid` filter                                      | Yes                  | global /api requireAuth gate<br>manager guard present in Worker source<br>employee/staff guard or allowlist present                                                      | financial route lacks direct audit evidence in inventory<br>tenant scope remains deployment corpid based                                                 | MANUAL_REVIEW |     |
|        | POST | `/api/rent_config`                          | Yes   | owner                                                                             | `corpid` filter                                      | Yes                  | global /api requireAuth gate<br>manager guard present in Worker source                                                                                                   | tenant scope remains deployment corpid based                                                                                                             | MANUAL_REVIEW |     |
|        | POST | `/api/save_session`                         | Yes   | owner                                                                             | `corpid` write                                       | Yes                  | global /api requireAuth gate<br>manager guard present in Worker source                                                                                                   | tenant scope remains deployment corpid based                                                                                                             | MANUAL_REVIEW |     |
|        | POST | `/api/security/revoke_sessions`             | Yes   | owner                                                                             | `corpid` filter                                      | No                   | global /api requireAuth gate<br>manager guard present in Worker source                                                                                                   | tenant scope remains deployment corpid based                                                                                                             | MANUAL_REVIEW |     |
|        | GET  | `/api/session_detail`                       | Yes   | owner                                                                             | `corpid` filter                                      | Yes                  | global /api requireAuth gate<br>manager guard present in Worker source                                                                                                   | financial route lacks direct audit evidence in inventory<br>tenant scope remains deployment corpid based                                                 | MANUAL_REVIEW |     |
|        | POST | `/api/staging/employee-entry/adapter-draft` | Yes   | employee only                                                                     | session `corpid` plus request/resolved `property_id` | Yes                  | global /api requireAuth gate<br>employee/staff guard or allowlist present<br>staging feature flag guard present<br>production 404 guard present for staging route family | none                                                                                                                                                     | STATIC_OK     |     |
|        | POST | `/api/staging/handover/commit`              | Yes   | employee only                                                                     | session `corpid` plus request `property_id`          | Yes                  | global /api requireAuth gate<br>employee/staff guard or allowlist present<br>staging feature flag guard present<br>production 404 guard present for staging route family | none                                                                                                                                                     | STATIC_OK     |     |
|        | GET  | `/api/wifi/accounts`                        | Yes   | owner                                                                             | `corpid` filter                                      | No                   | global /api requireAuth gate<br>manager guard present in Worker source                                                                                                   | tenant scope remains deployment corpid based                                                                                                             | MANUAL_REVIEW |     |
|        | POST | `/api/wifi/accounts`                        | Yes   | owner                                                                             | `corpid` filter                                      | No                   | global /api requireAuth gate<br>manager guard present in Worker source                                                                                                   | tenant scope remains deployment corpid based                                                                                                             | MANUAL_REVIEW |     |
|        | POST | `/auth/confirm-manager`                     | Yes   | authenticated                                                                     | session `corpid`                                     | No                   | global /api requireAuth gate                                                                                                                                             | tenant scope remains deployment corpid based                                                                                                             | MANUAL_REVIEW |     |
|        | POST | `/auth/employee-login`                      | No    | public                                                                            | env `CORPID`                                         | No                   | public route by inventory                                                                                                                                                | tenant scope remains deployment corpid based                                                                                                             | MANUAL_REVIEW |     |
|        | POST | `/auth/login`                               | No    | public                                                                            | env `CORPID`                                         | No                   | public route by inventory                                                                                                                                                | tenant scope remains deployment corpid based                                                                                                             | MANUAL_REVIEW |     |
|        | POST | `/auth/logout`                              | No    | public                                                                            | none                                                 | No                   | public route by inventory                                                                                                                                                | none                                                                                                                                                     | STATIC_OK     |     |
|        | GET  | `/favicon.ico`                              | No    | public                                                                            | none                                                 | No                   | public route by inventory                                                                                                                                                | none                                                                                                                                                     | STATIC_OK     |     |

## Manual Review Focus

- `GET /api/arrear_tasks`: financial route lacks direct audit evidence in inventory; tenant scope remains deployment corpid based
- `POST /api/arrear_tasks/update`: tenant scope remains deployment corpid based
- `GET /api/arrears`: financial route lacks direct audit evidence in inventory; tenant scope remains deployment corpid based
- `POST /api/clear_arrear`: tenant scope remains deployment corpid based
- `GET /api/customers`: tenant scope remains deployment corpid based
- `POST /api/customers`: tenant scope remains deployment corpid based
- `POST /api/delete_session`: tenant scope remains deployment corpid based
- `GET /api/employee/deposit`: financial route lacks direct audit evidence in inventory; tenant scope remains deployment corpid based
- `POST /api/employee/entry`: tenant scope remains deployment corpid based
- `GET /api/employee/lock/cards`: tenant scope remains deployment corpid based
- `POST /api/employee/migrate`: tenant scope remains deployment corpid based
- `ANY /api/history`: route accepts ANY method in source inventory; financial route lacks direct audit evidence in inventory; tenant scope remains deployment corpid based
- `GET /api/lock/cards`: tenant scope remains deployment corpid based
- `ANY /api/me`: route accepts ANY method in source inventory; tenant scope remains deployment corpid based
- `GET /api/me`: tenant scope remains deployment corpid based
- `GET /api/rent_config`: financial route lacks direct audit evidence in inventory; tenant scope remains deployment corpid based
- `POST /api/rent_config`: tenant scope remains deployment corpid based
- `POST /api/save_session`: tenant scope remains deployment corpid based
- `POST /api/security/revoke_sessions`: tenant scope remains deployment corpid based
- `GET /api/session_detail`: financial route lacks direct audit evidence in inventory; tenant scope remains deployment corpid based
- `GET /api/wifi/accounts`: tenant scope remains deployment corpid based
- `POST /api/wifi/accounts`: tenant scope remains deployment corpid based
- `POST /auth/confirm-manager`: tenant scope remains deployment corpid based
- `POST /auth/employee-login`: tenant scope remains deployment corpid based
- `POST /auth/login`: tenant scope remains deployment corpid based
```


### 5.3 AUDIT_LOG_COVERAGE_MATRIX.md Excerpt

File: `AUDIT_LOG_COVERAGE_MATRIX.md`


```text
# Audit Log Coverage Matrix

Generated: 2026-05-25T05:44:31.609Z

Scope: static audit coverage review for API mutations and financial routes. This script is read-only and does not call APIs, deploy, migrate, or write D1.

| Method | Path | Purpose                                     | Financial Mutation                                                                                                         | Inventory Audit | Source Audit Evidence | Status | Missing / Notes |
| ------ | ---- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | --------------- | --------------------- | ------ | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
|        | GET  | `/api/arrear_tasks`                         | list arrear follow-up tasks                                                                                                | No              | No                    | Yes    | MANUAL_REVIEW   | inventory audit evidence missing                                                                                                                                       |     |
|        | POST | `/api/arrear_tasks/update`                  | update arrear follow-up task                                                                                               | Yes             | Yes                   | Yes    | STATIC_EVIDENCE | Needs stricter lifecycle tests and receivable linkage.                                                                                                                 |     |
|        | GET  | `/api/arrears`                              | owner arrears view                                                                                                         | No              | No                    | Yes    | MANUAL_REVIEW   | inventory audit evidence missing                                                                                                                                       |     |
|        | POST | `/api/clear_arrear`                         | manager clear arrear                                                                                                       | Yes             | Yes                   | Yes    | STATIC_EVIDENCE | Requires full before/after audit and receivable application.                                                                                                           |     |
|        | POST | `/api/customers`                            | save customer credit data                                                                                                  | No              | Yes                   | Yes    | STATIC_EVIDENCE | Needs normalized customer model before commercial multi-property use.                                                                                                  |     |
|        | POST | `/api/delete_session`                       | void session                                                                                                               | Yes             | Yes                   | Yes    | STATIC_EVIDENCE | Normal business flow preserves rows; production migration discipline remains required.                                                                                 |     |
|        | GET  | `/api/employee/deposit`                     | employee deposit balance lookup                                                                                            | No              | No                    | Yes    | MANUAL_REVIEW   | inventory audit evidence missing                                                                                                                                       |     |
|        | POST | `/api/employee/entry`                       | employee transaction entry; local/staging adapter pre-validation rehearsal behind ENABLE_EMPLOYEE_ENTRY_ADAPTER_LIVE_ROUTE | Yes             | Yes                   | Yes    | STATIC_EVIDENCE | Production and feature-flag-off behavior remain legacy. Local/staging adapter rehearsal pre-validates minor-unit plans before legacy write and rejects invalid drafts. |     |
|        | POST | `/api/employee/migrate`                     | employee schema migration endpoint                                                                                         | Yes             | Yes                   | Yes    | STATIC_EVIDENCE | Request-path migration must move to migration pipeline.                                                                                                                |     |
|        | ANY  | `/api/history`                              | list sessions                                                                                                              | No              | No                    | Yes    | MANUAL_REVIEW   | inventory audit evidence missing                                                                                                                                       |     |
|        | GET  | `/api/rent_config`                          | read rent reference config                                                                                                 | No              | No                    | Yes    | MANUAL_REVIEW   | inventory audit evidence missing                                                                                                                                       |     |
|        | POST | `/api/rent_config`                          | update rent reference config                                                                                               | Yes             | Yes                   | Yes    | STATIC_EVIDENCE | Affects future receivables; requires effective-date model before SaaS.                                                                                                 |     |
|        | POST | `/api/save_session`                         | owner legacy session save                                                                                                  | Yes             | No                    | Yes    | MANUAL_REVIEW   | inventory audit evidence missing                                                                                                                                       |     |
|        | POST | `/api/security/revoke_sessions`             | revoke other sessions                                                                                                      | Yes             | Yes                   | Yes    | STATIC_EVIDENCE | financial relevance indirect/unclear                                                                                                                                   |     |
|        | GET  | `/api/session_detail`                       | session transaction detail                                                                                                 | No              | No                    | Yes    | MANUAL_REVIEW   | inventory audit evidence missing                                                                                                                                       |     |
|        | POST | `/api/staging/employee-entry/adapter-draft` | local/staging-only employee entry live write adapter draft endpoint                                                        | Yes             | Yes                   | Yes    | STATIC_EVIDENCE | Feature-flagged local/staging endpoint only; returns adapter write plans and does not write legacy live financial tables.                                              |     |
|        | POST | `/api/staging/handover/commit`              | local/staging-only atomic employee handover commit rehearsal endpoint                                                      | Yes             | Yes                   | Yes    | STATIC_EVIDENCE | Feature-flagged local/staging endpoint only; production returns 404 and live handover flow remains unchanged.                                                          |     |
|        | POST | `/api/wifi/accounts`                        | save WiFi accounts                                                                                                         | No              | Yes                   | Yes    | STATIC_EVIDENCE | Sensitive secrets require production key rotation process.                                                                                                             |     |
|        | POST | `/auth/confirm-manager`                     | confirm manager credential                                                                                                 | No              | No                    | Yes    | MANUAL_REVIEW   | inventory audit evidence missing                                                                                                                                       |     |
|        | POST | `/auth/employee-login`                      | employee PIN login                                                                                                         | Yes             | No                    | Yes    | MANUAL_REVIEW   | inventory audit evidence missing<br>financial relevance indirect/unclear                                                                                               |     |
|        | POST | `/auth/login`                               | owner/staff password login                                                                                                 | Yes             | No                    | Yes    | MANUAL_REVIEW   | inventory audit evidence missing<br>financial relevance indirect/unclear                                                                                               |     |
|        | POST | `/auth/logout`                              | clear browser session cookie                                                                                               | No              | No                    | Yes    | MANUAL_REVIEW   | inventory audit evidence missing                                                                                                                                       |     |

## Required Follow-Up

- Convert manual-review financial mutations into runtime tests that assert `audit_logs` or `entry_events` rows are written.
- Define a unified immutable audit event model before production launch.
- Keep PII and secret redaction requirements from `OBSERVABILITY_AND_ERROR_MONITORING_PLAN.md` in scope.
```


## 6. Performance Analysis


### 6.1 History / Arrears / Customer Query Evidence

Command: `rg -n "/api/history|/api/arrears|/api/customers|LIMIT|OFFSET|ORDER BY|SELECT .* FROM" deploy-worker/src/index.js`


```text
261:      `SELECT sid FROM active_sessions
262:       WHERE sid=? AND corpid=? AND userid=? AND role=? AND revoked=0 AND expires_at>? LIMIT 1`
459:  if (!env.RATE_LIMIT) return null;
461:  const current = Number(await env.RATE_LIMIT.get(key) || "0");
463:  await env.RATE_LIMIT.put(key, String(current + 1), { expirationTtl: LOGIN_WINDOW_SECONDS });
469:    await env.RATE_LIMIT?.delete(`login:${clientIp(request)}`);
609:  const row=await env.DB.prepare("SELECT employee_id FROM employee_users WHERE lower(employee_id)=? LIMIT 1").bind(seedEmployeeId).first();
629:  const row=await env.DB.prepare("SELECT * FROM employee_users WHERE lower(employee_id)=? AND status='ACTIVE' LIMIT 1").bind(employeeId).first();
1069:  const r=await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").bind(table).first();
1309:  const row=await env.DB.prepare("SELECT COALESCE(SUM(delta),0) AS balance FROM deposit_ledger WHERE corpid=? AND tenant_card_id=? AND COALESCE(voided_at,'')=''")
1316:    const existing=await env.DB.prepare(`SELECT ledger_id,balance_after,delta FROM deposit_ledger
1317:      WHERE corpid=? AND tenant_card_id=? AND entry_id=? AND type=? AND COALESCE(voided_at,'')='' LIMIT 1`)
1336:  const task=await env.DB.prepare(`SELECT * FROM arrear_tasks
1337:    WHERE task_id=? AND corpid=? AND COALESCE(close_status,'') NOT IN ('PAID','CLEARED','CLOSED','VOID','WAIVED','WRITTEN_OFF','已结清','结清','作废') LIMIT 1`)
1340:  const paidRow=await env.DB.prepare(`SELECT COALESCE(SUM(amount),0) AS total_paid FROM transactions
1380:  const existing=await env.DB.prepare(`SELECT * FROM arrear_tasks
1381:    WHERE task_id=? AND corpid=? LIMIT 1`).bind(cleanTaskId,user.corpid).first();
1386:  const legacy=await env.DB.prepare("SELECT * FROM arrears WHERE id=? AND corpid=? AND cleared=0 LIMIT 1")
1414:  const row=await env.DB.prepare("SELECT value FROM app_settings WHERE corpid=? AND key=? LIMIT 1").bind(corpid,"rent_ref_room").first();
1484:  const existingTx=await env.DB.prepare("SELECT id,session_id,type,linked_task_id FROM transactions WHERE id=? AND corpid=? LIMIT 1").bind(entryId,user.corpid).first();
1651:    const paidRow=await env.DB.prepare(`SELECT COALESCE(SUM(paid),0) AS total_paid FROM transactions
1656:    const existing=await env.DB.prepare(`SELECT task_id FROM arrear_tasks
1658:        AND COALESCE(close_status,'') NOT IN ('PAID','CLEARED','CLOSED','VOID','WAIVED','WRITTEN_OFF','已结清','结清','作废') LIMIT 1`).bind(user.corpid,room,periodStart,periodEnd).first();
1771:  const taskRows=await env.DB.prepare("SELECT * FROM arrear_tasks WHERE corpid=? ORDER BY COALESCE(updated_at,created_at) DESC").bind(user.corpid).all();
1780:    const legacy=await env.DB.prepare("SELECT * FROM arrears WHERE corpid=? AND cleared=0 AND COALESCE(voided_at,'')='' ORDER BY created_at DESC").bind(user.corpid).all();
1817:  const task=await env.DB.prepare("SELECT * FROM arrear_tasks WHERE task_id=? AND corpid=? LIMIT 1").bind(id,user.corpid).first();
1857:  let old=await env.DB.prepare("SELECT * FROM arrear_tasks WHERE task_id=? AND corpid=? LIMIT 1").bind(taskId,user.corpid).first();
1866:    const fallback=await env.DB.prepare("SELECT * FROM arrears WHERE id=? AND corpid=? LIMIT 1").bind(taskId,user.corpid).first().catch(()=>null);
2300:  const existingKey=await env.DB.prepare("SELECT * FROM handover_idempotency_keys WHERE company_id=? AND property_id=? AND idempotency_key=? LIMIT 1")
2304:      const commit=await env.DB.prepare("SELECT * FROM handover_commits WHERE commit_id=? LIMIT 1").bind(existingKey.commit_id||"").first().catch(()=>null);
2309:  const duplicateFingerprint=await env.DB.prepare("SELECT * FROM handover_idempotency_keys WHERE company_id=? AND property_id=? AND request_fingerprint=? LIMIT 1")
2312:  const duplicateSession=await env.DB.prepare("SELECT * FROM handover_commits WHERE company_id=? AND property_id=? AND session_id=? AND status='ACCEPTED' LIMIT 1")
2689:          "SELECT value, updated_by, updated_at FROM app_settings WHERE corpid=? AND key=? LIMIT 1"
2760:    if (path === "/api/arrears" && method === "GET") {
2763:    if (path === "/api/customers" && method === "GET") {
2779:          "SELECT value, updated_by, updated_at FROM app_settings WHERE corpid=? AND key=? LIMIT 1"
2798:    if (path === "/api/customers" && method === "POST") {
2846:          "SELECT value, updated_by, updated_at FROM app_settings WHERE corpid=? AND key=? LIMIT 1"
3011:        "SELECT id, voided_at FROM sessions WHERE id=? AND corpid=? LIMIT 1"
3050:                entry_id IN (SELECT id FROM transactions WHERE session_id=? AND corpid=?)
3051:                OR original_entry_id IN (SELECT id FROM transactions WHERE session_id=? AND corpid=?)
3060:              AND entry_id IN (SELECT id FROM transactions WHERE session_id=? AND corpid=?)`).bind(now, user.userid, voidReason, voidSource, user.corpid, id, user.corpid),
3103:    if (path === "/api/history") {
3111:        ? "SELECT * FROM sessions WHERE corpid=? ORDER BY created_at DESC"
3112:        : "SELECT * FROM sessions WHERE corpid=? AND COALESCE(voided_at,'')='' AND COALESCE(handover_status,'')<>'VOID' ORDER BY created_at DESC";
3114:        const { results } = await env.DB.prepare(`${baseSql} LIMIT ? OFFSET ?`).bind(user.corpid, limit, offset).all();
3129:          ? "SELECT * FROM transactions WHERE session_id=? AND corpid=? ORDER BY created_at ASC"
3130:          : "SELECT * FROM transactions WHERE session_id=? AND corpid=? AND COALESCE(voided_at,'')='' AND COALESCE(status,'ACTIVE')<>'VOID' ORDER BY created_at ASC"
```


### 6.2 Frontend Loading / Skeleton Evidence

Command: `rg -n "skeleton|loading|load more|limit=20|offset|history" deploy-worker/public --glob "*.{html,js}"`


```text
deploy-worker/public\index.html:246:.owner-auth-loading{display:grid;grid-template-columns:auto 1fr;gap:12px;align-items:center;padding:14px;border:1px solid var(--border);border-radius:var(--r);background:var(--surface2);color:var(--text2);font-size:13px;line-height:1.45;margin-bottom:12px}
deploy-worker/public\index.html:247:.owner-auth-loading[hidden]{display:none}
deploy-worker/public\index.html:1052:.owner-ui-unified .owner-auth-loading{
deploy-worker/public\index.html:1057:.owner-ui-unified .owner-auth-loading{min-height:92px}
deploy-worker/public\index.html:1390:<symbol id="i-history" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></symbol>
deploy-worker/public\index.html:1430:    <div class="owner-auth-loading" id="ownerAuthLoading">
deploy-worker/public\index.html:1468:      <button class="nav-btn" data-view="history" id="navHistory"><svg class="ico"><use href="#i-history"/></svg>历史<span class="en-sub">HISTORY</span></button>
deploy-worker/public\index.html:1606:  <section id="view-history" class="view hidden">
deploy-worker/public\index.html:1608:    <div class="page-sub" id="historyCount">所有保存过的会话</div>
deploy-worker/public\index.html:1609:    <div id="historyContent"></div>
deploy-worker/public\index-51.html:246:.owner-auth-loading{display:grid;grid-template-columns:auto 1fr;gap:12px;align-items:center;padding:14px;border:1px solid var(--border);border-radius:var(--r);background:var(--surface2);color:var(--text2);font-size:13px;line-height:1.45;margin-bottom:12px}
deploy-worker/public\index-51.html:247:.owner-auth-loading[hidden]{display:none}
deploy-worker/public\index-51.html:1052:.owner-ui-unified .owner-auth-loading{
deploy-worker/public\index-51.html:1057:.owner-ui-unified .owner-auth-loading{min-height:92px}
deploy-worker/public\index-51.html:1390:<symbol id="i-history" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></symbol>
deploy-worker/public\index-51.html:1430:    <div class="owner-auth-loading" id="ownerAuthLoading">
deploy-worker/public\index-51.html:1468:      <button class="nav-btn" data-view="history" id="navHistory"><svg class="ico"><use href="#i-history"/></svg>历史<span class="en-sub">HISTORY</span></button>
deploy-worker/public\index-51.html:1606:  <section id="view-history" class="view hidden">
deploy-worker/public\index-51.html:1608:    <div class="page-sub" id="historyCount">所有保存过的会话</div>
deploy-worker/public\index-51.html:1609:    <div id="historyContent"></div>
deploy-worker/public\index-51-main.js:99:    loading:document.getElementById('ownerAuthLoading'),
deploy-worker/public\index-51-main.js:113:  if(els.loading)els.loading.hidden=false;
deploy-worker/public\index-51-main.js:125:  if(els.loading)els.loading.hidden=true;
deploy-worker/public\index-51-main.js:594:  from:'',to:'',txCatFilter:'all',txSearch:'',historyViewing:null,historyLimit:HISTORY_PAGE_SIZE,
deploy-worker/public\index-51-main.js:1506:  const wrap=document.getElementById('historyContent');
deploy-worker/public\index-51-main.js:1509:  if(state.historyViewing){
deploy-worker/public\index-51-main.js:1510:    const s=state.historyViewing;
deploy-worker/public\index-51-main.js:1535:    document.getElementById('btnHistBack').onclick=()=>{state.historyViewing=null;renderHistory();};
deploy-worker/public\index-51-main.js:1542:  const limit=state.historyLimit||HISTORY_PAGE_SIZE;
deploy-worker/public\index-51-main.js:1543:  wrap.innerHTML=`<div class="owner-history-skeleton history-skeleton card" style="padding:18px">
deploy-worker/public\index-51-main.js:1546:      ${Array.from({length:Math.min(6,limit)}).map(()=>'<div class="hist-card skeleton-card" style="min-height:118px;background:linear-gradient(90deg,rgba(255,255,255,.58),rgba(226,239,233,.72),rgba(255,255,255,.58));background-size:220% 100%;animation:pulse 1.2s ease-in-out infinite"></div>').join('')}
deploy-worker/public\index-51-main.js:1551:    const r=await apiFetchWithTimeout(`/api/history?limit=${encodeURIComponent(limit)}`);
deploy-worker/public\index-51-main.js:1557:    wrap.innerHTML=`<div class="card owner-history-timeout" style="padding:24px;text-align:center;color:var(--red)">
deploy-worker/public\index-51-main.js:1592:  document.getElementById('historyCount').textContent=`流水档案 · 已加载最近 ${all.length} 条 · ${groups.length} 个月 · 新 → 旧`;
deploy-worker/public\index-51-main.js:1667:      }else if(a.dataset.act==='view'){state.historyViewing=s;renderHistory();}
deploy-worker/public\index-51-main.js:1671:  if(more)more.onclick=()=>{state.historyLimit=(state.historyLimit||HISTORY_PAGE_SIZE)+HISTORY_PAGE_SIZE;renderHistory();};
deploy-worker/public\index-51-main.js:3503:        <button class="btn btn-ghost" type="button" onclick="switchView('history')">历史</button>
deploy-worker/public\index-51-main.js:3564:  const apiHost=apiUrl('/api/history').replace(/\/api\/history$/,'');
deploy-worker/public\index-51-main.js:3618:    const r=await apiFetch(`/api/history?limit=${HISTORY_PAGE_SIZE}`);
deploy-worker/public\index-51-main.js:4678:  if(role==='staff'&&(v==='overview'||v==='history'||v==='analysis'||v==='clients'||v==='wifi')){toast('员工账户无此权限','err');return;}
deploy-worker/public\index-51-main.js:4681:  ['entry','overview','history','analysis','clients','wifi'].forEach(n=>{document.getElementById('view-'+n)?.classList.toggle('hidden',n!==v);});
deploy-worker/public\index-51-main.js:4684:  if(v==='history')renderHistory();
deploy-worker/public\index-51-cp.js:363:        <stop offset="0%" stop-color="#1A9E3F" stop-opacity="0.18"/>
deploy-worker/public\index-51-cp.js:364:        <stop offset="100%" stop-color="#1A9E3F" stop-opacity="0.01"/>
deploy-worker/public\employee-v3.html:1187:.followup-card.history{border-left-color:#2563eb}
deploy-worker/public\employee-v3.html:2725:function historyFollowupItems(){
deploy-worker/public\employee-v3.html:2738:      source:card?'history':'history_unmatched',
deploy-worker/public\employee-v3.html:2762:  const history=historyFollowupItems();
deploy-worker/public\employee-v3.html:2763:  const historyBeds=new Set(history.map(x=>String(x.bed||'')).filter(Boolean));
deploy-worker/public\employee-v3.html:2764:  const items=[...dueFromLockCards().filter(x=>!historyBeds.has(String(x.bed||''))),...history];
deploy-worker/public\employee-v3.html:2778:  const cls=force?'force':(item.source==='history'||item.source==='history_unmatched'?'history':'overdue');
deploy-worker/public\employee-v3.html:2779:  const source=item.source==='ttlock'?'通通锁过期 TTLOCK':(item.source==='history_unmatched'?'历史欠款 / 未匹配当前通通锁':'历史欠款 HISTORY');
deploy-worker/public\employee-v3.html:2819:  const history=items.filter(x=>x.source==='history'||x.source==='history_unmatched');
deploy-worker/public\employee-v3.html:2826:    <div class="followup-metric"><span>历史欠款</span><small>ARREARS</small><b>${history.length}</b></div>
```


### 6.3 DATABASE_STATIC_SCAN.md Excerpt

File: `DATABASE_STATIC_SCAN.md`


```text
# Database Static Scan

Date: 2026-05-23
Source: generated by `scripts/audit-db.mjs`
Production calls: none
Production database mutation: none

This is a static scan artifact. It does not replace `DATABASE_AUDIT.md`, which contains manual commercial database review and migration recommendations.

## Scan Inputs

- `deploy-worker/src/index.js`
- `migrations/001_employee_anchor_schema.sql`
- `migrations/local/001_clean_legacy_bootstrap.sql`
- `migrations/local/002_handover_atomic_staging.sql`
- `migration-drafts/002_commercial_bootstrap.sql`
- `migration-drafts/003_delete_session_void_fields.sql`
- `migration-drafts/004_receivables_model_draft.sql`
- `migration-drafts/005_money_minor_units_dual_write_draft.sql`
- `migration-drafts/handover_atomic_commit_draft.sql`
- `migration-drafts/receivables_local_staging_rehearsal_draft.sql`
- `migration-drafts/tenant_scope_staging_compatibility_columns_draft.sql`

## Tables Detected

| Table                       | Source Files                                                                                                                                                          |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `active_sessions`           | deploy-worker/src/index.js, migrations/local/001_clean_legacy_bootstrap.sql                                                                                           |
| `app_settings`              | deploy-worker/src/index.js, migrations/local/001_clean_legacy_bootstrap.sql                                                                                           |
| `arrear_tasks`              | deploy-worker/src/index.js, migration-drafts/002_commercial_bootstrap.sql, migrations/001_employee_anchor_schema.sql, migrations/local/001_clean_legacy_bootstrap.sql |
| `arrears`                   | migrations/local/001_clean_legacy_bootstrap.sql                                                                                                                       |
| `audit_events`              | migration-drafts/002_commercial_bootstrap.sql                                                                                                                         |
| `audit_logs`                | deploy-worker/src/index.js, migrations/local/001_clean_legacy_bootstrap.sql                                                                                           |
| `bed_rent_config_versions`  | migration-drafts/002_commercial_bootstrap.sql                                                                                                                         |
| `beds`                      | migration-drafts/002_commercial_bootstrap.sql                                                                                                                         |
| `companies`                 | migration-drafts/002_commercial_bootstrap.sql                                                                                                                         |
| `deposit_ledger`            | deploy-worker/src/index.js, migration-drafts/002_commercial_bootstrap.sql, migrations/local/001_clean_legacy_bootstrap.sql                                            |
| `employee_users`            | deploy-worker/src/index.js, migrations/local/001_clean_legacy_bootstrap.sql                                                                                           |
| `entry_events`              | deploy-worker/src/index.js, migrations/001_employee_anchor_schema.sql, migrations/local/001_clean_legacy_bootstrap.sql                                                |
| `handover_audit_events`     | migration-drafts/handover_atomic_commit_draft.sql, migrations/local/002_handover_atomic_staging.sql                                                                   |
| `handover_commit_rows`      | migration-drafts/handover_atomic_commit_draft.sql, migrations/local/002_handover_atomic_staging.sql                                                                   |
| `handover_commits`          | migration-drafts/handover_atomic_commit_draft.sql, migrations/local/002_handover_atomic_staging.sql                                                                   |
| `handover_idempotency_keys` | migration-drafts/handover_atomic_commit_draft.sql, migrations/local/002_handover_atomic_staging.sql                                                                   |
| `handover_sessions`         | migration-drafts/002_commercial_bootstrap.sql                                                                                                                         |
| `payment_allocations`       | migration-drafts/004_receivables_model_draft.sql, migration-drafts/receivables_local_staging_rehearsal_draft.sql                                                      |
| `payments`                  | migration-drafts/002_commercial_bootstrap.sql                                                                                                                         |
| `properties`                | migration-drafts/002_commercial_bootstrap.sql                                                                                                                         |
| `property_memberships`      | migration-drafts/002_commercial_bootstrap.sql                                                                                                                         |
| `receivable_adjustments`    | migration-drafts/004_receivables_model_draft.sql, migration-drafts/receivables_local_staging_rehearsal_draft.sql                                                      |
| `receivable_events`         | migration-drafts/004_receivables_model_draft.sql, migration-drafts/receivables_local_staging_rehearsal_draft.sql                                                      |
| `receivables`               | migration-drafts/002_commercial_bootstrap.sql, migration-drafts/004_receivables_model_draft.sql, migration-drafts/receivables_local_staging_rehearsal_draft.sql       |
| `schema_migrations`         | migration-drafts/002_commercial_bootstrap.sql                                                                                                                         |
| `sessions`                  | deploy-worker/src/index.js, migrations/local/001_clean_legacy_bootstrap.sql                                                                                           |
| `transactions`              | migration-drafts/002_commercial_bootstrap.sql, migrations/local/001_clean_legacy_bootstrap.sql                                                                        |
| `users`                     | migration-drafts/002_commercial_bootstrap.sql                                                                                                                         |

## Findings

| Severity | Location                                              | Issue                                         | Evidence                                     |
| -------- | ----------------------------------------------------- | --------------------------------------------- | -------------------------------------------- |
| P1       | `deploy-worker/src/index.js:248`                      | Runtime CREATE TABLE appears in Worker source | `CREATE TABLE IF NOT EXISTS active_sessions` |
| P1       | `deploy-worker/src/index.js:476`                      | Runtime CREATE TABLE appears in Worker source | `CREATE TABLE IF NOT EXISTS active_sessions` |
| P1       | `deploy-worker/src/index.js:593`                      | Runtime CREATE TABLE appears in Worker source | `CREATE TABLE IF NOT EXISTS employee_users`  |
| P1       | `deploy-worker/src/index.js:762`                      | Runtime CREATE TABLE appears in Worker source | `CREATE TABLE IF NOT EXISTS audit_logs`      |
| P1       | `deploy-worker/src/index.js:1088`                     | Runtime CREATE TABLE appears in Worker source | `CREATE TABLE IF NOT EXISTS sessions`        |
| P1       | `deploy-worker/src/index.js:1157`                     | Runtime CREATE TABLE appears in Worker source | `CREATE TABLE IF NOT EXISTS arrear_tasks`    |
| P1       | `deploy-worker/src/index.js:1175`                     | Runtime CREATE TABLE appears in Worker source | `CREATE TABLE IF NOT EXISTS entry_events`    |
| P1       | `deploy-worker/src/index.js:1188`                     | Runtime CREATE TABLE appears in Worker source | `CREATE TABLE IF NOT EXISTS deposit_ledger`  |
| P1       | `deploy-worker/src/index.js:1406`                     | Runtime CREATE TABLE appears in Worker source | `CREATE TABLE IF NOT EXISTS app_settings`    |
| P1       | `deploy-worker/src/index.js:2643`                     | Runtime CREATE TABLE appears in Worker source | `CREATE TABLE IF NOT EXISTS active_sessions` |
| P1       | `deploy-worker/src/index.js:2676`                     | Runtime CREATE TABLE appears in Worker source | `CREATE TABLE IF NOT EXISTS app_settings`    |
| P1       | `deploy-worker/src/index.js:2740`                     | Runtime CREATE TABLE appears in Worker source | `CREATE TABLE IF NOT EXISTS app_settings`    |
| P1       | `deploy-worker/src/index.js:2766`                     | Runtime CREATE TABLE appears in Worker source | `CREATE TABLE IF NOT EXISTS app_settings`    |
| P1       | `deploy-worker/src/index.js:2810`                     | Runtime CREATE TABLE appears in Worker source | `CREATE TABLE IF NOT EXISTS app_settings`    |
| P1       | `deploy-worker/src/index.js:2833`                     | Runtime CREATE TABLE appears in Worker source | `CREATE TABLE IF NOT EXISTS app_settings`    |
| P1       | `deploy-worker/src/index.js:2863`                     | Runtime CREATE TABLE appears in Worker source | `CREATE TABLE IF NOT EXISTS app_settings`    |
| P0       | `deploy-worker/src/index.js:1099`                     | Decimal/money precision risk keyword          | `REAL`                                       |
| P0       | `deploy-worker/src/index.js:1100`                     | Decimal/money precision risk keyword          | `REAL`                                       |
| P0       | `deploy-worker/src/index.js:1102`                     | Decimal/money precision risk keyword          | `REAL`                                       |
| P0       | `deploy-worker/src/index.js:1122`                     | Decimal/money precision risk keyword          | `REAL`                                       |
| P0       | `deploy-worker/src/index.js:1124`                     | Decimal/money precision risk keyword          | `REAL`                                       |
| P0       | `deploy-worker/src/index.js:1127`                     | Decimal/money precision risk keyword          | `REAL`                                       |
| P0       | `deploy-worker/src/index.js:1133`                     | Decimal/money precision risk keyword          | `REAL`                                       |
| P0       | `deploy-worker/src/index.js:1135`                     | Decimal/money precision risk keyword          | `REAL`                                       |
| P0       | `deploy-worker/src/index.js:1136`                     | Decimal/money precision risk keyword          | `REAL`                                       |
| P0       | `deploy-worker/src/index.js:1139`                     | Decimal/money precision risk keyword          | `REAL`                                       |
| P0       | `deploy-worker/src/index.js:1154`                     | Decimal/money precision risk keyword          | `REAL`                                       |
| P0       | `deploy-worker/src/index.js:1164`                     | Decimal/money precision risk keyword          | `REAL`                                       |
| P0       | `deploy-worker/src/index.js:1169`                     | Decimal/money precision risk keyword          | `REAL`                                       |
| P0       | `deploy-worker/src/index.js:1170`                     | Decimal/money precision risk keyword          | `REAL`                                       |
| P0       | `deploy-worker/src/index.js:1197`                     | Decimal/money precision risk keyword          | `REAL`                                       |
| P0       | `deploy-worker/src/index.js:1198`                     | Decimal/money precision risk keyword          | `REAL`                                       |
| P0       | `deploy-worker/src/index.js:1199`                     | Decimal/money precision risk keyword          | `REAL`                                       |
| P0       | `migrations/001_employee_anchor_schema.sql:23`        | Decimal/money precision risk keyword          | `REAL`                                       |
| P0       | `migrations/001_employee_anchor_schema.sql:28`        | Decimal/money precision risk keyword          | `REAL`                                       |
| P0       | `migrations/001_employee_anchor_schema.sql:29`        | Decimal/money precision risk keyword          | `REAL`                                       |
| P0       | `migrations/local/001_clean_legacy_bootstrap.sql:8`   | Decimal/money precision risk keyword          | `REAL`                                       |
| P0       | `migrations/local/001_clean_legacy_bootstrap.sql:71`  | Decimal/money precision risk keyword          | `REAL`                                       |
| P0       | `migrations/local/001_clean_legacy_bootstrap.sql:72`  | Decimal/money precision risk keyword          | `REAL`                                       |
| P0       | `migrations/local/001_clean_legacy_bootstrap.sql:74`  | Decimal/money precision risk keyword          | `REAL`                                       |
| P0       | `migrations/local/001_clean_legacy_bootstrap.sql:95`  | Decimal/money precision risk keyword          | `REAL`                                       |
| P0       | `migrations/local/001_clean_legacy_bootstrap.sql:96`  | Decimal/money precision risk keyword          | `REAL`                                       |
| P0       | `migrations/local/001_clean_legacy_bootstrap.sql:97`  | Decimal/money precision risk keyword          | `REAL`                                       |
| P0       | `migrations/local/001_clean_legacy_bootstrap.sql:98`  | Decimal/money precision risk keyword          | `REAL`                                       |
| P0       | `migrations/local/001_clean_legacy_bootstrap.sql:103` | Decimal/money precision risk keyword          | `REAL`                                       |
| P0       | `migrations/local/001_clean_legacy_bootstrap.sql:104` | Decimal/money precision risk keyword          | `REAL`                                       |
| P0       | `migrations/local/001_clean_legacy_bootstrap.sql:105` | Decimal/money precision risk keyword          | `REAL`                                       |
| P0       | `migrations/local/001_clean_legacy_bootstrap.sql:123` | Decimal/money precision risk keyword          | `REAL`                                       |
| P0       | `migrations/local/001_clean_legacy_bootstrap.sql:125` | Decimal/money precision risk keyword          | `REAL`                                       |
| P0       | `migrations/local/001_clean_legacy_bootstrap.sql:128` | Decimal/money precision risk keyword          | `REAL`                                       |
| P0       | `migrations/local/001_clean_legacy_bootstrap.sql:134` | Decimal/money precision risk keyword          | `REAL`                                       |
| P0       | `migrations/local/001_clean_legacy_bootstrap.sql:136` | Decimal/money precision risk keyword          | `REAL`                                       |
| P0       | `migrations/local/001_clean_legacy_bootstrap.sql:137` | Decimal/money precision risk keyword          | `REAL`                                       |
| P0       | `migrations/local/001_clean_legacy_bootstrap.sql:140` | Decimal/money precision risk keyword          | `REAL`                                       |
| P0       | `migrations/local/001_clean_legacy_bootstrap.sql:155` | Decimal/money precision risk keyword          | `REAL`                                       |
| P0       | `migrations/local/001_clean_legacy_bootstrap.sql:181` | Decimal/money precision risk keyword          | `REAL`                                       |
| P0       | `migrations/local/001_clean_legacy_bootstrap.sql:206` | Decimal/money precision risk keyword          | `REAL`                                       |
| P0       | `migrations/local/001_clean_legacy_bootstrap.sql:211` | Decimal/money precision risk keyword          | `REAL`                                       |
| P0       | `migrations/local/001_clean_legacy_bootstrap.sql:212` | Decimal/money precision risk keyword          | `REAL`                                       |
| P0       | `migrations/local/001_clean_legacy_bootstrap.sql:269` | Decimal/money precision risk keyword          | `REAL`                                       |
| P0       | `migrations/local/001_clean_legacy_bootstrap.sql:270` | Decimal/money precision risk keyword          | `REAL`                                       |
| P0       | `migrations/local/001_clean_legacy_bootstrap.sql:271` | Decimal/money precision risk keyword          | `REAL`                                       |

## Commercial Interpretation

- P0 findings are launch blockers until the commercial schema moves money to integer minor units and removes hard deletes from normal business flows.
- P1 runtime DDL findings confirm schema changes must move out of Worker request paths and into reviewed migrations.
- This scan is intentionally read-only and does not connect to D1.
```


## 7. Test Coverage And Build Pipeline


### 7.1 Test File List

Command: `powershell -NoProfile -Command "Get-ChildItem tests -Recurse -File -Include *.spec.mjs,*.test.mjs | Select-Object -ExpandProperty FullName"`


```text
C:\Users\Chinalink\Desktop\软件迭代\tests\arrears-export-format.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\arrears-modal-compact-mobile.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\auth-route-closure.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\auth-single-entry-routing.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\backend-totals-authority.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\backend-totals-shadow.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\backend-totals-staging-switch-gate.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\backend-totals-staging-switch-rehearsal.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\d1-write-plan-executor.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\dubai-business-date.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\employee-display-name.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\employee-entry-adapter-staging-endpoint.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\employee-entry-commercial-adapter.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\employee-entry-commercial-handler.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\employee-entry-draft.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\employee-entry-live-write-adapter.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\employee-entry-production-behavior-lock.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\employee-entry-route-switch-rehearsal.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\employee-idempotency.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\employee-identity-display.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\employee-rent-write-plan.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\employee-script-error-regression.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\employee-top-nav-consistency.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\feature-flag-production-lock-matrix.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\finance-handover.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\finance-money.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\finance-periods.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\finance-receivables.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\governance.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\handover-atomic-rehearsal.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\handover-atomic.design.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\handover-staging-endpoint.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\legacy-login-flash-regression.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\legacy-login-hidden.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\logout-always-unified-login.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\logout-lock-icon-routing.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\logout-to-root-entry.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\migration-draft.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\money-dual-write-local-staging.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\money-dual-write.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\money-shadow.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\money.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\no-legacy-login-visible.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\owner-arrears-modal-layout.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\owner-card-system-match-employee.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\owner-client-credit-ui.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\owner-control-panel-layout.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\owner-employee-visual-shell-alignment.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\owner-header-match-employee.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\owner-history-load-performance.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\owner-history-performance.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\owner-mobile-density.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\owner-mobile-nav-layout.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\owner-mobile-ui-alignment.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\owner-nav-information-architecture.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\owner-nav-match-employee.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\owner-network-control-entry.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\owner-network-wifi-entry.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\owner-overview-business-value.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\owner-real-screenshot-regression.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\owner-topbar-simplification.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\owner-ui-design-alignment.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\readonly-admin-portal.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\readonly-admin-role.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\readonly-admin-unified-login.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\receivables-staging-authority-switch-gate.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\receivables-staging-authority-switch-rehearsal.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\receivables-staging-shadow-gate.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\receivables-staging-shadow-rehearsal.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\receivables.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\role-guard-closure.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\route-normalization.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\source-risk.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\tenant-scope-access-matrix.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\tenant-scope-audit-entry-events.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\tenant-scope-auth-claim-staging-rehearsal.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\tenant-scope-auth-claims.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\tenant-scope-backfill-reconciliation-gate.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\tenant-scope-local-staging.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\tenant-scope-staging-access-matrix-rehearsal.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\tenant-scope-staging-backfill-dry-run.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\tenant-scope-staging-dashboard-history-query-gate.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\tenant-scope-staging-route-enforcement-gate.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\tenant-scope-staging-shadow-gate.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\tenant-scope-staging-wiring-gate.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\tenant-scope-staging-wiring-rehearsal.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\three-portal-entry.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\ttlock-remark.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\unified-login-auth-guard.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\unified-login-minimal-regression.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\unified-login-minimal-ui.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\unified-login-owner-ux.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\unified-login-password-manager.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\unified-login-remember-account.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\unified-login-role-routing.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\unified-login-session-handoff.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\unified-login-single-entry.spec.mjs
C:\Users\Chinalink\Desktop\软件迭代\tests\unified-login-visual-match.spec.mjs
```


### 7.2 npm Test / Build Scripts

Command: `node -e "const p=require('./package.json'); for (const [k,v] of Object.entries(p.scripts||{})) if (/test|check|build|audit|gate|security|qa|deploy/.test(k)) console.log(k+': '+v)"`


```text
build: npm run build:worker:assets && npm run build:worker:embedded
build:worker:assets: cd deploy-worker && wrangler deploy --config wrangler.toml --dry-run --outdir ../.wrangler-dryrun/assets
build:worker:embedded: cd deploy-worker && wrangler deploy --config wrangler.embedded.toml --dry-run --outdir ../.wrangler-dryrun/embedded
format:check: prettier --check "*.md" "tools/**/*.cjs" "scripts/**/*.mjs" "tests/**/*.mjs" "modules/**/*.mjs"
typecheck: node scripts/check-syntax.mjs
governance:check: node tools/check-governance.cjs
security:secrets: node scripts/check-secrets.mjs
audit:api: node scripts/audit-api.mjs
audit:api:check: node scripts/audit-api.mjs --check
audit:api-permissions: node scripts/audit-api-permissions.mjs
audit:db: node scripts/audit-db.mjs
audit:db:check: node scripts/audit-db.mjs --check
audit:db-readiness: node scripts/audit-db-table-readiness.mjs
audit:worker-drift: node scripts/audit-worker-entrypoint-drift.mjs
audit:observability: node scripts/audit-observability-readiness.mjs
audit:env-separation: node scripts/audit-environment-separation.mjs
audit:audit-logs: node scripts/audit-audit-log-coverage.mjs
audit:rollback-readiness: node scripts/audit-rollback-readiness.mjs
gate:commercial-launch: node scripts/gate-commercial-launch-readiness.mjs
build:embedded:dry-run: node scripts/generate-embedded-worker-dry-run.mjs
build:embedded:write: node scripts/write-embedded-worker-controlled.mjs
audit:money: node scripts/audit-money-fields.mjs
audit:money-live-writes: node scripts/audit-money-live-write-paths.mjs
gate:money-reconciliation: node scripts/reconcile-money-dual-write-gate.mjs
audit:backend-totals: node scripts/audit-backend-totals.mjs
gate:backend-totals-live: node scripts/gate-backend-totals-live-authority.mjs
gate:receivables: node scripts/gate-receivables-readiness.mjs
gate:tenant-scope: node scripts/gate-tenant-scope-readiness.mjs
test:tenant-scope: node --test tests/tenant-scope-local-staging.spec.mjs
test:tenant-scope-staging-shadow: node --test tests/tenant-scope-staging-shadow-gate.spec.mjs
test:tenant-scope-route-gate: node --test tests/tenant-scope-staging-route-enforcement-gate.spec.mjs
gate:tenant-scope-route-enforcement: node scripts/gate-tenant-scope-staging-route-enforcement.mjs
test:tenant-scope-query-gate: node --test tests/tenant-scope-staging-dashboard-history-query-gate.spec.mjs
gate:tenant-scope-dashboard-history-query: node scripts/gate-tenant-scope-dashboard-history-query.mjs
test:tenant-scope-wiring-gate: node --test tests/tenant-scope-staging-wiring-gate.spec.mjs
gate:tenant-scope-staging-wiring: node scripts/gate-tenant-scope-staging-wiring-readiness.mjs
test:tenant-scope-wiring-rehearsal: node --test tests/tenant-scope-staging-wiring-rehearsal.spec.mjs
test:tenant-claims: node --test tests/tenant-scope-auth-claims.spec.mjs
test:tenant-claims-staging: node --test tests/tenant-scope-auth-claim-staging-rehearsal.spec.mjs
test:tenant-access-matrix: node --test tests/tenant-scope-access-matrix.spec.mjs
test:tenant-access-matrix-staging: node --test tests/tenant-scope-staging-access-matrix-rehearsal.spec.mjs
test:tenant-audit-events: node --test tests/tenant-scope-audit-entry-events.spec.mjs
rehearse:tenant-audit-events: node scripts/rehearse-tenant-scope-audit-entry-events.mjs
seed:tenant-audit-events: node scripts/seed-tenant-audit-event-evidence.mjs
test:tenant-scope-backfill-gate: node --test tests/tenant-scope-backfill-reconciliation-gate.spec.mjs
gate:tenant-scope-backfill-reconciliation: node scripts/gate-tenant-scope-backfill-reconciliation.mjs
test:tenant-scope-staging-backfill-dry-run: node --test tests/tenant-scope-staging-backfill-dry-run.spec.mjs
audit:runtime-ddl: node scripts/audit-runtime-ddl.mjs
gate:runtime-ddl-removal: node scripts/gate-runtime-ddl-removal.mjs
audit:legacy-backfill: node scripts/audit-legacy-backfill.mjs
test:delete-session: node scripts/test-delete-session-void.mjs
test:money: node --test tests/money.spec.mjs
test:money-shadow: node --test tests/money-shadow.spec.mjs
test:money-dual-write: node --test tests/money-dual-write.spec.mjs
test:receivables: node --test tests/receivables.spec.mjs
test:receivables-staging-shadow: node --test tests/receivables-staging-shadow-gate.spec.mjs
test:receivables-staging-rehearsal: node --test tests/receivables-staging-shadow-rehearsal.spec.mjs
test:receivables-staging-authority-switch: node --test tests/receivables-staging-authority-switch-gate.spec.mjs
test:receivables-staging-authority-rehearsal: node --test tests/receivables-staging-authority-switch-rehearsal.spec.mjs
gate:receivables-staging-authority-switch: node scripts/gate-receivables-staging-authority-switch.mjs
test:money-dual-write-local-staging: node --test tests/money-dual-write-local-staging.spec.mjs
test:employee-entry-live-write-adapter: node --test tests/employee-entry-live-write-adapter.spec.mjs
test:employee-entry-adapter-staging-endpoint: node --test tests/employee-entry-adapter-staging-endpoint.spec.mjs
test:employee-entry-route-switch: node --test tests/employee-entry-route-switch-rehearsal.spec.mjs
test:employee-entry-production-lock: node --test tests/employee-entry-production-behavior-lock.spec.mjs
test:feature-flag-matrix: node --test tests/feature-flag-production-lock-matrix.spec.mjs
test:unified-login: node --test tests/unified-login-role-routing.spec.mjs
test:unified-login-session-handoff: node --test tests/unified-login-session-handoff.spec.mjs
test:unified-login-auth-guard: node --test tests/unified-login-auth-guard.spec.mjs
test:unified-login-owner-ux: node --test tests/unified-login-owner-ux.spec.mjs
test:unified-login-single-entry: node --test tests/unified-login-single-entry.spec.mjs
test:unified-login-visual-match: node --test tests/unified-login-visual-match.spec.mjs
test:unified-login-minimal-ui: node --test tests/unified-login-minimal-ui.spec.mjs
test:owner-ui: node --test tests/owner-ui-design-alignment.spec.mjs
test:owner-mobile-ui: node --test tests/owner-mobile-ui-alignment.spec.mjs
test:owner-mobile-nav: node --test tests/owner-mobile-nav-layout.spec.mjs
test:owner-nav-ia: node --test tests/owner-nav-information-architecture.spec.mjs
test:owner-client-credit-ui: node --test tests/owner-client-credit-ui.spec.mjs
test:owner-real-screenshot-regression: node --test tests/owner-real-screenshot-regression.spec.mjs
test:visual-shell-alignment: node --test tests/owner-employee-visual-shell-alignment.spec.mjs
test:owner-header-match: node --test tests/owner-header-match-employee.spec.mjs
test:owner-nav-match: node --test tests/owner-nav-match-employee.spec.mjs
test:owner-card-system: node --test tests/owner-card-system-match-employee.spec.mjs
test:unified-login-minimal-regression: node --test tests/unified-login-minimal-regression.spec.mjs
test:unified-login-remember-account: node --test tests/unified-login-remember-account.spec.mjs
test:owner-topbar: node --test tests/owner-topbar-simplification.spec.mjs
test:owner-overview-value: node --test tests/owner-overview-business-value.spec.mjs
test:owner-history-performance: node --test tests/owner-history-performance.spec.mjs tests/owner-history-load-performance.spec.mjs
test:owner-mobile-density: node --test tests/owner-mobile-density.spec.mjs
test:auth-single-entry: node --test tests/auth-single-entry-routing.spec.mjs
test:logout-routing: node --test tests/logout-lock-icon-routing.spec.mjs
test:employee-identity: node --test tests/employee-identity-display.spec.mjs
test:owner-network-entry: node --test tests/owner-network-control-entry.spec.mjs
test:owner-history-load-performance: node --test tests/owner-history-load-performance.spec.mjs
test:legacy-login-flash: node --test tests/legacy-login-flash-regression.spec.mjs
test:no-legacy-login: node --test tests/no-legacy-login-visible.spec.mjs
test:logout-unified: node --test tests/logout-always-unified-login.spec.mjs
test:employee-display-name: node --test tests/employee-display-name.spec.mjs
test:employee-top-nav: node --test tests/employee-top-nav-consistency.spec.mjs
test:owner-control-panel-layout: node --test tests/owner-control-panel-layout.spec.mjs
test:owner-arrears-modal: node --test tests/owner-arrears-modal-layout.spec.mjs
test:owner-network-wifi-entry: node --test tests/owner-network-wifi-entry.spec.mjs
test:employee-script-error: node --test tests/employee-script-error-regression.spec.mjs
test:arrears-export-format: node --test tests/arrears-export-format.spec.mjs
test:arrears-modal-compact: node --test tests/arrears-modal-compact-mobile.spec.mjs
test:unified-login-password-manager: node --test tests/unified-login-password-manager.spec.mjs
test:readonly-admin-role: node --test tests/readonly-admin-role.spec.mjs
test:readonly-admin-unified-login: node --test tests/readonly-admin-unified-login.spec.mjs
test:auth-route-closure: node --test tests/auth-route-closure.spec.mjs
test:three-portal: node --test tests/three-portal-entry.spec.mjs
test:route-normalization: node --test tests/route-normalization.spec.mjs
test:legacy-login-hidden: node --test tests/legacy-login-hidden.spec.mjs
test:logout-to-root: node --test tests/logout-to-root-entry.spec.mjs
test:role-guard-closure: node --test tests/role-guard-closure.spec.mjs
test:readonly-admin-portal: node --test tests/readonly-admin-portal.spec.mjs
test:employee-identity-display: node --test tests/employee-identity-display.spec.mjs
qa:employee-entry-staging: node scripts/qa-employee-entry-real-staging.mjs
staging:setup-test-accounts: node scripts/setup-staging-test-accounts.mjs
test:backend-totals-shadow: node --test tests/backend-totals-shadow.spec.mjs
test:backend-totals: node --test tests/backend-totals-authority.spec.mjs
test:backend-totals-staging-gate: node --test tests/backend-totals-staging-switch-gate.spec.mjs
test:backend-totals-staging-switch: node --test tests/backend-totals-staging-switch-rehearsal.spec.mjs
test:handover-atomic-design: node --test tests/handover-atomic.design.spec.mjs
test:handover-atomic: node --test tests/handover-atomic-rehearsal.spec.mjs
test:handover-staging-endpoint: node --test tests/handover-staging-endpoint.spec.mjs
test:timezone: node --test tests/dubai-business-date.spec.mjs
test: node --test --test-concurrency=1 tests/**/*.spec.mjs
check: npm run governance:check && npm run security:secrets && npm run format:check && npm run lint && npm run typecheck && npm run audit:api:check && npm run audit:db:check && npm run test && npm run build
```


### 7.3 CI Workflow Excerpt

Command: `powershell -NoProfile -Command "if (Test-Path .github/workflows) { Get-ChildItem .github/workflows -File | ForEach-Object { '--- '+$_.Name; Get-Content $_.FullName -TotalCount 80 } } else { 'No .github/workflows directory' }"`


```text
--- commercial-check.yml
name: Commercial Check

on:
  pull_request:
  push:
    branches:
      - master
      - main

permissions:
  contents: read

jobs:
  check:
    name: Governance, Audit, Test, Dry-Run Build
    runs-on: ubuntu-latest
    timeout-minutes: 15

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Run commercial check
        run: npm run check
```


### 7.4 Current Check Result Tail

Command: `npm run check`

```text
Result: PASS
Governance check passed.
Secret hygiene check passed.
All matched files use Prettier code style.
Syntax check passed for 216 file(s).
API inventory is up to date.
Database static scan is up to date.
Tests: 583 total, 583 pass, 0 fail.
Build: wrangler deploy dry-run for assets and embedded Worker only; no deploy executed.
D1 write: no.
Migration: no.
```

## 8. Known Issues And TODO Markers


### 8.1 TODO/FIXME/BUG/HACK/Manual Markers

Command: `rg -n "TODO|FIXME|BUG|HACK|XXX|MANUAL_REQUIRED|PRODUCTION_NO_GO|P0|P1" deploy-worker/src deploy-worker/public modules scripts tests docs --glob "*.{js,mjs,html,md,sql}"`


```text
docs\TEST_STRATEGY_GAP_ROOT_CAUSE_ANALYSIS.md:62:Required P0 test:
docs\TEST_STRATEGY_GAP_ROOT_CAUSE_ANALYSIS.md:88:Required P1 performance proof:
docs\TEST_STRATEGY_GAP_ROOT_CAUSE_ANALYSIS.md:128:### P0 Before Internal Write QA
docs\TEST_STRATEGY_GAP_ROOT_CAUSE_ANALYSIS.md:136:### P1 Before Production-Copy Write Rehearsal
docs\TEST_STRATEGY_GAP_ROOT_CAUSE_ANALYSIS.md:155:3. P0 gaps are resolved before internal write QA.
docs\TEST_STRATEGY_GAP_ROOT_CAUSE_ANALYSIS.md:156:4. P1 gaps are resolved before production-copy write rehearsal.
docs\TEST_STRATEGY_GAP_ROOT_CAUSE_ANALYSIS.md:157:5. Production remains `PRODUCTION_NO_GO`.
docs\SYSTEM_AUTHORITY_MATRIX.md:68:5. Production remains `PRODUCTION_NO_GO`.
docs\FINANCE_AUTHORITY_FREEZE.md:186:PRODUCTION_NO_GO
docs\AUTH_ROUTE_FINAL_ARCHITECTURE.md:182:6. Keep production status `PRODUCTION_NO_GO` until tenant and finance gates pass.
tests\auth-single-entry-routing.spec.mjs:32:test("production cutover remains PRODUCTION_NO_GO", async () => {
tests\auth-single-entry-routing.spec.mjs:35:  assert.match(readiness, /PRODUCTION_NO_GO/);
tests\auth-route-closure.spec.mjs:80:  assert.match(readiness, /PRODUCTION_NO_GO/);
tests\arrears-modal-compact-mobile.spec.mjs:28:  assert.match(readiness, /PRODUCTION_NO_GO/);
tests\arrears-export-format.spec.mjs:146:  assert.match(readiness, /PRODUCTION_NO_GO/);
deploy-worker/public\index-51-main.js:2363:  /* depPaid 优先；否则才解析备注"含押 XXX"；两者互斥，防止双扣 */
tests\employee-entry-route-switch-rehearsal.spec.mjs:195:      export_text: "P0-001J local rehearsal"
tests\employee-entry-route-switch-rehearsal.spec.mjs:211:      note: "P0-001J local rehearsal"
tests\employee-entry-route-switch-rehearsal.spec.mjs:223:      export_text: "P0-001J local rehearsal",
tests\employee-entry-route-switch-rehearsal.spec.mjs:240:      note: "P0-001J local rehearsal",
tests\backend-totals-staging-switch-rehearsal.spec.mjs:71:    Notes: "P0-008 blocked"
tests\backend-totals-staging-switch-rehearsal.spec.mjs:75:    "Current / Legacy Total": "MANUAL_REQUIRED",
tests\backend-totals-staging-switch-rehearsal.spec.mjs:78:    Status: "MANUAL_REQUIRED",
tests\backend-totals-staging-switch-rehearsal.spec.mjs:79:    Notes: "P0-001 blocked"
tests\backend-totals-staging-switch-rehearsal.spec.mjs:83:    "Current / Legacy Total": "MANUAL_REQUIRED",
tests\backend-totals-staging-switch-rehearsal.spec.mjs:86:    Status: "MANUAL_REQUIRED",
tests\backend-totals-staging-switch-rehearsal.spec.mjs:87:    Notes: "P0-001 blocked"
tests\backend-totals-staging-switch-rehearsal.spec.mjs:144:test("blocked P0-008 totals stay shadow-only", () => {
tests\backend-totals-staging-switch-rehearsal.spec.mjs:153:  assert.match(arrears.Notes, /BLOCKED_BY_P0_008/);
tests\backend-totals-staging-switch-rehearsal.spec.mjs:156:test("P0-001 blocked totals stay shadow-only", () => {
tests\backend-totals-staging-switch-rehearsal.spec.mjs:166:    assert.match(row.Notes, /BLOCKED_BY_P0_001/);
tests\backend-totals-staging-switch-rehearsal.spec.mjs:170:test("P0-006 keeps all production switches disabled", () => {
tests\backend-totals-staging-switch-gate.spec.mjs:79:        src: "P0-008E_RECEIVABLES_SHADOW_REHEARSAL",
tests\backend-totals-staging-switch-gate.spec.mjs:141:test("P0-008 blocked totals are not switched", () => {
tests\backend-totals-staging-switch-gate.spec.mjs:142:  assert.equal(classifyTotalScope("arrears outstanding"), "BLOCKED_BY_P0_008");
tests\backend-totals-staging-switch-gate.spec.mjs:143:  assert.equal(classifyTotalScope("dashboard overdue amount"), "BLOCKED_BY_P0_008");
tests\backend-totals-staging-switch-gate.spec.mjs:146:test("P0-006 blocked totals remain production no-go through scope rows", () => {
tests\backend-totals-staging-switch-gate.spec.mjs:151:  assert.ok(rows.some((row) => row.blocker === "PRODUCTION_NO_GO"));
tests\backend-totals-staging-switch-gate.spec.mjs:154:test("P0-001 unresolved totals are not switched", () => {
tests\backend-totals-staging-switch-gate.spec.mjs:155:  assert.equal(classifyTotalScope("dashboard monthly income"), "BLOCKED_BY_P0_001");
tests\backend-totals-staging-switch-gate.spec.mjs:156:  assert.equal(classifyTotalScope("history row totals"), "BLOCKED_BY_P0_001");
scripts\audit-backend-totals.mjs:39:      "Legacy Worker parses submitted totals; P0-003 must compare against backend recompute."
scripts\audit-backend-totals.mjs:103:Scope: P0-003A static audit only. This report does not change dashboard totals, handover submission, Worker responses, database schema, or production configuration.
scripts\audit-backend-totals.mjs:123:The current production route is not changed by this scan. P0-003 remains Partial until backend recomputation becomes the authoritative response/write path and is covered by authenticated regression tests.
scripts\compare-employee-entry-legacy-vs-adapter.mjs:90:  return "MANUAL_REQUIRED";
scripts\compare-employee-entry-legacy-vs-adapter.mjs:161:        "MANUAL_REQUIRED: employee entry legacy route does not yet expose a handover-style frontend-total comparison contract."
scripts\compare-employee-entry-legacy-vs-adapter.mjs:168:        "MANUAL_REQUIRED: existing idempotency is transaction-id based; production cutover needs explicit retry policy review."
scripts\compare-employee-entry-legacy-vs-adapter.mjs:178:          status: "MANUAL_REQUIRED",
scripts\compare-employee-entry-legacy-vs-adapter.mjs:184:          status: "MANUAL_REQUIRED",
scripts\compare-employee-entry-legacy-vs-adapter.mjs:189:        status: "MANUAL_REQUIRED"
scripts\compare-employee-entry-legacy-vs-adapter.mjs:217:Scope: P0-001K local-only comparison. This command uses disposable local D1 Workers only. It does not execute production deploy, staging deploy, production D1 migration, remote D1 migration, production config changes, or secret writes.
scripts\compare-employee-entry-legacy-vs-adapter.mjs:228:- MANUAL_REQUIRED means the behavior needs a human decision before production cutover.
scripts\audit-audit-log-coverage.mjs:142:  "Overall: `MANUAL_REQUIRED`",
scripts\audit-audit-log-coverage.mjs:162:console.log("AUDIT_LOG_COVERAGE=MANUAL_REQUIRED");
tests\employee-script-error-regression.spec.mjs:23:  assert.match(readiness, /PRODUCTION_NO_GO/);
scripts\audit-db.mjs:57:          "P1",
scripts\audit-db.mjs:71:          "P1",
scripts\audit-db.mjs:84:        "P0",
scripts\audit-db.mjs:95:      finding("P0", file, lineNumberFor(text, match.index ?? 0), "Hard delete statement", match[0])
scripts\audit-db.mjs:145:    "- P0 findings are launch blockers until the commercial schema moves money to integer minor units and removes hard deletes from normal business flows.",
scripts\audit-db.mjs:146:    "- P1 runtime DDL findings confirm schema changes must move out of Worker request paths and into reviewed migrations.",
scripts\audit-legacy-backfill.mjs:23:    risk: "P0",
scripts\audit-legacy-backfill.mjs:30:    risk: "P0",
scripts\audit-legacy-backfill.mjs:37:    risk: "P0",
scripts\audit-legacy-backfill.mjs:44:    risk: "P1",
scripts\audit-legacy-backfill.mjs:51:    risk: "P1",
scripts\audit-legacy-backfill.mjs:58:    risk: "P0",
scripts\audit-legacy-backfill.mjs:65:    risk: "P1",
scripts\audit-legacy-backfill.mjs:72:    risk: "P1",
scripts\audit-legacy-backfill.mjs:116:    findings.push({ severity: "P1", issue: `Target signal not found in static corpus: ${signal}` });
scripts\audit-api.mjs:22:    risk: "P1",
scripts\audit-api.mjs:35:    risk: "P1",
scripts\audit-api.mjs:308:    risk: "P1",
scripts\audit-api.mjs:334:    risk: "P1",
scripts\audit-api.mjs:347:    risk: "P0",
scripts\audit-api.mjs:360:    risk: "P1",
scripts\audit-api.mjs:373:    risk: "P1",
scripts\audit-api.mjs:386:    risk: "P1",
scripts\audit-api.mjs:401:    risk: "P0",
scripts\audit-api.mjs:416:    risk: "P0",
scripts\audit-api.mjs:430:    risk: "P0",
scripts\audit-api.mjs:444:    risk: "P1",
scripts\audit-api.mjs:457:    risk: "P1",
scripts\audit-api.mjs:470:    risk: "P0",
scripts\audit-api.mjs:483:    risk: "P1",
scripts\audit-api.mjs:496:    risk: "P1",
scripts\audit-api.mjs:509:    risk: "P1",
scripts\audit-api.mjs:522:    risk: "P1",
scripts\audit-api.mjs:535:    risk: "P1",
scripts\audit-api.mjs:548:    risk: "P1",
scripts\audit-api.mjs:561:    risk: "P0",
scripts\audit-api.mjs:575:    risk: "P1",
scripts\audit-api.mjs:588:    risk: "P0",
scripts\audit-api.mjs:601:    risk: "P1",
scripts\audit-api.mjs:614:    risk: "P1",
scripts\audit-api.mjs:672:  const p0 = riskRows(routes, "P0");
scripts\audit-api.mjs:673:  const p1 = riskRows(routes, "P1");
scripts\audit-api.mjs:727:    "## P0 API Risks",
scripts\audit-api.mjs:731:    "## P1 API Risks",
scripts\audit-rollback-readiness.mjs:16:      "P0_001K_CUTOVER_READINESS_CHECKLIST.md"
scripts\audit-rollback-readiness.mjs:19:    risk: "P0-001"
scripts\audit-rollback-readiness.mjs:26:      "P0_002D_GO_NO_GO_REVIEW.md"
scripts\audit-rollback-readiness.mjs:29:    risk: "P0-002"
scripts\audit-rollback-readiness.mjs:35:      "P0_003C_BACKEND_TOTALS_LIVE_AUTHORITY_GATE.md"
scripts\audit-rollback-readiness.mjs:38:    risk: "P0-003"
scripts\audit-rollback-readiness.mjs:45:      "P0_001D_GO_NO_GO_CHECKLIST.md"
scripts\audit-rollback-readiness.mjs:48:    risk: "P0-001"
scripts\audit-rollback-readiness.mjs:54:      "P1_002B_RUNTIME_DDL_REMOVAL_READINESS.md",
scripts\audit-rollback-readiness.mjs:55:      "NEXT_PROMPT_P1_002C_RUNTIME_DDL_CONTROLLED_REMOVAL.md"
scripts\audit-rollback-readiness.mjs:58:    risk: "P1-002"
scripts\audit-rollback-readiness.mjs:68:    risk: "P1-006"
scripts\audit-rollback-readiness.mjs:74:      "P0_008B_RECEIVABLES_IMPLEMENTATION_READINESS_GATE.md",
scripts\audit-rollback-readiness.mjs:75:      "NEXT_PROMPT_P0_008C_RECEIVABLES_LOCAL_STAGING_REHEARSAL.md"
scripts\audit-rollback-readiness.mjs:78:    risk: "P0-008"
scripts\audit-rollback-readiness.mjs:84:      "P0_006B_TENANT_PROPERTY_SCOPE_READINESS_GATE.md",
scripts\audit-rollback-readiness.mjs:85:      "NEXT_PROMPT_P0_006C_TENANT_SCOPE_LOCAL_STAGING_REHEARSAL.md"
scripts\audit-rollback-readiness.mjs:88:    risk: "P0-006"
scripts\audit-rollback-readiness.mjs:95:      "P0_001L_PRODUCTION_CUTOVER_NO_GO_REVIEW.md"
scripts\audit-rollback-readiness.mjs:98:    risk: "P1-010"
scripts\audit-rollback-readiness.mjs:107:    risk: "P1-009"
scripts\audit-rollback-readiness.mjs:123:        ? "MANUAL_REQUIRED"
scripts\audit-rollback-readiness.mjs:132:  manual: rows.filter((row) => row.result === "MANUAL_REQUIRED").length,
scripts\audit-rollback-readiness.mjs:161:  "- `MANUAL_REQUIRED` means rollout/cutover must not proceed until the missing rollback terms are reviewed.",
scripts\audit-rollback-readiness.mjs:174:  `| MANUAL_REQUIRED areas | ${summary.manual} |`,
scripts\audit-rollback-readiness.mjs:177:  "Overall: `MANUAL_REQUIRED`",
scripts\audit-rollback-readiness.mjs:191:console.log("ROLLBACK_READINESS_AUDIT=MANUAL_REQUIRED");
scripts\audit-rollback-readiness.mjs:193:console.log(`ROLLBACK_MANUAL_REQUIRED=${summary.manual}`);
scripts\audit-money-live-write-paths.mjs:84:  if (isVoidOnly) return { risk: "P1", status: "Allowed void/update path; verify no hard delete" };
scripts\audit-money-live-write-paths.mjs:85:  if (isConfigWrite) return { risk: "P1", status: "Rent config JSON still stores legacy money" };
scripts\audit-money-live-write-paths.mjs:88:      risk: "P0",
scripts\audit-money-live-write-paths.mjs:92:  return { risk: "P1", status: "Uses minor-unit field, still needs reconciliation gate" };
scripts\audit-money-live-write-paths.mjs:136:        risk: areaForLine(lineNumber).includes("staging") ? "P2" : "P0/P1",
scripts\audit-money-live-write-paths.mjs:182:  const p0Statements = statements.filter((item) => item.risk === "P0").length;
scripts\audit-money-live-write-paths.mjs:195:| P0 live decimal authority write statements | ${p0Statements} |
scripts\audit-money-live-write-paths.mjs:213:- P0 rows are live financial authority paths that still write legacy decimal / REAL-compatible values.
scripts\audit-money-live-write-paths.mjs:214:- P1 rows are still migration-sensitive but are not immediate write-authority switches.
scripts\audit-money-live-write-paths.mjs:216:- This report supports P0-001F gate design only. It does not approve live dual-write, production migration, dashboard switch, or handover flow switch.
scripts\audit-money-live-write-paths.mjs:223:  console.log(`MONEY_LIVE_WRITE_P0_STATEMENTS=${p0Statements}`);
tests\governance.spec.mjs:37:  assert.match(blocker, /P0/i);
tests\governance.spec.mjs:38:  assert.match(backlog, /P0-001/);
scripts\audit-observability-readiness.mjs:29:  result: "MANUAL_REQUIRED",
scripts\audit-observability-readiness.mjs:41:const manual = rows.some((row) => row.result === "MANUAL_REQUIRED");
scripts\audit-observability-readiness.mjs:43:const overall = manual ? "MANUAL_REQUIRED" : warning ? "WARNING" : "PASS";
scripts\audit-worker-entrypoint-drift.mjs:38:    risk: "P0/P1",
scripts\audit-worker-entrypoint-drift.mjs:45:    risk: "P0/P1",
scripts\audit-worker-entrypoint-drift.mjs:52:    risk: "P0/P1",
scripts\audit-worker-entrypoint-drift.mjs:58:    risk: "P0/P1",
scripts\audit-worker-entrypoint-drift.mjs:65:    risk: "P1",
scripts\audit-worker-entrypoint-drift.mjs:71:    risk: "P0",
scripts\audit-worker-entrypoint-drift.mjs:77:    risk: "P0",
scripts\audit-worker-entrypoint-drift.mjs:79:      "Embedded artifact must preserve P0-004 void behavior; hard delete must not reappear."
scripts\audit-worker-entrypoint-drift.mjs:84:    risk: "P1",
scripts\audit-worker-entrypoint-drift.mjs:90:    risk: "P1",
scripts\audit-worker-entrypoint-drift.mjs:96:    risk: "P1",
scripts\audit-worker-entrypoint-drift.mjs:102:    risk: "P1",
scripts\audit-worker-entrypoint-drift.mjs:108:    risk: "P1",
scripts\audit-worker-entrypoint-drift.mjs:114:    risk: "P1",
scripts\audit-worker-entrypoint-drift.mjs:116:      "Runtime DDL remains a P1 risk, but source and embedded artifacts must at least match until migration discipline removes it."
scripts\audit-worker-entrypoint-drift.mjs:148:      route === "/api/staging/handover/commit" ? "P0/P1" : inSource !== inEmbedded ? "P1" : "P3",
scripts\audit-worker-entrypoint-drift.mjs:181:    "Scope: P1-006 controlled embedded Worker drift review. This script is read-only and does not overwrite deploy artifacts.",
scripts\audit-db-table-readiness.mjs:155:    ? "P0"
scripts\audit-db-table-readiness.mjs:157:      ? "P0/P1"
scripts\audit-db-table-readiness.mjs:159:        ? "P1"
scripts\audit-db-table-readiness.mjs:161:          ? "P1"
scripts\audit-db-table-readiness.mjs:164:  const status = !exists ? "BLOCKED" : missing.length ? "MANUAL_REQUIRED" : "READY_DRAFT";
scripts\audit-db-table-readiness.mjs:189:  manual: rows.filter((row) => row.status === "MANUAL_REQUIRED").length,
scripts\audit-db-table-readiness.mjs:226:  "- `MANUAL_REQUIRED` means table shape or scope requires human review before staging/production use.",
scripts\audit-db-table-readiness.mjs:228:  "- Runtime DDL and `REAL` money storage remain separate launch blockers tracked by P1-002 and P0-001."
scripts\audit-db-table-readiness.mjs:240:  `| MANUAL_REQUIRED tables | ${summary.manual} |`,
scripts\audit-db-table-readiness.mjs:246:  "Overall: `MANUAL_REQUIRED`",
scripts\audit-db-table-readiness.mjs:267:console.log("DB_TABLE_READINESS_AUDIT=MANUAL_REQUIRED");
scripts\audit-db-table-readiness.mjs:270:console.log(`DB_TABLES_MANUAL_REQUIRED=${summary.manual}`);
scripts\audit-runtime-ddl.mjs:36:  if (/ALTER\s+TABLE/i.test(statement)) return "P1 runtime schema drift";
scripts\audit-runtime-ddl.mjs:37:  if (/CREATE\s+TABLE/i.test(statement)) return "P1 runtime bootstrap side effect";
scripts\audit-runtime-ddl.mjs:70:      `| \`${item.file}:${item.line}\` | \`${item.statement.replaceAll("|", "\\|")}\` | ${item.covered} | ${item.risk} | Keep until P1-002 migration cutover; do not remove automatically. |`
scripts\audit-runtime-ddl.mjs:96:    "- P1 runtime DDL remains open while Worker request paths can create or alter schema.",
scripts\audit-money-fields.mjs:66:    return "Replace with centralized money helper in P0-001B/C; do not trust JS Number as accounting authority.";
scripts\audit-money-fields.mjs:153:Scope: static source scan for P0-001A. This report is non-blocking and does not modify business calculations.
scripts\audit-money-fields.mjs:167:- This scan intentionally includes legacy Worker and frontend code because P0-001A is an inventory task.
scripts\audit-money-fields.mjs:169:- P0-001 remains Partial because this task does not migrate storage or live write paths to integer minor units.
scripts\audit-money-fields.mjs:170:- P0-001D adds \`npm run triage:money\` and \`npm run gate:money-reconciliation\` so these raw counts are reviewed through risk classes and a read-only reconciliation gate before any local/staging dual-write rehearsal.
scripts\compare-staging-receivables-shadow.mjs:18:export const P0_008E_QA_RUN_ID = "P0-008E-20260525-STAGING-SHADOW-001";
scripts\compare-staging-receivables-shadow.mjs:19:export const P0_008E_SOURCE = "P0-008E_RECEIVABLES_SHADOW_REHEARSAL";
scripts\compare-staging-receivables-shadow.mjs:132:      "PRODUCTION_NO_GO"
scripts\compare-staging-receivables-shadow.mjs:177:      "PRODUCTION_NO_GO"
scripts\compare-staging-receivables-shadow.mjs:204:      "BLOCKED_BY_P0_006"
scripts\compare-staging-receivables-shadow.mjs:242:  if (manual) return "MANUAL_REQUIRED";
scripts\compare-staging-receivables-shadow.mjs:320:    return text.includes(P0_008E_QA_RUN_ID) || text.includes(P0_008E_SOURCE);
scripts\compare-staging-receivables-shadow.mjs:331:    Scenario: `P0-008E ${scenario}`,
scripts\compare-staging-receivables-shadow.mjs:342:    Scenario: `P0-008E ${scenario}`,
scripts\compare-staging-receivables-shadow.mjs:569:  rows.push(...createP0008EScenarioRows({ arrearRows, transactions }, { businessDate }));
scripts\compare-staging-receivables-shadow.mjs:574:export function createP0008EScenarioRows(
scripts\compare-staging-receivables-shadow.mjs:604:    rows.push(missingQaScenarioRow("due today", "No P0-008E due-today QA row found."));
scripts\compare-staging-receivables-shadow.mjs:618:    rows.push(missingQaScenarioRow("overdue", "No P0-008E overdue QA row found."));
scripts\compare-staging-receivables-shadow.mjs:632:    rows.push(missingQaScenarioRow("short pay outstanding", "No P0-008E short-pay QA row found."));
scripts\compare-staging-receivables-shadow.mjs:660:      missingQaScenarioRow("partial repayment", "No P0-008E partial repayment QA row found.")
scripts\compare-staging-receivables-shadow.mjs:688:    rows.push(missingQaScenarioRow("full repayment", "No P0-008E full repayment QA row found."));
scripts\compare-staging-receivables-shadow.mjs:714:      missingQaScenarioRow("adjustment credit", "No P0-008E adjustment credit QA row found.")
scripts\compare-staging-receivables-shadow.mjs:741:      missingQaScenarioRow("adjustment debit", "No P0-008E adjustment debit QA row found.")
scripts\compare-staging-receivables-shadow.mjs:746:    Scenario: "P0-008E voided payment impact",
scripts\compare-staging-receivables-shadow.mjs:757:      : "No P0-008E voided payment QA row found."
scripts\compare-staging-receivables-shadow.mjs:761:    Scenario: "P0-008E deposit exclusion",
scripts\compare-staging-receivables-shadow.mjs:768:      : "No P0-008E deposit exclusion QA row found."
scripts\compare-staging-receivables-shadow.mjs:778:  const manualRequiredCount = rows.filter((row) => row.Status === "MANUAL_REQUIRED").length;
scripts\audit-environment-separation.mjs:45:    result: sourceName && embeddedName && sourceName !== embeddedName ? "PASS" : "MANUAL_REQUIRED",
scripts\audit-environment-separation.mjs:51:    result: sourceDb && embeddedDb && sourceDb !== embeddedDb ? "PASS" : "MANUAL_REQUIRED",
scripts\audit-environment-separation.mjs:57:    result: sourceKv && embeddedKv && sourceKv !== embeddedKv ? "PASS" : "MANUAL_REQUIRED",
scripts\audit-environment-separation.mjs:63:    result: /APP_ENV/.test(`${source}\n${embedded}`) ? "PASS" : "MANUAL_REQUIRED",
scripts\audit-environment-separation.mjs:76:const manual = rows.some((row) => row.result === "MANUAL_REQUIRED");
scripts\audit-environment-separation.mjs:78:const overall = fail ? "FAIL" : manual ? "MANUAL_REQUIRED" : warning ? "WARNING" : "PASS";
scripts\audit-api-permissions.mjs:190:  "Overall: `MANUAL_REQUIRED`",
scripts\audit-api-permissions.mjs:196:  "- Financial routes still require P0-001/P0-003/P0-006/P0-008 completion before commercial launch.",
scripts\audit-api-permissions.mjs:211:console.log("API_PERMISSION_AUDIT=MANUAL_REQUIRED");
scripts\compare-staging-tenant-scope-shadow.mjs:127:      hasCompany && hasProperty ? "PASS" : hasCorpid ? "LEGACY_WARNING" : "MANUAL_REQUIRED";
scripts\compare-staging-tenant-scope-shadow.mjs:180:  const manual = rows.filter((row) => row.Result === "MANUAL_REQUIRED");
scripts\compare-staging-tenant-scope-shadow.mjs:244:    "- P0-006 remains Partial, not Verified.",
scripts\compare-staging-tenant-scope-shadow.mjs:253:  console.log(`TENANT_SCOPE_STAGING_SHADOW_MANUAL_REQUIRED=${summary.manualRequiredCount}`);
scripts\compare-staging-backend-totals.mjs:15:const RECEIVABLES_SHADOW_REHEARSAL_SOURCE = "P0-008E_RECEIVABLES_SHADOW_REHEARSAL";
scripts\compare-staging-backend-totals.mjs:36:  ["dashboard monthly income", "BLOCKED_BY_P0_001"],
scripts\compare-staging-backend-totals.mjs:37:  ["history row totals", "BLOCKED_BY_P0_001"],
scripts\compare-staging-backend-totals.mjs:38:  ["dashboard today due", "BLOCKED_BY_P0_008"],
scripts\compare-staging-backend-totals.mjs:39:  ["dashboard overdue amount", "BLOCKED_BY_P0_008"],
scripts\compare-staging-backend-totals.mjs:40:  ["dashboard arrears total", "BLOCKED_BY_P0_008"],
scripts\compare-staging-backend-totals.mjs:41:  ["deposit total", "BLOCKED_BY_P0_008"],
scripts\compare-staging-backend-totals.mjs:42:  ["arrears paid", "BLOCKED_BY_P0_008"],
scripts\compare-staging-backend-totals.mjs:43:  ["arrears outstanding", "BLOCKED_BY_P0_008"]
scripts\compare-staging-backend-totals.mjs:99:      blocker: "BLOCKED_BY_P0_001"
scripts\compare-staging-backend-totals.mjs:108:      blocker: "BLOCKED_BY_P0_008"
scripts\compare-staging-backend-totals.mjs:117:      blocker: "BLOCKED_BY_P0_008"
scripts\compare-staging-backend-totals.mjs:126:      blocker: "BLOCKED_BY_P0_008"
scripts\compare-staging-backend-totals.mjs:135:      blocker: "PRODUCTION_NO_GO"
scripts\compare-staging-backend-totals.mjs:144:      blocker: "PRODUCTION_NO_GO"
scripts\compare-staging-backend-totals.mjs:153:      blocker: "PRODUCTION_NO_GO"
scripts\compare-staging-backend-totals.mjs:162:      blocker: "BLOCKED_BY_P0_008"
scripts\compare-staging-backend-totals.mjs:171:      blocker: "PRODUCTION_NO_GO"
scripts\compare-staging-backend-totals.mjs:180:      blocker: "BLOCKED_BY_P0_008"
scripts\compare-staging-backend-totals.mjs:189:      blocker: "BLOCKED_BY_P0_008"
scripts\compare-staging-backend-totals.mjs:198:      blocker: "PRODUCTION_NO_GO"
scripts\compare-staging-backend-totals.mjs:207:      blocker: "PRODUCTION_NO_GO"
scripts\compare-staging-backend-totals.mjs:216:      blocker: "BLOCKED_BY_P0_001"
scripts\compare-staging-backend-totals.mjs:225:      blocker: "PRODUCTION_NO_GO"
scripts\compare-staging-backend-totals.mjs:234:      blocker: "PRODUCTION_NO_GO"
scripts\compare-staging-backend-totals.mjs:241:  if (!row) return "MANUAL_REQUIRED";
scripts\compare-staging-backend-totals.mjs:273:    const status = row.Status || "MANUAL_REQUIRED";
scripts\compare-staging-backend-totals.mjs:305:        Result: status === "MANUAL_REQUIRED" ? "MANUAL_REQUIRED" : "PASS",
scripts\compare-staging-backend-totals.mjs:328:      Result: status === "MISMATCH" ? "MANUAL_REQUIRED" : "SHADOW_ONLY",
scripts\compare-staging-backend-totals.mjs:336:  const manual = rows.filter((row) => row.Result === "MANUAL_REQUIRED");
scripts\compare-staging-backend-totals.mjs:347:          ? "MANUAL_REQUIRED"
scripts\compare-staging-backend-totals.mjs:654:        "P0-008E receivables shadow evidence rows are isolated from backend totals switch comparison."
scripts\compare-staging-backend-totals.mjs:664:      notes: "Interim shadow only; final authority blocked by P0-008 receivables."
scripts\compare-staging-backend-totals.mjs:670:    "Current / Legacy Total": "MANUAL_REQUIRED",
scripts\compare-staging-backend-totals.mjs:673:    Status: "MANUAL_REQUIRED",
scripts\compare-staging-backend-totals.mjs:693:  const hasManual = rows.some((row) => row.Status === "MANUAL_REQUIRED");
scripts\compare-staging-backend-totals.mjs:694:  const overall = hasMismatch ? "MISMATCH" : hasBlocked || hasManual ? "MANUAL_REQUIRED" : "PASS";
scripts\compare-staging-backend-totals.mjs:730:    "- `BLOCKED` means the total is intentionally blocked by unresolved P0 dependencies.",
scripts\compare-staging-backend-totals.mjs:731:    "- `MANUAL_REQUIRED` means authenticated dashboard/history response evidence is still required before switch rehearsal.",
tests\migration-draft.spec.mjs:148:    "P0 Exceptions"
tests\migration-draft.spec.mjs:215:    "clean-bootstrap P0",
tests\helpers\employee-entry-route-switch-fixture.mjs:189:      export_text: "P0-001K local QA",
tests\helpers\employee-entry-route-switch-fixture.mjs:206:      note: "P0-001K local QA",
scripts\dry-run-tenant-scope-staging-backfill.mjs:122:          ? "MANUAL_REQUIRED"
scripts\dry-run-tenant-scope-staging-backfill.mjs:127:            ? "MANUAL_REQUIRED"
scripts\dry-run-tenant-scope-staging-backfill.mjs:159:  const manual = rows.filter((row) => row.Result === "MANUAL_REQUIRED");
scripts\dry-run-tenant-scope-staging-backfill.mjs:273:    "- P0-006 remains Partial, not Verified.",
scripts\dry-run-tenant-scope-staging-backfill.mjs:283:  console.log(`TENANT_SCOPE_STAGING_BACKFILL_MANUAL_REQUIRED=${summary.manualRequiredCount}`);
tests\money-dual-write-local-staging.spec.mjs:6:  P0_001E_TABLE_SPECS,
tests\money-dual-write-local-staging.spec.mjs:10:test("P0-001E table specs target only known local/staging companion fils fields", () => {
tests\money-dual-write-local-staging.spec.mjs:11:  assert.equal(P0_001E_TABLE_SPECS.length >= 5, true);
tests\money-dual-write-local-staging.spec.mjs:12:  for (const spec of P0_001E_TABLE_SPECS) {
tests\no-legacy-login-visible.spec.mjs:48:test("production cutover remains PRODUCTION_NO_GO", async () => {
tests\no-legacy-login-visible.spec.mjs:50:  assert.match(readiness, /PRODUCTION_NO_GO/);
tests\owner-client-credit-ui.spec.mjs:36:test("production cutover remains PRODUCTION_NO_GO", () => {
scripts\gate-tenant-scope-staging-route-enforcement.mjs:217:    "- P0-006 remains Partial, not Verified.",
scripts\gate-receivables-readiness.mjs:12:  ["receivables migration draft", "migration-drafts/receivables_model_draft.sql", "MANUAL_REQUIRED"]
scripts\gate-receivables-readiness.mjs:21:      : defaultResult === "MANUAL_REQUIRED"
scripts\gate-receivables-readiness.mjs:22:        ? "MANUAL_REQUIRED"
scripts\gate-receivables-readiness.mjs:27:      : defaultResult === "MANUAL_REQUIRED"
scripts\gate-receivables-readiness.mjs:42:  result: "MANUAL_REQUIRED",
scripts\gate-receivables-readiness.mjs:43:  evidence: "P0-001/P0-003/P0-006 dependencies",
scripts\gate-receivables-readiness.mjs:49:const manual = rows.some((row) => row.result === "MANUAL_REQUIRED");
scripts\gate-receivables-readiness.mjs:50:const overall = fail ? "FAIL" : manual ? "MANUAL_REQUIRED" : "PASS";
scripts\gate-tenant-scope-dashboard-history-query.mjs:134:    "- P0-006 remains Partial, not Verified.",
scripts\gate-commercial-launch-readiness.mjs:17:    area: "P0-007 Worker/auth smoke",
scripts\gate-commercial-launch-readiness.mjs:18:    evidence: ["P0_P1_STATUS_REVIEW.md", "RUN_REPORT.md"],
scripts\gate-commercial-launch-readiness.mjs:19:    required: ["P0-007", "Verified", "smoke:with-worker"],
scripts\gate-commercial-launch-readiness.mjs:23:    area: "P0-004 delete_session void",
scripts\gate-commercial-launch-readiness.mjs:24:    evidence: ["P0_P1_STATUS_REVIEW.md", "RUN_REPORT.md"],
scripts\gate-commercial-launch-readiness.mjs:25:    required: ["P0-004", "Verified", "test:delete-session"],
scripts\gate-commercial-launch-readiness.mjs:29:    area: "P0-005 clean D1 bootstrap",
scripts\gate-commercial-launch-readiness.mjs:30:    evidence: ["P0_P1_STATUS_REVIEW.md", "RUN_REPORT.md"],
scripts\gate-commercial-launch-readiness.mjs:31:    required: ["P0-005", "Verified", "verify:clean-d1"],
scripts\gate-commercial-launch-readiness.mjs:35:    area: "P0-001 money precision",
scripts\gate-commercial-launch-readiness.mjs:39:      "P0_P1_STATUS_REVIEW.md"
scripts\gate-commercial-launch-readiness.mjs:41:    required: ["P0-001", "Partial", "MANUAL_REQUIRED"],
scripts\gate-commercial-launch-readiness.mjs:45:    area: "P0-002 handover atomic",
scripts\gate-commercial-launch-readiness.mjs:46:    evidence: ["P0_P1_STATUS_REVIEW.md", "HANDOVER_STAGING_ENDPOINT_REHEARSAL_RESULT.md"],
scripts\gate-commercial-launch-readiness.mjs:47:    required: ["P0-002", "Partial", "staging"],
scripts\gate-commercial-launch-readiness.mjs:51:    area: "P0-003 backend totals authority",
scripts\gate-commercial-launch-readiness.mjs:53:      "P0_003C_BACKEND_TOTALS_LIVE_AUTHORITY_GATE.md",
scripts\gate-commercial-launch-readiness.mjs:56:    required: ["MANUAL_REQUIRED", "dashboard", "receivables"],
scripts\gate-commercial-launch-readiness.mjs:60:    area: "P0-006 tenant/property scope",
scripts\gate-commercial-launch-readiness.mjs:62:      "P0_006B_TENANT_PROPERTY_SCOPE_READINESS_GATE.md",
scripts\gate-commercial-launch-readiness.mjs:65:    required: ["MANUAL_REQUIRED", "corpid", "tenant"],
scripts\gate-commercial-launch-readiness.mjs:69:    area: "P0-008 receivables",
scripts\gate-commercial-launch-readiness.mjs:71:      "P0_008B_RECEIVABLES_IMPLEMENTATION_READINESS_GATE.md",
scripts\gate-commercial-launch-readiness.mjs:74:    required: ["MANUAL_REQUIRED", "receivables"],
scripts\gate-commercial-launch-readiness.mjs:79:    evidence: ["P0_001L_STAGING_ENVIRONMENT_PREFLIGHT.md", "STAGING_QA_MANUAL_REQUIRED.md"],
scripts\gate-commercial-launch-readiness.mjs:80:    required: ["MANUAL_REQUIRED", "staging", "backup", "rollback"],
scripts\gate-commercial-launch-readiness.mjs:89:    required: ["MANUAL_REQUIRED", "D1", "KV", "APP_ENV"],
scripts\gate-commercial-launch-readiness.mjs:94:    evidence: ["P1_002B_RUNTIME_DDL_REMOVAL_READINESS.md", "RUNTIME_DDL_REMOVAL_GATE_RESULT.md"],
scripts\gate-commercial-launch-readiness.mjs:95:    required: ["MANUAL_REQUIRED", "runtime DDL"],
scripts\gate-commercial-launch-readiness.mjs:101:    required: ["MANUAL_REQUIRED", "alert", "redaction"],
scripts\gate-commercial-launch-readiness.mjs:107:    required: ["MANUAL_REQUIRED", "29", "25"],
scripts\gate-commercial-launch-readiness.mjs:113:    required: ["MANUAL_REQUIRED", "22", "10"],
scripts\gate-commercial-launch-readiness.mjs:119:    required: ["MANUAL_REQUIRED", "22", "11"],
scripts\gate-commercial-launch-readiness.mjs:129:    required: ["MANUAL_REQUIRED", "BLOCKED", "MONEY_DUAL_WRITE_READINESS_GATE.md"],
scripts\gate-commercial-launch-readiness.mjs:150:        : "MANUAL_REQUIRED";
scripts\gate-commercial-launch-readiness.mjs:163:  manual: rows.filter((row) => row.result === "MANUAL_REQUIRED").length,
scripts\gate-commercial-launch-readiness.mjs:184:  "- Real staging QA is `MANUAL_REQUIRED` until target resources, accounts, backup, rollback, and feature flags are provided.",
scripts\gate-commercial-launch-readiness.mjs:185:  "- Production cutover is `NO-GO` because multiple P0/P1 launch gates remain incomplete.",
scripts\gate-commercial-launch-readiness.mjs:199:  `| MANUAL_REQUIRED areas | ${summary.manual} |`,
scripts\gate-commercial-launch-readiness.mjs:202:  "Overall: `PRODUCTION_NO_GO`",
scripts\gate-commercial-launch-readiness.mjs:218:console.log("COMMERCIAL_LAUNCH_READINESS=PRODUCTION_NO_GO");
scripts\gate-commercial-launch-readiness.mjs:221:console.log(`COMMERCIAL_LAUNCH_MANUAL_REQUIRED=${summary.manual}`);
scripts\gate-tenant-scope-readiness.mjs:32:  result: corpidCount > companyIdCount ? "MANUAL_REQUIRED" : "WARNING",
scripts\gate-tenant-scope-readiness.mjs:46:  result: "MANUAL_REQUIRED",
scripts\gate-tenant-scope-readiness.mjs:52:const manual = rows.some((row) => row.result === "MANUAL_REQUIRED");
scripts\gate-tenant-scope-readiness.mjs:53:const overall = fail ? "FAIL" : manual ? "MANUAL_REQUIRED" : "PASS";
scripts\gate-runtime-ddl-removal.mjs:33:  result: findingRows.length > 0 ? "MANUAL_REQUIRED" : "PASS",
scripts\gate-runtime-ddl-removal.mjs:43:  result: "MANUAL_REQUIRED",
scripts\gate-runtime-ddl-removal.mjs:57:const manual = rows.some((row) => row.result === "MANUAL_REQUIRED");
scripts\gate-runtime-ddl-removal.mjs:58:const overall = fail ? "FAIL" : manual ? "MANUAL_REQUIRED" : "PASS";
scripts\gate-receivables-staging-authority-switch.mjs:33:  "P0-008E due today",
scripts\gate-receivables-staging-authority-switch.mjs:34:  "P0-008E overdue",
scripts\gate-receivables-staging-authority-switch.mjs:35:  "P0-008E short pay outstanding",
scripts\gate-receivables-staging-authority-switch.mjs:36:  "P0-008E partial repayment",
scripts\gate-receivables-staging-authority-switch.mjs:37:  "P0-008E full repayment",
scripts\gate-receivables-staging-authority-switch.mjs:38:  "P0-008E voided payment impact",
scripts\gate-receivables-staging-authority-switch.mjs:39:  "P0-008E deposit exclusion"
scripts\gate-receivables-staging-authority-switch.mjs:43:  "P0-008E adjustment credit",
scripts\gate-receivables-staging-authority-switch.mjs:44:  "P0-008E adjustment debit",
scripts\gate-receivables-staging-authority-switch.mjs:123:    const status = row.Status || "MANUAL_REQUIRED";
scripts\gate-receivables-staging-authority-switch.mjs:260:  if (result.code !== 0 || !output.includes("COMMERCIAL_LAUNCH_READINESS=PRODUCTION_NO_GO")) {
scripts\gate-receivables-staging-authority-switch.mjs:261:    throw new Error("Commercial launch gate is not PRODUCTION_NO_GO.");
scripts\gate-receivables-staging-authority-switch.mjs:330:    "- Production remains `NO-GO`; this gate does not verify P0-008 for production.",
tests\owner-employee-visual-shell-alignment.spec.mjs:65:test("production cutover remains PRODUCTION_NO_GO", () => {
scripts\gate-tenant-scope-backfill-reconciliation.mjs:149:    "- P0-006 remains Partial, not Verified.",
scripts\generate-reconciliation-template.mjs:127:    "- P0/P1/P2/P3 exceptions",
scripts\gate-tenant-scope-staging-wiring-readiness.mjs:50:    manualRequiredCount: rows.filter((row) => row.Status === "MANUAL_REQUIRED").length,
scripts\gate-tenant-scope-staging-wiring-readiness.mjs:51:    productionNoGoCount: rows.filter((row) => row.Status === "PRODUCTION_NO_GO").length,
scripts\gate-tenant-scope-staging-wiring-readiness.mjs:135:      Status: "MANUAL_REQUIRED",
scripts\gate-tenant-scope-staging-wiring-readiness.mjs:145:      Status: "MANUAL_REQUIRED",
scripts\gate-tenant-scope-staging-wiring-readiness.mjs:156:      Status: "MANUAL_REQUIRED",
scripts\gate-tenant-scope-staging-wiring-readiness.mjs:165:      "Gate Result": "PRODUCTION_NO_GO",
scripts\gate-tenant-scope-staging-wiring-readiness.mjs:167:      Status: "PRODUCTION_NO_GO",
scripts\gate-tenant-scope-staging-wiring-readiness.mjs:240:    "- P0-006 remains Partial, not Verified.",
scripts\gate-tenant-scope-staging-wiring-readiness.mjs:249:  console.log(`TENANT_SCOPE_STAGING_WIRING_MANUAL_REQUIRED=${result.summary.manualRequiredCount}`);
scripts\gate-tenant-scope-staging-wiring-readiness.mjs:250:  console.log(`TENANT_SCOPE_STAGING_WIRING_PRODUCTION_NO_GO=${result.summary.productionNoGoCount}`);
scripts\manual-handover-staging-validation.mjs:235:Scope: P0-002D local/staging manual validation helper. It executed safe local scenarios and generated copyable PowerShell examples with redacted cookies. No production Worker, remote D1, production migration, live employee flow switch, live dashboard change, or legacy financial table write was performed.
scripts\money-shadow-reconcile.mjs:125:Scope: P0-001B shadow validation. This script performs read-only local D1 inspection and does not modify database rows, production configuration, dashboard formulas, handover flow, or delete-session behavior.
... [truncated 250 more lines]
```


### 8.2 Console Warnings / Errors / Throws

Command: `rg -n "console\.error|console\.warn|throw new Error|return forbidden|status: 403|status: 401" deploy-worker/src deploy-worker/public modules scripts --glob "*.{js,mjs,html}"`


```text
deploy-worker/src\index.js:73:  if (!secret) throw new Error("jwt_secret_missing");
deploy-worker/src\index.js:86:    throw new Error("jwt_secret_missing");
deploy-worker/src\index.js:89:    throw new Error("malformed_token");
deploy-worker/src\index.js:92:  if (parts.length !== 3) throw new Error("malformed_token");
deploy-worker/src\index.js:97:    throw new Error("malformed_token");
deploy-worker/src\index.js:100:    throw new Error("malformed_token");
deploy-worker/src\index.js:110:  if (!isValid) throw new Error("invalid_signature");
deploy-worker/src\index.js:115:    throw new Error("malformed_token");
deploy-worker/src\index.js:118:    throw new Error("token_expired");
deploy-worker/src\index.js:121:    throw new Error("malformed_token");
deploy-worker/src\index.js:235:    return { error: "unauthenticated", status: 401 };
deploy-worker/src\index.js:241:    return { error: e.message, status: 401 };
deploy-worker/src\index.js:244:    return { error: "session_required", status: 401 };
deploy-worker/src\index.js:270:    if (!active) return { error: "session_revoked", status: 401 };
deploy-worker/src\index.js:272:    return { error: "session_check_failed", status: 401 };
deploy-worker/src\index.js:275:    return { error: "forbidden", status: 403 };
deploy-worker/src\index.js:319:      return forbidden("invalid_origin");
deploy-worker/src\index.js:322:  return forbidden("missing_origin");
deploy-worker/src\index.js:412:  if (!allowed) return forbidden("invalid_origin");
deploy-worker/src\index.js:708:  if (!secret) throw new Error("encryption_key_missing");
deploy-worker/src\index.js:786:    console.warn("[audit]", action, e?.message || e);
deploy-worker/src\index.js:919:  if (text.startsWith("<")) throw new Error("upstream_html_response");
deploy-worker/src\index.js:929:    throw new Error(`upstream_invalid_json:${source}`);
deploy-worker/src\index.js:931:  if (!response.ok) throw new Error(data?.errmsg || data?.message || `upstream_${response.status}`);
deploy-worker/src\index.js:1435:  if(!requireManager(user))return forbidden();
deploy-worker/src\index.js:1868:    if(!isManager&&!fallback&&!isLockDue)return forbidden();
deploy-worker/src\index.js:1953:  if(isReadonlyAdminRoleValue(user?.role)&&request.method!=="GET")return forbidden();
deploy-worker/src\index.js:1955:    if(!requireManager(user))return forbidden();
deploy-worker/src\index.js:2038:    throw new Error(`${field} exceeds safe integer range.`);
deploy-worker/src\index.js:2616:      if (auth.status === 403) return forbidden();
deploy-worker/src\index.js:2638:      return forbidden();
deploy-worker/src\index.js:2641:      if (!requireManager(user)) return forbidden();
deploy-worker/src\index.js:2662:      if (!canReadOwnerData(user)) return forbidden();
deploy-worker/src\index.js:2673:      if (!canReadOwnerData(user)) return forbidden();
deploy-worker/src\index.js:2693:        throw new Error("wifi_accounts_table_missing");
deploy-worker/src\index.js:2718:      if (!requireManager(user)) return forbidden();
deploy-worker/src\index.js:2783:        throw new Error("client_credit_table_missing");
deploy-worker/src\index.js:2799:      if (!requireManager(user)) return forbidden();
deploy-worker/src\index.js:2850:        throw new Error("rent_config_table_missing");
deploy-worker/src\index.js:2861:      if (!requireManager(user)) return forbidden();
deploy-worker/src\index.js:2895:      if (!requireManager(user)) return forbidden();
deploy-worker/src\index.js:2996:      if (!requireManager(user)) return forbidden();
deploy-worker/src\index.js:3095:      if (!requireManager(user)) return forbidden();
deploy-worker/public\unified-login.html:388:  if (!response.ok) throw new Error(body?.error || "me_failed");
deploy-worker/public\unified-login.html:447:      throw new Error(authResult.body?.error || "invalid_credentials");
deploy-worker/public\unified-login.html:452:    if (!me) throw new Error("session_expired");
deploy-worker/public\portal.html:182:  if(!response.ok)throw new Error("me_failed");
deploy-worker/public\portal.html:233:    if(!auth.response.ok)throw new Error("login_failed");
deploy-worker/public\portal.html:235:    if(!me)throw new Error("session_missing");
modules\worker\employee-entry-commercial-adapter.mjs:15:    throw new Error(`${label} is required.`);
modules\worker\employee-entry-commercial-adapter.mjs:30:    throw new Error(`${label} must use YYYY-MM-DD.`);
modules\worker\employee-entry-commercial-adapter.mjs:38:  throw new Error("resolved.listPriceFils or resolved.listPriceAed is required.");
modules\worker\d1-write-plan-executor.mjs:20:    throw new Error(`${label} is required.`);
modules\worker\d1-write-plan-executor.mjs:28:    throw new Error(`Unsafe SQL identifier for ${label}: ${value}`);
modules\worker\d1-write-plan-executor.mjs:37:  throw new Error(`Unsupported D1 binding for ${key}.`);
modules\worker\d1-write-plan-executor.mjs:43:    throw new Error(`Unsupported insert table: ${table}`);
modules\worker\d1-write-plan-executor.mjs:48:  if (!entries.length) throw new Error(`Insert row for ${table} cannot be empty.`);
modules\worker\d1-write-plan-executor.mjs:127:    throw new Error("D1 write plan must be marked atomic.");
modules\worker\d1-write-plan-executor.mjs:130:    throw new Error("D1 write plan operations are required.");
modules\worker\d1-write-plan-executor.mjs:137:    throw new Error(`Unsupported write plan operation: ${JSON.stringify(op)}`);
deploy-worker/public\index-51-main.js:92:  if(!r.ok)throw new Error('me_failed_'+r.status);
deploy-worker/public\index-51-main.js:199:    console.warn('[UnifiedLogin] unsupported role for owner app');
deploy-worker/public\index-51-main.js:203:    console.warn('[UnifiedLogin] owner session handoff failed:',e);
deploy-worker/public\index-51-main.js:276:  try{switchView(defaultViewForRole());}catch(e){console.error('[OwnerBootstrap] initial shell render failed:',e);}
deploy-worker/public\index-51-main.js:281:    console.error('[OwnerBootstrap] data load failed:', e);
deploy-worker/public\index-51-main.js:293:    console.warn('[Logout] 服务端清除 Cookie 失败（网络问题），继续本地登出:',e);
deploy-worker/public\index-51-main.js:649:      if(!cr.ok)throw new Error('api');
deploy-worker/public\index-51-main.js:665:      if(!_ar.ok) throw new Error('api');
deploy-worker/public\index-51-main.js:933:  }catch(e){console.warn('refreshArrearsFromCloud:',e);}
deploy-worker/public\index-51-main.js:1470:    if(!_r.ok) throw new Error('HTTP '+_r.status);
deploy-worker/public\index-51-main.js:1529:      }catch(e){console.warn('session_detail failed:',e);wrap.innerHTML=`<div class="card" style="padding:24px;text-align:center;color:var(--red)">历史详情加载失败：${esc(e.message||'网络错误')}</div>`;return;}
deploy-worker/public\index-51-main.js:1661:          if(!r.ok) throw new Error('HTTP '+r.status);
deploy-worker/public\index-51-main.js:1770:    if(!r.ok)throw new Error('rent_config');
deploy-worker/public\index-51-main.js:1782:    if(Object.keys(local).length>0)console.warn('参考租金云端读取失败，暂用本机缓存',e);
deploy-worker/public\index-51-main.js:1796:    if(!r.ok)throw new Error('rent_config_save_'+r.status);
deploy-worker/public\index-51-main.js:1800:    console.warn('参考租金云端保存失败',e);
deploy-worker/public\index-51-main.js:2337:    console.error('rc_loadLock cp_loadAll error:',e);
deploy-worker/public\index-51-main.js:2860:  if(denyReadonlyAdminWrite())throw new Error('readonly_admin_denied');
deploy-worker/public\index-51-main.js:2864:  if(!r.ok)throw new Error('wifi_save_failed');
deploy-worker/public\index-51-main.js:3800:        if(!r.ok){console.warn('session_detail failed:',cs.id,r.status);fail++;continue;}
deploy-worker/public\index-51-main.js:3813:      }catch(e){console.warn('session_detail failed:',cs.id,e);fail++;continue;}
deploy-worker/public\index-51-main.js:4124:    .catch(e=>console.warn('customers cloud save failed:',e));
deploy-worker/public\index-51-main.js:4419:        console.warn('[ccTenantScore]',t.bed,t.cardName,e);
deploy-worker/public\index-51-main.js:4452:      console.error('[ccBuildCache]',e);
deploy-worker/public\index-51-cp.js:61:    console.error(e);
modules\tenant\scope.mjs:23:    throw new Error(`${label} is required.`);
deploy-worker/public\employee-v3.html:1933:  if(!r.ok)throw new Error('me_failed_'+r.status);
deploy-worker/public\employee-v3.html:1975:  console.error('[EmployeeRuntime]',info,e.error||e.message);
deploy-worker/public\employee-v3.html:1977:    console.warn('[EmployeeRuntime] Anonymous browser/extension script error suppressed from user UI.');
deploy-worker/public\employee-v3.html:1985:  console.error('[EmployeeRuntimePromise]',info,e.reason);
deploy-worker/public\employee-v3.html:2080:    if(!r.ok||!data?.success)throw new Error(data?.error||'login_failed');
deploy-worker/public\employee-v3.html:2253:  try{const r=await apiFetch('/api/employee/lock/cards');if(!r.ok)throw new Error('HTTP '+r.status);const data=await r.json();const list=data.roomsData?Object.entries(data.roomsData).flatMap(([room,cards])=>(cards||[]).map(card=>({...card,room}))):[];state.lockCards=list.map(normalizeCard).filter(x=>x.bed);toast('已抓取通通锁 '+state.lockCards.length+' 条');lookupBed();return true}catch(e){toast('抓取失败，可继续手动录入');return false}
deploy-worker/public\employee-v3.html:2642:    console.error('entryPayload failed',err);
deploy-worker/public\employee-v3.html:2902:    if(!r.ok)throw new Error('HTTP '+r.status);
deploy-worker/public\employee-v3.html:3043:      if(!r.ok||data?.success===false)throw new Error(data?.error||data?.message||raw||('HTTP '+r.status));
deploy-worker/public\employee-v3.html:3280:    console.warn('[UnifiedLogin] employee session handoff failed:',e);
deploy-worker/public\employee-v2.html:249:    if(!r.ok)throw new Error('HTTP '+r.status);
scripts\check-syntax.mjs:60:  console.error(`Syntax check failed for ${failures.length} file(s).`);
scripts\check-syntax.mjs:62:    console.error(`\n--- ${failure.file} ---`);
scripts\check-syntax.mjs:63:    if (failure.stdout) console.error(failure.stdout.trim());
scripts\check-syntax.mjs:64:    if (failure.stderr) console.error(failure.stderr.trim());
scripts\check-secrets.mjs:76:  console.error("Secret hygiene check failed:");
scripts\check-secrets.mjs:77:  for (const violation of violations) console.error(`- ${violation}`);
scripts\audit-money-live-write-paths.mjs:228:  console.error(error.stack || error.message);
modules\finance\shadow-totals.mjs:6:    throw new Error(`Missing money value for ${fieldName}.`);
modules\finance\handover.mjs:51:  if (!normalized) throw new Error(`Unsupported ${label}: ${value}`);
modules\finance\handover.mjs:130:    throw new Error(`Unsupported handover category after normalization: ${category}`);
scripts\gate-receivables-staging-authority-switch.mjs:261:    throw new Error("Commercial launch gate is not PRODUCTION_NO_GO.");
scripts\gate-receivables-staging-authority-switch.mjs:345:    console.error(`RECEIVABLES_AUTHORITY_SWITCH_GATE=BLOCKED: ${error?.message || error}`);
modules\finance\receivables.mjs:27:    throw new Error(`${label} is required.`);
modules\finance\receivables.mjs:44:    throw new Error(`${label} must use YYYY-MM-DD.`);
modules\finance\receivables.mjs:52:    throw new Error(`${label} must be an ISO timestamp string.`);
modules\finance\receivables.mjs:59:    throw new Error(`${label} is required.`);
modules\finance\receivables.mjs:72:  if (!allowedReasons.has(reason)) throw new Error(`Unsupported ${label}: ${value}`);
modules\finance\receivables.mjs:190:    throw new Error(`Unsupported shortfall treatment: ${input.shortfallTreatment}`);
modules\finance\receivables.mjs:268:    throw new Error("Deposit is not a rent receivable unless explicitly configured.");
scripts\audit-db.mjs:157:    throw new Error("DATABASE_STATIC_SCAN.md is out of date. Run `npm run audit:db`.");
scripts\generate-embedded-worker-dry-run.mjs:75:    throw new Error("embedded fallback injection failed");
modules\finance\periods.mjs:9:  if (!match) throw new Error("Date must use YYYY-MM-DD.");
modules\finance\periods.mjs:21:    throw new Error(`Invalid calendar date: ${value}`);
modules\finance\periods.mjs:57:    throw new Error(`${label} must be a positive integer.`);
modules\finance\periods.mjs:118:  throw new Error(`Unsupported rent cycle: ${input.cycle}`);
scripts\manual-handover-staging-validation.mjs:98:    { status: 403, code: "FEATURE_DISABLED" },
scripts\manual-handover-staging-validation.mjs:218:    { status: 403 },
modules\finance\money.mjs:10:  if (!trimmed) throw new Error("Invalid AED amount: empty string");
modules\finance\money.mjs:11:  if (/nan|infinity/i.test(trimmed)) throw new Error(`Invalid AED amount: ${input}`);
modules\finance\money.mjs:19:  throw new Error(`Invalid AED amount: ${input}`);
modules\finance\money.mjs:25:  if (!match) throw new Error(`Invalid AED amount: ${input}`);
modules\finance\money.mjs:29:    throw new Error("Negative AED amount is not allowed.");
modules\finance\money.mjs:48:    throw new Error("Negative money minor-unit value is not allowed.");
scripts\gate-tenant-scope-staging-wiring-readiness.mjs:258:    console.error(`TENANT_SCOPE_STAGING_WIRING_GATE=BLOCKED: ${error?.message || error}`);
scripts\local-worker-utils.mjs:39:    throw new Error(
scripts\local-worker-utils.mjs:51:  if (missing.length) throw new Error(`Missing local auth secret(s): ${missing.join(", ")}`);
scripts\local-worker-utils.mjs:54:    throw new Error(
scripts\local-worker-utils.mjs:59:    throw new Error("ALLOW_DEV_SEED must be true for local employee auth smoke");
scripts\local-worker-utils.mjs:113:  throw new Error(
scripts\local-worker-utils.mjs:127:    throw new Error(`Wrangler binary not found at ${wranglerBin}. Run npm install first.`);
scripts\local-worker-utils.mjs:366:    if (error) console.error(sanitizeLog(error?.stack || error?.message || String(error)));
scripts\local-worker-utils.mjs:370:      console.error(`${label} failed: ${sanitizeLog(cleanupError?.message || cleanupError)}`);
modules\finance\money-dual-write.mjs:18:    throw new Error(`${label} is required.`);
modules\finance\money-dual-write.mjs:21:  if (!FIELD_PATTERN.test(field)) throw new Error(`Unsafe field name for ${label}: ${value}`);
modules\finance\money-dual-write.mjs:40:    throw new Error(`Dual-write target must end with _fils: ${filsField}`);
modules\finance\money-dual-write.mjs:163:    throw new Error("At least one money field spec is required.");
scripts\dry-run-tenant-scope-staging-backfill.mjs:70:    throw new Error(`Unable to confirm staging D1 target. Exit ${result.code}.`);
scripts\dry-run-tenant-scope-staging-backfill.mjs:74:    throw new Error("D1 target mismatch; refusing tenant scope staging backfill dry-run.");
scripts\dry-run-tenant-scope-staging-backfill.mjs:90:    throw new Error(`Read-only staging D1 SELECT failed with exit code ${result.code}.`);
scripts\dry-run-tenant-scope-staging-backfill.mjs:291:    console.error(`TENANT_SCOPE_STAGING_BACKFILL_DRY_RUN=BLOCKED: ${error?.message || error}`);
scripts\gate-tenant-scope-staging-route-enforcement.mjs:235:    console.error(
scripts\audit-api.mjs:669:    throw new Error(details.join("\n"));
scripts\audit-api.mjs:752:    throw new Error("API_INVENTORY.md is out of date. Run `npm run audit:api`.");
scripts\handover-staging-validation-utils.mjs:49:  if (response.status !== 200) throw new Error(`employee login failed ${response.status}`);
scripts\handover-staging-validation-utils.mjs:54:  if (!ownerPassword) throw new Error("LOCAL_MANAGER_PASSWORD is required for owner login");
scripts\handover-staging-validation-utils.mjs:59:  if (response.status !== 200) throw new Error(`owner login failed ${response.status}`);
scripts\db-local-reset.mjs:8:  throw new Error(`Local D1 reset failed for ${persistTo}: ${cleanup.errorCode}`);
scripts\db-local-reset.mjs:11:  console.warn(`WARNING moved locked local D1 directory to ${cleanup.movedTo}`);
scripts\gate-tenant-scope-dashboard-history-query.mjs:155:    console.error(`TENANT_SCOPE_DASHBOARD_HISTORY_QUERY_GATE=BLOCKED: ${error?.message || error}`);
modules\employees\handover-atomic-contract.mjs:7:    throw new Error(`${label} is required.`);
modules\employees\handover-atomic-contract.mjs:14:    throw new Error("handover rows are required.");
modules\employees\handover-atomic-contract.mjs:17:    throw new Error(`handover rows exceed limit ${MAX_HANDOVER_ROWS}.`);
modules\employees\handover-atomic-contract.mjs:21:      throw new Error(`handover row ${index + 1} must be an object.`);
scripts\db-local-bootstrap.mjs:13:  throw new Error(`Local D1 bootstrap reset failed for ${persistTo}: ${cleanup.errorCode}`);
scripts\db-local-bootstrap.mjs:16:  console.warn(`WARNING moved locked local D1 directory to ${cleanup.movedTo}`);
scripts\gate-tenant-scope-backfill-reconciliation.mjs:170:    console.error(`TENANT_SCOPE_BACKFILL_RECONCILIATION_GATE=BLOCKED: ${error?.message || error}`);
modules\employees\entry-draft.mjs:11:    throw new Error(`${label} is required.`);
modules\employees\entry-draft.mjs:19:    throw new Error(`Unsupported employee entry event for rent draft: ${value}`);
modules\employees\entry-draft.mjs:25:  if (!remarkBed) throw new Error("TTLock remark bed anchor is required for rent entry.");
modules\employees\entry-draft.mjs:27:    throw new Error(`Input bed ${inputBed} does not match TTLock remark bed ${remarkBed}.`);
modules\employees\entry-draft.mjs:36:  throw new Error(`Unsupported settlement status: ${settlementStatus}`);
modules\employees\entry-draft.mjs:56:    throw new Error(`TTLock remark is excluded from rent flow: ${remark.exclusionReason}`);
scripts\qa-employee-entry-real-staging.mjs:192:    throw new Error("Unable to confirm staging D1 target.");
scripts\qa-employee-entry-real-staging.mjs:209:    throw new Error(`D1 SELECT failed for staging database. Exit ${result.code}`);
scripts\qa-employee-entry-real-staging.mjs:267:    throw new Error("Missing employee staging credential material.");
scripts\qa-employee-entry-real-staging.mjs:272:  if (response.status !== 200) throw new Error(`employee login failed ${response.status}`);
scripts\qa-employee-entry-real-staging.mjs:278:  if (!password) throw new Error("Missing owner staging credential material.");
scripts\qa-employee-entry-real-staging.mjs:283:  if (response.status !== 200) throw new Error(`owner login failed ${response.status}`);
scripts\qa-employee-entry-real-staging.mjs:508:    throw new Error("Staging D1 target mismatch; refusing real staging QA.");
scripts\qa-employee-entry-real-staging.mjs:511:    throw new Error("Staging Worker URL mismatch; refusing real staging QA.");
scripts\qa-employee-entry-real-staging.mjs:514:    throw new Error("Staging URL guard matched production pattern; refusing real staging QA.");
scripts\qa-employee-entry-real-staging.mjs:519:    throw new Error("Secret material target worker mismatch.");
scripts\qa-employee-entry-real-staging.mjs:522:    throw new Error("Secret material target D1 mismatch.");
scripts\qa-employee-entry-real-staging.mjs:895:  console.error(`EMPLOYEE_ENTRY_STAGING_QA=BLOCKED: ${error?.message || error}`);
modules\finance\dubai-business-date.mjs:13:    throw new Error(`${label} must use YYYY-MM-DD.`);
modules\finance\dubai-business-date.mjs:22:    throw new Error(`${label} is not a valid calendar date.`);
modules\finance\dubai-business-date.mjs:34:  if (Number.isNaN(date.getTime())) throw new Error("instant must be a valid date.");
deploy-worker/src\index.embedded.js:58:  if (!secret) throw new Error("jwt_secret_missing");
deploy-worker/src\index.embedded.js:71:    throw new Error("jwt_secret_missing");
deploy-worker/src\index.embedded.js:74:    throw new Error("malformed_token");
deploy-worker/src\index.embedded.js:77:  if (parts.length !== 3) throw new Error("malformed_token");
deploy-worker/src\index.embedded.js:82:    throw new Error("malformed_token");
deploy-worker/src\index.embedded.js:85:    throw new Error("malformed_token");
deploy-worker/src\index.embedded.js:95:  if (!isValid) throw new Error("invalid_signature");
deploy-worker/src\index.embedded.js:100:    throw new Error("malformed_token");
deploy-worker/src\index.embedded.js:103:    throw new Error("token_expired");
deploy-worker/src\index.embedded.js:106:    throw new Error("malformed_token");
deploy-worker/src\index.embedded.js:220:    return { error: "unauthenticated", status: 401 };
deploy-worker/src\index.embedded.js:226:    return { error: e.message, status: 401 };
deploy-worker/src\index.embedded.js:229:    return { error: "session_required", status: 401 };
deploy-worker/src\index.embedded.js:255:    if (!active) return { error: "session_revoked", status: 401 };
deploy-worker/src\index.embedded.js:257:    return { error: "session_check_failed", status: 401 };
deploy-worker/src\index.embedded.js:260:    return { error: "forbidden", status: 403 };
deploy-worker/src\index.embedded.js:304:      return forbidden("invalid_origin");
deploy-worker/src\index.embedded.js:307:  return forbidden("missing_origin");
deploy-worker/src\index.embedded.js:397:  if (!allowed) return forbidden("invalid_origin");
deploy-worker/src\index.embedded.js:692:  if (!secret) throw new Error("encryption_key_missing");
deploy-worker/src\index.embedded.js:770:    console.warn("[audit]", action, e?.message || e);
deploy-worker/src\index.embedded.js:903:  if (text.startsWith("<")) throw new Error("upstream_html_response");
deploy-worker/src\index.embedded.js:913:    throw new Error(`upstream_invalid_json:${source}`);
deploy-worker/src\index.embedded.js:915:  if (!response.ok) throw new Error(data?.errmsg || data?.message || `upstream_${response.status}`);
deploy-worker/src\index.embedded.js:1419:  if(!requireManager(user))return forbidden();
deploy-worker/src\index.embedded.js:1852:    if(!isManager&&!fallback&&!isLockDue)return forbidden();
deploy-worker/src\index.embedded.js:1938:    if(!requireManager(user))return forbidden();
deploy-worker/src\index.embedded.js:2021:    throw new Error(`${field} exceeds safe integer range.`);
deploy-worker/src\index.embedded.js:2534:      if (auth.status === 403) return forbidden();
deploy-worker/src\index.embedded.js:2550:      return forbidden();
deploy-worker/src\index.embedded.js:2553:      if (!requireManager(user)) return forbidden();
deploy-worker/src\index.embedded.js:2574:      if (!requireManager(user)) return forbidden();
deploy-worker/src\index.embedded.js:2585:      if (!requireManager(user)) return forbidden();
deploy-worker/src\index.embedded.js:2622:      if (!requireManager(user)) return forbidden();
deploy-worker/src\index.embedded.js:2748:      if (!requireManager(user)) return forbidden();
deploy-worker/src\index.embedded.js:2782:      if (!requireManager(user)) return forbidden();
deploy-worker/src\index.embedded.js:2883:      if (!requireManager(user)) return forbidden();
deploy-worker/src\index.embedded.js:2982:      if (!requireManager(user)) return forbidden();
scripts\probe-clean-worker-bootstrap.mjs:29:  throw new Error(`Worker did not become ready on ${baseUrl}: ${lastError}`);
scripts\probe-clean-worker-bootstrap.mjs:124:    console.error("Worker log tail:");
scripts\probe-clean-worker-bootstrap.mjs:125:    console.error(sanitizeLog(workerLog));
scripts\probe-clean-worker-bootstrap.mjs:126:    console.error("P0 confirmed: clean local Worker bootstrap cannot complete employee entry.");
scripts\money-shadow-reconcile.mjs:18:  if (!first?.success) throw new Error(`D1 query failed: ${output}`);
scripts\money-shadow-reconcile.mjs:223:    console.error(error.stack || error.message);
modules\employees\rent-write-plan.mjs:5:    throw new Error(`${label} is required.`);
modules\employees\rent-write-plan.mjs:62:      if (!id) throw new Error("Not enough audit event ids supplied.");
modules\employees\rent-write-plan.mjs:71:  if (paidFils <= 0) throw new Error("Rent write plan requires a positive payment amount.");
modules\employees\rent-write-plan.mjs:143:    if (!ids.arrearTaskId) throw new Error("arrearTaskId is required for partial rent payment.");
modules\employees\rent-write-plan.mjs:211:    throw new Error("Too many audit event ids supplied.");
scripts\compare-staging-backend-totals.mjs:396:    throw new Error(
scripts\compare-staging-backend-totals.mjs:402:    throw new Error("D1 target mismatch; refusing staging backend totals comparison.");
scripts\compare-staging-backend-totals.mjs:418:    throw new Error(`Read-only staging D1 SELECT failed with exit code ${result.code}.`);
scripts\compare-staging-backend-totals.mjs:745:      console.error(`STAGING_BACKEND_TOTALS_COMPARISON=BLOCKED: ${error?.message || error}`);
modules\employees\idempotency.mjs:5:    throw new Error(`${label} is required for idempotency.`);
scripts\rehearse-backend-totals-authority.mjs:236:    console.warn(`WARNING rehearsal temp D1 cleanup ${cleanup.errorCode || "UNKNOWN"}`);
scripts\compare-employee-entry-legacy-vs-adapter.mjs:238:  console.error(error?.stack || error?.message || error);
scripts\db-local-bootstrap-utils.mjs:36:    throw new Error(
scripts\db-local-bootstrap-utils.mjs:42:    throw new Error(`Refusing to target broad local root directly: ${resolved}`);
scripts\db-local-bootstrap-utils.mjs:49:    throw new Error(`Wrangler binary not found at ${wranglerBin}. Run npm install first.`);
scripts\db-local-bootstrap-utils.mjs:52:    throw new Error("Remote D1 operations are forbidden in local bootstrap scripts.");
scripts\db-local-bootstrap-utils.mjs:65:      console.warn(
scripts\db-local-bootstrap-utils.mjs:100:  if (!files.length) throw new Error(`No local migration files found in ${localMigrationDir}`);
scripts\compare-staging-tenant-scope-shadow.mjs:69:    throw new Error(`Unable to confirm staging D1 target. Exit ${result.code}.`);
scripts\compare-staging-tenant-scope-shadow.mjs:73:    throw new Error("D1 target mismatch; refusing tenant scope staging shadow gate.");
scripts\compare-staging-tenant-scope-shadow.mjs:89:    throw new Error(`Read-only staging D1 SELECT failed with exit code ${result.code}.`);
scripts\compare-staging-tenant-scope-shadow.mjs:260:    console.error(`TENANT_SCOPE_STAGING_SHADOW_GATE=BLOCKED: ${error?.message || error}`);
scripts\compare-staging-receivables-shadow.mjs:861:    console.error(`STAGING_RECEIVABLES_SHADOW_COMPARISON=BLOCKED: ${error?.message || error}`);
scripts\reconcile-legacy-dry-run.mjs:75:      if (!value || value.startsWith("--")) throw new Error(`Missing value for ${arg}`);
scripts\reconcile-legacy-dry-run.mjs:89:      throw new Error(`${arg} is forbidden for legacy reconciliation dry-run.`);
scripts\reconcile-legacy-dry-run.mjs:91:      throw new Error(`Unknown argument: ${arg}`);
scripts\reconcile-legacy-dry-run.mjs:95:  if (!args.persistTo) throw new Error("Missing required --persist-to <local D1 state directory>.");
scripts\reconcile-legacy-dry-run.mjs:123:  if (!starts.length) throw new Error(`Wrangler output did not contain JSON: ${text}`);
scripts\reconcile-legacy-dry-run.mjs:129:  if (!/^[A-Za-z0-9_]+$/.test(identifier)) throw new Error(`Unsafe SQL identifier: ${identifier}`);
scripts\rehearse-backend-totals-staging-switch.mjs:50:    throw new Error("Commercial launch gate is not PRODUCTION_NO_GO.");
scripts\rehearse-backend-totals-staging-switch.mjs:82:    throw new Error("Staging D1 target mismatch; refusing backend totals switch rehearsal.");
scripts\rehearse-backend-totals-staging-switch.mjs:175:      console.error(`BACKEND_TOTALS_STAGING_SWITCH_REHEARSAL=BLOCKED: ${error?.message || error}`);
... [truncated 127 more lines]
```


## 9. Build And Deployment Process


### 9.1 Deploy / Build Script References

Command: `rg -n "wrangler deploy|--dry-run|deploy|build:worker|verify:embedded|audit:worker-drift|gate:commercial-launch" package.json .github deploy-worker scripts --glob "*.{json,yml,yaml,mjs,js,toml}"`


```text
package.json:7:    "build": "npm run build:worker:assets && npm run build:worker:embedded",
package.json:8:    "build:worker:assets": "cd deploy-worker && wrangler deploy --config wrangler.toml --dry-run --outdir ../.wrangler-dryrun/assets",
package.json:9:    "build:worker:embedded": "cd deploy-worker && wrangler deploy --config wrangler.embedded.toml --dry-run --outdir ../.wrangler-dryrun/embedded",
package.json:10:    "lint": "eslint deploy-worker/src/index.js deploy-worker/scripts/**/*.js index-51-main.js",
package.json:21:    "audit:worker-drift": "node scripts/audit-worker-entrypoint-drift.mjs",
package.json:26:    "gate:commercial-launch": "node scripts/gate-commercial-launch-readiness.mjs",
package.json:27:    "verify:embedded-worker": "node scripts/verify-embedded-worker-freshness.mjs",
scripts\audit-db-table-readiness.mjs:25:  path.join(root, "deploy-worker", "src", "index.js"),
scripts\audit-db-table-readiness.mjs:137:  ).test(sources.get("deploy-worker/src/index.js") || "");
scripts\audit-db-table-readiness.mjs:201:  "Scope: static table-by-table commercial readiness audit. This script is read-only and does not connect to D1, deploy, or run migrations.",
scripts\audit-db-table-readiness.mjs:255:  "No production deploy, migration, remote D1 access, or secret access was performed."
scripts\audit-backend-totals.mjs:11:  "deploy-worker/src/index.js",
scripts\audit-backend-totals.mjs:12:  "deploy-worker/public/employee-v3.html",
scripts\audit-backend-totals.mjs:58:  if (/deploy-worker\/src\/index\.js$/.test(relative)) return "Worker backend";
scripts\audit-audit-log-coverage.mjs:7:const workerPath = path.resolve("deploy-worker/src/index.js");
scripts\audit-audit-log-coverage.mjs:104:  "Scope: static audit coverage review for API mutations and financial routes. This script is read-only and does not call APIs, deploy, migrate, or write D1.",
scripts\audit-audit-log-coverage.mjs:150:  "No production deploy, migration, remote D1 access, or secret access was performed."
scripts\audit-api.mjs:6:const workerPath = path.join(root, "deploy-worker", "src", "index.js");
scripts\audit-api.mjs:683:    "Source: generated from `deploy-worker/src/index.js` by `scripts/audit-api.mjs`",
scripts\audit-api-permissions.mjs:7:const workerPath = path.resolve("deploy-worker/src/index.js");
scripts\audit-api-permissions.mjs:113:    warnings.push("tenant scope remains deployment corpid based");
scripts\audit-api-permissions.mjs:148:  "Scope: static API-by-API permission audit. This script is read-only and does not call APIs, deploy, migrate, or modify Worker routes.",
scripts\audit-api-permissions.mjs:199:  "No production deploy, migration, remote D1 access, or secret access was performed."
scripts\audit-legacy-backfill.mjs:6:  "deploy-worker/src/index.js",
scripts\audit-rollback-readiness.mjs:67:    requiredTerms: ["rollback", "dry-run", "deploy"],
scripts\audit-rollback-readiness.mjs:91:    area: "Production deployment",
scripts\audit-rollback-readiness.mjs:141:  "Scope: static rollback/readiness audit. This script reads reports only and does not deploy, migrate, call APIs, or access D1.",
scripts\audit-rollback-readiness.mjs:179:  "No production deploy, staging deploy, D1 migration, remote D1 access, or secret access was performed."
deploy-worker\src\index.js:2419:    production_deploy:false,
scripts\audit-environment-separation.mjs:20:const source = read("deploy-worker/wrangler.toml");
scripts\audit-environment-separation.mjs:21:const embedded = read("deploy-worker/wrangler.embedded.toml");
scripts\audit-environment-separation.mjs:34:    evidence: "deploy-worker/wrangler.toml",
scripts\audit-environment-separation.mjs:40:    evidence: "deploy-worker/wrangler.embedded.toml",
scripts\audit-environment-separation.mjs:47:    notes: "same Worker name requires human deploy-entrypoint discipline"
scripts\audit-environment-separation.mjs:68:    check: "dry-run deploy scripts",
scripts\audit-environment-separation.mjs:69:    result: read("package.json").includes("--dry-run") ? "PASS" : "WARNING",
scripts\audit-environment-separation.mjs:98:  "This audit is read-only and does not modify Wrangler config or deploy."
scripts\audit-observability-readiness.mjs:5:const sourcePath = path.resolve("deploy-worker/src/index.js");
scripts\audit-db.mjs:10:  path.join(root, "deploy-worker", "src", "index.js"),
scripts\audit-db.mjs:46:  const isWorker = rel(file) === "deploy-worker/src/index.js";
scripts\audit-money-live-write-paths.mjs:10:const workerPath = path.join(rootDir, "deploy-worker", "src", "index.js");
scripts\audit-money-fields.mjs:10:  "deploy-worker",
scripts\audit-money-fields.mjs:44:  if (/^deploy-worker\/src\//.test(relative)) return "Worker backend";
scripts\audit-money-fields.mjs:45:  if (/^deploy-worker\/public\//.test(relative) || /^(employee|index-51)/.test(relative)) {
scripts\compare-staging-receivables-shadow.mjs:807:    "Scope: read-only staging receivables shadow comparison. This script does not deploy, migrate, write D1 rows, mutate dashboard output, or enable feature flags.",
scripts\compare-staging-receivables-shadow.mjs:832:    "- Production deploy: no.",
scripts\check-secrets.mjs:20:  "deploy-worker/.dev.vars"
scripts\compare-staging-backend-totals.mjs:701:    "Scope: read-only staging D1 comparison. This script does not deploy, migrate, write D1 rows, mutate API responses, or change dashboard output.",
scripts\compare-staging-backend-totals.mjs:718:    "- Production deploy: no.",
scripts\compare-employee-entry-legacy-vs-adapter.mjs:217:Scope: P0-001K local-only comparison. This command uses disposable local D1 Workers only. It does not execute production deploy, staging deploy, production D1 migration, remote D1 migration, production config changes, or secret writes.
scripts\audit-worker-entrypoint-drift.mjs:7:const sourcePath = path.join(root, "deploy-worker", "src", "index.js");
scripts\audit-worker-entrypoint-drift.mjs:8:const embeddedPath = path.join(root, "deploy-worker", "src", "index.embedded.js");
scripts\audit-worker-entrypoint-drift.mjs:40:      "Embedded deploy path must not be used for staging handover validation unless this route is present."
scripts\audit-worker-entrypoint-drift.mjs:47:      "Feature-flag guard must match source before any staging endpoint can be deployed through embedded artifact."
scripts\audit-worker-entrypoint-drift.mjs:53:    recommendation: "Production-disabled behavior must exist in any deployable artifact."
scripts\audit-worker-entrypoint-drift.mjs:66:    recommendation: "Audit evidence paths must exist in the deployed artifact."
scripts\audit-worker-entrypoint-drift.mjs:91:    recommendation: "History route drift can make owner history validation differ from deployment."
scripts\audit-worker-entrypoint-drift.mjs:97:    recommendation: "Owner auth route drift blocks credible deployment validation."
scripts\audit-worker-entrypoint-drift.mjs:152:        : "Regenerate or review embedded artifact before deploy through embedded config."
scripts\audit-worker-entrypoint-drift.mjs:181:    "Scope: P1-006 controlled embedded Worker drift review. This script is read-only and does not overwrite deploy artifacts.",
scripts\audit-worker-entrypoint-drift.mjs:205:    `- Staging deploy using embedded artifact: ${stagingRouteMissing ? "NO-GO" : "Needs entrypoint confirmation"}`,
scripts\audit-worker-entrypoint-drift.mjs:206:    `- Production deploy using embedded artifact: ${criticalMismatches.length ? "NO-GO until drift is resolved or embedded is proven unused" : "Needs standard deploy gate"}`,
scripts\audit-worker-entrypoint-drift.mjs:207:    "- Source `wrangler.toml` path remains the local verification target; embedded deploy path needs separate approval.",
scripts\audit-worker-entrypoint-drift.mjs:211:    "1. Do not deploy through `wrangler.embedded.toml` while critical mismatches remain.",
scripts\audit-worker-entrypoint-drift.mjs:212:    "2. Keep local/staging validation on `deploy-worker/src/index.js` unless a controlled embedded write is approved.",
scripts\audit-worker-entrypoint-drift.mjs:213:    "3. Run `npm run verify:embedded-worker` and `npm run build:embedded:dry-run` before any deploy-prep decision.",
scripts\audit-worker-entrypoint-drift.mjs:214:    "4. Treat this as a deployment-artifact gate, not as production deployment approval.",
scripts\check-syntax.mjs:6:  "deploy-worker/src/index.js",
scripts\check-syntax.mjs:7:  "deploy-worker/scripts/build-embedded-worker.js",
scripts\check-syntax.mjs:16:  { dir: "deploy-worker/src", extensions: new Set([".js"]) },
scripts\check-syntax.mjs:17:  { dir: "deploy-worker/scripts", extensions: new Set([".js"]) }
scripts\audit-runtime-ddl.mjs:9:  path.join(root, "deploy-worker", "src", "index.js"),
scripts\audit-runtime-ddl.mjs:10:  path.join(root, "deploy-worker", "src", "index.embedded.js")
scripts\audit-runtime-ddl.mjs:78:    "Production deploy executed: no.",
scripts\compare-staging-tenant-scope-shadow.mjs:214:    "Scope: read-only staging/local tenant scope shadow gate. This script confirms the staging D1 target, reads table schema/counts with SELECT only, runs local cross-tenant fixture evidence, and does not deploy, migrate, write D1 rows, call production, mutate dashboard output, or change auth behavior.",
scripts\compare-staging-tenant-scope-shadow.mjs:231:    "- Production deploy: no.",
scripts\gate-commercial-launch-readiness.mjs:172:  "Scope: read-only commercial launch gate. This script reads reports only and does not deploy, migrate, call APIs, access D1, or read secrets.",
scripts\gate-commercial-launch-readiness.mjs:186:  "- This matrix is not deployment approval."
scripts\gate-commercial-launch-readiness.mjs:206:  "Forbidden next work without human approval: production deploy, staging deploy, remote/production D1 migration, production feature flag enablement, and live accounting authority switch."
scripts\dry-run-tenant-scope-staging-backfill.mjs:223:    "Scope: read-only staging tenant scope backfill dry-run. This script confirms the staging D1 target, reads table schema/counts with SELECT only, generates draft update-plan classifications, and does not deploy, migrate, write D1 rows, call production, mutate dashboard/history output, or remove legacy CORPID fallback.",
scripts\dry-run-tenant-scope-staging-backfill.mjs:260:    "- Production deploy: no.",
scripts\gate-receivables-staging-authority-switch.mjs:256:          "& 'npm' 'run' 'gate:commercial-launch'"
scripts\gate-receivables-staging-authority-switch.mjs:258:      : await runProcess("npm", ["run", "gate:commercial-launch"]);
scripts\gate-receivables-staging-authority-switch.mjs:282:    "Scope: staging/local-only gate for a future receivables dashboard authority switch. This script does not deploy, migrate, write D1 rows, mutate dashboard output, call production, or enable remote feature flags.",
scripts\gate-receivables-staging-authority-switch.mjs:310:    "- Production deploy: no.",
scripts\gate-runtime-ddl-removal.mjs:29:  .filter((line) => line.startsWith("| `") || line.startsWith("| deploy-worker"));
scripts\gate-tenant-scope-dashboard-history-query.mjs:97:    "Scope: staging/local-only dashboard and history query gate using static fixtures. This script does not deploy, migrate, read or write D1, call production, mutate dashboard/history output, change auth behavior, or remove legacy CORPID fallback.",
scripts\gate-tenant-scope-dashboard-history-query.mjs:122:    "- Production deploy: no.",
scripts\gate-tenant-scope-backfill-reconciliation.mjs:110:    "Scope: staging/local-only tenant scope backfill reconciliation using static fixtures. This script does not deploy, migrate, read or write D1, call production, mutate dashboard/history output, change auth behavior, or remove legacy CORPID fallback.",
scripts\gate-tenant-scope-backfill-reconciliation.mjs:136:    "- Production deploy: no.",
scripts\gate-tenant-scope-staging-wiring-readiness.mjs:168:      Notes: "Production deployment, migration, D1 write, and cutover remain forbidden."
scripts\gate-tenant-scope-staging-wiring-readiness.mjs:201:    "Scope: staging/local-only tenant scope route and dashboard/history query wiring readiness. This script uses static fixtures and existing gate helpers only. It does not deploy, migrate, read or write D1, call production, mutate dashboard/history output, change auth behavior, or remove legacy CORPID fallback.",
scripts\gate-tenant-scope-staging-wiring-readiness.mjs:227:    "- Production deploy: no.",
scripts\gate-tenant-scope-readiness.mjs:5:const sourcePath = path.resolve("deploy-worker/src/index.js");
scripts\gate-tenant-scope-staging-route-enforcement.mjs:181:    "Scope: staging/local-only tenant scope route enforcement gate using static fixtures. This script does not deploy, migrate, read or write D1, call production, mutate dashboard/history output, change auth behavior, or remove legacy CORPID fallback.",
scripts\gate-tenant-scope-staging-route-enforcement.mjs:205:    "- Production deploy: no.",
scripts\generate-embedded-worker-dry-run.mjs:7:const workerRoot = path.join(root, "deploy-worker");
scripts\generate-embedded-worker-dry-run.mjs:48:// Source: deploy-worker/src/index.js
scripts\generate-embedded-worker-dry-run.mjs:119:    "Scope: P1-006 dry-run generation. This script writes only to `.tmp/embedded-worker-dry-run/` and does not overwrite `deploy-worker/src/index.embedded.js`.",
scripts\generate-embedded-worker-dry-run.mjs:155:    "- This dry-run is not a deployment.",
scripts\local-worker-utils.mjs:9:export const workerDir = path.join(rootDir, "deploy-worker");
scripts\local-worker-utils.mjs:40:      `Local dev secrets file missing: ${envPath}. Run npm run dev:secrets or copy deploy-worker/.dev.vars.example.`
scripts\manual-handover-staging-validation.mjs:245:The script logs in with local dev credentials from \`deploy-worker/.dev.vars\` but does not print actual cookies or secrets. Replace \`<EMPLOYEE_COOKIE>\` with a manually obtained local employee session cookie when using the commands below.
scripts\probe-clean-worker-bootstrap.mjs:10:const workerDir = path.join(rootDir, "deploy-worker");
scripts\probe-clean-worker-bootstrap.mjs:101:      SMOKE_ENV_FILE: "deploy-worker/.dev.vars"
deploy-worker\src\index.embedded.js:3:// Source: deploy-worker/src/index.js
deploy-worker\src\index.embedded.js:2402:    production_deploy:false,
scripts\qa-employee-entry-real-staging.mjs:39:  const wrangler = readTextIfExists("deploy-worker/wrangler.toml");
scripts\qa-employee-entry-real-staging.mjs:95:    "This script does not deploy, migrate, or write staging data unless all explicit confirmations are supplied."
scripts\reconcile-legacy-dry-run.mjs:8:const workerDir = path.join(rootDir, "deploy-worker");
scripts\rehearse-backend-totals-authority.mjs:209:Scope: P0-003B local-only rehearsal. No production D1, remote D1, production Worker deploy, live dashboard output, or employee handover production path was changed.
scripts\rehearse-backend-totals-staging-switch.mjs:45:  const result = await runCommand("npm", ["run", "gate:commercial-launch"]);
scripts\rehearse-backend-totals-staging-switch.mjs:120:    "Scope: staging/local rehearsal only. This script does not deploy, migrate, change remote feature flags, write D1 rows, mutate API responses, or change dashboard output.",
scripts\rehearse-backend-totals-staging-switch.mjs:147:    "- Production deploy: no.",
scripts\rehearse-employee-entry-adapter-staging-endpoint.mjs:234:Scope: local/staging-only endpoint rehearsal for \`${endpoint}\`. This did not execute production or remote D1 migration, did not deploy, did not switch \`/api/employee/entry\`, did not change dashboard output, and did not write legacy live financial tables.
scripts\rehearse-employee-entry-adapter-staging-endpoint.mjs:247:| Production deploy executed | no |
scripts\rehearse-employee-entry-live-write-adapter.mjs:200:Scope: local/staging-only rehearsal. This run used an isolated local D1 directory for evidence only. The adapter generated write plans and \`*_fils\` patches, but it did not write D1, did not execute production migration, did not execute remote D1 migration, did not deploy, did not switch live dashboard results, and did not switch the live employee handover flow.
scripts\rehearse-employee-entry-rollback.mjs:109:Scope: P0-001K local-only rollback drill. This command uses disposable local D1 Workers only. It does not deploy, run production or remote migrations, change production config, or write secrets.
scripts\rehearse-employee-entry-route-switch.mjs:35:This rehearsal did not execute production deployment, staging deployment, production D1 migration, remote D1 migration, production config changes, or secret writes. It did not delete the legacy route or legacy fields.
scripts\rehearse-employee-entry-route-switch.mjs:86:| No production deploy | PASS | Script only runs local Worker tests. |
scripts\rehearse-employee-entry-route-switch.mjs:116:- No production deployment.
scripts\rehearse-handover-atomic-commit.mjs:190:Scope: P0-002B local-only rehearsal. No production D1, remote D1, production Worker deploy, live employee handover route, live dashboard result, or live financial formula was changed.
scripts\rehearse-handover-staging-endpoint.mjs:250:Scope: P0-002C local/staging-only endpoint rehearsal. No production D1, remote D1, production Worker deploy, live employee handover switch, live dashboard change, or live financial formula change was performed.
scripts\rehearse-money-dual-write-local-staging.mjs:331:Scope: local/staging-only rehearsal. This run used an isolated local D1 directory and did not execute production migration, remote D1 migration, staging deploy, production deploy, live dashboard switch, live handover switch, or legacy field deletion.
scripts\rehearse-migration.mjs:9:const workerDir = path.join(rootDir, "deploy-worker");
scripts\rehearse-receivables-local-staging.mjs:213:    "Scope: local/staging dry-run receivables rehearsal. This script does not deploy, migrate, write production D1, write staging D1 by default, or change dashboard responses.",
scripts\rehearse-receivables-local-staging.mjs:231:    "- Production deploy: no.",
scripts\rehearse-rent-write-plan.mjs:13:const workerDir = path.join(rootDir, "deploy-worker");
scripts\rehearse-tenant-scope-access-matrix.mjs:551:    "Scope: staging/local-only access matrix gate using deterministic claims and resource fixtures. This script does not deploy, migrate, read or write D1, call production, mutate dashboard/history output, remove legacy CORPID fallback, or print secrets.",
scripts\rehearse-tenant-scope-access-matrix.mjs:585:    "- Production deploy: no.",
scripts\rehearse-tenant-scope-access-matrix.mjs:600:    "- Production migration, production deploy, production backfill, live auth wiring, and production cutover remain unapproved.",
scripts\rehearse-receivables-staging-authority-switch.mjs:48:  const result = await runCommand("npm", ["run", "gate:commercial-launch"]);
scripts\rehearse-receivables-staging-authority-switch.mjs:148:    "Scope: staging/local-only authority switch rehearsal. This script does not deploy, migrate, write D1 rows, call production, mutate live dashboard output, or enable remote feature flags.",
scripts\rehearse-receivables-staging-authority-switch.mjs:182:    "- Production deploy: no.",
scripts\rehearse-tenant-scope-audit-entry-events.mjs:726:    "Scope: staging/local audit/event scope rehearsal. The script uses read-only staging D1 schema/count queries plus deterministic access-policy fixtures. It does not deploy, migrate, write D1, call production, mutate dashboard/history output, remove legacy CORPID fallback, or print secrets.",
scripts\rehearse-tenant-scope-audit-entry-events.mjs:771:    "- Production deploy: no.",
scripts\rehearse-tenant-scope-audit-entry-events.mjs:785:    "- Production migration, production deploy, production backfill, live auth wiring, and production cutover remain unapproved.",
scripts\rehearse-tenant-scope-auth-claims.mjs:226:    "Scope: staging/local-only auth claim contract rehearsal. This script does not deploy, migrate, read or write D1, call production, mutate dashboard/history output, change live auth behavior, remove legacy CORPID fallback, or print secrets.",
scripts\rehearse-tenant-scope-auth-claims.mjs:240:    "- Production deploy: no.",
scripts\rehearse-tenant-scope-auth-claim-staging.mjs:422:    "Scope: staging/local-only auth claim rehearsal using deterministic test claims and route/query policy helpers. This script does not deploy, migrate, read or write D1, call production, mutate dashboard/history output, remove legacy CORPID fallback, or print secrets.",
scripts\rehearse-tenant-scope-auth-claim-staging.mjs:452:    "- Production deploy: no.",
scripts\rehearse-tenant-scope-auth-claim-staging.mjs:467:    "- Production migration, production deploy, production backfill, and production cutover remain unapproved.",
scripts\rehearse-tenant-scope-local-staging.mjs:115:    "Scope: local/staging-only tenant/property scope rehearsal using static fixtures. This script does not deploy, migrate, read or write D1, call production, mutate dashboard output, or change auth behavior.",
scripts\rehearse-tenant-scope-local-staging.mjs:138:    "- Production deploy: no.",
scripts\rehearse-tenant-scope-staging-access-matrix.mjs:83:    "Scope: staging/local-only access matrix rehearsal using deterministic test claims and resource fixtures. This script does not deploy, migrate, read or write D1, call production, mutate dashboard/history output, remove legacy CORPID fallback, or print secrets.",
scripts\rehearse-tenant-scope-staging-access-matrix.mjs:132:    "- Production deploy: no.",
scripts\rehearse-tenant-scope-staging-access-matrix.mjs:147:    "- Production migration, production deploy, production backfill, live auth wiring, and production cutover remain unapproved.",
scripts\rehearse-tenant-scope-staging-wiring.mjs:219:    "- Production deploy: no.",
scripts\rehearse-tenant-scope-staging-wiring.mjs:378:      "- This rehearsal did not deploy production.",
scripts\seed-receivables-staging-shadow-data.mjs:87:          `& ${["npm", "run", "gate:commercial-launch"].map(psQuote).join(" ")}`
scripts\seed-receivables-staging-shadow-data.mjs:89:      : await runProcess("npm", ["run", "gate:commercial-launch"]);
scripts\seed-receivables-staging-shadow-data.mjs:330:    "- Production deploy: no.",
scripts\reproduce-employee-entry-econnreset.mjs:87:  "Scope: local Worker ECONNRESET reproduction only. No deploy, no migration, no staging D1 write, and no feature flag change was executed.",
scripts\set-staging-secrets-from-local.mjs:62:            "& 'npx' 'wrangler' 'secret' 'bulk' '--env' 'staging' '--config' 'deploy-worker/wrangler.toml'"
scripts\set-staging-secrets-from-local.mjs:71:            "deploy-worker/wrangler.toml"
scripts\set-staging-secrets-from-local.mjs:157:  `Command: \`npx wrangler secret bulk --env staging --config deploy-worker/wrangler.toml\``,
scripts\set-staging-secrets-from-local.mjs:168:  "Production deploy: no",
scripts\seed-tenant-audit-event-evidence.mjs:370:    "- Production deploy: no.",
scripts\smoke-embedded-with-worker.mjs:16:const workerDir = path.join(rootDir, "deploy-worker");
scripts\smoke-embedded-with-worker.mjs:208:    "Scope: local-only P1-006B smoke using `deploy-worker/wrangler.embedded.toml`. This is not a deploy and does not use remote D1.",
scripts\smoke-core-flows.mjs:4:const envPath = process.env.SMOKE_ENV_FILE || "deploy-worker/.dev.vars";
scripts\smoke-auth.mjs:4:const envPath = process.env.SMOKE_ENV_FILE || "deploy-worker/.dev.vars";
scripts\smoke-employee-auth.mjs:4:const envPath = process.env.SMOKE_ENV_FILE || "deploy-worker/.dev.vars";
scripts\smoke-owner-auth.mjs:4:const envPath = process.env.SMOKE_ENV_FILE || "deploy-worker/.dev.vars";
scripts\smoke-employee-entry.mjs:4:const envPath = process.env.SMOKE_ENV_FILE || "deploy-worker/.dev.vars";
scripts\verify-clean-d1.mjs:102:    SMOKE_ENV_FILE: "deploy-worker/.dev.vars",
scripts\triage-money-audit.mjs:10:  "deploy-worker",
scripts\triage-money-audit.mjs:86:  if (relative === "deploy-worker/src/index.js") return "Worker live backend";
scripts\triage-money-audit.mjs:87:  if (relative.startsWith("deploy-worker/src/")) return "Worker backend";
scripts\triage-money-audit.mjs:89:    relative.startsWith("deploy-worker/public/") ||
scripts\triage-money-audit.mjs:133:  if (relative === "deploy-worker/src/index.js" && kind !== "money keyword") {
scripts\triage-money-audit.mjs:137:    relative === "deploy-worker/src/index.js" &&
scripts\triage-money-audit.mjs:167:  const liveScore = item.file === "deploy-worker/src/index.js" ? 200 : 0;
scripts\verify-embedded-worker-freshness.mjs:7:const sourcePath = path.join(root, "deploy-worker", "src", "index.js");
scripts\verify-embedded-worker-freshness.mjs:8:const embeddedPath = path.join(root, "deploy-worker", "src", "index.embedded.js");
scripts\verify-embedded-worker-freshness.mjs:9:const sourceConfigPath = path.join(root, "deploy-worker", "wrangler.toml");
scripts\verify-embedded-worker-freshness.mjs:10:const embeddedConfigPath = path.join(root, "deploy-worker", "wrangler.embedded.toml");
scripts\verify-embedded-worker-freshness.mjs:85:    "Embedded artifact is referenced by a deployable Wrangler config and is missing source-critical behavior."
scripts\verify-embedded-worker-freshness.mjs:96:  notes.push("No embedded Wrangler config found; embedded deploy path may be legacy only.");
scripts\verify-embedded-worker-freshness.mjs:129:    "Scope: read-only P1-006 freshness gate. No deploy artifact was overwritten.",
scripts\verify-embedded-worker-freshness.mjs:160:    "- `WARNING`: artifact may be stale or lacks freshness metadata, but no confirmed deploy-blocking critical drift was proven.",
scripts\verify-embedded-worker-freshness.mjs:161:    "- `MANUAL_REQUIRED`: deploy entrypoint or artifact freshness needs human approval before staging/production deploy.",
scripts\verify-embedded-worker-freshness.mjs:162:    "- `FAIL`: a confirmed active deploy artifact is missing critical behavior.",
scripts\verify-embedded-worker-freshness.mjs:164:    "Current recommendation: do not deploy through the embedded config until controlled generation and human diff review are completed.",
scripts\write-embedded-worker-controlled.mjs:8:const sourcePath = path.join(root, "deploy-worker", "src", "index.js");
scripts\write-embedded-worker-controlled.mjs:9:const targetPath = path.join(root, "deploy-worker", "src", "index.embedded.js");
scripts\write-embedded-worker-controlled.mjs:105:    "Scope: P1-006B controlled write. This is not a staging or production deploy and does not run D1 migrations.",
scripts\write-embedded-worker-controlled.mjs:130:    `- Before commit: copy \`${path.relative(root, backupPath)}\` back to \`${path.relative(root, targetPath)}\`, or run \`git restore -- deploy-worker/src/index.embedded.js\`.`,
scripts\write-embedded-worker-controlled.mjs:135:    "- No Wrangler deploy command was executed.",
```


### 9.2 .env.example (No Secrets)

File: `.env.example`


```text
The example env file was intentionally summarized here instead of copied verbatim.
It contains local-only placeholders for app metadata, origin controls, auth key
names, password-hash placeholders, local smoke-test credentials, USER_ACCOUNTS,
and TTLock integration placeholders.

No real secret values are present in the repository audit report.
```


### 9.3 Environment Variable Access In Code

Command: `rg -n "env\.|process\.env|APP_ENV|USER_ACCOUNTS|CORPID|STAGING|PRODUCTION" deploy-worker/src modules scripts --glob "*.{js,mjs,ts}"`


```text
deploy-worker/src\index.js:239:    payload = await verifyJWT(token, env.JWT_SECRET);
deploy-worker/src\index.js:243:  if (!payload.sid || !env.DB) {
deploy-worker/src\index.js:247:    await env.DB.prepare(
deploy-worker/src\index.js:260:    const active = await env.DB.prepare(
deploy-worker/src\index.js:290:  const explicit = String(env.ALLOWED_ORIGINS || "").split(",").map((v) => v.trim()).filter(Boolean);
deploy-worker/src\index.js:291:  const host = String(env.ALLOWED_HOST || "").trim();
deploy-worker/src\index.js:339:  const apiOrigin = String(env.CLOUD_API_ORIGIN || "https://homelink-finance.habibramadan888.workers.dev").trim();
deploy-worker/src\index.js:459:  if (!env.RATE_LIMIT) return null;
deploy-worker/src\index.js:461:  const current = Number(await env.RATE_LIMIT.get(key) || "0");
deploy-worker/src\index.js:463:  await env.RATE_LIMIT.put(key, String(current + 1), { expirationTtl: LOGIN_WINDOW_SECONDS });
deploy-worker/src\index.js:469:    await env.RATE_LIMIT?.delete(`login:${clientIp(request)}`);
deploy-worker/src\index.js:475:  await env.DB.prepare(
deploy-worker/src\index.js:494:  await env.DB.prepare(
deploy-worker/src\index.js:513:    const payload = await verifyJWT(token, env.JWT_SECRET, { skipSession: true });
deploy-worker/src\index.js:514:    if (!payload.sid || !env.DB) return;
deploy-worker/src\index.js:516:    await env.DB.prepare(
deploy-worker/src\index.js:524:  const raw = String(env.USER_ACCOUNTS || "").trim();
deploy-worker/src\index.js:542:  const salt = env.PW_SALT;
deploy-worker/src\index.js:548:  if (await verifyPassword(password, env.MANAGER_PW_HASH, salt)) return "manager";
deploy-worker/src\index.js:549:  if (await verifyPassword(password, env.STAFF_PW_HASH, salt)) return "staff";
deploy-worker/src\index.js:570:  const corpid = env.CORPID || "homelink";
deploy-worker/src\index.js:579:  }, env.JWT_SECRET);
deploy-worker/src\index.js:593:  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS employee_users (
deploy-worker/src\index.js:602:  const appEnv=String(env.APP_ENV||"").trim().toLowerCase();
deploy-worker/src\index.js:603:  const allowDevSeed=["1","true","yes","on"].includes(String(env.ALLOW_DEV_SEED||"").trim().toLowerCase());
deploy-worker/src\index.js:605:  const seedEmployeeId=cleanText(env.LOCAL_EMPLOYEE_ID||"abdul",80).toLowerCase();
deploy-worker/src\index.js:606:  const seedEmployeePin=String(env.LOCAL_EMPLOYEE_PIN||"");
deploy-worker/src\index.js:607:  const seedEmployeeName=cleanText(env.LOCAL_EMPLOYEE_NAME||seedEmployeeId,120)||seedEmployeeId;
deploy-worker/src\index.js:609:  const row=await env.DB.prepare("SELECT employee_id FROM employee_users WHERE lower(employee_id)=? LIMIT 1").bind(seedEmployeeId).first();
deploy-worker/src\index.js:611:    const salt=env.PW_SALT||env.JWT_SECRET||"homelink";
deploy-worker/src\index.js:613:    await env.DB.prepare(`INSERT OR REPLACE INTO employee_users
deploy-worker/src\index.js:629:  const row=await env.DB.prepare("SELECT * FROM employee_users WHERE lower(employee_id)=? AND status='ACTIVE' LIMIT 1").bind(employeeId).first();
deploy-worker/src\index.js:630:  const salt=env.PW_SALT||env.JWT_SECRET||"homelink";
deploy-worker/src\index.js:633:  const corpid=env.CORPID||"homelink";
deploy-worker/src\index.js:636:  const token=await signJWT({role:row.role||"staff",userid:row.employee_id,employee_name:row.employee_name,corpid,sid},env.JWT_SECRET,employeeTtl);
deploy-worker/src\index.js:707:  const secret = String(env.DATA_ENCRYPTION_KEY || env.JWT_SECRET || "").trim();
deploy-worker/src\index.js:761:    await env.DB.prepare(
deploy-worker/src\index.js:773:    await env.DB.prepare(
deploy-worker/src\index.js:947:  const apiOrigin = String(env.TTLOCK_API_ORIGIN || TTLOCK_API_ORIGIN).trim().replace(/\/+$/, "");
deploy-worker/src\index.js:948:  const clientId = String(env.TTLOCK_CLIENT_ID || "").trim();
deploy-worker/src\index.js:949:  const clientSecret = String(env.TTLOCK_CLIENT_SECRET || "").trim();
deploy-worker/src\index.js:950:  const username = String(env.TTLOCK_USERNAME || "").trim();
deploy-worker/src\index.js:951:  const password = String(env.TTLOCK_PASSWORD || "").trim();
deploy-worker/src\index.js:1064:  const r=await env.DB.prepare(`PRAGMA table_info(${table})`).all();
deploy-worker/src\index.js:1069:  const r=await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").bind(table).first();
deploy-worker/src\index.js:1076:  await env.DB.prepare(`ALTER TABLE ${table} ADD COLUMN ${col} ${ddl}`).run();
deploy-worker/src\index.js:1088:  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS sessions (
deploy-worker/src\index.js:1157:  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS arrear_tasks (
deploy-worker/src\index.js:1175:  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS entry_events (
deploy-worker/src\index.js:1188:  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS deposit_ledger (
deploy-worker/src\index.js:1221:  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_transactions_period ON transactions(corpid, period_start, period_end)").run().catch(()=>{});
deploy-worker/src\index.js:1222:  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_transactions_operator ON transactions(corpid, operator_id)").run().catch(()=>{});
deploy-worker/src\index.js:1223:  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_transactions_cid_period ON transactions(corpid, tenant_card_id, period_start, period_end)").run().catch(()=>{});
deploy-worker/src\index.js:1224:  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_arrear_tasks_status ON arrear_tasks(corpid, followup_status, promise_date)").run();
deploy-worker/src\index.js:1225:  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_arrear_tasks_cid_period ON arrear_tasks(corpid, tenant_card_id, original_period_start, original_period_end)").run().catch(()=>{});
deploy-worker/src\index.js:1226:  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_entry_events_ref ON entry_events(corpid, ref_type, ref_id, ts)").run();
deploy-worker/src\index.js:1227:  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_deposit_ledger_cid ON deposit_ledger(corpid, tenant_card_id, ts)").run();
deploy-worker/src\index.js:1295:  await env.DB.prepare(`INSERT OR REPLACE INTO ${table} (${names.join(",")}) VALUES (${names.map(()=>"?").join(",")})`).bind(...vals).run();
deploy-worker/src\index.js:1309:  const row=await env.DB.prepare("SELECT COALESCE(SUM(delta),0) AS balance FROM deposit_ledger WHERE corpid=? AND tenant_card_id=? AND COALESCE(voided_at,'')=''")
deploy-worker/src\index.js:1316:    const existing=await env.DB.prepare(`SELECT ledger_id,balance_after,delta FROM deposit_ledger
deploy-worker/src\index.js:1336:  const task=await env.DB.prepare(`SELECT * FROM arrear_tasks
deploy-worker/src\index.js:1340:  const paidRow=await env.DB.prepare(`SELECT COALESCE(SUM(amount),0) AS total_paid FROM transactions
deploy-worker/src\index.js:1346:  await env.DB.prepare(`UPDATE arrear_tasks
deploy-worker/src\index.js:1359:    await env.DB.prepare(`UPDATE arrears
deploy-worker/src\index.js:1380:  const existing=await env.DB.prepare(`SELECT * FROM arrear_tasks
deploy-worker/src\index.js:1386:  const legacy=await env.DB.prepare("SELECT * FROM arrears WHERE id=? AND corpid=? AND cleared=0 LIMIT 1")
deploy-worker/src\index.js:1406:  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS app_settings (
deploy-worker/src\index.js:1414:  const row=await env.DB.prepare("SELECT value FROM app_settings WHERE corpid=? AND key=? LIMIT 1").bind(corpid,"rent_ref_room").first();
deploy-worker/src\index.js:1484:  const existingTx=await env.DB.prepare("SELECT id,session_id,type,linked_task_id FROM transactions WHERE id=? AND corpid=? LIMIT 1").bind(entryId,user.corpid).first();
deploy-worker/src\index.js:1651:    const paidRow=await env.DB.prepare(`SELECT COALESCE(SUM(paid),0) AS total_paid FROM transactions
deploy-worker/src\index.js:1656:    const existing=await env.DB.prepare(`SELECT task_id FROM arrear_tasks
deploy-worker/src\index.js:1661:        await env.DB.prepare(`UPDATE arrear_tasks
deploy-worker/src\index.js:1687:      await env.DB.prepare("UPDATE arrear_tasks SET close_status='PAID', followup_status='已结清', actual_received=?, updated_by=?, updated_at=? WHERE task_id=? AND corpid=?")
deploy-worker/src\index.js:1771:  const taskRows=await env.DB.prepare("SELECT * FROM arrear_tasks WHERE corpid=? ORDER BY COALESCE(updated_at,created_at) DESC").bind(user.corpid).all();
deploy-worker/src\index.js:1780:    const legacy=await env.DB.prepare("SELECT * FROM arrears WHERE corpid=? AND cleared=0 AND COALESCE(voided_at,'')='' ORDER BY created_at DESC").bind(user.corpid).all();
deploy-worker/src\index.js:1810:    await env.DB.prepare(
deploy-worker/src\index.js:1817:  const task=await env.DB.prepare("SELECT * FROM arrear_tasks WHERE task_id=? AND corpid=? LIMIT 1").bind(id,user.corpid).first();
deploy-worker/src\index.js:1819:    await env.DB.prepare(
deploy-worker/src\index.js:1857:  let old=await env.DB.prepare("SELECT * FROM arrear_tasks WHERE task_id=? AND corpid=? LIMIT 1").bind(taskId,user.corpid).first();
deploy-worker/src\index.js:1866:    const fallback=await env.DB.prepare("SELECT * FROM arrears WHERE id=? AND corpid=? LIMIT 1").bind(taskId,user.corpid).first().catch(()=>null);
deploy-worker/src\index.js:1941:  await env.DB.prepare(`UPDATE arrear_tasks SET ${updates.join(",")} WHERE task_id=? AND corpid=?`).bind(...vals).run();
deploy-worker/src\index.js:1972:const HSC_ALLOWED_APP_ENVS = new Set(["development","dev","local","test","staging"]);
deploy-worker/src\index.js:1995:  const appEnv=String(env.APP_ENV||"").trim().toLowerCase();
deploy-worker/src\index.js:1997:  if(!HSC_ALLOWED_APP_ENVS.has(appEnv))return {ok:false,status:403,code:"FEATURE_DISABLED",message:"Feature disabled for this environment."};
deploy-worker/src\index.js:1998:  const enabled=["1","true","yes","on"].includes(String(env.ENABLE_HANDOVER_ATOMIC_STAGING||"").trim().toLowerCase());
deploy-worker/src\index.js:2271:  await env.DB.prepare(`INSERT INTO handover_audit_events
deploy-worker/src\index.js:2300:  const existingKey=await env.DB.prepare("SELECT * FROM handover_idempotency_keys WHERE company_id=? AND property_id=? AND idempotency_key=? LIMIT 1")
deploy-worker/src\index.js:2304:      const commit=await env.DB.prepare("SELECT * FROM handover_commits WHERE commit_id=? LIMIT 1").bind(existingKey.commit_id||"").first().catch(()=>null);
deploy-worker/src\index.js:2309:  const duplicateFingerprint=await env.DB.prepare("SELECT * FROM handover_idempotency_keys WHERE company_id=? AND property_id=? AND request_fingerprint=? LIMIT 1")
deploy-worker/src\index.js:2312:  const duplicateSession=await env.DB.prepare("SELECT * FROM handover_commits WHERE company_id=? AND property_id=? AND session_id=? AND status='ACCEPTED' LIMIT 1")
deploy-worker/src\index.js:2344:    env.DB.prepare(`INSERT INTO handover_commits (
deploy-worker/src\index.js:2363:    env.DB.prepare(`INSERT INTO handover_idempotency_keys
deploy-worker/src\index.js:2367:    env.DB.prepare(`INSERT INTO handover_audit_events
deploy-worker/src\index.js:2371:    env.DB.prepare(`INSERT INTO entry_events
deploy-worker/src\index.js:2377:    statements.push(env.DB.prepare(`INSERT INTO handover_commit_rows
deploy-worker/src\index.js:2382:  await env.DB.batch(statements);
deploy-worker/src\index.js:2387:const EEA_ALLOWED_APP_ENVS = HSC_ALLOWED_APP_ENVS;
deploy-worker/src\index.js:2390:  const appEnv=String(env.APP_ENV||"").trim().toLowerCase();
deploy-worker/src\index.js:2392:  if(!EEA_ALLOWED_APP_ENVS.has(appEnv))return {ok:false,status:403,code:"FEATURE_DISABLED",message:"Feature disabled for this environment."};
deploy-worker/src\index.js:2393:  const enabled=["1","true","yes","on"].includes(String(env.ENABLE_EMPLOYEE_ENTRY_ADAPTER_STAGING||"").trim().toLowerCase());
deploy-worker/src\index.js:2399:  const appEnv=String(env.APP_ENV||"").trim().toLowerCase();
deploy-worker/src\index.js:2400:  const flagEnabled=["1","true","yes","on"].includes(String(env.ENABLE_EMPLOYEE_ENTRY_ADAPTER_LIVE_ROUTE||"").trim().toLowerCase());
deploy-worker/src\index.js:2402:  if(!EEA_ALLOWED_APP_ENVS.has(appEnv))return {enabled:false,appEnv,reason:"environment_not_allowed"};
deploy-worker/src\index.js:2529:    return await verifyJWT(token, env.JWT_SECRET);
deploy-worker/src\index.js:2536:  if (!env.ASSETS) return null;
deploy-worker/src\index.js:2540:  return env.ASSETS.fetch(new Request(assetUrl.toString(), {
deploy-worker/src\index.js:2642:      await env.DB.prepare(
deploy-worker/src\index.js:2655:      await env.DB.prepare(
deploy-worker/src\index.js:2675:        await env.DB.prepare(
deploy-worker/src\index.js:2688:        row = await env.DB.prepare(
deploy-worker/src\index.js:2703:        await env.DB.prepare(
deploy-worker/src\index.js:2739:      await env.DB.prepare(
deploy-worker/src\index.js:2749:      await env.DB.prepare(
deploy-worker/src\index.js:2765:        await env.DB.prepare(
deploy-worker/src\index.js:2778:        row = await env.DB.prepare(
deploy-worker/src\index.js:2809:      await env.DB.prepare(
deploy-worker/src\index.js:2819:      await env.DB.prepare(
deploy-worker/src\index.js:2832:        await env.DB.prepare(
deploy-worker/src\index.js:2845:        row = await env.DB.prepare(
deploy-worker/src\index.js:2862:      await env.DB.prepare(
deploy-worker/src\index.js:2883:      await env.DB.prepare(
deploy-worker/src\index.js:2918:      batch.push(env.DB.prepare(
deploy-worker/src\index.js:2935:        batch.push(env.DB.prepare(
deploy-worker/src\index.js:2973:          batch.push(env.DB.prepare(
deploy-worker/src\index.js:2992:      await env.DB.batch(batch);
deploy-worker/src\index.js:3010:      const existing = await env.DB.prepare(
deploy-worker/src\index.js:3020:        env.DB.prepare(`UPDATE sessions
deploy-worker/src\index.js:3038:          env.DB.prepare(`UPDATE arrear_tasks
deploy-worker/src\index.js:3053:          env.DB.prepare(`UPDATE deposit_ledger
deploy-worker/src\index.js:3061:          env.DB.prepare(`UPDATE transactions
deploy-worker/src\index.js:3072:          env.DB.prepare(`UPDATE arrears
deploy-worker/src\index.js:3080:      await env.DB.batch(batch);
deploy-worker/src\index.js:3114:        const { results } = await env.DB.prepare(`${baseSql} LIMIT ? OFFSET ?`).bind(user.corpid, limit, offset).all();
deploy-worker/src\index.js:3117:      const { results } = await env.DB.prepare(
deploy-worker/src\index.js:3127:      const { results } = await env.DB.prepare(
deploy-worker/src\index.js:3136:  if (env.ASSETS) {
deploy-worker/src\index.js:3137:    return env.ASSETS.fetch(request);
scripts\audit-api-permissions.mjs:87:      source.includes("ENABLE_HANDOVER_ATOMIC_STAGING") ||
scripts\audit-api-permissions.mjs:88:      source.includes("ENABLE_EMPLOYEE_ENTRY_ADAPTER_STAGING")
scripts\compare-staging-backend-totals.mjs:14:export const BACKEND_TOTALS_STAGING_FLAG = "ENABLE_BACKEND_TOTALS_AUTHORITY_STAGING";
scripts\compare-staging-backend-totals.mjs:16:const RECEIVABLES_SHADOW_REHEARSAL_CORPID = "p0-008e-shadow";
scripts\compare-staging-backend-totals.mjs:23:export const APPROVED_BACKEND_TOTALS_STAGING_SWITCH_TOTALS = new Set([
scripts\compare-staging-backend-totals.mjs:35:export const BLOCKED_BACKEND_TOTALS_STAGING_SWITCH_TOTALS = new Map([
scripts\compare-staging-backend-totals.mjs:46:const reportPath = path.resolve("STAGING_BACKEND_TOTALS_COMPARISON_RESULT.md");
scripts\compare-staging-backend-totals.mjs:55:  const appEnv = String(env.APP_ENV || "").trim();
scripts\compare-staging-backend-totals.mjs:56:  const flag = normalizeBool(env[BACKEND_TOTALS_STAGING_FLAG]);
scripts\compare-staging-backend-totals.mjs:135:      blocker: "PRODUCTION_NO_GO"
scripts\compare-staging-backend-totals.mjs:144:      blocker: "PRODUCTION_NO_GO"
scripts\compare-staging-backend-totals.mjs:153:      blocker: "PRODUCTION_NO_GO"
scripts\compare-staging-backend-totals.mjs:171:      blocker: "PRODUCTION_NO_GO"
scripts\compare-staging-backend-totals.mjs:198:      blocker: "PRODUCTION_NO_GO"
scripts\compare-staging-backend-totals.mjs:207:      blocker: "PRODUCTION_NO_GO"
scripts\compare-staging-backend-totals.mjs:225:      blocker: "PRODUCTION_NO_GO"
scripts\compare-staging-backend-totals.mjs:234:      blocker: "PRODUCTION_NO_GO"
scripts\compare-staging-backend-totals.mjs:243:  if (row.canStagingSwitch && !row.canProductionSwitch) return "STAGING_SWITCH_CANDIDATE";
scripts\compare-staging-backend-totals.mjs:256:  if (APPROVED_BACKEND_TOTALS_STAGING_SWITCH_TOTALS.has(normalized)) {
scripts\compare-staging-backend-totals.mjs:257:    return "STAGING_SWITCH_CANDIDATE";
scripts\compare-staging-backend-totals.mjs:259:  if (BLOCKED_BACKEND_TOTALS_STAGING_SWITCH_TOTALS.has(normalized)) {
scripts\compare-staging-backend-totals.mjs:260:    return BLOCKED_BACKEND_TOTALS_STAGING_SWITCH_TOTALS.get(normalized);
scripts\compare-staging-backend-totals.mjs:287:    if (scenarioClass === "STAGING_SWITCH_CANDIDATE") {
scripts\compare-staging-backend-totals.mjs:293:          Mode: "BACKEND_TOTALS_STAGING",
scripts\compare-staging-backend-totals.mjs:303:        Mode: "BACKEND_TOTALS_STAGING",
scripts\compare-staging-backend-totals.mjs:339:      row.Mode === "BACKEND_TOTALS_STAGING" &&
scripts\compare-staging-backend-totals.mjs:340:      classifyBackendTotalsSwitchScenario(row.Scenario) !== "STAGING_SWITCH_CANDIDATE"
scripts\compare-staging-backend-totals.mjs:493:    String(row?.corpid || "") === RECEIVABLES_SHADOW_REHEARSAL_CORPID ||
scripts\compare-staging-backend-totals.mjs:736:  console.log(`STAGING_BACKEND_TOTALS_COMPARISON=${overall}`);
scripts\compare-staging-backend-totals.mjs:737:  console.log(`STAGING_BACKEND_TOTALS_MISMATCH=${hasMismatch ? "yes" : "no"}`);
scripts\compare-staging-backend-totals.mjs:738:  console.log(`STAGING_BACKEND_TOTALS_REPORT=${path.relative(process.cwd(), reportPath)}`);
scripts\compare-staging-backend-totals.mjs:745:      console.error(`STAGING_BACKEND_TOTALS_COMPARISON=BLOCKED: ${error?.message || error}`);
scripts\audit-environment-separation.mjs:62:    check: "APP_ENV configured in Wrangler",
scripts\audit-environment-separation.mjs:63:    result: /APP_ENV/.test(`${source}\n${embedded}`) ? "PASS" : "MANUAL_REQUIRED",
scripts\audit-environment-separation.mjs:65:    notes: "runtime APP_ENV must be explicit per environment"
scripts\audit-rollback-readiness.mjs:25:      "HANDOVER_STAGING_ENDPOINT_IMPLEMENTATION.md",
scripts\audit-rollback-readiness.mjs:75:      "NEXT_PROMPT_P0_008C_RECEIVABLES_LOCAL_STAGING_REHEARSAL.md"
scripts\audit-rollback-readiness.mjs:85:      "NEXT_PROMPT_P0_006C_TENANT_SCOPE_LOCAL_STAGING_REHEARSAL.md"
scripts\audit-rollback-readiness.mjs:93:      "PRODUCTION_DEPLOYMENT_SAFETY_CHECKLIST.md",
scripts\audit-rollback-readiness.mjs:95:      "P0_001L_PRODUCTION_CUTOVER_NO_GO_REVIEW.md"
scripts\compare-employee-entry-legacy-vs-adapter.mjs:107:    APP_ENV: "test",
scripts\compare-employee-entry-legacy-vs-adapter.mjs:112:    APP_ENV: "test",
scripts\db-local-bootstrap-utils.mjs:15:export const localD1DatabaseName = process.env.LOCAL_D1_DATABASE || "homelink";
scripts\db-local-bootstrap-utils.mjs:23:export function resolveCleanD1PersistTo(input = process.env.CLEAN_D1_PERSIST_TO) {
scripts\db-local-bootstrap-utils.mjs:60:        env: { ...process.env, WRANGLER_SEND_METRICS: "false" }
scripts\db-local-bootstrap-utils.mjs:131:  const corpid = env.CORPID || "local-dev-company";
scripts\check-secrets.mjs:18:  ".env.local",
scripts\check-secrets.mjs:46:    file.endsWith(".example") || file.endsWith(".env.example") || file.endsWith(".local.example")
scripts\audit-api.mjs:16:    tenantScope: "env `CORPID`",
scripts\audit-api.mjs:29:    tenantScope: "env `CORPID`",
scripts\audit-worker-entrypoint-drift.mjs:43:    item: "ENABLE_HANDOVER_ATOMIC_STAGING guard",
scripts\audit-worker-entrypoint-drift.mjs:44:    patterns: ["ENABLE_HANDOVER_ATOMIC_STAGING"],
scripts\audit-worker-entrypoint-drift.mjs:50:    item: "APP_ENV production disabled guard",
scripts\audit-worker-entrypoint-drift.mjs:51:    patterns: ["HSC_ALLOWED_APP_ENVS", "APP_ENV"],
scripts\audit-worker-entrypoint-drift.mjs:224:console.log(`WORKER_DRIFT_STAGING_HANDOVER_MISSING=${stagingRouteMissing ? "yes" : "no"}`);
scripts\dry-run-tenant-scope-staging-backfill.mjs:11:const reportPath = path.resolve("TENANT_SCOPE_STAGING_BACKFILL_DRY_RUN_RESULT.md");
scripts\dry-run-tenant-scope-staging-backfill.mjs:139:      "Has CORPID": yesNo(hasCorpid),
scripts\dry-run-tenant-scope-staging-backfill.mjs:142:      "Legacy CORPID Rows": String(count.legacyCorpidRows),
scripts\dry-run-tenant-scope-staging-backfill.mjs:223:    "Scope: read-only staging tenant scope backfill dry-run. This script confirms the staging D1 target, reads table schema/counts with SELECT only, generates draft update-plan classifications, and does not deploy, migrate, write D1 rows, call production, mutate dashboard/history output, or remove legacy CORPID fallback.",
scripts\dry-run-tenant-scope-staging-backfill.mjs:231:      "Has CORPID",
scripts\dry-run-tenant-scope-staging-backfill.mjs:234:      "Legacy CORPID Rows",
scripts\dry-run-tenant-scope-staging-backfill.mjs:256:    "- PRODUCTION_FORBIDDEN: yes.",
scripts\dry-run-tenant-scope-staging-backfill.mjs:268:    "- Legacy CORPID fallback removed: no.",
scripts\dry-run-tenant-scope-staging-backfill.mjs:280:  console.log(`TENANT_SCOPE_STAGING_BACKFILL_DRY_RUN=${summary.overall}`);
scripts\dry-run-tenant-scope-staging-backfill.mjs:281:  console.log(`TENANT_SCOPE_STAGING_BACKFILL_TABLES=${summary.rowCount}`);
scripts\dry-run-tenant-scope-staging-backfill.mjs:282:  console.log(`TENANT_SCOPE_STAGING_BACKFILL_BLOCKED=${summary.blockedCount}`);
scripts\dry-run-tenant-scope-staging-backfill.mjs:283:  console.log(`TENANT_SCOPE_STAGING_BACKFILL_MANUAL_REQUIRED=${summary.manualRequiredCount}`);
scripts\dry-run-tenant-scope-staging-backfill.mjs:284:  console.log(`TENANT_SCOPE_STAGING_BACKFILL_LEGACY_WARNINGS=${summary.legacyWarningCount}`);
scripts\dry-run-tenant-scope-staging-backfill.mjs:285:  console.log(`TENANT_SCOPE_STAGING_BACKFILL_REPORT=${path.relative(process.cwd(), reportPath)}`);
scripts\dry-run-tenant-scope-staging-backfill.mjs:291:    console.error(`TENANT_SCOPE_STAGING_BACKFILL_DRY_RUN=BLOCKED: ${error?.message || error}`);
scripts\compare-staging-receivables-shadow.mjs:17:export const RECEIVABLES_SHADOW_FLAG = "ENABLE_RECEIVABLES_SHADOW_STAGING";
scripts\compare-staging-receivables-shadow.mjs:18:export const P0_008E_QA_RUN_ID = "P0-008E-20260525-STAGING-SHADOW-001";
scripts\compare-staging-receivables-shadow.mjs:28:const reportPath = path.resolve("STAGING_RECEIVABLES_SHADOW_COMPARISON_RESULT.md");
scripts\compare-staging-receivables-shadow.mjs:38:  const appEnv = String(env.APP_ENV || "")
scripts\compare-staging-receivables-shadow.mjs:105:      "NEEDS_MORE_STAGING_DATA"
scripts\compare-staging-receivables-shadow.mjs:132:      "PRODUCTION_NO_GO"
scripts\compare-staging-receivables-shadow.mjs:141:      "NEEDS_MORE_STAGING_DATA"
scripts\compare-staging-receivables-shadow.mjs:150:      "NEEDS_MORE_STAGING_DATA"
scripts\compare-staging-receivables-shadow.mjs:168:      "NEEDS_MORE_STAGING_DATA"
scripts\compare-staging-receivables-shadow.mjs:177:      "PRODUCTION_NO_GO"
scripts\compare-staging-receivables-shadow.mjs:195:      "NEEDS_MORE_STAGING_DATA"
scripts\compare-staging-receivables-shadow.mjs:213:      "NEEDS_MORE_STAGING_DATA"
scripts\compare-staging-receivables-shadow.mjs:851:  console.log(`STAGING_RECEIVABLES_SHADOW_COMPARISON=${summary.overall}`);
scripts\compare-staging-receivables-shadow.mjs:852:  console.log(`STAGING_RECEIVABLES_SHADOW_MISMATCH=${summary.mismatchCount ? "yes" : "no"}`);
scripts\compare-staging-receivables-shadow.mjs:853:  console.log(`STAGING_RECEIVABLES_SHADOW_NEEDS_MORE_DATA=${summary.needsMoreDataCount}`);
scripts\compare-staging-receivables-shadow.mjs:854:  console.log(`STAGING_RECEIVABLES_SHADOW_REPORT=${path.relative(process.cwd(), reportPath)}`);
scripts\compare-staging-receivables-shadow.mjs:861:    console.error(`STAGING_RECEIVABLES_SHADOW_COMPARISON=BLOCKED: ${error?.message || error}`);
modules\tenant\scope.mjs:5:const TENANT_SCOPE_SHADOW_STAGING_FLAG = "ENABLE_TENANT_SCOPE_SHADOW_STAGING";
modules\tenant\scope.mjs:6:const TENANT_SCOPE_ROUTE_ENFORCEMENT_STAGING_FLAG = "ENABLE_TENANT_SCOPE_ROUTE_ENFORCEMENT_STAGING";
modules\tenant\scope.mjs:7:const TENANT_SCOPE_DASHBOARD_HISTORY_QUERY_STAGING_FLAG =
modules\tenant\scope.mjs:8:  "ENABLE_TENANT_SCOPE_DASHBOARD_HISTORY_QUERY_STAGING";
modules\tenant\scope.mjs:38:  const appEnv = String(env.APP_ENV || "")
modules\tenant\scope.mjs:49:  const appEnv = String(env.APP_ENV || "")
modules\tenant\scope.mjs:52:  const flag = String(env[TENANT_SCOPE_SHADOW_STAGING_FLAG] ?? "")
modules\tenant\scope.mjs:83:  const appEnv = String(env.APP_ENV || "")
modules\tenant\scope.mjs:86:  const flag = String(env[TENANT_SCOPE_ROUTE_ENFORCEMENT_STAGING_FLAG] ?? "")
modules\tenant\scope.mjs:120:  const appEnv = String(env.APP_ENV || "")
modules\tenant\scope.mjs:123:  const flag = String(env[TENANT_SCOPE_DASHBOARD_HISTORY_QUERY_STAGING_FLAG] ?? "")
modules\tenant\scope.mjs:226:  env = { APP_ENV: "test" },
modules\tenant\scope.mjs:289:  env = { APP_ENV: "test" },
modules\tenant\scope.mjs:315:    APP_ENV: "test",
modules\tenant\scope.mjs:316:    [TENANT_SCOPE_DASHBOARD_HISTORY_QUERY_STAGING_FLAG]: "true"
modules\tenant\scope.mjs:363:  env = { APP_ENV: "test" },
modules\tenant\scope.mjs:396:  env = { APP_ENV: "test", [TENANT_SCOPE_ROUTE_ENFORCEMENT_STAGING_FLAG]: "true" },
modules\tenant\scope.mjs:448:  TENANT_SCOPE_DASHBOARD_HISTORY_QUERY_STAGING_FLAG,
modules\tenant\scope.mjs:449:  TENANT_SCOPE_ROUTE_ENFORCEMENT_STAGING_FLAG,
modules\tenant\scope.mjs:450:  TENANT_SCOPE_SHADOW_STAGING_FLAG
scripts\gate-commercial-launch-readiness.mjs:46:    evidence: ["P0_P1_STATUS_REVIEW.md", "HANDOVER_STAGING_ENDPOINT_REHEARSAL_RESULT.md"],
scripts\gate-commercial-launch-readiness.mjs:79:    evidence: ["P0_001L_STAGING_ENVIRONMENT_PREFLIGHT.md", "STAGING_QA_MANUAL_REQUIRED.md"],
scripts\gate-commercial-launch-readiness.mjs:89:    required: ["MANUAL_REQUIRED", "D1", "KV", "APP_ENV"],
scripts\gate-commercial-launch-readiness.mjs:202:  "Overall: `PRODUCTION_NO_GO`",
scripts\gate-commercial-launch-readiness.mjs:218:console.log("COMMERCIAL_LAUNCH_READINESS=PRODUCTION_NO_GO");
scripts\compare-staging-tenant-scope-shadow.mjs:10:  TENANT_SCOPE_SHADOW_STAGING_FLAG
scripts\compare-staging-tenant-scope-shadow.mjs:19:const reportPath = path.resolve("TENANT_SCOPE_STAGING_SHADOW_GATE_RESULT.md");
scripts\compare-staging-tenant-scope-shadow.mjs:165:    "Staging Source": TENANT_SCOPE_SHADOW_STAGING_FLAG,
scripts\compare-staging-tenant-scope-shadow.mjs:168:      APP_ENV: "production",
scripts\compare-staging-tenant-scope-shadow.mjs:169:      [TENANT_SCOPE_SHADOW_STAGING_FLAG]: "true"
scripts\compare-staging-tenant-scope-shadow.mjs:217:    `Feature flag: \`${TENANT_SCOPE_SHADOW_STAGING_FLAG}\``,
scripts\compare-staging-tenant-scope-shadow.mjs:238:    "- Legacy CORPID fallback removed: no.",
scripts\compare-staging-tenant-scope-shadow.mjs:251:  console.log(`TENANT_SCOPE_STAGING_SHADOW_GATE=${summary.overall}`);
scripts\compare-staging-tenant-scope-shadow.mjs:252:  console.log(`TENANT_SCOPE_STAGING_SHADOW_LEGACY_WARNINGS=${summary.legacyWarningCount}`);
scripts\compare-staging-tenant-scope-shadow.mjs:253:  console.log(`TENANT_SCOPE_STAGING_SHADOW_MANUAL_REQUIRED=${summary.manualRequiredCount}`);
scripts\compare-staging-tenant-scope-shadow.mjs:254:  console.log(`TENANT_SCOPE_STAGING_SHADOW_REPORT=${path.relative(process.cwd(), reportPath)}`);
scripts\compare-staging-tenant-scope-shadow.mjs:260:    console.error(`TENANT_SCOPE_STAGING_SHADOW_GATE=BLOCKED: ${error?.message || error}`);
modules\auth\tenant-claims.mjs:137:    warnings: ["LEGACY_CORPID_FALLBACK"]
modules\auth\tenant-claims.mjs:146:  const appEnv = String(options.appEnv ?? options.APP_ENV ?? "")
modules\auth\tenant-claims.mjs:165:    if (stringOrNull(claim.corp_id)) warnings.push("LEGACY_CORPID_PRESENT_COMPATIBILITY_ONLY");
modules\auth\tenant-claims.mjs:167:    warnings.push("LEGACY_CORPID_FALLBACK");
modules\auth\tenant-claims.mjs:169:    errors.push("MISSING_TENANT_ID_PRODUCTION_UNSAFE");
modules\auth\tenant-claims.mjs:199:  if (validation.errors.includes("MISSING_TENANT_ID_PRODUCTION_UNSAFE")) {
modules\auth\tenant-claims.mjs:200:    return "PRODUCTION_UNSAFE";
modules\auth\tenant-claims.mjs:203:  if (validation.warnings.includes("LEGACY_CORPID_FALLBACK")) {
modules\auth\tenant-claims.mjs:207:  return "READY_FOR_STAGING_REHEARSAL";
modules\auth\tenant-claims.mjs:242:      risk: "READY_FOR_STAGING_REHEARSAL"
modules\auth\tenant-claims.mjs:256:      risk: "READY_FOR_STAGING_REHEARSAL"
modules\auth\tenant-claims.mjs:265:      risk: "READY_FOR_STAGING_REHEARSAL"
scripts\gate-receivables-staging-authority-switch.mjs:13:export const RECEIVABLES_AUTHORITY_STAGING_FLAG = "ENABLE_RECEIVABLES_AUTHORITY_STAGING";
scripts\gate-receivables-staging-authority-switch.mjs:48:const reportPath = path.resolve("RECEIVABLES_STAGING_AUTHORITY_SWITCH_GATE_RESULT.md");
scripts\gate-receivables-staging-authority-switch.mjs:57:  const appEnv = String(env.APP_ENV || "")
scripts\gate-receivables-staging-authority-switch.mjs:60:  const flag = normalizeBool(env[RECEIVABLES_AUTHORITY_STAGING_FLAG]);
scripts\gate-receivables-staging-authority-switch.mjs:83:    mode: "RECEIVABLES_AUTHORITY_STAGING_GATE",
scripts\gate-receivables-staging-authority-switch.mjs:94:    return "STAGING_AUTHORITY_CANDIDATE";
scripts\gate-receivables-staging-authority-switch.mjs:137:    if (scenarioClass === "STAGING_AUTHORITY_CANDIDATE") {
scripts\gate-receivables-staging-authority-switch.mjs:142:        Mode: "RECEIVABLES_AUTHORITY_STAGING_GATE",
scripts\gate-receivables-staging-authority-switch.mjs:203:    (row) => row.Mode === "RECEIVABLES_AUTHORITY_STAGING_GATE" && row.Result === "PASS"
scripts\gate-receivables-staging-authority-switch.mjs:208:      row.Mode === "RECEIVABLES_AUTHORITY_STAGING_GATE" &&
scripts\gate-receivables-staging-authority-switch.mjs:209:      classifyReceivablesAuthorityScenario(row.Scenario) !== "STAGING_AUTHORITY_CANDIDATE"
scripts\gate-receivables-staging-authority-switch.mjs:260:  if (result.code !== 0 || !output.includes("COMMERCIAL_LAUNCH_READINESS=PRODUCTION_NO_GO")) {
scripts\gate-receivables-staging-authority-switch.mjs:261:    throw new Error("Commercial launch gate is not PRODUCTION_NO_GO.");
scripts\gate-receivables-staging-authority-switch.mjs:272:    APP_ENV: "staging",
scripts\gate-receivables-staging-authority-switch.mjs:273:    [RECEIVABLES_AUTHORITY_STAGING_FLAG]: "true"
scripts\gate-receivables-staging-authority-switch.mjs:286:    `Feature flag: \`${RECEIVABLES_AUTHORITY_STAGING_FLAG}\``,
scripts\gate-receivables-staging-authority-switch.mjs:328:    `- Keep \`${RECEIVABLES_AUTHORITY_STAGING_FLAG}=false\` unless an explicit later staging switch rehearsal enables it.`,
modules\auth\unified-login-routing.mjs:5:export const PRODUCTION_CUTOVER_STATUS = "PRODUCTION_NO_GO";
modules\auth\unified-login-routing.mjs:158:  return PRODUCTION_CUTOVER_STATUS;
scripts\gate-tenant-scope-backfill-reconciliation.mjs:75:      "Legacy CORPID": row.corpid || "missing",
scripts\gate-tenant-scope-backfill-reconciliation.mjs:110:    "Scope: staging/local-only tenant scope backfill reconciliation using static fixtures. This script does not deploy, migrate, read or write D1, call production, mutate dashboard/history output, change auth behavior, or remove legacy CORPID fallback.",
scripts\gate-tenant-scope-backfill-reconciliation.mjs:117:      "Legacy CORPID",
scripts\gate-tenant-scope-backfill-reconciliation.mjs:144:    "- Legacy CORPID fallback removed: no.",
scripts\gate-tenant-scope-dashboard-history-query.mjs:9:  TENANT_SCOPE_DASHBOARD_HISTORY_QUERY_STAGING_FLAG
scripts\gate-tenant-scope-dashboard-history-query.mjs:13:const reportPath = path.resolve("TENANT_SCOPE_STAGING_DASHBOARD_HISTORY_QUERY_GATE_RESULT.md");
scripts\gate-tenant-scope-dashboard-history-query.mjs:30:    APP_ENV: "staging",
scripts\gate-tenant-scope-dashboard-history-query.mjs:31:    [TENANT_SCOPE_DASHBOARD_HISTORY_QUERY_STAGING_FLAG]: "true"
... [truncated 574 more lines]
```


## 10. Findings, Risks, And Planning Inputs

### 10.1 Confirmed Architecture

- The live app is not a standard React/Vue SPA in `src`; it is a Cloudflare Worker serving static HTML/JS assets.
- `deploy-worker/src/index.js` is the central route/auth/D1/static-asset control point.
- The current formal entry model is `/` / `/portal` with role business routes `/employee`, `/owner`, and `/admin`.
- Legacy HTML files still exist as static assets, so route interception and auth guards are critical to prevent old-login visibility.
- Tests are mostly Node `node --test` static/unit/rehearsal tests, plus Wrangler dry-run builds.

### 10.2 Auth And Permission Risks

- Any local/session role cache must remain non-authoritative; `/api/me` and server session claims must be authority.
- readonly admin has source/test coverage, but live smoke must not print credentials/tokens/cookies and must not perform real writes.
- Old login paths need continuing regression coverage because compatibility assets remain in the repo.

### 10.3 Financial / Data Authority Risks

- `PRODUCTION_NO_GO` remains appropriate until money authority, receivables, tenant scope, audit trail, and runtime DDL blockers are fully closed.
- UI/export tasks must stay presentation-only unless a separate finance authority task explicitly approves calculation changes.
- Runtime DDL findings remain visible in static scans and should be resolved before commercial production authority is claimed.

### 10.4 Performance Inputs

- History has limit/offset and skeleton evidence, but production-sized read-only timing still needs real data verification.
- Arrears/customer control-panel views are mobile-sensitive and should be verified on real phone after deploy.

### 10.5 Recommended Next Planning Order

1. Keep `/` as formal entry and old HTML paths compatibility-only.
2. Run read-only live route smoke after any deployment.
3. Run production-sized read-only performance audit for history, arrears, and customers.
4. Defer finance authority changes to separate signoff: money unit, receivables state machine, audit completeness, runtime DDL removal.
5. Use real mobile QA for owner control panel, arrears modal/export, employee identity, and portal routing.


## 11. Audit Safety Log

- Production deploy executed: no.
- Production D1 write: no.
- Migration executed: no.
- D1 export/import/execute: no.
- Business write test: no.
- Password/token/cookie printed: no.
- Financial formula changed: no.
- Dashboard calculation changed: no.
- Code changed: no, report file only.
- Report generated at: 2026-05-29T10:59:12.842Z
