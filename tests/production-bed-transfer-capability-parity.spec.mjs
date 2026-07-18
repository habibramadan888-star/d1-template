import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { compareVersionConfigs, deploymentCapability, normalizeVersionConfig, verifyManifest } from "../scripts/check-production-bed-transfer-capability-parity.mjs";

const manifest = JSON.parse(await readFile(new URL("../deploy-worker/production-capability-manifest.json", import.meta.url), "utf8"));

function version({ plain = {}, d1 = "562aa079-1cca-4176-ba3b-7276a65f98fb", kv = "c7c64d522d964baba2e72454e7262da9", secrets = manifest.required_secret_names } = {}) {
  return {
    resources: {
      script_runtime: { compatibility_date: "2024-09-23", usage_model: "standard", assets: { raw_run_worker_first: true } },
      bindings: [
        ...Object.entries(plain).map(([name, text]) => ({ name, text, type: "plain_text" })),
        { name: "ASSETS", type: "assets" },
        { name: "DB", type: "d1", database_id: d1 },
        { name: "RATE_LIMIT", type: "kv_namespace", namespace_id: kv },
        ...secrets.map(name => ({ name, type: "secret_text" })),
      ],
    },
  };
}

const requiredPlain = { ...manifest.required_plain_text };

test("production manifest enables exact internal-beta Bed Transfer capability", () => {
  const config = normalizeVersionConfig(version({ plain: requiredPlain }));
  assert.deepEqual(deploymentCapability(config), manifest.capability_contract);
  assert.equal(verifyManifest(config, manifest).ok, true);
});

test("safe and candidate parity ignores version metadata but compares every effective binding", () => {
  const safe = normalizeVersionConfig({ id: "safe", metadata: { created_on: "old" }, ...version({ plain: requiredPlain }) });
  const candidate = normalizeVersionConfig({ id: "candidate", metadata: { created_on: "new" }, ...version({ plain: requiredPlain }) });
  assert.equal(compareVersionConfigs(safe, candidate).ok, true);
  candidate.plain_text.BED_TRANSFER_WRITE_APPROVED = "false";
  assert.equal(compareVersionConfigs(safe, candidate).ok, false);
});

test("preflight fails closed for missing, malformed, QA-open or drifted production config", () => {
  const missing = { ...requiredPlain }; delete missing.BED_TRANSFER_LEGACY_GENESIS_MODE;
  assert.equal(verifyManifest(normalizeVersionConfig(version({ plain: missing })), manifest).ok, false);
  assert.equal(verifyManifest(normalizeVersionConfig(version({ plain: { ...requiredPlain, BED_TRANSFER_WRITE_APPROVED: "TRUE" } })), manifest).ok, false);
  assert.equal(verifyManifest(normalizeVersionConfig(version({ plain: { ...requiredPlain, QA_ACCEPTANCE_ENABLED: "true" } })), manifest).ok, false);
  assert.equal(verifyManifest(normalizeVersionConfig(version({ plain: requiredPlain, d1: "qa-d1" })), manifest).ok, false);
});

test("production and QA inverse gates remain distinct", () => {
  const production = normalizeVersionConfig(version({ plain: requiredPlain }));
  const qa = normalizeVersionConfig(version({ plain: { ...requiredPlain, APP_ENV: "qa", CORPID: "HL-QA", QA_ACCEPTANCE_ENABLED: "true" } }));
  assert.equal(deploymentCapability(production).server_verified_permission, true);
  assert.equal(verifyManifest(qa, manifest).ok, false);
});

test("browser acceptance contract waits for capability success, not identity visibility", () => {
  assert.match(manifest.browser_acceptance_contract.ready_when, /status=success/);
  assert.match(manifest.browser_acceptance_contract.ready_when, /bed_transfer_validate_enabled=true/);
  assert.match(manifest.browser_acceptance_contract.ready_when, /bed_transfer_write_enabled=true/);
  assert.match(manifest.browser_acceptance_contract.not_ready_when, /capability request is still loading/);
  assert.equal(manifest.browser_acceptance_contract.fail_closed_timeout_ms, 10000);
});
