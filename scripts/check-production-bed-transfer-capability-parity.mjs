import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultManifestPath = path.join(rootDir, "deploy-worker", "production-capability-manifest.json");
const defaultConfigPath = path.join(rootDir, "deploy-worker", "wrangler.toml");
const wranglerBin = path.join(rootDir, "node_modules", "wrangler", "bin", "wrangler.js");

function option(name, argv = process.argv.slice(2)) {
  const prefix = `--${name}=`;
  return argv.find(value => value.startsWith(prefix))?.slice(prefix.length) || "";
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, row]) => [key, stable(row)]));
}

export function normalizeVersionConfig(version = {}) {
  const plain_text = {};
  const bindings = {};
  const secret_names = [];
  for (const binding of version?.resources?.bindings || []) {
    const name = String(binding?.name || "");
    if (!name) continue;
    if (binding.type === "plain_text") plain_text[name] = String(binding.text ?? "");
    else if (binding.type === "secret_text") secret_names.push(name);
    else if (binding.type === "d1") bindings[name] = { type: "d1", id: String(binding.database_id || binding.id || "") };
    else if (binding.type === "kv_namespace") bindings[name] = { type: "kv_namespace", id: String(binding.namespace_id || binding.id || "") };
    else bindings[name] = { type: String(binding.type || "") };
  }
  const runtime = version?.resources?.script_runtime || {};
  return stable({
    plain_text,
    bindings,
    secret_names: [...new Set(secret_names)].sort(),
    runtime: {
      compatibility_date: String(runtime.compatibility_date || ""),
      usage_model: String(runtime.usage_model || ""),
      assets_run_worker_first: runtime?.assets?.raw_run_worker_first === true,
    },
  });
}

export function deploymentCapability(config = {}, user = { role: "STAFF", corpid: "homelink" }) {
  const env = config.plain_text || {};
  const appEnv = String(env.APP_ENV || "").trim().toLowerCase();
  const write = String(env.BED_TRANSFER_WRITE_APPROVED || "").trim() === "true";
  const mode = String(env.BED_TRANSFER_LEGACY_GENESIS_MODE || "").trim().toLowerCase();
  const role = String(user.role || "").trim().toLowerCase();
  const employeeAuthorized = ["staff", "employee"].includes(role) && String(user.corpid || "").trim().length > 0;
  return {
    bed_transfer_validate_enabled: true,
    bed_transfer_write_enabled: write,
    legacy_genesis_mode: mode,
    server_verified_permission: ["internal_beta", "qa"].includes(appEnv) && employeeAuthorized && write && mode === "server_verified",
    production_cutover: "PRODUCTION_NO_GO",
  };
}

export function verifyManifest(config, manifest) {
  const missing_variables = [];
  const different_variables = [];
  const unexpected_variables = [];
  for (const [name, expected] of Object.entries(manifest.required_plain_text || {})) {
    if (!Object.hasOwn(config.plain_text, name)) missing_variables.push(name);
    else if (config.plain_text[name] !== String(expected)) different_variables.push({ name, expected: String(expected), actual: config.plain_text[name] });
  }
  for (const [name, forbidden] of Object.entries(manifest.forbidden_plain_text || {})) {
    if (config.plain_text[name] === String(forbidden)) unexpected_variables.push({ name, value: config.plain_text[name] });
  }
  for (const [name, expected] of Object.entries(manifest.required_bindings || {})) {
    const actual = config.bindings[name];
    if (!actual) missing_variables.push(`binding:${name}`);
    else if (JSON.stringify(stable(actual)) !== JSON.stringify(stable(expected))) different_variables.push({ name: `binding:${name}`, expected, actual });
  }
  for (const name of manifest.required_secret_names || []) if (!config.secret_names.includes(name)) missing_variables.push(`secret:${name}`);
  const expectedRuntime = manifest.runtime_contract || {};
  for (const [name, expected] of Object.entries(expectedRuntime)) if (config.runtime[name] !== expected) different_variables.push({ name: `runtime:${name}`, expected, actual: config.runtime[name] });
  const capability = deploymentCapability(config);
  for (const [name, expected] of Object.entries(manifest.capability_contract || {})) if (capability[name] !== expected) different_variables.push({ name: `capability:${name}`, expected, actual: capability[name] });
  return { ok: !missing_variables.length && !different_variables.length && !unexpected_variables.length, missing_variables, different_variables, unexpected_variables, capability };
}

