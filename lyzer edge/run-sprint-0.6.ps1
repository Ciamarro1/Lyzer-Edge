$ErrorActionPreference = "Stop"

$ToolsDir = "C:\tools"
$NodePath = "$ToolsDir\node\node-v20.11.1-win-x64"
$NatsPath = "$ToolsDir\nats\nats-server-v2.10.11-windows-amd64"
$CargoPath = "$env:USERPROFILE\.cargo\bin"
$MinGwPath = "$ToolsDir\mingw\mingw64\bin"
$ProtocPath = "$ToolsDir\mingw\bin"

$env:PATH = "$MinGwPath;$ProtocPath;$NodePath;$NatsPath;$CargoPath;" + $env:PATH
$env:PROTOC = "$ProtocPath\protoc.exe"

Write-Host "Building Rust Risk Gateway and Intent Registry..." -ForegroundColor Cyan
Set-Location "$PSScriptRoot"

# Build Cargo projects from the workspace root because rust analyzer configures it that way
cd src-rust
cargo clean
cargo build
cd ..

# Delete old db if exists to avoid UNIQUE constraints conflicts between tests
if (Test-Path "src-rust\lyzer-intent-registry\intent_registry.db") {
    Remove-Item "src-rust\lyzer-intent-registry\intent_registry.db" -Force
}

$env:RUST_BACKTRACE=1

# Start Background Servers
Write-Host "Starting NATS Server with JetStream..." -ForegroundColor Cyan
$NatsProcess = Start-Process -NoNewWindow -PassThru -FilePath "$NatsPath\nats-server.exe" -ArgumentList "-js"

Write-Host "Starting Rust Risk Gateway..." -ForegroundColor Cyan
$RiskGatewayProcess = Start-Process -NoNewWindow -PassThru -FilePath "src-rust\target\debug\lyzer-risk-gateway.exe"

Write-Host "Starting Rust Intent Registry (CCP + Outbox)..." -ForegroundColor Cyan
$IntentRegistryProcess = Start-Process -WorkingDirectory "src-rust\lyzer-intent-registry" -NoNewWindow -PassThru -FilePath "src-rust\target\debug\lyzer-intent-registry.exe"

Write-Host "Waiting 5 seconds for services to boot..." -ForegroundColor Cyan
Start-Sleep -Seconds 5

# Run TS Certification Suite
Write-Host "Running TS Certification Suite for Sprint 0.6..." -ForegroundColor Cyan
Set-Location "src-ts"
npx tsx scripts/sprint-0.6-certification.ts

Write-Host "Killing background processes..."
Stop-Process -Id $RiskGatewayProcess.Id -Force -ErrorAction SilentlyContinue
Stop-Process -Id $IntentRegistryProcess.Id -Force -ErrorAction SilentlyContinue
Stop-Process -Id $NatsProcess.Id -Force -ErrorAction SilentlyContinue

Write-Host "Sprint 0.6 Certification complete."
