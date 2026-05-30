#!/usr/bin/env bash
set -euo pipefail

TARGET_ENV="${PHASE3_TARGET_ENV:-production-copy}"
MODE="${PHASE3_DEPLOY_MODE:-dry-run}"
CONFIG_PATH="${PHASE3_WRANGLER_CONFIG:-wrangler.toml}"
DRYRUN_OUTDIR="${PHASE3_DRYRUN_OUTDIR:-../.wrangler-dryrun/production-copy}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKER_DIR="${ROOT_DIR}/deploy-worker"

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

info() {
  echo "phase3-deploy: $*"
}

if [[ "${TARGET_ENV}" != "production-copy" ]]; then
  fail "PHASE3_TARGET_ENV must be exactly production-copy. Refusing target: ${TARGET_ENV}"
fi

if [[ ! -d "${WORKER_DIR}" ]]; then
  fail "deploy-worker directory not found"
fi

info "target environment: ${TARGET_ENV}"
info "mode: ${MODE}"
info "production remains out of scope"

info "checking commercial launch gate"
(cd "${ROOT_DIR}" && npm run gate:commercial-launch)

case "${MODE}" in
  dry-run)
    info "running Wrangler deploy dry-run only"
    (
      cd "${WORKER_DIR}"
      npx wrangler deploy --config "${CONFIG_PATH}" --env "${TARGET_ENV}" --dry-run --outdir "${DRYRUN_OUTDIR}"
    )
    info "dry-run complete; no deployment was performed"
    ;;
  execute)
    [[ "${PHASE3_DEPLOY_APPROVED:-}" == "YES" ]] || fail "set PHASE3_DEPLOY_APPROVED=YES"
    [[ "${PHASE3_CONFIRM_NO_PRODUCTION:-}" == "YES" ]] || fail "set PHASE3_CONFIRM_NO_PRODUCTION=YES"
    [[ -n "${PHASE3_CHANGE_TICKET:-}" ]] || fail "set PHASE3_CHANGE_TICKET to the approved change ticket"

    info "executing production-copy deploy with approved change ticket ${PHASE3_CHANGE_TICKET}"
    (
      cd "${WORKER_DIR}"
      npx wrangler deploy --config "${CONFIG_PATH}" --env "${TARGET_ENV}" --keep-vars
    )
    info "production-copy deployment command completed"
    ;;
  *)
    fail "PHASE3_DEPLOY_MODE must be dry-run or execute"
    ;;
esac
