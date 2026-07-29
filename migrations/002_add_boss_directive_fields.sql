-- Migration 002: Boss directive fields for arrear_tasks follow-up loop

ALTER TABLE arrear_tasks ADD COLUMN boss_requested_at TEXT;
ALTER TABLE arrear_tasks ADD COLUMN boss_requested_by TEXT;
ALTER TABLE arrear_tasks ADD COLUMN boss_requested_due_date TEXT;
ALTER TABLE arrear_tasks ADD COLUMN directive_status TEXT DEFAULT 'none';
ALTER TABLE arrear_tasks ADD COLUMN staff_promised_at TEXT;

CREATE INDEX IF NOT EXISTS idx_arrear_tasks_directive
  ON arrear_tasks(corpid, directive_status, boss_requested_due_date, promise_date);
