import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const git = "C:\\Program Files\\Git\\cmd\\git.exe";

const trackedFiles = execFileSync(git, ["ls-files"], {
  cwd: root,
  encoding: "utf8"
})
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean);

const forbiddenTrackedNames = new Set([
  ".env",
  ".env.local",
  ".dev.vars",
  "deploy-worker/.dev.vars"
]);

const secretKeys = [
  "JWT_SECRET",
  "PW_SALT",
  "DATA_ENCRYPTION_KEY",
  "MANAGER_PW_HASH",
  "STAFF_PW_HASH",
  "OWNER_PASSWORD",
  "ADMIN_PASSWORD",
  "LOCAL_MANAGER_PASSWORD",
  "LOCAL_STAFF_PASSWORD",
  "LOCAL_EMPLOYEE_PIN",
  "TTLOCK_CLIENT_SECRET",
  "TTLOCK_PASSWORD",
  "CF_API_TOKEN",
  "CLOUDFLARE_API_TOKEN"
];

const placeholderPattern =
  /^(replace-with-|generate-|local-test-only|\[\]|""|''|changeme|example-|dummy-)/i;
const violations = [];

function isExampleFile(file) {
  return (
    file.endsWith(".example") || file.endsWith(".env.example") || file.endsWith(".local.example")
  );
}

for (const file of trackedFiles) {
  const normalized = file.replaceAll("\\", "/");
  if (forbiddenTrackedNames.has(normalized)) {
    violations.push(`${normalized}: forbidden local secret file is tracked`);
    continue;
  }

  const absolute = path.join(root, normalized);
  let text = "";
  try {
    text = readFileSync(absolute, "utf8");
  } catch {
    continue;
  }

  for (const key of secretKeys) {
    const assignment = new RegExp(`^${key}\\s*=\\s*([\"']?)([^\"'\\r\\n#]+)\\1\\s*$`, "gm");
    for (const match of text.matchAll(assignment)) {
      const value = String(match[2] || "").trim();
      if (isExampleFile(normalized) && placeholderPattern.test(value)) continue;
      violations.push(`${normalized}: tracked secret-looking assignment for ${key}`);
    }
  }
}

if (violations.length) {
  console.error("Secret hygiene check failed:");
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log("Secret hygiene check passed.");
