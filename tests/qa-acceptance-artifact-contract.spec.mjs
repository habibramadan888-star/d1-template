import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

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
