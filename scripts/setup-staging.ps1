param(
  [switch]$ApplyMigrations,
  [switch]$Deploy
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

Write-Host "======================================"
Write-Host "Staging Environment Setup"
Write-Host "======================================"

if (-not (Get-Command npx -ErrorAction SilentlyContinue)) {
  throw "npx is required. Install Node.js/npm first."
}

if (-not (Test-Path ".env.staging")) {
  Copy-Item ".env.staging.example" ".env.staging"
  Write-Host "Created local .env.staging from .env.staging.example"
} else {
  Write-Host ".env.staging already exists; leaving local values unchanged"
}

Write-Host "Validating staging Worker configuration with dry-run build..."
Push-Location "deploy-worker"
try {
  npx wrangler deploy --config wrangler.toml --env staging --dry-run --outdir ../.wrangler-dryrun/staging
} finally {
  Pop-Location
}

if ($ApplyMigrations) {
  Write-Host "Migration review requested. Remote D1 writes are intentionally not performed."
  Get-ChildItem "migrations" -Filter "*.sql" | ForEach-Object {
    Write-Host "Review and apply manually if approved: $($_.FullName)"
  }
} else {
  Write-Host "Skipping migrations. Use -ApplyMigrations only after backup and approval."
}

if ($Deploy) {
  throw "Refusing live staging deploy from setup script. Use the approved deployment runbook after sign-off."
}

Write-Host ""
Write-Host "======================================"
Write-Host "Staging setup preflight complete"
Write-Host "======================================"
Write-Host "Feature flags default to false:"
Write-Host "  FF_BACKEND_TOTALS=false"
Write-Host "  FF_RECEIVABLES_STATE=false"
Write-Host "  FF_TENANT_ISOLATION=false"
Write-Host "  FF_AUDIT_TRAIL=false"
