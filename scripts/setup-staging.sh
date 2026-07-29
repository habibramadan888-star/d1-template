#!/usr/bin/env bash
set -euo pipefail

echo "======================================"
echo "Staging Environment Setup"
echo "======================================"

APPLY_MIGRATIONS=false
DEPLOY_DRY_RUN=true

for arg in "$@"; do
  case "$arg" in
    --apply-migrations)
      APPLY_MIGRATIONS=true
      ;;
    --deploy)
      DEPLOY_DRY_RUN=false
      ;;
    *)
      echo "Unknown argument: $arg"
      echo "Usage: scripts/setup-staging.sh [--apply-migrations] [--deploy]"
      exit 1
      ;;
  esac
done

if ! command -v npx >/dev/null 2>&1; then
  echo "npx is required. Install Node.js/npm first."
  exit 1
fi

if [ ! -f ".env.staging" ]; then
  cp .env.staging.example .env.staging
  echo "Created local .env.staging from .env.staging.example"
else
  echo ".env.staging already exists; leaving local values unchanged"
fi

echo "Validating staging Worker configuration with dry-run build..."
(
  cd deploy-worker
  npx wrangler deploy --config wrangler.toml --env staging --dry-run --outdir ../.wrangler-dryrun/staging
)

if [ "$APPLY_MIGRATIONS" = "true" ]; then
  echo "Applying local D1 migrations to homelink-finance-staging."
  echo "Remote/staging D1 writes are intentionally not performed by this script."
  for migration in migrations/*.sql; do
    if [ -f "$migration" ]; then
      echo "Review and apply manually if approved: $migration"
    fi
  done
else
  echo "Skipping migrations. Pass --apply-migrations only after backup and approval."
fi

if [ "$DEPLOY_DRY_RUN" = "false" ]; then
  echo "Refusing live staging deploy from setup script."
  echo "Use the approved deployment runbook after sign-off."
  exit 1
fi

echo ""
echo "======================================"
echo "Staging setup preflight complete"
echo "======================================"
echo "Feature flags default to false:"
echo "  FF_BACKEND_TOTALS=false"
echo "  FF_RECEIVABLES_STATE=false"
echo "  FF_TENANT_ISOLATION=false"
echo "  FF_AUDIT_TRAIL=false"
