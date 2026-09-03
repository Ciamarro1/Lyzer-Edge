/**
 * ALPHA FACTORY — DATA LAKE CATALOG & INTEGRITY AUDITOR
 * Script: index_lake.js
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { FirewallGuard, DISCOVERY_START_MS, DISCOVERY_END_MS } from '../core/firewall_guard.js';

const rootDir = process.cwd();
const dataDir = path.resolve(rootDir, 'research/alpha_discovery/AD003/data');
const outManifest = path.resolve(rootDir, 'research/alpha_factory/data_lake/DATA_LAKE_MANIFEST.json');

const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json') && !f.includes('MANIFEST'));

const manifest = {
  dataLakeId: 'LYZER_ALPHA_FACTORY_DISCOVERY_LAKE_v1.0',
  description: 'Certified 2023-2024 Discovery Datasets under Fail-Closed Cryptographic Firewall',
  temporalBounds: {
    startMs: DISCOVERY_START_MS,
    endMs: DISCOVERY_END_MS,
    startDateUTC: new Date(DISCOVERY_START_MS).toISOString(),
    endDateUTC: new Date(DISCOVERY_END_MS).toISOString()
  },
  holdoutStatus: '2025-2026 PERMANENTLY SEALED OUTSIDE LAKE',
  totalDatasets: files.length,
  datasets: {}
};

for (const f of files) {
  const p = path.join(dataDir, f);
  const buf = fs.readFileSync(p);
  const raw = JSON.parse(buf.toString());

  // Strict firewall assertion
  FirewallGuard.assertDiscoveryCandles(raw, f);

  const hash = crypto.createHash('sha256').update(buf).digest('hex');
  const [sym, tfWithExt] = f.split('_');
  const tf = tfWithExt.replace('.json', '');

  manifest.datasets[f] = {
    symbol: sym,
    timeframe: tf,
    candlesCount: raw.length,
    sizeBytes: buf.length,
    sha256: hash,
    firstCandleUTC: new Date(raw[0].timestamp).toISOString(),
    lastCandleUTC: new Date(raw[raw.length - 1].timestamp).toISOString()
  };
}

fs.writeFileSync(outManifest, JSON.stringify(manifest, null, 2));
console.log(`✔ Alpha Factory Data Lake successfully audited and indexed: ${files.length} datasets certified.`);
console.log(`Manifest saved at: ${outManifest}`);
