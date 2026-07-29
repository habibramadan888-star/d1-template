#!/usr/bin/env bash
set -euo pipefail

TARGET_ENV="${PHASE3_TARGET_ENV:-production-copy}"
MODE="${PHASE3_ROLLBACK_MODE:-dry-run}"
CONFIG_PATH="${PHASE3_WRANGLER_CONFIG:-wrangler.toml}"
ROLLBACK_VERSION_ID="${PHASE3_ROLLBACK_VERSION_ID:-}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKER_DIR="${ROOT_DIR}/deploy-worker"

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

info() {
  echo "phase3-rollback: $*"
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

case "${MODE}" in
  dry-run)
    info "dry-run only; no rollback will be executed"
    info "recommended pre-rollback commands:"
    echo "  cd deploy-worker"
    echo "  npx wrangler versions list --config ${CONFIG_PATH} --env ${TARGET_ENV}"
    if [[ -n "${ROLLBACK_VERSION_ID}" ]]; then
      echo "  npx wrangler rollback ${ROLLBACK_VERSION_ID} --config ${CONFIG_PATH} --env ${TARGET_ENV}"
    else
      echo "  npx wrangler rollback --config ${CONFIG_PATH} --env ${TARGET_ENV}"
    fi
    ;;
  execute)
    [[ "${PHASE3_ROLLBACK_APPROVED:-}" == "YES" ]] || fail "set PHASE3_ROLLBACK_APPROVED=YES"
    [[ "${PHASE3_CONFIRM_NO_PRODUCTION:-}" == "YES" ]] || fail "set PHASE3_CONFIRM_NO_PRODUCTION=YES"

    info "listing recent production-copy Worker versions before rollback"
    (
      cd "${WORKER_DIR}"
      npx wrangler versions list --config "${CONFIG_PATH}" --env "${TARGET_ENV}"
    )

    info "executing production-copy rollback"
    if [[ -n "${ROLLBACK_VERSION_ID}" ]]; then
      (
        cd "${WORKER_DIR}"
        npx wrangler rollback "${ROLLBACK_VERSION_ID}" --config "${CONFIG_PATH}" --env "${TARGET_ENV}"
      )
    else
      (
        cd "${WORKER_DIR}"
        npx wrangler rollback --config "${CONFIG_PATH}" --env "${TARGET_ENV}"
      )
    fi

    info "rollback command completed; run smoke and monitoring validation immediately"
    ;;
  *)
    fail "PHASE3_ROLLBACK_MODE must be dry-run or execute"
    ;;
esac
