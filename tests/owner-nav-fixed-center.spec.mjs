import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const files = [
  'deploy-worker/public/index.html',
  'deploy-worker/public/index-51.html',
];

for (const file of files) {
  test(`${file} keeps owner nav fixed and centered`, () => {
    const html = readFileSync(file, 'utf8');
    assert.match(html, /OWNER NAV LOCK: fixed centered tabs, no horizontal scroll/);
    assert.match(html, /\.owner-ui-unified \.topbar-row2\{display:flex;justify-content:center;overflow:hidden\}/);
    assert.match(html, /\.owner-ui-unified \.nav\{display:grid!important;grid-template-columns:repeat\(5,minmax\(0,1fr\)\)!important/);
    assert.match(html, /width:min\(100%,430px\)!important/);
    assert.match(html, /id="navAnalysis"/);
    assert.match(html, /id="navWifi"/);
  });
}
