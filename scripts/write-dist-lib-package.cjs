const { mkdirSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");

const distLibDir = join(__dirname, "..", "dist", "lib");

mkdirSync(distLibDir, { recursive: true });
writeFileSync(join(distLibDir, "package.json"), `${JSON.stringify({ type: "module" }, null, 2)}\n`);
