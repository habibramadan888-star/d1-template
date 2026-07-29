const { DatabaseSync } = require("node:sqlite");
const fs = require("node:fs");
const path = require("node:path");

const scriptDir = __dirname;
const rootDir = path.resolve(scriptDir, "..");
const dbPath = path.join(rootDir, ".wrangler", "state", "d1.db");

const REQUIRED_TABLES = [
  "entries",
  "payments",
  "customers",
  "receivables",
  "receivables_ledger",
  "audit_logs",
  "idempotency_keys",
  "tenants",
  "properties",
  "handovers"
];

const DATA_TABLES = [
  "tenants",
  "properties",
  "customers",
  "entries",
  "payments",
  "receivables",
  "audit_logs"
];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function backupExistingDatabase(file) {
  if (!fs.existsSync(file)) return null;

  const backup = `${file}.backup.${Date.now()}`;
  fs.copyFileSync(file, backup);
  fs.unlinkSync(file);
  return backup;
}

function migrationFiles() {
  const rootMigrations = path.join(rootDir, "migrations");
  const localMigrations = path.join(rootMigrations, "local");

  if (!fs.existsSync(rootMigrations)) {
    throw new Error("migrations directory not found");
  }

  const rootFiles = fs
    .readdirSync(rootMigrations)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  const coreFiles = rootFiles.filter((file) => file.includes("core-schema"));
  const remainingRootFiles = rootFiles.filter((file) => !coreFiles.includes(file));
  const localFiles = fs.existsSync(localMigrations)
    ? fs
        .readdirSync(localMigrations)
        .filter((file) => file.endsWith(".sql"))
        .sort()
        .map((file) => path.join("local", file))
    : [];

  return [...coreFiles, ...localFiles, ...remainingRootFiles].map((file) =>
    path.join(rootMigrations, file)
  );
}

function normalizeMigrationSql(sql) {
  return String(sql).replace(
    /followup_status\s+TEXT\s+DEFAULT\s+'寰呰窡杩\?,/g,
    "followup_status TEXT DEFAULT '待跟进',"
  );
}

function splitStatements(sql) {
  return normalizeMigrationSql(sql)
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);
}

function isIgnorableMigrationError(error) {
  return /already exists|duplicate column name|no such column/i.test(error.message || "");
}

function applyMigrations(db) {
  const files = migrationFiles();
  const warnings = [];

  console.log("Applying migrations...");
  for (const file of files) {
    const relative = path.relative(rootDir, file);
    const sql = fs.readFileSync(file, "utf8");
    console.log(`  ${relative}`);

    for (const statement of splitStatements(sql)) {
      try {
        db.exec(statement);
      } catch (error) {
        if (isIgnorableMigrationError(error)) {
          warnings.push({ file: relative, message: error.message });
        } else {
          throw new Error(`${relative}: ${error.message}`);
        }
      }
    }
  }

  if (warnings.length) {
    console.warn(`Migration warnings ignored: ${warnings.length}`);
    for (const warning of warnings.slice(0, 8)) {
      console.warn(`  ${warning.file}: ${warning.message}`);
    }
    if (warnings.length > 8) {
      console.warn(`  ... ${warnings.length - 8} more warnings`);
    }
  }

  return { files, warnings };
}

