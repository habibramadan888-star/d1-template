import { existsSync, readdirSync } from "node:fs";
import { extname, join } from "node:path";
import { spawnSync } from "node:child_process";

const fixedFiles = [
  "deploy-worker/src/index.js",
  "deploy-worker/scripts/build-embedded-worker.js",
  "index-51-main.js"
];

const scannedRoots = [
  { dir: "modules", extensions: new Set([".mjs"]) },
  { dir: "scripts", extensions: new Set([".mjs"]) },
  { dir: "tests", extensions: new Set([".mjs"]) },
  { dir: "tools", extensions: new Set([".cjs"]) },
  { dir: "deploy-worker/scripts", extensions: new Set([".js"]) }
];

function collectFiles(dir, extensions, results = []) {
  if (!existsSync(dir)) return results;

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      collectFiles(fullPath, extensions, results);
      continue;
    }
    if (entry.isFile() && extensions.has(extname(entry.name))) {
      results.push(fullPath.replace(/\\/g, "/"));
    }
  }

  return results;
}

const files = [
  ...fixedFiles.filter((file) => existsSync(file)),
  ...scannedRoots.flatMap((root) => collectFiles(root.dir, root.extensions))
];

const uniqueFiles = [...new Set(files)].sort();
const failures = [];

for (const file of uniqueFiles) {
  const result = spawnSync(process.execPath, ["--check", file], {
    encoding: "utf8"
  });

  if (result.status !== 0) {
    failures.push({
      file,
      stdout: result.stdout,
      stderr: result.stderr
    });
  }
}

if (failures.length > 0) {
  console.error(`Syntax check failed for ${failures.length} file(s).`);
  for (const failure of failures) {
    console.error(`\n--- ${failure.file} ---`);
    if (failure.stdout) console.error(failure.stdout.trim());
    if (failure.stderr) console.error(failure.stderr.trim());
  }
  process.exitCode = 1;
} else {
  console.log(`Syntax check passed for ${uniqueFiles.length} file(s).`);
}
