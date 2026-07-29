import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { qaRehydrationCompatibility } from "../scripts/build-qa-acceptance-artifact.mjs";

const source = await readFile(new URL("../scripts/build-qa-acceptance-artifact.mjs", import.meta.url), "utf8");

test("artifact builder performs two reproducible Wrangler dry runs and hashes Worker plus all assets", () => {
  assert.match(source, /dryRun\(first\)/);
  assert.match(source, /dryRun\(second\)/);
  assert.match(source, /workerSha !== sha256\(secondWorker\)/);
  assert.match(source, /assetManifest\(publicRoot\)/);
  assert.match(source, /candidate_sha256/);
  assert.match(source, /reproducible_build: true/);
});

test("artifact builder writes only ignored local artifact output and never deploys", () => {
  assert.match(source, /\.qa-artifacts/);
  assert.match(source, /"--dry-run"/);
  assert.doesNotMatch(source, /versions["']?,\s*["']deploy|deployments["']?,\s*["']create|--remote/);
});

test("rehydration compatibility is exact to one Run artifact commit and payload", () => {
  const lineage = qaRehydrationCompatibility([
    "--rehydration-compatible-run=QA-20260716-4FB51FAF",
    `--rehydration-compatible-artifact=${"a".repeat(64)}`,
    `--rehydration-compatible-commit=${"b".repeat(40)}`,
    `--rehydration-compatible-payload=${"c".repeat(64)}`,
  ]);
  assert.deepEqual(lineage, [{
    scope: "employee_post_acceptance_rehydration_v1",
    qa_run_id: "QA-20260716-4FB51FAF",
    artifact_sha256: "a".repeat(64),
    git_commit: "b".repeat(40),
    payload_hash: "c".repeat(64),
  }]);
  assert.throws(() => qaRehydrationCompatibility([`--rehydration-compatible-artifact=${"a".repeat(64)}`]), /Complete exact Run artifact/);
});