export function compareVersionConfigs(safeConfig, candidateConfig) {
  const safe = stable(safeConfig), candidate = stable(candidateConfig);
  return { ok: JSON.stringify(safe) === JSON.stringify(candidate), safe, candidate };
}

async function filesUnder(root, relative = "") {
  const rows = await readdir(path.join(root, relative), { withFileTypes: true });
  const out = [];
  for (const row of rows.sort((a, b) => a.name.localeCompare(b.name))) {
    const next = path.join(relative, row.name);
    if (row.isDirectory()) out.push(...await filesUnder(root, next));
    else if (row.isFile()) out.push(next.replaceAll("\\", "/"));
  }
  return out;
}

export async function canonicalArtifactSha(artifactDir) {
  const artifactManifest = JSON.parse(await readFile(path.join(artifactDir, "artifact-manifest.json"), "utf8"));
  const worker = await readFile(path.join(artifactDir, "worker", "index.js"));
  const workerSha = createHash("sha256").update(worker).digest("hex");
  const publicDir = path.join(artifactDir, "public");
  const assets = [];
  for (const file of await filesUnder(publicDir)) {
    const bytes = await readFile(path.join(publicDir, file));
    assets.push({ path: file, bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") });
  }
  const canonical = JSON.stringify({ format: "homelink-qa-artifact-v1", worker_sha256: workerSha, assets });
  const actual = createHash("sha256").update(canonical).digest("hex");
  return { ok: actual === artifactManifest.candidate_sha256, expected: artifactManifest.candidate_sha256, actual, worker_sha256: workerSha };
}

function versionView(versionId, { worker, config }) {
  const output = execFileSync(process.execPath, [wranglerBin, "versions", "view", versionId, "--config", config, "--name", worker, "--json"], { cwd: rootDir, encoding: "utf8", env: { ...process.env, WRANGLER_SEND_METRICS: "false" } });
  return JSON.parse(output);
}

export async function runPreflight(argv = process.argv.slice(2)) {
  const safeVersion = option("safe-version", argv);
  const candidateVersion = option("candidate-version", argv);
  if (!safeVersion || !candidateVersion) throw new Error("--safe-version and --candidate-version are required");
  const manifestPath = path.resolve(rootDir, option("manifest", argv) || path.relative(rootDir, defaultManifestPath));
  const configPath = path.resolve(rootDir, option("config", argv) || path.relative(rootDir, defaultConfigPath));
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const safe = normalizeVersionConfig(versionView(safeVersion, { worker: manifest.worker_name, config: configPath }));
  const candidate = normalizeVersionConfig(versionView(candidateVersion, { worker: manifest.worker_name, config: configPath }));
  const safe_result = verifyManifest(safe, manifest);
  const candidate_result = verifyManifest(candidate, manifest);
  const parity = compareVersionConfigs(safe, candidate);
  let artifact = null;
  const artifactDir = option("artifact-dir", argv);
  if (artifactDir) artifact = await canonicalArtifactSha(path.resolve(rootDir, artifactDir));
  const ok = safe_result.ok && candidate_result.ok && parity.ok && (!artifact || (artifact.ok && artifact.actual === manifest.artifact_sha256));
  const result = { ok, safe_version: safeVersion, candidate_version: candidateVersion, safe_result, candidate_result, parity: { ok: parity.ok }, artifact };
  console.log(JSON.stringify(result, null, 2));
  if (!ok) process.exitCode = 1;
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) runPreflight().catch(error => { console.error(error?.stack || error); process.exitCode = 1; });
