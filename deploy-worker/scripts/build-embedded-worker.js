const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const publicDir = path.join(root, "public");
const sourcePath = path.join(root, "src", "index.js");
const outPath = path.join(root, "src", "index.embedded.js");

function contentType(name) {
  if (name.endsWith(".html")) return "text/html; charset=utf-8";
  if (name.endsWith(".js")) return "application/javascript; charset=utf-8";
  return "application/octet-stream";
}

const assets = {};
for (const name of fs.readdirSync(publicDir)) {
  const full = path.join(publicDir, name);
  if (!fs.statSync(full).isFile()) continue;
  assets[`/${name}`] = {
    type: contentType(name),
    b64: fs.readFileSync(full).toString("base64"),
  };
}

const embeddedHelper = `
const EMBEDDED_ASSETS = ${JSON.stringify(assets)};
function embeddedAssetResponse(pathname) {
  const clean = pathname === "/" ? "/index.html" : (pathname.endsWith(".html") || pathname.endsWith(".js") ? pathname : pathname + ".html");
  const asset = EMBEDDED_ASSETS[clean] || EMBEDDED_ASSETS[pathname];
  if (!asset) return null;
  const binary = atob(asset.b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Response(bytes, { headers: { "Content-Type": asset.type, "Cache-Control": "no-store" } });
}
`;

const original = fs.readFileSync(sourcePath, "utf8");
const marker = `  if (env.ASSETS) {
    return env.ASSETS.fetch(request);
  }
  return new Response("Homelink Finance API is running. Use /auth/login for authentication.", {`;
const replacement = `  if (env.ASSETS) {
    return env.ASSETS.fetch(request);
  }
  const embeddedResponse = embeddedAssetResponse(path);
  if (embeddedResponse) return embeddedResponse;
  return new Response("Homelink Finance API is running. Use /auth/login for authentication.", {`;

const generated = embeddedHelper + original.replace(marker, replacement);
if (!generated.includes("const embeddedResponse = embeddedAssetResponse(path);")) {
  throw new Error("embedded fallback injection failed");
}

fs.writeFileSync(outPath, generated, "utf8");
console.log(`Generated ${outPath} with ${Object.keys(assets).length} embedded assets.`);
