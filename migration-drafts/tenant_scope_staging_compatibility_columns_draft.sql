-- P0-006I tenant scope staging compatibility columns draft.
-- Staging/local draft only. Do not apply to production.
-- Do not execute in the P0-006I gate task.
-- Adds nullable compatibility columns only.
-- Does not backfill data and does not remove legacy corpid.

ALTER TABLE active_sessions ADD COLUMN company_id TEXT;
ALTER TABLE active_sessions ADD COLUMN owner_id TEXT;
ALTER TABLE active_sessions ADD COLUMN employee_id TEXT;

ALTER TABLE employee_users ADD COLUMN company_id TEXT;

ALTER TABLE app_settings ADD COLUMN company_id TEXT;
ALTER TABLE app_settings ADD COLUMN property_id TEXT;
ALTER TABLE app_settings ADD COLUMN owner_id TEXT;

ALTER TABLE sessions ADD COLUMN company_id TEXT;
ALTER TABLE sessions ADD COLUMN property_id TEXT;
ALTER TABLE sessions ADD COLUMN employee_id TEXT;

ALTER TABLE transactions ADD COLUMN company_id TEXT;
ALTER TABLE transactions ADD COLUMN property_id TEXT;
ALTER TABLE transactions ADD COLUMN employee_id TEXT;

ALTER TABLE deposit_ledger ADD COLUMN company_id TEXT;
ALTER TABLE deposit_ledger ADD COLUMN property_id TEXT;
ALTER TABLE deposit_ledger ADD COLUMN employee_id TEXT;

ALTER TABLE arrears ADD COLUMN company_id TEXT;
ALTER TABLE arrears ADD COLUMN property_id TEXT;
ALTER TABLE arrears ADD COLUMN employee_id TEXT;

ALTER TABLE arrear_tasks ADD COLUMN company_id TEXT;
ALTER TABLE arrear_tasks ADD COLUMN property_id TEXT;
ALTER TABLE arrear_tasks ADD COLUMN employee_id TEXT;

ALTER TABLE audit_logs ADD COLUMN company_id TEXT;
ALTER TABLE audit_logs ADD COLUMN property_id TEXT;
ALTER TABLE audit_logs ADD COLUMN owner_id TEXT;
ALTER TABLE audit_logs ADD COLUMN employee_id TEXT;

ALTER TABLE entry_events ADD COLUMN company_id TEXT;
ALTER TABLE entry_events ADD COLUMN property_id TEXT;
ALTER TABLE entry_events ADD COLUMN employee_id TEXT;
