-- Migration 004: Arrears task materialization source metadata
-- Scope: add materialization metadata and idempotent source uniqueness for materialized arrear_tasks.
-- Safety: does not change amount, actual_received, accounting_status, close_status, or dashboard formula.

ALTER TABLE arrear_tasks ADD COLUMN source_type TEXT;
ALTER TABLE arrear_tasks ADD COLUMN source_ref TEXT;
ALTER TABLE arrear_tasks ADD COLUMN source_fingerprint TEXT;
ALTER TABLE arrear_tasks ADD COLUMN materialized_from TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_arrear_tasks_source_unique
  ON arrear_tasks(corpid, source_type, source_ref)
  WHERE source_type IS NOT NULL
    AND source_type != ''
    AND source_ref IS NOT NULL
    AND source_ref != '';
