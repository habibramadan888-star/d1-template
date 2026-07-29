import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

const migrationPath = new URL("../migrations/008_durable_stay_context.sql", import.meta.url);
const designPath = new URL("../docs/BED_TRANSFER_DURABLE_STAY_AND_CANONICAL_ARCHIVE_DESIGN_V1.md", import.meta.url);
const forbiddenColumns = [
  "tenant_card_id", "tenantCardId", "card_id", "cardId", "old_ttlock_ref", "oldTtlockRef",
  "provider_phone", "providerPhone", "phone_99099", "phone99099", "creator_phone", "creatorPhone",
  "card_creation_time", "cardCreationTime", "ttlock_provider_metadata", "ttlockProviderMetadata",
  "provider_metadata", "providerMetadata", "customer_id", "customer_code", "bed", "room",
  "current_bed", "original_bed"
];

async function migrationSql() {
  return readFile(migrationPath, "utf8");
}

async function migratedDatabase() {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(await migrationSql());
  return db;
}

function insertStay(db, overrides = {}) {
  const row = {
    stay_context_id: "stay-context-000001",
    corpid: "corp-a",
    lifecycle_status: "active",
    genesis_event_type: "rent",
    genesis_session_id: "session-1",
    genesis_entry_id: "entry-1",
    genesis_anchor_id: "anchor-1",
    started_at: "2026-07-11T12:00:00+04:00",
    closed_at: null,
    close_session_id: null,
    close_entry_id: null,
    close_anchor_id: null,
    ...overrides
  };
  return db.prepare(`INSERT INTO stay_contexts (
    stay_context_id, corpid, lifecycle_status, genesis_event_type,
    genesis_session_id, genesis_entry_id, genesis_anchor_id, started_at,
    closed_at, close_session_id, close_entry_id, close_anchor_id
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    row.stay_context_id, row.corpid, row.lifecycle_status, row.genesis_event_type,
    row.genesis_session_id, row.genesis_entry_id, row.genesis_anchor_id, row.started_at,
    row.closed_at, row.close_session_id, row.close_entry_id, row.close_anchor_id
  );
}

function insertLink(db, overrides = {}) {
  const row = {
    stay_event_link_id: "stay-event-link-001",
    corpid: "corp-a",
    stay_context_id: "stay-context-000001",
    session_id: "session-1",
    entry_id: "entry-1",
    anchor_id: "link-anchor-1",
    event_type: "rent",
    link_role: "genesis",
    occurred_at: "2026-07-11T12:00:00+04:00",
    ...overrides
  };
  return db.prepare(`INSERT INTO stay_event_links (
    stay_event_link_id, corpid, stay_context_id, session_id, entry_id,
    anchor_id, event_type, link_role, occurred_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    row.stay_event_link_id, row.corpid, row.stay_context_id, row.session_id, row.entry_id,
    row.anchor_id, row.event_type, row.link_role, row.occurred_at
  );
}

test("migration executes on an empty database and re-executes safely", async () => {
  const sql = await migrationSql();
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(sql);
  db.exec(sql);
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map(row => row.name);
  assert.deepEqual(tables, ["stay_contexts", "stay_event_links"]);
  db.close();
});

test("design document DDL block exactly matches the migration", async () => {
  const sql = await migrationSql();
  const design = await readFile(designPath, "utf8");
  const match = design.match(/## Durable Stay Persistence DDL Contract[\s\S]*?```sql\r?\n([\s\S]*?)\r?\n```/);
  assert.ok(match, "durable stay DDL contract block must exist");
  assert.equal(match[1].trim(), sql.trim());
});

test("tables, columns, primary key, indexes, and composite foreign key match contract", async () => {
  const db = await migratedDatabase();
  const stayColumns = db.prepare("PRAGMA table_info(stay_contexts)").all();
  const linkColumns = db.prepare("PRAGMA table_info(stay_event_links)").all();
  assert.deepEqual(stayColumns.map(row => row.name), [
    "stay_context_id", "corpid", "lifecycle_status", "genesis_event_type", "genesis_session_id",
    "genesis_entry_id", "genesis_anchor_id", "started_at", "closed_at", "close_session_id",
    "close_entry_id", "close_anchor_id", "created_at", "updated_at"
  ]);
  assert.deepEqual(linkColumns.map(row => row.name), [
    "stay_event_link_id", "corpid", "stay_context_id", "session_id", "entry_id", "anchor_id",
    "event_type", "link_role", "occurred_at", "created_at"
  ]);
  assert.equal(stayColumns.find(row => row.name === "stay_context_id").pk, 1);

  const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND sql IS NOT NULL ORDER BY name").all().map(row => row.name);
  for (const name of [
    "idx_stay_contexts_corpid_status", "idx_stay_contexts_corpid_genesis_anchor",
    "idx_stay_event_links_stay_time", "idx_stay_event_links_event_type"
  ]) assert.ok(indexes.includes(name), name);

  const foreignKeys = db.prepare("PRAGMA foreign_key_list(stay_event_links)").all();
  assert.equal(foreignKeys.length, 2);
  assert.deepEqual(foreignKeys.map(row => [row.from, row.to]), [["corpid", "corpid"], ["stay_context_id", "stay_context_id"]]);
  assert.ok(foreignKeys.every(row => row.on_update === "RESTRICT" && row.on_delete === "RESTRICT"));
  db.close();
});

test("stay lifecycle and genesis constraints reject invalid rows", async () => {
  const db = await migratedDatabase();
  assert.throws(() => insertStay(db, { stay_context_id: "too-short" }), /constraint/i);
  assert.throws(() => insertStay(db, { lifecycle_status: "paused" }), /constraint/i);
  assert.throws(() => insertStay(db, { closed_at: "2026-07-12", close_session_id: "s", close_entry_id: "e", close_anchor_id: "a" }), /constraint/i);

  for (const missing of ["closed_at", "close_session_id", "close_entry_id", "close_anchor_id"]) {
    const closed = {
      lifecycle_status: "closed",
      closed_at: "2026-07-12T12:00:00+04:00",
      close_session_id: "close-session",
      close_entry_id: "close-entry",
      close_anchor_id: "close-anchor",
      stay_context_id: `closed-stay-${missing}-0001`,
      genesis_anchor_id: `genesis-${missing}`
    };
    closed[missing] = null;
    assert.throws(() => insertStay(db, closed), /constraint/i, missing);
  }

  for (const genesis_event_type of ["rent", "deposit_in"]) {
    assert.throws(() => insertStay(db, { stay_context_id: `${genesis_event_type}-missing-session`, genesis_anchor_id: `${genesis_event_type}-a`, genesis_event_type, genesis_session_id: null }), /constraint/i);
    assert.throws(() => insertStay(db, { stay_context_id: `${genesis_event_type}-missing-entry-01`, genesis_anchor_id: `${genesis_event_type}-b`, genesis_event_type, genesis_entry_id: null }), /constraint/i);
  }

  insertStay(db, {
    stay_context_id: "legacy-bootstrap-0001",
    genesis_event_type: "legacy_bootstrap",
    genesis_session_id: null,
    genesis_entry_id: null,
    genesis_anchor_id: "legacy-anchor-1"
  });
  assert.throws(() => insertStay(db, {
    stay_context_id: "legacy-bootstrap-0002",
    genesis_event_type: "legacy_bootstrap",
    genesis_session_id: null,
    genesis_entry_id: null,
    genesis_anchor_id: null
  }), /constraint/i);
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM stay_contexts").get().count, 1);
  db.close();
});

test("canonical references are unique and company-safe", async () => {
  const db = await migratedDatabase();
  insertStay(db);
  assert.throws(() => insertStay(db, { genesis_anchor_id: "anchor-2" }), /unique/i);
  assert.throws(() => insertStay(db, { stay_context_id: "stay-context-000002", genesis_anchor_id: "anchor-1" }), /unique/i);
  assert.throws(() => insertLink(db, { stay_context_id: "missing-stay-00001" }), /foreign key/i);
  assert.throws(() => insertLink(db, { corpid: "corp-b" }), /foreign key/i);

  insertLink(db);
  assert.throws(() => insertLink(db, { stay_event_link_id: "stay-event-link-002", session_id: "session-2", entry_id: "entry-2" }), /unique/i);
  assert.throws(() => insertLink(db, { stay_event_link_id: "stay-event-link-003", anchor_id: "link-anchor-3" }), /unique/i);
  assert.throws(() => db.prepare("DELETE FROM stay_contexts WHERE stay_context_id=?").run("stay-context-000001"), /foreign key/i);
  db.close();
});

test("migration is additive and contains no forbidden identity or legacy backfill", async () => {
  const sql = await migrationSql();
  const db = await migratedDatabase();
  const schemaColumns = [
    ...db.prepare("PRAGMA table_info(stay_contexts)").all(),
    ...db.prepare("PRAGMA table_info(stay_event_links)").all()
  ].map(row => row.name);
  for (const forbidden of forbiddenColumns) {
    assert.equal(schemaColumns.includes(forbidden), false, forbidden);
  }
  assert.doesNotMatch(sql, /\b(current_bed|original_bed|tenant_card_id|card_id|old_ttlock_ref|provider_phone|phone_99099|creator_phone|card_creation_time|ttlock_provider_metadata|provider_metadata|customer_id|customer_code)\b/i);
  assert.doesNotMatch(sql, /^\s*(INSERT|UPDATE|DELETE)\b/im);
  assert.doesNotMatch(sql, /\b(ALTER|DROP)\s+TABLE\b/i);
  assert.doesNotMatch(sql, /\b(backfill|CREATE\s+TRIGGER|CREATE\s+VIEW)\b/i);
  assert.doesNotMatch(sql, /REFERENCES\s+(sessions|transactions|arrear_tasks)\b/i);
  assert.doesNotMatch(sql, /ON\s+DELETE\s+CASCADE/i);
  db.close();
});
