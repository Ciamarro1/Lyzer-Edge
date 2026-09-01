import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(__dirname, '../../');

import { WyckoffVolumeProfileEngine } from '../../packages/lyzer-shared/src/providers/v5_wyckoff_volume_profile.js';

const h1Path = resolve(ROOT_DIR, 'research/datasets/batch035/BTCUSDT_FUTURES_H1_2023_2026.json');
const candles = JSON.parse(readFileSync(h1Path, 'utf8'));
candles.sort((a, b) => a.openTime - b.openTime);

const v5Engine = new WyckoffVolumeProfileEngine({
  lookback: 30,
  volumeZScore: 1.50,
  minPierceATR: 0.50,
  pocProximity: 0.003,
  requireVolume: true,
  requirePierce: true,
  requirePOC: false,
  requireReversal: true
});

let signalCount = 0;
const buffer = [];

for (let i = 0; i < candles.length; i++) {
  const c = candles[i];
  buffer.push(c);
  if (buffer.length > 300) buffer.shift();
  if (i < 100 || buffer.length < 30) continue;

  const res = v5Engine.reconstruct({ slow: buffer });
  if (res.signal !== 'flat') {
    signalCount++;
    if (signalCount <= 10) {
      console.log(`Candle ${i} [${new Date(c.openTime).toISOString()}]: Signal=${res.signal} Close=${c.close} Narrative=${res.narrative}`);
    }
  }
}

console.log(`\nTotal V5 Signals on H1: ${signalCount}`);
