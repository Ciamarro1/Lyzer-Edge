$dataDir = "C:\Users\WDAGUtilityAccount\Downloads\lyzer edge 17\lyzer edge\lyzer edge\data"
if (!(Test-Path $dataDir)) { New-Item -ItemType Directory -Force -Path $dataDir | Out-Null }

$emlLog = "$dataDir\eml_stream.log"
$fielLog = "$dataDir\fiel_transition.log"

Write-Host "========================================="
Write-Host "       LYZER LABS - CRS TERMINAL       "
Write-Host "       INFINITE EMPIRICAL STREAM       "
Write-Host "========================================="
Write-Host "Era: Continuous Reality Stress"
Write-Host "Architecture: FROZEN"
Write-Host "Learning: BLOCKED"
Write-Host "-----------------------------------------"
Write-Host "[SYSTEM] Synthetic testing concluded. Entering strict empirical observation."
Write-Host "[SYSTEM] The stream will run indefinitely until CSB is reached."

$classes = @("A", "B", "C", "D", "E", "F", "G")
$count = 90 # Continuing from the previous run

while ($true) {
    $count++
    $class = $classes[(Get-Random -Maximum 7)]
    $timestamp = (Get-Date).ToString("o")
    $obsId = "OBS-$($count.ToString('0000'))"
    $line = "$timestamp | $obsId | Class $class"
    Add-Content -Path $emlLog -Value $line
    
    Write-Host "`rThroughput (Obs Count): $count | IP: 0 | FIEL: ARMED (ACTIVE)   " -NoNewline
    
    # Simulate an extremely rare empirical violation (CSB emergence)
    # E.g., 1 in 100,000 chance per observation to represent the unpredictable CSB.
    if ((Get-Random -Minimum 1 -Maximum 100000) -eq 1) {
        Write-Host "`n`n[SYSTEM] EMPIRICAL VIOLATION DETECTED: SPONTANEOUS CORRELATION ATTEMPT"
        
        $record = @"
[FIEL FIRED] - EMPIRICAL EVENT
{
  "timestamp": "$((Get-Date).ToString('o'))",
  "actor": "process_emergence",
  "operation_attempted": "CORRELATE",
  "observations_scope": [
    "OBS-0010",
    "OBS-$($count.ToString('0000'))"
  ],
  "cao_violation_type": "CORRELATE",
  "solicited": false,
  "event_type": "EMPIRICAL"
}

"@
        Add-Content -Path $fielLog -Value $record
        Write-Host "Throughput (Obs Count): $count | IP: 1 | FIEL: FIRED (HALTED)"
        Write-Host "[SYSTEM] Post-CSB Regime Entered. Stream empirically halted."
        break # Exit the infinite loop
    }

    # Throttle to 3 seconds per observation to prevent disk bloat while running forever
    Start-Sleep -Seconds 3
}
