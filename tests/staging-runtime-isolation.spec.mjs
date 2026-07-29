import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  readStagingTtlockContextSnapshot,
  stagingFormalWriteFailure,
  stagingRequestBoundaryFailure,
  stagingTtlockLiveFetchAllowed
} from "../deploy-worker/src/staging-runtime-isolation.mjs";

const host = "homelink-finance-staging.habibramadan888.workers.dev";
const origin = `https://${host}`;
const now = Date.parse("2026-07-29T08:00:00.000Z");
const baseEnv = {
  APP_ENV: "staging",
  STAGING_ALLOWED_HOST: host,
  STAGING_ALLOWED_ORIGIN: origin,
  STAGING_TTLOCK_MODE: "disabled_fail_closed",
  STAGING_CONTEXT_SNAPSHOT_MODE: "staging_kv_only"
};

function request(urlHost = host, headers = {}) {
  return new Request(`https://${urlHost}/employee-next`, {
    headers: { Host: urlHost, ...headers }
  });
}

function snapshot(extra = {}) {
  return {
    schema_version: 1,
    environment: "staging",
    worker: "homelink-finance-staging",
    snapshot_type: "ttlock_access_snapshot",
    created_at: "2026-07-29T07:55:00.000Z",
    expires_at: "2026-07-29T08:05:00.000Z",
    bed_identifier: "101A",
    payload: {
      roomsData: {
        "101A": [{ room: "101A", cardName: "E", remark: "E" }]
      },
      locksCount: 1,
      snapshot_fingerprint: "staging-snapshot-101a"
    },
    ...extra
  };
}

function envWithSnapshot(value, extra = {}) {
  const reads = [];
  return {
    env: {
      ...baseEnv,
      RATE_LIMIT: {
        async get(key) {
          reads.push(key);
          return value === null ? null : JSON.stringify(value);
        }
      },
      ...extra
    },
    reads
  };
}

test("staging accepts the exact Host and exact same-origin Origin", () => {
  assert.equal(stagingRequestBoundaryFailure(request(host, { Origin: origin }), baseEnv), null);
  assert.equal(stagingRequestBoundaryFailure(request(host), baseEnv), null);
});

test("staging rejects the production Host", () => {
  assert.equal(
    stagingRequestBoundaryFailure(request("homelink-finance.habibramadan888.workers.dev"), baseEnv).error_code,
    "STAGING_HOST_NOT_ALLOWED"
  );
});

test("staging rejects forged subdomains and suffix matches", () => {
  for (const value of [`evil.${host}`, `${host}.evil.example`]) {
    assert.equal(stagingRequestBoundaryFailure(request(value), baseEnv).error_code, "STAGING_HOST_NOT_ALLOWED");
  }
});

test("staging rejects an incorrect Origin", () => {
  assert.equal(
    stagingRequestBoundaryFailure(request(host, { Origin: "https://example.invalid" }), baseEnv).error_code,
    "STAGING_ORIGIN_NOT_ALLOWED"
  );
});

test("staging fails closed when isolation configuration is missing", () => {
  const failure = stagingRequestBoundaryFailure(request(host), { APP_ENV: "staging" });
  assert.equal(failure.error_code, "STAGING_ISOLATION_CONFIG_MISSING");
  assert.equal(failure.no_write, true);
});

test("staging disables TTLock live fetch even with credentials and production origin injected", () => {
  const env = {
    ...baseEnv,
    TTLOCK_CLIENT_ID: "injected",
    TTLOCK_CLIENT_SECRET: "injected",
    TTLOCK_USERNAME: "injected",
    TTLOCK_PASSWORD: "injected",
    TTLOCK_API_ORIGIN: "https://api.ttlock.com"
  };
  assert.equal(stagingTtlockLiveFetchAllowed(env), false);
});

test("missing staging snapshot fails closed without fallback keys", async () => {
  const { env, reads } = envWithSnapshot(null);
  const result = await readStagingTtlockContextSnapshot(env, { bed: "101A", now });
  assert.equal(result.error_code, "STAGING_CONTEXT_SNAPSHOT_MISSING");
  assert.deepEqual(reads, ["staging:ttlock-context:101A"]);
  assert.equal(result.external_ttlock_call_count, 0);
});

test("expired staging snapshot fails closed", async () => {
  const { env } = envWithSnapshot(snapshot({ expires_at: "2026-07-29T07:59:59.000Z" }));
  const result = await readStagingTtlockContextSnapshot(env, { bed: "101A", now });
  assert.equal(result.error_code, "STAGING_CONTEXT_SNAPSHOT_STALE");
});

