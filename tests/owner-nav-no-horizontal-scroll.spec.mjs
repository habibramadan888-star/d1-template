import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const files = [
  'deploy-worker/public/index.html',
  'deploy-worker/public/index-51.html',
];

function ownerCss(content) {
  return content
    .split('\n')
    .filter((line) => line.includes('.owner-ui-unified') || line.includes('OWNER NAV LOCK'))
    .join('\n');
}

for (const file of files) {
  test(`${file} does not allow horizontal owner nav scrolling`, () => {
    const html = readFileSync(file, 'utf8');
    const css = ownerCss(html);
    assert.doesNotMatch(css, /overflow-x\s*:\s*auto/i);
    assert.doesNotMatch(css, /width\s*:\s*max-content/i);
    assert.doesNotMatch(css, /scroll-snap/i);
    assert.doesNotMatch(css, /flex-wrap\s*:\s*nowrap!important;width:max-content/i);
    assert.doesNotMatch(html, /data-view="arrears"/);
  });
}

test('production cutover remains no-go in gate script', () => {
  const gate = readFileSync('scripts/gate-commercial-launch-readiness.mjs', 'utf8');
  assert.match(gate, /PRODUCTION_NO_GO/);
  assert.doesNotMatch(gate, /PRODUCTION_READY_GO/);
});
