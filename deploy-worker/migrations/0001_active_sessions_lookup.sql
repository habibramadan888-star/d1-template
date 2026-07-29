-- Optimize authenticated /api route session lookup.
CREATE INDEX IF NOT EXISTS idx_active_sessions_lookup
  ON active_sessions(sid, revoked, expires_at);