function createCompatibilitySourceTables(db) {
  db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS tenants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      country TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS properties (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      name TEXT NOT NULL,
      address TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_properties_tenant_id
      ON properties(tenant_id);

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      property_id TEXT,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_customers_tenant_id
      ON customers(tenant_id);

    CREATE TABLE IF NOT EXISTS entries (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      customer_id TEXT,
      property_id TEXT,
      amount INTEGER NOT NULL,
      method TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'CREATED',
      handover_id TEXT,
      handover_status TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_entries_tenant_property
      ON entries(tenant_id, property_id);

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      customer_id TEXT,
      property_id TEXT,
      amount INTEGER NOT NULL,
      method TEXT NOT NULL,
      status TEXT DEFAULT 'SUCCESS',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_payments_tenant_method
      ON payments(tenant_id, method);

    CREATE TABLE IF NOT EXISTS receivables (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      customer_id TEXT,
      property_id TEXT,
      amount INTEGER NOT NULL,
      outstanding_amount INTEGER NOT NULL,
      due_date TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_receivables_tenant_due
      ON receivables(tenant_id, due_date);

    CREATE TABLE IF NOT EXISTS handovers (
      id TEXT PRIMARY KEY,
      tenant_id TEXT,
      employee_id TEXT,
      total_cash INTEGER NOT NULL DEFAULT 0,
      total_bank INTEGER NOT NULL DEFAULT 0,
      entry_count INTEGER NOT NULL DEFAULT 0,
      status TEXT DEFAULT 'PENDING',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

function run(db, sql, params = []) {
  return db.prepare(sql).run(...params);
}

function get(db, sql, params = []) {
  return db.prepare(sql).get(...params);
}

function seededRandom() {
  let seed = 20260530;
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

function moneyAmount(random, min = 5000, max = 100000) {
  return Math.floor(random() * (max - min + 1)) + min;
}

function phone(random) {
  return `+971${String(Math.floor(random() * 1_000_000_000)).padStart(9, "0")}`;
}

function isoNow() {
  return new Date().toISOString();
}

function seedData(db) {
  const random = seededRandom();
  const now = isoNow();

  const tenants = [
    { id: "tenant-demo", name: "Demo Tenant", country: "AE" },
    { id: "tenant-test", name: "Test Tenant", country: "AE" }
  ];

  const properties = [
    {
      id: "prop-101",
      tenant_id: "tenant-demo",
      name: "Property 101",
      address: "Dubai Marina"
    },
    {
      id: "prop-102",
      tenant_id: "tenant-demo",
      name: "Property 102",
      address: "Abu Dhabi Downtown"
    },
    {
      id: "prop-201",
      tenant_id: "tenant-test",
      name: "Property 201",
      address: "Sharjah Waterfront"
    }
  ];

  db.exec("BEGIN IMMEDIATE TRANSACTION");
  try {
    for (const tenant of tenants) {
      run(db, "INSERT OR IGNORE INTO tenants (id, name, country, created_at) VALUES (?, ?, ?, ?)", [
        tenant.id,
        tenant.name,
        tenant.country,
        now
      ]);
    }

    for (const property of properties) {
      run(
        db,
        "INSERT OR IGNORE INTO properties (id, tenant_id, name, address, created_at) VALUES (?, ?, ?, ?, ?)",
        [property.id, property.tenant_id, property.name, property.address, now]
      );
    }

    for (let index = 0; index < 100; index += 1) {
      const customerNumber = index + 1;
      const customerId = `cust-${String(customerNumber).padStart(4, "0")}`;
      const tenantId = index < 50 ? "tenant-demo" : "tenant-test";
      const propertyId =
        tenantId === "tenant-demo" ? (index % 2 === 0 ? "prop-101" : "prop-102") : "prop-201";

      run(
        db,
        `INSERT OR IGNORE INTO customers
          (id, tenant_id, property_id, name, email, phone, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          customerId,
          tenantId,
          propertyId,
          `Customer ${customerNumber}`,
          `customer${customerNumber}@test.local`,
          phone(random),
          now
        ]
      );
    }

    for (let index = 0; index < 500; index += 1) {
      const entryNumber = index + 1;
      const customerNumber = (index % 100) + 1;
      const customerId = `cust-${String(customerNumber).padStart(4, "0")}`;
      const tenantId = customerNumber <= 50 ? "tenant-demo" : "tenant-test";
      const propertyId =
        tenantId === "tenant-demo" ? (index % 2 === 0 ? "prop-101" : "prop-102") : "prop-201";
      const method = index % 2 === 0 ? "CASH" : "BANK";

      run(
        db,
        `INSERT OR IGNORE INTO entries
          (id, tenant_id, customer_id, property_id, amount, method, description, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `entry-${String(entryNumber).padStart(5, "0")}`,
          tenantId,
          customerId,
          propertyId,
          moneyAmount(random, 5000, 55000),
          method,
          `Test Entry ${entryNumber}`,
          "CREATED",
          now
        ]
      );
    }

    for (let index = 0; index < 300; index += 1) {
      const paymentNumber = index + 1;
      const customerNumber = (index % 100) + 1;
      const customerId = `cust-${String(customerNumber).padStart(4, "0")}`;
      const tenantId = customerNumber <= 50 ? "tenant-demo" : "tenant-test";
      const propertyId =
        tenantId === "tenant-demo" ? (index % 2 === 0 ? "prop-101" : "prop-102") : "prop-201";
      const method = index % 2 === 0 ? "CASH" : "BANK";

      run(
        db,
        `INSERT OR IGNORE INTO payments
          (id, tenant_id, customer_id, property_id, amount, method, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `payment-${String(paymentNumber).padStart(5, "0")}`,
          tenantId,
          customerId,
          propertyId,
          moneyAmount(random, 5000, 55000),
          method,
          "SUCCESS",
          now
        ]
      );
    }

    for (let index = 0; index < 200; index += 1) {
      const receivableNumber = index + 1;
      const customerNumber = (index % 100) + 1;
      const customerId = `cust-${String(customerNumber).padStart(4, "0")}`;
      const tenantId = customerNumber <= 50 ? "tenant-demo" : "tenant-test";
      const propertyId =
        tenantId === "tenant-demo" ? (index % 2 === 0 ? "prop-101" : "prop-102") : "prop-201";
      const amount = moneyAmount(random, 10000, 110000);
      const outstanding = Math.max(1, Math.floor(amount * (0.2 + random() * 0.8)));
      const dayOffset = Math.floor(random() * 91) - 45;
      const dueDate = new Date(Date.now() + dayOffset * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);

      run(
        db,
        `INSERT OR IGNORE INTO receivables
          (id, tenant_id, customer_id, property_id, amount, outstanding_amount, status, due_date, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `receivable-${String(receivableNumber).padStart(5, "0")}`,
          tenantId,
          customerId,
          propertyId,
          amount,
          outstanding,
          "PENDING",
          dueDate,
          now
        ]
      );
    }

    for (let index = 0; index < 100; index += 1) {
      run(
        db,
        `INSERT OR IGNORE INTO audit_logs
          (id, operation_type, resource_type, resource_id, user_id, user_role, new_value, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `audit-seed-${String(index + 1).padStart(4, "0")}`,
          "SEED",
          "staging_fixture",
          `fixture-${String(index + 1).padStart(4, "0")}`,
          "seed-system",
          "system",
          JSON.stringify({ fixture: index + 1 }),
          "SUCCESS",
          now
        ]
      );
    }

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function verifyRequiredTables(db) {
  const missing = [];
  for (const table of REQUIRED_TABLES) {
    const row = get(db, "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?", [
      table
    ]);
    if (!row) missing.push(table);
  }
  return missing;
}

function tableCount(db, table) {
  return get(db, `SELECT COUNT(*) AS count FROM ${table}`).count;
}

function main() {
  ensureDir(path.dirname(dbPath));
  const backup = backupExistingDatabase(dbPath);
  if (backup) {
    console.log(`Backed up existing database to ${path.relative(rootDir, backup)}`);
  }

  const db = new DatabaseSync(dbPath);
  console.log(`Created local D1 database at ${path.relative(rootDir, dbPath)}`);

  createCompatibilitySourceTables(db);
  const migrationResult = applyMigrations(db);
  seedData(db);

  const missingTables = verifyRequiredTables(db);
  if (missingTables.length) {
    throw new Error(`Missing required tables: ${missingTables.join(", ")}`);
  }

  const stats = Object.fromEntries(DATA_TABLES.map((table) => [table, tableCount(db, table)]));
  const total = Object.values(stats).reduce((sum, count) => sum + count, 0);

  console.log("");
  console.log("Database summary:");
  for (const [table, count] of Object.entries(stats)) {
    console.log(`  ${table.padEnd(15)} ${count}`);
  }
  console.log(`  ${"TOTAL".padEnd(15)} ${total}`);

  console.log("");
  console.log(`Required tables verified: ${REQUIRED_TABLES.length}`);
  console.log(`Migrations processed: ${migrationResult.files.length}`);
  console.log(`Migration warnings ignored: ${migrationResult.warnings.length}`);
  console.log("Database initialization complete");
}

main();
