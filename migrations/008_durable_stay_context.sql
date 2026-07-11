CREATE TABLE IF NOT EXISTS stay_contexts (
  stay_context_id TEXT PRIMARY KEY,
  corpid TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL DEFAULT 'active',
  genesis_event_type TEXT NOT NULL,
  genesis_session_id TEXT,
  genesis_entry_id TEXT,
  genesis_anchor_id TEXT NOT NULL,
  started_at TEXT NOT NULL,
  closed_at TEXT,
  close_session_id TEXT,
  close_entry_id TEXT,
  close_anchor_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE (corpid, stay_context_id),

  CHECK (length(trim(stay_context_id)) >= 16),

  CHECK (
    lifecycle_status IN ('active', 'closed')
  ),

  CHECK (
    genesis_event_type IN (
      'rent',
      'deposit_in',
      'legacy_bootstrap'
    )
  ),

  CHECK (
    genesis_event_type = 'legacy_bootstrap'
    OR (
      genesis_session_id IS NOT NULL
      AND genesis_entry_id IS NOT NULL
    )
  ),

  CHECK (
    (
      lifecycle_status = 'active'
      AND closed_at IS NULL
      AND close_session_id IS NULL
      AND close_entry_id IS NULL
      AND close_anchor_id IS NULL
    )
    OR
    (
      lifecycle_status = 'closed'
      AND closed_at IS NOT NULL
      AND close_session_id IS NOT NULL
      AND close_entry_id IS NOT NULL
      AND close_anchor_id IS NOT NULL
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_stay_contexts_corpid_status
  ON stay_contexts(corpid, lifecycle_status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_stay_contexts_corpid_genesis_anchor
  ON stay_contexts(corpid, genesis_anchor_id);

CREATE TABLE IF NOT EXISTS stay_event_links (
  stay_event_link_id TEXT PRIMARY KEY,
  corpid TEXT NOT NULL,
  stay_context_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  entry_id TEXT NOT NULL,
  anchor_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  link_role TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE (corpid, anchor_id),
  UNIQUE (corpid, session_id, entry_id),

  FOREIGN KEY (corpid, stay_context_id)
    REFERENCES stay_contexts(corpid, stay_context_id)
    ON UPDATE RESTRICT
    ON DELETE RESTRICT,

  CHECK (
    link_role IN (
      'genesis',
      'activity',
      'transfer',
      'termination',
      'correction'
    )
  ),

  CHECK (length(trim(stay_event_link_id)) >= 16),
  CHECK (length(trim(event_type)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_stay_event_links_stay_time
  ON stay_event_links(corpid, stay_context_id, occurred_at);

CREATE INDEX IF NOT EXISTS idx_stay_event_links_event_type
  ON stay_event_links(corpid, event_type, occurred_at);
