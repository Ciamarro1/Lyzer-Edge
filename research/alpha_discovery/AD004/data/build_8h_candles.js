/**
 * ALPHA FACTORY — 8H CANDLE SYNCHRONIZER FOR FUNDING RATE RESEARCH
 * Script: build_8h_candles.js
 * 
 * Aggregates 1H candles into exact 8H candles aligned with Binance funding intervals:
 * 00:00 UTC, 08:00 UTC, 16:00 UTC.
 */

import fs from 'fs';
import path from 'path';
import { FirewallGuard, DISCOVERY_START_MS, DISCOVERY_END_MS } from '../../../alpha_factory/core/firewall_guard.js';

const rootDir = process.cwd();
const inDir = path.resolve(rootDir, 'research/alpha_discovery/AD003/data');
const outDir = path.resolve(rootDir, 'research/alpha_discovery/AD004/data');
const assets = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'AVAXUSDT', 'LINKUSDT', 'DOGEUSDT'];

for (const sym of assets) {
  const f1h = path.join(inDir, `${sym}_1h.json`);
  if (!fs.existsSync(f1h)) {
    throw new Error(`Missing 1h dataset: ${f1h}`);
  }

  const raw1h = JSON.parse(fs.readFileSync(f1h, 'utf8'));
  raw1h.sort((a, b) => a.timestamp - b.timestamp);

  // Hard firewall assertion
  FirewallGuard.assertDiscoveryCandles(raw1h, `${sym}_1h`);

  const candles8h = [];
  let currentBlock = [];

  for (const c of raw1h) {
    const dt = new Date(c.timestamp);
    const hour = dt.getUTCHours();

    // Binance funding periods start at 0, 8, 16 UTC
    if ((hour === 0 || hour === 8 || hour === 16) && dt.getUTCMinutes() === 0 && currentBlock.length > 0) {
      // Finalize previous 8h candle
      candles8h.push(aggregateBlock(currentBlock));
      currentBlock = [];
    }

    currentBlock.push(c);
  }

  if (currentBlock.length > 0) {
    candles8h.push(aggregateBlock(currentBlock));
  }

  // Assert firewall on 8h candles
  FirewallGuard.assertDiscoveryCandles(candles8h, `${sym}_8h`);

  const destPath = path.join(outDir, `${sym}_8h.json`);
  fs.writeFileSync(destPath, JSON.stringify(candles8h, null, 2));
  console.log(`✔ [${sym}] Generated ${candles8h.length} 8H candles strictly <= 2024-12-31.`);
}

function aggregateBlock(block) {
  const open = block[0].open;
  const close = block[block.length - 1].close;
  let high = -Infinity;
  let low = Infinity;
  let volume = 0;

  for (const b of block) {
    if (b.high > high) high = b.high;
    if (b.low < low) low = b.low;
    volume += b.volume;
  }

  return {
    timestamp: block[0].timestamp,
    open,
    high,
    low,
    close,
    volume,
    barsCount: block.length
  };
}
