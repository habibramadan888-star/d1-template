import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("owner primary nav is capped at five visible modules and keeps network on the first row", async () => {
  const html = await readFile("deploy-worker/public/index-51.html", "utf8");

  assert.match(html, /id="navArrears"/);
  assert.match(html, /id="navWifi"/);
  assert.match(
    html,
    /\.owner-ui-unified \.nav\{[\s\S]*grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/
  );
  assert.match(html, /\.owner-ui-unified #navClients\{display:none!important\}/);
  assert.match(
    html,
    /@media\(max-width:720px\)[\s\S]*\.owner-ui-unified \.nav\{[\s\S]*grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/
  );
});