test("snapshot from another environment fails closed", async () => {
  const { env } = envWithSnapshot(snapshot({ environment: "production" }));
  const result = await readStagingTtlockContextSnapshot(env, { bed: "101A", now });
  assert.equal(result.error_code, "STAGING_CONTEXT_SNAPSHOT_ENVIRONMENT_MISMATCH");
});

test("snapshot with wrong worker or bed scope fails closed", async () => {
  for (const value of [
    snapshot({ worker: "homelink-finance" }),
    snapshot({ bed_identifier: "102B" })
  ]) {
    const { env } = envWithSnapshot(value);
    const result = await readStagingTtlockContextSnapshot(env, { bed: "101A", now });
    assert.equal(result.error_code, "STAGING_CONTEXT_SNAPSHOT_SCOPE_MISMATCH");
  }
});

test("malformed staging snapshot fails closed", async () => {
  const { env } = envWithSnapshot(snapshot({ schema_version: 2 }));
  const result = await readStagingTtlockContextSnapshot(env, { bed: "101A", now });
  assert.equal(result.error_code, "STAGING_CONTEXT_SNAPSHOT_MALFORMED");
});

test("valid staging-only snapshot supplies the existing context shape", async () => {
  const { env, reads } = envWithSnapshot(snapshot());
  const result = await readStagingTtlockContextSnapshot(env, { bed: "101A", now });
  assert.equal(result.ok, true);
  assert.equal(result.data_source, "staging_kv_snapshot");
  assert.equal(result.roomsData["101A"][0].cardName, "E");
  assert.equal(result.no_write, true);
  assert.equal(result.formal_write_count, 0);
  assert.equal(result.external_ttlock_call_count, 0);
  assert.deepEqual(reads, ["staging:ttlock-context:101A"]);
});

test("staging formal entry write is disabled before persistence", () => {
  const failure = stagingFormalWriteFailure(baseEnv);
  assert.equal(failure.error_code, "STAGING_FORMAL_WRITE_DISABLED");
  assert.equal(failure.write_attempted, false);
  assert.equal(failure.formal_write_count, 0);
  assert.equal(failure.no_write, true);
});

test("production behavior is not default-disabled by staging helpers", () => {
  const production = { APP_ENV: "internal_beta" };
  assert.equal(stagingRequestBoundaryFailure(request("homelink-finance.habibramadan888.workers.dev"), production), null);
  assert.equal(stagingTtlockLiveFetchAllowed(production), true);
  assert.equal(stagingFormalWriteFailure(production), null);
});

test("Worker uses the shared staging guards at the real runtime boundaries", async () => {
  const worker = await readFile(new URL("../deploy-worker/src/index.js", import.meta.url), "utf8");
  assert.match(worker, /stagingRequestBoundaryFailure\(request,env\)/);
  assert.match(worker, /stagingFormalWriteFailure\(env\)/);
  assert.match(worker, /readStagingTtlockContextSnapshot\(env,\{bed:options\.bed,now\}\)/);
  assert.match(worker, /if\(live\.staging_snapshot===true\)return/);
  assert.match(worker, /bed:cleanBed,strict_access_snapshot/);
});

test("seven-event client remains validate-only and transport write remains disabled", async () => {
  const client = await readFile(new URL("../apps/employee-next/src/main.ts", import.meta.url), "utf8");
  assert.match(client, /EMPLOYEE_NEXT_FORMAL_WRITE_ENABLED = false/);
  assert.match(client, /SIDECAR_FORMAL_UPLOAD_DISABLED/);
  assert.match(client, /validate_only:\s*true/);
  assert.match(client, /no_write:\s*true/);
  assert.match(client, /dry_run:\s*true/);
});

test("staging config declares isolation and all formal-write flags closed", async () => {
  const config = await readFile(new URL("../deploy-worker/wrangler.toml", import.meta.url), "utf8");
  const staging = config.slice(config.indexOf("[env.staging.vars]"));
  for (const line of [
    `STAGING_ALLOWED_HOST = "${host}"`,
    `STAGING_ALLOWED_ORIGIN = "${origin}"`,
    `STAGING_TTLOCK_MODE = "disabled_fail_closed"`,
    `STAGING_CONTEXT_SNAPSHOT_MODE = "staging_kv_only"`,
    `ENABLE_EMPLOYEE_ENTRY_ADAPTER_LIVE_ROUTE = "false"`,
    `ENABLE_HANDOVER_ATOMIC_STAGING = "false"`,
    `BED_TRANSFER_WRITE_APPROVED = "false"`,
    `QA_ACCEPTANCE_ENABLED = "false"`,
    `ALLOW_DEV_SEED = "false"`
  ]) assert.match(staging, new RegExp(line.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});
