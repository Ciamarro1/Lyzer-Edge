import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';

import { StructuralBoundaryEngine } from '../../packages/lyzer-shared/src/providers/v2_snd_snr.js';
import { InstitutionalMarketCausalityEngine } from '../../packages/lyzer-shared/src/providers/v4_imce.js';
import { WyckoffVolumeProfileEngine } from '../../packages/lyzer-shared/src/providers/v5_wyckoff_volume_profile.js';
import { MarketProfileEngine } from '../../packages/lyzer-shared/src/providers/v6_market_profile.js';
import { TapeReadingEngine } from '../../packages/lyzer-shared/src/providers/v7_tape_reading.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function diagnose() {
  const datasetPath = resolve(__dirname, '../datasets/BTCUSDT_1m_90d.json');
  const raw = readFileSync(datasetPath, 'utf-8');
  const allCandles = JSON.parse(raw);
  allCandles.sort((a, b) => a.openTime - b.openTime);

  // 60% IS segment
  const isEnd = Math.floor(allCandles.length * 0.6);
  const isCandles = allCandles.slice(0, isEnd);

  console.log('='.repeat(70));
  console.log('🔬 FORENSIC PROVIDER SIGNAL DIAGNOSTIC (IS SEGMENT: 77,760 CANDLES)');
  console.log('='.repeat(70));

  const providers = {
    v2: new StructuralBoundaryEngine(),
    v4: new InstitutionalMarketCausalityEngine(),
    v5: new WyckoffVolumeProfileEngine(),
    v6: new MarketProfileEngine(),
    v7: new TapeReadingEngine(),
  };

  const stats = {
    v2: { total: 0, long: 0, short: 0, flat: 0, breakoutLong: 0, breakoutShort: 0, bounceLong: 0, bounceShort: 0, trending: 0 },
    v4: { total: 0, long: 0, short: 0, flat: 0, sweeps: 0, mss: 0, scoreGt60: 0 },
    v5: { total: 0, long: 0, short: 0, flat: 0, springs: 0, upthrusts: 0, highVolumeCandles: 0, nearPocCount: 0, piercedCount: 0 },
    v6: { total: 0, long: 0, short: 0, flat: 0, aboveVah: 0, belowVal: 0, inVa: 0 },
    v7: { total: 0, long: 0, short: 0, flat: 0, cvdDivLong: 0, cvdDivShort: 0, absLong: 0, absShort: 0, exhLong: 0, exhShort: 0 },
  };

  const rollingMtf = {
    '1m': [],
    '5m': [],
    '15m': [],
    '1h': [],
    fast: [],
    intermediate: [],
    slow: []
  };

  // Funnel tracking
  for (let i = 0; i < isCandles.length; i++) {
    const c = isCandles[i];
    rollingMtf['1m'].push(c);
    if (rollingMtf['1m'].length > 1500) rollingMtf['1m'].shift();
    rollingMtf.fast = rollingMtf['1m'];
    rollingMtf.intermediate = rollingMtf['1m'];
    rollingMtf.slow = rollingMtf['1m'];

    // V2
    const resV2 = providers.v2.reconstruct(rollingMtf);
    stats.v2.total++;
    if (resV2.signal === 'long') stats.v2.long++;
    else if (resV2.signal === 'short') stats.v2.short++;
    else stats.v2.flat++;
    if (resV2.narrative === 'RESISTANCE_BREAKOUT') stats.v2.breakoutLong++;
    if (resV2.narrative === 'SUPPORT_BREAKDOWN') stats.v2.breakoutShort++;
    if (resV2.narrative === 'SUPPORT_BOUNCE') stats.v2.bounceLong++;
    if (resV2.narrative === 'RESISTANCE_REJECTION') stats.v2.bounceShort++;
    if (resV2.narrative?.startsWith('TRENDING')) stats.v2.trending++;

    // V4
    const resV4 = providers.v4.reconstruct(rollingMtf);
    stats.v4.total++;
    if (resV4.signal === 'long') stats.v4.long++;
    else if (resV4.signal === 'short') stats.v4.short++;
    else stats.v4.flat++;
    if (resV4.confidence >= 60) stats.v4.scoreGt60++;

    // V5
    const resV5 = providers.v5.reconstruct(rollingMtf);
    stats.v5.total++;
    if (resV5.signal === 'LONG') stats.v5.long++;
    else if (resV5.signal === 'SHORT') stats.v5.short++;
    else stats.v5.flat++;
    if (resV5.signal === 'LONG') stats.v5.springs++;
    if (resV5.signal === 'SHORT') stats.v5.upthrusts++;

    // V6
    const resV6 = providers.v6.reconstruct(rollingMtf);
    stats.v6.total++;
    if (resV6.signal === 'LONG') { stats.v6.long++; stats.v6.aboveVah++; }
    else if (resV6.signal === 'SHORT') { stats.v6.short++; stats.v6.belowVal++; }
    else { stats.v6.flat++; stats.v6.inVa++; }

    // V7
    const resV7 = providers.v7.reconstruct(rollingMtf);
    stats.v7.total++;
    if (resV7.signal === 'LONG') stats.v7.long++;
    else if (resV7.signal === 'SHORT') stats.v7.short++;
    else stats.v7.flat++;
    if (resV7.narrative?.includes('Bullish Divergence')) stats.v7.cvdDivLong++;
    if (resV7.narrative?.includes('Bearish Divergence')) stats.v7.cvdDivShort++;
    if (resV7.narrative?.includes('Buy Absorption')) stats.v7.absLong++;
    if (resV7.narrative?.includes('Sell Absorption')) stats.v7.absShort++;
    if (resV7.narrative?.includes('Exhaustion at Low')) stats.v7.exhLong++;
    if (resV7.narrative?.includes('Exhaustion at High')) stats.v7.exhShort++;
  }

  console.log('\n--- V2 (SNR/SND) EMISSION FUNNEL ---');
  console.log(`Candles Evaluated: ${stats.v2.total}`);
  console.log(`Raw Signals: LONG=${stats.v2.long} | SHORT=${stats.v2.short} | FLAT=${stats.v2.flat}`);
  console.log(`  - Resistance Breakout (LONG): ${stats.v2.breakoutLong}`);
  console.log(`  - Support Breakdown (SHORT): ${stats.v2.breakoutShort}`);
  console.log(`  - Support Bounce (LONG): ${stats.v2.bounceLong}`);
  console.log(`  - Resistance Rejection (SHORT): ${stats.v2.bounceShort}`);
  console.log(`  - Trending towards boundaries: ${stats.v2.trending}`);

  console.log('\n--- V4 (IMCE) EMISSION FUNNEL ---');
  console.log(`Candles Evaluated: ${stats.v4.total}`);
  console.log(`Raw Signals: LONG=${stats.v4.long} | SHORT=${stats.v4.short} | FLAT=${stats.v4.flat}`);
  console.log(`  - Confidence >= 60%: ${stats.v4.scoreGt60}`);

  console.log('\n--- V5 (WYCKOFF VOLUME) EMISSION FUNNEL ---');
  console.log(`Candles Evaluated: ${stats.v5.total}`);
  console.log(`Raw Signals: LONG=${stats.v5.long} | SHORT=${stats.v5.short} | FLAT=${stats.v5.flat}`);
  console.log(`  - Springs (LONG): ${stats.v5.springs}`);
  console.log(`  - Upthrusts (SHORT): ${stats.v5.upthrusts}`);

  console.log('\n--- V6 (MARKET PROFILE) EMISSION FUNNEL ---');
  console.log(`Candles Evaluated: ${stats.v6.total}`);
  console.log(`Raw Signals: LONG=${stats.v6.long} | SHORT=${stats.v6.short} | FLAT=${stats.v6.flat}`);
  console.log(`  - Above VAH (LONG): ${stats.v6.aboveVah}`);
  console.log(`  - Below VAL (SHORT): ${stats.v6.belowVal}`);
  console.log(`  - Inside Value Area (FLAT): ${stats.v6.inVa}`);

  console.log('\n--- V7 (TAPE READING) EMISSION FUNNEL ---');
  console.log(`Candles Evaluated: ${stats.v7.total}`);
  console.log(`Raw Signals: LONG=${stats.v7.long} | SHORT=${stats.v7.short} | FLAT=${stats.v7.flat}`);
  console.log(`  - CVD Bullish Div: ${stats.v7.cvdDivLong} | Bearish Div: ${stats.v7.cvdDivShort}`);
  console.log(`  - Absorption LONG: ${stats.v7.absLong} | SHORT: ${stats.v7.absShort}`);
  console.log(`  - Exhaustion LONG: ${stats.v7.exhLong} | SHORT: ${stats.v7.exhShort}`);

  const outDir = resolve(__dirname, '../results/provider_grid/diagnostics');
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  writeFileSync(resolve(outDir, 'raw_provider_diagnostics.json'), JSON.stringify(stats, null, 2));
  console.log(`\nDiagnostics saved to ${resolve(outDir, 'raw_provider_diagnostics.json')}`);
}

diagnose();
