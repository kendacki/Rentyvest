# RentyVest full Canton DevNet deployment (DAR upload + contract instantiation)
# Requires: Daml SDK 3.4.x on PATH, root .env with DevNet participant credentials

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

if (-not (Get-Command daml -ErrorAction SilentlyContinue)) {
    if (-not (Test-Path "$env:USERPROFILE\.daml\bin\daml.exe")) {
        Write-Error @"
Daml SDK not found on PATH.

Install Daml 3.4.x for Canton Network DevNet:
  WSL/Linux: curl -sSL https://get.digitalasset.com/ | sh
  Then: daml install 3.4.11

Then reopen your terminal and rerun:
  .\scripts\deploy-all.ps1
"@
    }
    $env:PATH = "$env:USERPROFILE\.daml\bin;$env:PATH"
}

if (-not (Test-Path "$RepoRoot\.env")) {
    Write-Warning "No .env at repo root. Copy .env.example and set your DevNet participant credentials."
    Write-Host "  cp .env.example .env"
    exit 1
}

$bash = Get-Command bash -ErrorAction SilentlyContinue
if ($bash) {
    & bash -lc "cd '$($RepoRoot -replace '\\','/')' && make deploy-all"
    exit $LASTEXITCODE
}

Write-Error "Git Bash or WSL required to run make deploy-all on Windows."
