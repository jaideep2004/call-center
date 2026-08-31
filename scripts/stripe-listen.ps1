# Stripe CLI local webhook forwarder — one-shot setup
# Usage:  powershell -ExecutionPolicy Bypass -File scripts\stripe-listen.ps1
#
# Requires: STRIPE_SECRET_KEY set to a REAL sk_test_ key in .env

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$dotenv = Get-Content (Join-Path $projectRoot ".env")
$key = ($dotenv | Select-String '^STRIPE_SECRET_KEY=').Line -replace '^STRIPE_SECRET_KEY=',''

if (-not $key -or $key -match 'sk_test_replac' -or $key.Length -lt 30) {
    Write-Host "X  STRIPE_SECRET_KEY in .env is missing or still a placeholder." -ForegroundColor Red
    Write-Host "   Paste your REAL test key (sk_test_...) from Stripe Dashboard -> Test mode -> API keys," -ForegroundColor Yellow
    Write-Host "   then re-run this script." -ForegroundColor Yellow
    exit 1
}

$exe = Join-Path $env:USERPROFILE "stripe-cli\stripe.exe"
if (-not (Test-Path $exe)) {
    Write-Host "X  stripe.exe not found at $exe" -ForegroundColor Red
    exit 1
}

$outFile = Join-Path $env:TEMP "stripe-listen.out.log"
$errFile = Join-Path $env:TEMP "stripe-listen.err.log"
if (Test-Path $outFile) { Remove-Item $outFile -Force }

Write-Host "Starting stripe listen -> localhost:30001/api/webhooks/stripe ..." -ForegroundColor Cyan
$proc = Start-Process -FilePath $exe `
    -ArgumentList "listen","--api-key",$key,"--forward-to","localhost:30001/api/webhooks/stripe" `
    -RedirectStandardOutput $outFile -RedirectStandardError $errFile `
    -PassThru -WindowStyle Hidden

Start-Sleep -Seconds 12

# Check both stdout and stderr files for the whsec
$whsec = @(
    Select-String -Path $outFile -Pattern 'whsec_[A-Za-z0-9]+' -AllMatches
    Select-String -Path $errFile -Pattern 'whsec_[A-Za-z0-9]+' -AllMatches
).Matches.Value

if (-not $whsec) {
    # Fallback: regex on both files
    $combined = (Get-Content $outFile -Raw -ErrorAction SilentlyContinue) + (Get-Content $errFile -Raw -ErrorAction SilentlyContinue)
    $whsec = ([regex]::Match($combined, 'whsec_[A-Za-z0-9]+')).Value
}

if (-not $whsec) {
    Write-Host "X  Could not capture webhook signing secret. Output:" -ForegroundColor Red
    Get-Content $outFile -ErrorAction SilentlyContinue
    Write-Host "err:"; Get-Content $errFile -ErrorAction SilentlyContinue | Select-Object -First 10
    Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
    exit 1
}

Write-Host ("OK  signing secret captured: {0}..." -f $whsec.Substring(0, 12)) -ForegroundColor Green

Push-Location $projectRoot
npx tsx scripts/store-whsec.ts $whsec
Pop-Location

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "READY. Forwarder running (PID $($proc.Id))." -ForegroundColor Green
    Write-Host ""
    Write-Host "Now trigger a payment:" -ForegroundColor Cyan
    Write-Host "  Option A: click a wallet top-up button in the app, card 4242 4242 4242 4242" -ForegroundColor Gray
    Write-Host ("  Option B: & `"{0}`" trigger checkout.session.completed --api-key <your sk_test_ key>" -f $exe) -ForegroundColor Gray
    Write-Host ""
    Write-Host "Forwarder log: $outFile"
    Write-Host "Keep this process running while testing. Stop it with: Stop-Process -Id $($proc.Id)"
} else {
    Write-Host "Storing the secret failed - the forwarder is still running (PID $($proc.Id))." -ForegroundColor Yellow
    Write-Host "You can paste the whsec manually in Admin -> System Settings instead." -ForegroundColor Yellow
}
