import fs from 'fs';
import path from 'path';

/**
 * Stage B: Provenance Audit
 * 
 * Verifies the integrity of the ingested empirical data.
 * Detects missing bars, gaps, and statistical impossibilities.
 */

const DATA_DIR = path.join(__dirname, '../../../data/empirical');
const INPUT_FILE = path.join(DATA_DIR, 'btcusdt_1h_5y.json');
const REPORT_FILE = path.join(DATA_DIR, 'provenance_audit_report.json');

const HOUR_MS = 60 * 60 * 1000;

interface AuditReport {
  totalBars: number;
  expectedBars: number;
  missingBarsCount: number;
  gaps: Array<{ startMs: number; endMs: number; gapHours: number }>;
  zeroVolumeCount: number;
  extremeSpikes: Array<{ timestampMs: number; percentChange: number }>;
}

async function audit() {
  console.log(`[STAGE B] Starting Provenance Audit`);

  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`[ERROR] Dataset not found at ${INPUT_FILE}. Run Stage A first.`);
    return;
  }

  const bars: any[] = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));
  console.log(`Loaded ${bars.length} bars. Scanning for reality anomalies...`);

  if (bars.length < 2) {
    console.log(`[STAGE B] Insufficient data to audit.`);
    return;
  }

  const report: AuditReport = {
    totalBars: bars.length,
    expectedBars: 0,
    missingBarsCount: 0,
    gaps: [],
    zeroVolumeCount: 0,
    extremeSpikes: []
  };

  const firstTimestamp = bars[0].timestampMs;
  const lastTimestamp = bars[bars.length - 1].timestampMs;
  
  report.expectedBars = Math.floor((lastTimestamp - firstTimestamp) / HOUR_MS) + 1;
  report.missingBarsCount = report.expectedBars - report.totalBars;

  for (let i = 1; i < bars.length; i++) {
    const current = bars[i];
    const previous = bars[i - 1];

    // Gap detection
    const timeDiff = current.timestampMs - previous.timestampMs;
    if (timeDiff > HOUR_MS) {
      report.gaps.push({
        startMs: previous.timestampMs,
        endMs: current.timestampMs,
        gapHours: Math.floor(timeDiff / HOUR_MS) - 1
      });
    }

    // Zero volume check
    if (current.volume === 0) {
      report.zeroVolumeCount++;
    }

    // Extreme spike check (> 20% in 1h)
    const pctChange = Math.abs((current.close - previous.close) / previous.close);
    if (pctChange > 0.2) {
      report.extremeSpikes.push({
        timestampMs: current.timestampMs,
        percentChange: pctChange * 100
      });
    }
  }

  console.log(`[STAGE B] Audit Complete.`);
  console.log(`Expected Bars: ${report.expectedBars}`);
  console.log(`Actual Bars: ${report.totalBars}`);
  console.log(`Missing Bars: ${report.missingBarsCount}`);
  console.log(`Total Gaps Discovered: ${report.gaps.length}`);
  console.log(`Extreme Spikes Detected: ${report.extremeSpikes.length}`);

  fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));
  console.log(`[STAGE B] Saved audit report to ${REPORT_FILE}`);
}

audit().catch(console.error);
