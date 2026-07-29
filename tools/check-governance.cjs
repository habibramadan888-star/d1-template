const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

const checks = [
  {
    file: "AI_CONTRACT.md",
    required: [
      "Do Not Expand Monolith Files",
      "Financial Amount Rules",
      "API Authentication And Authorization Rules",
      "Data Deletion Rules",
      "Multi-Tenant Rules",
      "Test Rules"
    ]
  },
  {
    file: "ARCHITECTURE.md",
    required: [
      "Module Boundaries",
      "Data Flow",
      "Worker Structure",
      "API Layer",
      "Permission Layer"
    ]
  },
  {
    file: "PROJECT_MAP.md",
    required: [
      "Main Entrypoints",
      "Cloudflare Structure",
      "Environment Variables And Secrets",
      "Database Relationship Map",
      "API Map"
    ]
  }
];

const failures = [];

for (const check of checks) {
  const fullPath = path.join(root, check.file);
  if (!fs.existsSync(fullPath)) {
    failures.push(`${check.file}: missing`);
    continue;
  }
  const text = fs.readFileSync(fullPath, "utf8");
  for (const phrase of check.required) {
    if (!text.includes(phrase)) {
      failures.push(`${check.file}: missing phrase "${phrase}"`);
    }
  }
}

if (failures.length) {
  console.error("Governance check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Governance check passed.");
