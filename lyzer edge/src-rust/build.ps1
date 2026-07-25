$ToolsDir = "C:\tools"
$MinGwPath = "$ToolsDir\mingw\mingw64\bin"
$ProtocPath = "$ToolsDir\mingw\bin"
$CargoPath = "$env:USERPROFILE\.cargo\bin"

$env:PATH = "$MinGwPath;$ProtocPath;$CargoPath;" + $env:PATH

Write-Host "Building workspace..."
cargo build
