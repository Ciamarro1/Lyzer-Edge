$ErrorActionPreference = "Continue"

$ToolsDir = "C:\tools"
$NodePath = "$ToolsDir\node\node-v20.11.1-win-x64"
$NatsPath = "$ToolsDir\nats\nats-server-v2.10.11-windows-amd64"
$CargoPath = "$env:USERPROFILE\.cargo\bin"
$MinGwPath = "$ToolsDir\mingw\mingw64\bin"
$ProtocPath = "$ToolsDir\mingw\bin"

$env:PATH = "$MinGwPath;$ProtocPath;$NodePath;$NatsPath;$CargoPath;" + $env:PATH

# Check if dlltool is available, if not, install MinGW
if (!(Get-Command "dlltool.exe" -ErrorAction SilentlyContinue)) {
    Write-Host "Installing MinGW-w64 (required for Rust GNU toolchain)..."
    if (!(Test-Path "$ToolsDir\mingw")) {
        New-Item -ItemType Directory -Force -Path "$ToolsDir\mingw" | Out-Null
    }
    $MinGwUrl = "https://github.com/brechtsanders/winlibs_mingw/releases/download/13.2.0-16.0.6-11.0.1-msvcrt-r1/winlibs-x86_64-posix-seh-gcc-13.2.0-mingw-w64msvcrt-11.0.1-r1.zip"
    $MinGwZip = "$ToolsDir\mingw.zip"
    Invoke-WebRequest -Uri $MinGwUrl -OutFile $MinGwZip
    Write-Host "Extracting MinGW..."
    tar -xf $MinGwZip -C "$ToolsDir\mingw"
    Write-Host "MinGW installed."
}

# Check if protoc is available
if (!(Get-Command "protoc.exe" -ErrorAction SilentlyContinue)) {
    Write-Host "Installing Protoc (required for tonic-build)..."
    $ProtocUrl = "https://github.com/protocolbuffers/protobuf/releases/download/v25.3/protoc-25.3-win64.zip"
    $ProtocZip = "$ToolsDir\protoc.zip"
    Invoke-WebRequest -Uri $ProtocUrl -OutFile $ProtocZip
    tar -xf $ProtocZip -C "$ToolsDir\mingw"
    Write-Host "Protoc installed."
}

Set-Location "$PSScriptRoot"

Write-Host "Installing NPM dependencies (including tsx)..."
npm install @grpc/grpc-js @grpc/proto-loader nats uuid typescript tsx

Write-Host "Building Rust Risk Gateway (this may take a minute)..."
Set-Location "$PSScriptRoot/src-rust/lyzer-risk-gateway"
cargo build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Cargo build failed!"
    exit 1
}

Write-Host "Starting NATS Server..."
Start-Process -NoNewWindow -FilePath "nats-server" -ArgumentList "-js"

Write-Host "Starting Rust Risk Gateway..."
Start-Process -NoNewWindow -FilePath "c:/Users/WDAGUtilityAccount/Downloads/lyzer edge 10/lyzer edge/lyzer edge/src-rust/target/debug/lyzer-risk-gateway.exe"

Write-Host "Waiting 5 seconds for services to boot..."
Start-Sleep -Seconds 5

Write-Host "Running TS Certification Suite..."
Set-Location "$PSScriptRoot"
npx tsx src-ts/scripts/setup-nats.ts
$TestOutput = npx tsx src-ts/scripts/boundary-certification-suite.ts

Write-Host "================== TEST OUTPUT =================="
$TestOutput | Out-Host
Write-Host "================================================="

Write-Host "Killing background processes..."
Stop-Process -Name "nats-server" -Force -ErrorAction SilentlyContinue
Stop-Process -Name "lyzer-risk-gateway" -Force -ErrorAction SilentlyContinue
