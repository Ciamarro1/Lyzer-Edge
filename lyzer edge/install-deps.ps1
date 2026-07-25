$ErrorActionPreference = "Stop"

$ToolsDir = "C:\tools"
if (!(Test-Path $ToolsDir)) {
    New-Item -ItemType Directory -Force -Path $ToolsDir | Out-Null
}

# 1. Install Node.js & npm
Write-Host "Installing Node.js..."
$NodeUrl = "https://nodejs.org/dist/v20.11.1/node-v20.11.1-win-x64.zip"
$NodeZip = "$ToolsDir\node.zip"
$NodeExtract = "$ToolsDir\node"
Invoke-WebRequest -Uri $NodeUrl -OutFile $NodeZip
Expand-Archive -Path $NodeZip -DestinationPath $NodeExtract -Force
$NodePath = "$NodeExtract\node-v20.11.1-win-x64"

# 2. Install NATS Server
Write-Host "Installing NATS Server..."
$NatsUrl = "https://github.com/nats-io/nats-server/releases/download/v2.10.11/nats-server-v2.10.11-windows-amd64.zip"
$NatsZip = "$ToolsDir\nats.zip"
$NatsExtract = "$ToolsDir\nats"
Invoke-WebRequest -Uri $NatsUrl -OutFile $NatsZip
Expand-Archive -Path $NatsZip -DestinationPath $NatsExtract -Force
$NatsPath = "$NatsExtract\nats-server-v2.10.11-windows-amd64"

# 3. Install Rust
Write-Host "Installing Rust (GNU toolchain)..."
$RustupExe = "$ToolsDir\rustup-init.exe"
Invoke-WebRequest -Uri "https://win.rustup.rs/x86_64" -OutFile $RustupExe
& $RustupExe -y --default-host x86_64-pc-windows-gnu --no-modify-path
$CargoPath = "$env:USERPROFILE\.cargo\bin"

# 4. Update PATH for current session and system
$NewPath = "$NodePath;$NatsPath;$CargoPath;" + $env:PATH
[Environment]::SetEnvironmentVariable("PATH", $NewPath, "User")
$env:PATH = $NewPath

Write-Host "Installation Complete."
Write-Host "Node: $(node --version)"
Write-Host "NPM: $(npm --version)"
Write-Host "Cargo: $(cargo --version)"
Write-Host "NATS: $(nats-server --version)"
