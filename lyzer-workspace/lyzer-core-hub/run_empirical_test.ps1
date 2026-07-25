cd "C:\Users\WDAGUtilityAccount\Downloads\lyzer edge 21\lyzer edge\lyzer-workspace\lyzer-core-hub"

$CargoPath = "C:\Users\WDAGUtilityAccount\.cargo\bin\cargo.exe"

# Build the hub
& $CargoPath build

# Start the hub in background
Start-Process -FilePath $CargoPath -ArgumentList "run" -NoNewWindow -PassThru -RedirectStandardOutput "hub_output.log" -RedirectStandardError "hub_error.log" | Set-Variable -Name HubProcess

Start-Sleep -Seconds 3

# Send V1 empirical interpretation
$v1_payload = @{
    observer = @{ Agent = "Provider-V1" }
    incentive_profile = @{ primary_mandate = "High-Frequency Volatility Extraction"; constraints = @("Temporal < 50ms") }
    evidence_references = @("BINANCE-LIVE-BTCUSDT-T0")
    interpretation = "Volatility Expansion Detected: Expecting +1% impulse."
    justification = "Real WebSocket data ingested."
    confidence = 0.92
} | ConvertTo-Json -Depth 5 -Compress

Invoke-RestMethod -Uri "http://127.0.0.1:8080" -Method Post -Body $v1_payload -ContentType "application/json" | Out-Null

# Send V2 empirical interpretation
$v2_payload = @{
    observer = @{ Agent = "Provider-V2" }
    incentive_profile = @{ primary_mandate = "Macro-Causal Trend Discovery"; constraints = @("Compute < 1000 GFLOPS") }
    evidence_references = @("BINANCE-LIVE-BTCUSDT-T0")
    interpretation = "Mean Reversion Detected: Expecting -0.5% collapse."
    justification = "Real WebSocket data ingested."
    confidence = 0.65
} | ConvertTo-Json -Depth 5 -Compress

Invoke-RestMethod -Uri "http://127.0.0.1:8080" -Method Post -Body $v2_payload -ContentType "application/json" | Out-Null

# Wait for the hub to arbitrate, assess truth, and exit
Start-Sleep -Seconds 2

# Output the captured log
Get-Content -Path "hub_output.log"
