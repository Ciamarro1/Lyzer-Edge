import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = process.cwd();

console.log('================================================================');
console.log('🛡️ OFI001 — UNTOUCHED DATA INGESTION & FORENSIC ADMISSION AUDIT');
console.log('Timestamp UTC:', new Date().toISOString());
console.log('================================================================\n');

// 1. Check V8 Engine Invariance
const enginePath = path.resolve(rootDir, 'packages/lyzer-shared/src/providers/institutional_quant_signal_engine.js');
const engineBuf = fs.readFileSync(enginePath);
const engineSHA = crypto.createHash('sha256').update(engineBuf).digest('hex');
const expectedSHA = 'fc19e807255b3ecfb8351e82d7dc9d244c1e511d9aa007ac8b67b12d584b4db1';

console.log('1. Verifying V8 Engine Hash:');
console.log('   SHA-256:', engineSHA);
if (engineSHA !== expectedSHA) {
  console.error('❌ CONSTITUTIONAL BREACH: V8 engine hash mismatch! Ingestion blocked.');
  process.exit(1);
}
console.log('   ✔ V8 Engine 100% Frozen & Untouched.\n');

// Cutoff T0 = 2026-09-01 00:00:00 UTC
const T0 = 1788220800000;
console.log(`2. Enforcing Temporal Firewall Cutoff T0: ${T0} (${new Date(T0).toISOString()})\n`);

// Forensic audit function for any incoming candidate file
export function auditCandidateDataset(filePath, expectedAsset) {
  console.log(`Auditing candidate dataset: ${filePath}...`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`File does not exist: ${filePath}`);
  }

  const stat = fs.statSync(filePath);
  const buf = fs.readFileSync(filePath);
  const sha256 = crypto.createHash('sha256').update(buf).digest('hex');
  const data = JSON.parse(buf.toString('utf8'));

  if (!Array.isArray(data)) {
    throw new Error('Dataset must be a JSON array of candle objects.');
  }

  const n = data.length;
  console.log(`  Records count: ${n.toLocaleString()} rows (${(stat.size / (1024*1024)).toFixed(2)} MB)`);

  let prevTs = -Infinity;
  let gapsCount = 0;
  let invalidT0Count = 0;
  let nanCount = 0;
  let volumeViolations = 0;
  const seenTs = new Set();

  for (let i = 0; i < n; i++) {
    const row = data[i];
    const ts = Number(row.timestamp);

    // Check T0
    if (ts < T0) invalidT0Count++;

    // Check Monotonicity & Duplicates
    if (ts <= prevTs) {
      throw new Error(`Monotonicity failure at index ${i}: current ts ${ts} <= prev ts ${prevTs}`);
    }
    if (seenTs.has(ts)) {
      throw new Error(`Duplicate timestamp detected at index ${i}: ${ts}`);
    }
    seenTs.add(ts);

    // Check Gaps (1h = 3600000ms)
    if (i > 0 && (ts - prevTs) > 3600000) {
      gapsCount++;
    }

    // Check Fields & NaN
    for (const f of ['open', 'high', 'low', 'close', 'volume', 'taker_buy_volume']) {
      const val = Number(row[f]);
      if (row[f] === null || row[f] === undefined || isNaN(val)) {
        nanCount++;
      }
    }

    // Check Taker Volume Consistency
    const vol = Number(row.volume);
    const takerBuy = Number(row.taker_buy_volume);
    if (takerBuy < 0 || takerBuy > vol * 1.00001) {
      volumeViolations++;
    }

    prevTs = ts;
  }

  if (invalidT0Count > 0) {
    throw new Error(`FIREWALL BREACH: Found ${invalidT0Count} rows with timestamp < T0 (${new Date(T0).toISOString()})!`);
  }
  if (nanCount > 0) {
    throw new Error(`Data integrity breach: Found ${nanCount} NaN or null values!`);
  }
  if (volumeViolations > 0) {
    throw new Error(`Microstructure integrity breach: Found ${volumeViolations} rows with taker volume > total volume!`);
  }

  console.log(`  ✔ Monotonic ordering: strictly validated.`);
  console.log(`  ✔ Cutoff T0 firewall: 100% compliant (Zero contaminated bars).`);
  console.log(`  ✔ Missing/NaN values: 0`);
  console.log(`  ✔ Taker volume integrity: 100% valid.`);
  console.log(`  ✔ Gaps detected: ${gapsCount}`);
  console.log(`  ✔ SHA-256: ${sha256}\n`);

  return {
    filePath,
    asset: expectedAsset,
    records: n,
    sizeBytes: stat.size,
    sha256,
    firstTimestamp: new Date(data[0].timestamp).toISOString(),
    lastTimestamp: new Date(data[n - 1].timestamp).toISOString(),
    gapsCount,
    admittedToFirewallUTC: new Date().toISOString()
  };
}

console.log('Data ingestion and audit module armed and ready.');
