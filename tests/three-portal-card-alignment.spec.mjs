import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("three portal cards use consistent centered text layout", async () => {
  const html = await readFile("deploy-worker/public/portal.html", "utf8");

  assert.match(html, /\.door\{[\s\S]*justify-content:center/);
  assert.match(html, /\.door\{[\s\S]*text-align:center/);
  assert.match(html, /\.door\{[\s\S]*min-height:88px/);
  assert.match(html, /\.door span\{[\s\S]*display:flex/);
  assert.match(html, /\.door span\{[\s\S]*flex-direction:column/);
  assert.match(html, /\.door span\{[\s\S]*align-items:center/);
  assert.match(html, /\.door strong\{[\s\S]*line-height:1\.12/);
});

test("portal still exposes exactly employee owner admin entries", async () => {
  const html = await readFile("deploy-worker/public/portal.html", "utf8");
  const cards = [...html.matchAll(/data-portal="([^"]+)"/g)].map((m) => m[1]);

  assert.deepEqual(cards, ["employee", "owner", "admin"]);
  assert.doesNotMatch(html, /data-portal="arrears"|directive-door|ARREARS FOLLOW-UP/i);
});

