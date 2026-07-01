$ErrorActionPreference = "Continue"

$ToolsDir = "C:\tools"
$NodePath = "$ToolsDir\node\node-v20.11.1-win-x64"
$NatsPath = "$ToolsDir\nats\nats-server-v2.10.11-windows-amd64"
$CargoPath = "$env:USERPROFILE\.cargo\bin"
$MinGwPath = "$ToolsDir\mingw\mingw64\bin"
$ProtocPath = "$ToolsDir\mingw\bin"

$env:PATH = "$MinGwPath;$ProtocPath;$NodePath;$NatsPath;$CargoPath;" + $env:PATH

Write-Host "Building Rust Risk Gateway and Intent Registry..."
Set-Location "$PSScriptRoot\src-rust"
cargo build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Cargo build failed!"
    exit 1
}

Write-Host "Starting Rust Risk Gateway..."
$RiskGatewayProcess = Start-Process -NoNewWindow -PassThru -FilePath "C:\Users\WDAGUtilityAccount\Downloads\lyzer edge 10\lyzer edge\lyzer edge\src-rust\target\debug\lyzer-risk-gateway.exe"

Write-Host "Starting Rust Intent Registry..."
$IntentRegistryProcess = Start-Process -NoNewWindow -PassThru -FilePath "C:\Users\WDAGUtilityAccount\Downloads\lyzer edge 10\lyzer edge\lyzer edge\src-rust\target\debug\lyzer-intent-registry.exe"

Write-Host "Waiting 5 seconds for services to boot..."
Start-Sleep -Seconds 5

Write-Host "Running TS Certification Suite for Sprint 0.5.1..."
Set-Location "$PSScriptRoot"
$TestOutput = npx tsx src-ts/scripts/sprint-0.5-certification.ts

Write-Host "================== TEST OUTPUT =================="
$TestOutput | Out-Host
Write-Host "================================================="

Write-Host "Killing background processes..."
Stop-Process -Name "lyzer-risk-gateway" -Force -ErrorAction SilentlyContinue
Stop-Process -Name "lyzer-intent-registry" -Force -ErrorAction SilentlyContinue

Write-Host "Sprint 0.5 Certification complete."
