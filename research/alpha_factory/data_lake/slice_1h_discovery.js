import fs from 'fs';
import path from 'path';

const batch039Dir = path.resolve('research/datasets/batch039');
const lakeDir = path.resolve('research/alpha_discovery/AD003/data');
const assets = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'AVAXUSDT', 'LINKUSDT', 'DOGEUSDT'];

const START_MS = 1672531200000; // 2023-01-01T00:00:00.000Z
const END_MS   = 1735689599999; // 2024-12-31T23:59:59.999Z

for (const sym of assets) {
  const src = path.join(batch039Dir, `${sym}_1h.json`);
  const dest = path.join(lakeDir, `${sym}_1h.json`);
  if (!fs.existsSync(dest)) {
    const raw = JSON.parse(fs.readFileSync(src, 'utf8'));
    const sliced = raw.filter(c => c.timestamp >= START_MS && c.timestamp <= END_MS);
    sliced.sort((a, b) => a.timestamp - b.timestamp);
    fs.writeFileSync(dest, JSON.stringify(sliced));
    console.log(`Sliced and created ${sym}_1h.json: ${sliced.length} candles.`);
  } else {
    console.log(`Already exists: ${dest}`);
  }
}
