/**
 * ALPHA FACTORY — AD005 CROSS-SECTIONAL SPREAD DISCOVERY RUNNER
 * Script: run_ad005_discovery.js
 * 
 * Objectives:
 * 1. Simulates 12 market-neutral pair cells (Long Top 1 vs Short Bottom 1) across 6 core assets in 1H.
 * 2. Strict 2-year Discovery window (2023-01-01 -> 2024-12-31).
 * 3. Enforces 24 bps total all-in roundtrip friction per pair.
 * 4. 14-Day Calendar Block Bootstrap (B=10,000, trade-weighted).
 * 5. Multiplicity control via Benjamini-Yekutieli (BY, 2001).
 */

import fs from 'fs';
import path from 'path';
import { FirewallGuard } from '../../../alpha_factory/core/firewall_guard.js';
import { AD005CrossSectionalDetector } from '../core/ad005_cross_sectional_detector.js';
import { runCalendarBlockBootstrap, computeBenjaminiYekutieli } from '../../../alpha_factory/core/inference_battery.js';

const rootDir = process.cwd();

async function main() {
  console.log('================================================================');
  console.log('🏛️ ALPHA FACTORY — PROGRAM AD005: CROSS-SECTIONAL SPREAD DISCOVERY');
  console.log('================================================================\n');

  // Step 1: V8 Invariance
  const v8Path = path.resolve(rootDir, 'packages/lyzer-shared/src/providers/institutional_quant_signal_engine.js');
  FirewallGuard.assertV8EngineInvariant(v8Path);
  console.log('✔ Engine V8 Invariant Verified.');

  // Step 2: Load Campaign Spec
  const specPath = path.resolve(rootDir, 'research/alpha_discovery/AD005/spec/AD005_CAMPAIGN_SPEC.json');
  const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));

  const dataDir = path.resolve(rootDir, 'research/alpha_discovery/AD003/data');
  const targetAssets = spec.targetAssets;

  console.log(`Universe: ${targetAssets.join(', ')} | Timeframe: 1h`);
  console.log(`Discovery Period: ${spec.period.label}`);

  // Step 3: Load and Assert Firewall on 1H Candles
  const panel = {};
  for (const sym of targetAssets) {
    const fPath = path.join(dataDir, `${sym}_1h.json`);
    const candles = JSON.parse(fs.readFileSync(fPath, 'utf8'));
    FirewallGuard.assertDiscoveryCandles(candles, `${sym}_1h`);
    panel[sym] = candles;
  }
  const nBars = panel[targetAssets[0]].length;
  console.log(`✔ All 6 assets loaded (${nBars} hourly bars each, synchronized).\n`);

  // Friction parameters
  const feeRate = spec.friction.feeRatePerLeg; // 5 bps
  const slippageRate = spec.friction.slippageRatePerLeg; // 1 bps
  const unitRiskPct = spec.riskNormalizer.unitRiskPct; // 1.5%

  const results = [];

  // Step 4: Simulate Each Hypothesis Cell
  for (let cIdx = 0; cIdx < spec.cells.length; cIdx++) {
    const cell = spec.cells[cIdx];
    const L = cell.lookbackHours;
    const H = cell.rebalanceHours;
    const strat = cell.strategy;

    const trades = [];

    for (let t = L; t < nBars - H - 1; t += H) {
      const pair = AD005CrossSectionalDetector.selectPairAt(panel, targetAssets, t, L, strat);
      if (!pair) continue;

      const longCandles = panel[pair.longSymbol];
      const shortCandles = panel[pair.shortSymbol];

      // Entry at t+1 Open with slippage
      const pLongEntry = longCandles[t + 1].open * (1 + slippageRate);
      const pShortEntry = shortCandles[t + 1].open * (1 - slippageRate);

      // Exit at t+H Close with slippage
      const pLongExit = longCandles[t + H].close * (1 - slippageRate);
      const pShortExit = shortCandles[t + H].close * (1 + slippageRate);

      const rLong = (pLongExit - pLongEntry) / pLongEntry;
      const rShort = -1 * ((pShortExit - pShortEntry) / pShortEntry);

      const grossPct = (rLong + rShort) / 2;
      // Friction: 2x feeRate on each leg = 2 * (2 * feeRate) / 2 = 2 * feeRate = 10 bps fees (+ 4 bps slippage already embedded)
      const netPct = grossPct - (2 * feeRate);

      const netR = netPct / unitRiskPct;

      trades.push({
        entryTime: longCandles[t + 1].timestamp,
        exitTime: longCandles[t + H].timestamp,
        longSymbol: pair.longSymbol,
        shortSymbol: pair.shortSymbol,
        rLong,
        rShort,
        grossPct,
        netPct,
        netR
      });
    }

    trades.sort((a, b) => a.exitTime - b.exitTime);

    // Bootstrap Inference (B=10,000)
    const boot = runCalendarBlockBootstrap(trades, {
      replications: 10000,
      seed: 888888
    });

    results.push({
      id: cell.id,
      strategy: cell.strategy,
      lookbackHours: cell.lookbackHours,
      rebalanceHours: cell.rebalanceHours,
      description: cell.description,
      nTrades: boot.nTrades,
      meanNetR: boot.meanNetR,
      ci95Lower: boot.ci95Lower,
      ci95Upper: boot.ci95Upper,
      pBlock: boot.pBlock,
      profitFactor: boot.profitFactor,
      mddR: boot.mddR,
      totalNetR: boot.totalNetR,
      isDegenerate: boot.isDegenerate
    });

    console.log(`   [Cell ${cIdx + 1}/${spec.cells.length}] ${cell.id} -> N=${boot.nTrades}, meanR=${boot.meanNetR >= 0 ? '+' : ''}${boot.meanNetR}R, PF=${boot.profitFactor}, p=${boot.pBlock.toFixed(4)}`);
  }

  // Step 5: Multiplicity Adjustment (Benjamini-Yekutieli, 2001)
  console.log('\nApplying Benjamini-Yekutieli (BY, 2001) FDR correction (M=12)...');
  const pValues = results.map(r => r.pBlock);
  const byAdjusted = computeBenjaminiYekutieli(pValues, 0.05);

  for (let i = 0; i < results.length; i++) {
    results[i].qBY = byAdjusted[i].qValue;
    results[i].byPass = byAdjusted[i].pass && !results[i].isDegenerate && results[i].nTrades >= 60;
  }

  const eligibleCount = results.filter(r => r.byPass && r.meanNetR >= 0.150).length;

  console.log('\n================================================================');
  console.log(`🏛️ AD005 CAMPAIGN COMPLETE — SUMMARY`);
  console.log(`Total Hypotheses:     ${spec.cells.length}`);
  console.log(`Eligible Candidates:  ${eligibleCount}/${spec.cells.length} (BY FDR < 0.05 & N >= 60 & E[R] >= +0.15R)`);
  console.log(`Verdict:              ${eligibleCount > 0 ? '🟢 CANDIDATE DISCOVERED' : '🔴 NO CANDIDATE PROMOTED'}`);
  console.log('================================================================\n');

  // Step 6: Persist Results JSON and Discovery Report
  const outJsonPath = path.resolve(rootDir, 'research/alpha_discovery/AD005/discovery/AD005_DISCOVERY_RESULTS.json');
  fs.writeFileSync(outJsonPath, JSON.stringify({
    campaignId: 'AD005_CROSS_SECTIONAL_SPREAD_DISCOVERY',
    timestampUTC: new Date().toISOString(),
    engineV8SHA256: 'fc19e807255b3ecfb8351e82d7dc9d244c1e511d9aa007ac8b67b12d584b4db1',
    eligibleCount,
    results
  }, null, 2));

  let md = `# RELATÓRIO DE DESCOBERTA QUANTITATIVA — PROGRAMA AD005
## Cross-Sectional Momentum & Market-Neutral Relative Strength Spread (Alpha Factory v1.0)

**Programa de Pesquisa:** \`AD005\`  
**Família:** Arbitragem Estatística Transversal & Portfólio Market-Neutral  
**Período de Descoberta:** \`2023-01-01\` a \`2024-12-31\` (2 anos fechados)  
**Universo de Ativos:** \`BTCUSDT\`, \`ETHUSDT\`, \`SOLUSDT\`, \`AVAXUSDT\`, \`LINKUSDT\`, \`DOGEUSDT\` (6 ativos core)  
**Total de Barras Processadas:** $105.264$ barras horárias ($17.544$ por ativo)  
**Controle de Fricção:** $24\\text{ bps}$ all-in por par ($12\\text{ bps}$ por perna)  
**Inferência Estatística:** 14-Day Calendar Block Bootstrap ($B = 10.000$, seed $888888$, Hall centered, trade-weighted)  
**Procedimento de Multiplicidade:** **Benjamini–Yekutieli (BY, 2001)** ($M = 12$, $c(12) = 3.1032$, multiplicador global = $37.24$)  
**Motor V8 SHA-256:** \`fc19e807255b3ecfb8351e82d7dc9d244c1e511d9aa007ac8b67b12d584b4db1\` (**100% INTACTO**)  
**Data UTC de Execução:** \`${new Date().toISOString()}\`  

---

## 📊 1. Resultados da Matriz de 12 Células Market-Neutral

| ID da Célula | Estratégia | Lookback ($L$) | Rebalanceamento ($H$) | $N$ Trades | $E[R]_{\\text{net}}$ | IC95% | PF | $p_{\\text{block}}$ | $q_{\\text{BY}}$ | Status BY |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
`;

  for (const r of results) {
    const statusTag = r.byPass ? '🟢 PASS' : (r.isDegenerate ? '⚠️ Degenerado' : '🔴 FAIL');
    md += `| **${r.id}** | \`${r.strategy}\` | ${r.lookbackHours}h | ${r.rebalanceHours}h | ${r.nTrades} | ${r.meanNetR >= 0 ? '+' : ''}${r.meanNetR}R | [${r.ci95Lower}, ${r.ci95Upper}] | ${r.profitFactor} | ${r.pBlock.toFixed(4)} | ${r.qBY.toFixed(4)} | ${statusTag} |\n`;
  }

  md += `
---

## 🔬 2. Análise Estrutural & Comparação de Famílias

### A. Subfamília CROSS-SECTIONAL MOMENTUM (Seguir o Ativo Mais Forte)
`;
  const momCells = results.filter(r => r.strategy === 'MOMENTUM');
  for (const r of momCells) {
    md += `- **${r.id}** (L=${r.lookbackHours}h, H=${r.rebalanceHours}h): $N = ${r.nTrades}$, $E[R] = ${r.meanNetR >= 0 ? '+' : ''}${r.meanNetR}R$, $\\text{PF} = ${r.profitFactor}$, $p = ${r.pBlock.toFixed(4)}$, $q_{\\text{BY}} = ${r.qBY.toFixed(4)}$\n`;
  }

  md += `
### B. Subfamília CROSS-SECTIONAL MEAN REVERSION (Apostar na Convergência do Spread)
`;
  const revCells = results.filter(r => r.strategy === 'MEAN_REVERSION');
  for (const r of revCells) {
    md += `- **${r.id}** (L=${r.lookbackHours}h, H=${r.rebalanceHours}h): $N = ${r.nTrades}$, $E[R] = ${r.meanNetR >= 0 ? '+' : ''}${r.meanNetR}R$, $\\text{PF} = ${r.profitFactor}$, $p = ${r.pBlock.toFixed(4)}$, $q_{\\text{BY}} = ${r.qBY.toFixed(4)}$\n`;
  }

  md += `
---

## 🏛️ 3. Conclusão Científica & Diagnóstico Institucional
`;

  const outMdPath = path.resolve(rootDir, 'research/alpha_discovery/AD005/discovery/AD005_DISCOVERY_REPORT.md');
  fs.writeFileSync(outMdPath, md);

  console.log(`✔ Results JSON saved at: ${outJsonPath}`);
  console.log(`✔ Discovery Report saved at: ${outMdPath}`);
}

main().catch(err => {
  console.error('❌ AD005 execution failed:', err);
  process.exit(1);
});
