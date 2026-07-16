import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { rootDir, workerDir, wranglerBin } from "./local-worker-utils.mjs";

const artifactRoot = path.join(rootDir, ".qa-artifacts");
const buildRoot = path.join(artifactRoot, ".build");
const configPath = path.join(workerDir, "wrangler.qa.toml");
const publicRoot = path.join(workerDir, "public");

const sha256 = value => createHash("sha256").update(value).digest("hex");

async function filesUnder(root, relative = "") {
  const dir = path.join(root, relative);
  const rows = await readdir(dir, { withFileTypes: true });
  const out = [];
  for (const row of rows.sort((a, b) => a.name.localeCompare(b.name))) {
    const next = path.join(relative, row.name);
    if (row.isDirectory()) out.push(...await filesUnder(root, next));
    else if (row.isFile()) out.push(next.replaceAll("\\", "/"));
  }
  return out;
}

async function assetManifest(root) {
  const files = await filesUnder(root);
  return Promise.all(files.map(async file => {
    const bytes = await readFile(path.join(root, file));
    return { path: file, bytes: bytes.length, sha256: sha256(bytes) };
  }));
}

function dryRun(outdir) {
  execFileSync(process.execPath, [
    wranglerBin, "deploy", "--config", configPath, "--dry-run", "--outdir", outdir,
  ], { cwd: rootDir, stdio: "inherit", env: { ...process.env, WRANGLER_SEND_METRICS: "false" } });
}

export async function buildQaAcceptanceArtifact() {
  await rm(buildRoot, { recursive: true, force: true });
  const first = path.join(buildRoot, "first"), second = path.join(buildRoot, "second");
  await mkdir(first, { recursive: true });
  await mkdir(second, { recursive: true });
  dryRun(first);
  dryRun(second);
  const firstWorker = await readFile(path.join(first, "index.js"));
  const secondWorker = await readFile(path.join(second, "index.js"));
  const workerSha = sha256(firstWorker);
  if (workerSha !== sha256(secondWorker)) throw new Error("QA artifact dry-run is not reproducible");
  const assets = await assetManifest(publicRoot);
  const canonical = JSON.stringify({ format: "homelink-qa-artifact-v1", worker_sha256: workerSha, assets });
  const candidateSha = sha256(canonical);
  const target = path.join(artifactRoot, candidateSha);
  await rm(target, { recursive: true, force: true });
  await mkdir(path.join(target, "worker"), { recursive: true });
  await cp(path.join(first, "index.js"), path.join(target, "worker", "index.js"));
  await cp(publicRoot, path.join(target, "public"), { recursive: true });
  const gitCommit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: rootDir, encoding: "utf8" }).trim();
  const manifest = {
    schema_version: "homelink-qa-artifact-v1",
    candidate_sha256: candidateSha,
    git_commit: gitCommit,
    built_at: new Date().toISOString(),
    worker_entry: "deploy-worker/src/index.js",
    bundled_worker_sha256: workerSha,
    asset_count: assets.length,
    assets,
    binding_contract_sha256: "aaa5d370f52b103b17718432596e0dae3db5b7500150d4081bad27ef0cad9afd",
    schema_version_qa: "qa-acceptance-schema-v1",
    test_matrix_version: "employee-qa-matrix-v2",
    reproducible_build: true,
    production_promoted: false,
  };
  await writeFile(path.join(target, "artifact-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  await rm(buildRoot, { recursive: true, force: true });
  console.log(`QA_ARTIFACT_SHA256=${candidateSha}`);
  console.log(`QA_ARTIFACT_DIRECTORY=${target}`);
  return { ...manifest, artifact_directory: target };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  buildQaAcceptanceArtifact().catch(error => { console.error(error?.stack || error); process.exitCode = 1; });
}
