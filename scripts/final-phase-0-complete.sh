#!/usr/bin/env bash
set -euo pipefail

echo "PHASE C + D + E: final Phase 0 execution"

node scripts/execute-phase0-tests.js || true
npm run security:secrets
node --test tests/integration/*.test.mjs
npm run gate:commercial-launch

echo "Phase 0 execution completed. Review docs/PHASE_0_TEST_RESULTS_FINAL.md."
