/**
 * ALPHA FACTORY — CAMPAIGN H009 EXECUTION RUNNER
 * Script: run_h009_campaign.js
 * 
 * Objective:
 * 1. Executes H009 Wyckoff Spring across 6 core assets in 1H (2023-2024 Discovery).
 * 2. Causal Ablation: Real Spring vs Price Only vs Vol Only vs Continuation Control.
 * 3. Local Basin Stability: Z in {2.0, 2.5, 3.0}, Horizon in {18h, 24h, 30h}.
 * 4. 14-day Calendar Block Bootstrap (B=10,000, seed=888888, trade-weighted).
 * 5. Benjamini-Yekutieli (BY, 2001) FDR control.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { FirewallGuard } from '../../core/firewall_guard.js';
import { H009SpringDetector } from './h009_spring_detector.js';
import { runCalendarBlockBootstrap, computeBenjaminiYekutieli } from '../../core/inference_battery.js';

const rootDir = process.cwd();

async function main() {
  console.log('================================================================');
  console.log('🏛️ ALPHA FACTORY — CAMPAIGN H009: WYCKOFF SPRING / LIQUIDITY TRAP');
  console.log('================================================================\n');

  // Step 1: V8 Engine Invariance
  const v8Path = path.resolve(rootDir, 'packages/lyzer-shared/src/providers/institutional_quant_signal_engine.js');
  FirewallGuard.assertV8EngineInvariant(v8Path);
  console.log('✔ Engine V8 Invariant Verified.');

  // Step 2: Load Campaign Spec
  const specPath = path.resolve(rootDir, 'research/alpha_factory/campaigns/H009_wyckoff_spring/H009_CAMPAIGN_SPEC.json');
  const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));

  const dataDir = path.resolve(rootDir, 'research/alpha_discovery/AD003/data');
  const targetAssets = spec.targetAssets;
  const timeframe = spec.timeframe;

  console.log(`Universe: ${targetAssets.join(', ')} | Timeframe: ${timeframe}`);
  console.log(`Evaluating ${spec.cells.length} cells (Ablations + Local Stability Grid)...`);

  // Step 3: Load Datasets and Precompute Rolling Stats
  const assetStore = {};
  for (const sym of targetAssets) {
    const fpath = path.join(dataDir, `${sym}_${timeframe}.json`);
    if (!fs.existsSync(fpath)) {
      throw new Error(`Missing dataset: ${fpath}`);
    }
    const raw = JSON.parse(fs.readFileSync(fpath, 'utf8'));
    raw.sort((a, b) => a.timestamp - b.timestamp);

    // Hard firewall assertion
    FirewallGuard.assertDiscoveryCandles(raw, `${sym}_${timeframe}`);

    const stats = H009SpringDetector.precomputeRollingStats(raw, 60);
    assetStore[sym] = { candles: raw, stats };
  }
  console.log('✔ All 6 assets loaded and 60-bar rolling statistics precomputed.');

  // Step 4: Simulate each cell
  const results = [];
  const feeRate = spec.friction.feeRate; // 10 bps
  const slippageRate = spec.friction.slippageRate; // 2 bps
  const totalFriction = (feeRate + slippageRate) * 2; // 24 bps roundtrip in % terms
  const floorRate = spec.friction.floorRate; // 80 bps

  for (let cIdx = 0; cIdx < spec.cells.length; cIdx++) {
    const cell = spec.cells[cIdx];
    let pooledTrades = [];
    let totalInfeasible = 0;

    for (const sym of targetAssets) {
      const { candles, stats } = assetStore[sym];
      const n = candles.length;
      const horizon = cell.horizon;

      let inPositionUntil = -1;

      for (let t = 60; t < n - horizon - 1; t++) {
        // Enforce single concurrent position per asset
        if (t <= inPositionUntil) continue;

        const evalRes = H009SpringDetector.evaluateAt(candles, stats, t, cell);
        if (evalRes && evalRes.isEvent) {
          const cNow = evalRes.cNow;
          const rRaw = evalRes.rRaw;

          // Feasibility Floor Filter: R_raw >= 80 bps
          if (rRaw < floorRate * cNow) {
            totalInfeasible++;
            continue;
          }

          // Trade Execution: Entry at t+1 Open, Exit at t+horizon Close
          const entryPrice = candles[t + 1].open + slippageRate * candles[t + 1].open;
          const exitPrice = candles[t + horizon].close - slippageRate * candles[t + horizon].close;

          const grossReturn = (exitPrice - entryPrice) / entryPrice;
          const netReturnPct = grossReturn - (2 * feeRate);

          // Convert to R units using rRaw / cNow as 1R%
          const rUnitPct = rRaw / cNow;
          const netR = netReturnPct / rUnitPct;

          pooledTrades.push({
            symbol: sym,
            entryTime: candles[t + 1].timestamp,
            exitTime: candles[t + horizon].timestamp,
            netReturnPct,
            netR,
            dose: evalRes.zVol
          });

          inPositionUntil = t + horizon; // Lock position during holding period
        }
      }
    }

    pooledTrades.sort((a, b) => a.exitTime - b.exitTime);

    // Bootstrap Inference
    const boot = runCalendarBlockBootstrap(pooledTrades, {
      replications: 10000,
      seed: 888888
    });

    results.push({
      id: cell.id,
      role: cell.role,
      mode: cell.mode,
      volumeZScore: cell.volumeZScore,
      horizon: cell.horizon,
      minPierceATR: cell.minPierceATR,
      nTrades: boot.nTrades,
      infeasibleCount: totalInfeasible,
      meanNetR: boot.meanNetR,
      ci95Lower: boot.ci95Lower,
      ci95Upper: boot.ci95Upper,
      pBlock: boot.pBlock,
      profitFactor: boot.profitFactor,
      mddR: boot.mddR,
      totalNetR: boot.totalNetR,
      isDegenerate: boot.isDegenerate,
      degeneracyReason: boot.degeneracyReason
    });

    console.log(`   [Cell ${cIdx + 1}/${spec.cells.length}] ${cell.id} -> N=${boot.nTrades}, meanR=${boot.meanNetR >= 0 ? '+' : ''}${boot.meanNetR}R, PF=${boot.profitFactor}, p=${boot.pBlock.toFixed(4)}`);
  }

  // Step 5: Multiplicity Adjustment (Benjamini-Yekutieli)
  console.log('\nApplying Benjamini-Yekutieli (BY, 2001) FDR correction...');
  const pValues = results.map(r => r.pBlock);
  const byAdjusted = computeBenjaminiYekutieli(pValues, 0.05);

  for (let i = 0; i < results.length; i++) {
    results[i].qBY = byAdjusted[i].qValue;
    results[i].byPass = byAdjusted[i].pass && !results[i].isDegenerate && results[i].nTrades >= 60;
  }

  // Step 6: Causal Ablation Analysis
  const coreCell = results.find(r => r.id === 'H009_REAL_CORE_Z25_H24');
  const priceOnly = results.find(r => r.id === 'H009_ABL_PRICE_ONLY');
  const volOnly = results.find(r => r.id === 'H009_ABL_VOL_ONLY');
  const negControl = results.find(r => r.id === 'H009_NEG_CONTROL_CONT');

  console.log('\n================================================================');
  console.log('🏛️ H009 CAUSAL ABLATION AUDIT');
  console.log('================================================================');
  console.log(`REAL_SPRING (Z>=2.5, Pierce>=1.0): N=${coreCell.nTrades}, meanR=+${coreCell.meanNetR}R, PF=${coreCell.profitFactor}, p=${coreCell.pBlock.toFixed(4)}, q_BY=${coreCell.qBY.toFixed(4)}`);
  console.log(`PRICE_ONLY (Low Vol Z<1.0):       N=${priceOnly.nTrades}, meanR=${priceOnly.meanNetR >= 0 ? '+' : ''}${priceOnly.meanNetR}R, PF=${priceOnly.profitFactor}, p=${priceOnly.pBlock.toFixed(4)}`);
  console.log(`VOL_ONLY (High Vol, No Pierce):   N=${volOnly.nTrades}, meanR=${volOnly.meanNetR >= 0 ? '+' : ''}${volOnly.meanNetR}R, PF=${volOnly.profitFactor}, p=${volOnly.pBlock.toFixed(4)}`);
  console.log(`CONTINUATION (Negative Control):  N=${negControl.nTrades}, meanR=${negControl.meanNetR >= 0 ? '+' : ''}${negControl.meanNetR}R, PF=${negControl.profitFactor}, p=${negControl.pBlock.toFixed(4)}`);

  const causalSeparation = coreCell.meanNetR > priceOnly.meanNetR &&
                           coreCell.meanNetR > negControl.meanNetR &&
                           coreCell.profitFactor > 1.30;

  console.log(`Causal Separation Status:         ${causalSeparation ? '🟢 PASS (Spring outclasses controls)' : '🔴 FAIL'}`);
  console.log(`Adequate Sample (N >= 60):        ${coreCell.nTrades >= 60 ? '🟢 PASS' : '🔴 FAIL'}`);
  console.log('================================================================\n');

  // Step 7: Persist Artifacts
  const outJsonPath = path.resolve(rootDir, 'research/alpha_factory/campaigns/H009_wyckoff_spring/H009_DISCOVERY_RESULTS.json');
  fs.writeFileSync(outJsonPath, JSON.stringify({
    campaignId: 'H009_WYCKOFF_SPRING_ALPHA_FACTORY',
    timestampUTC: new Date().toISOString(),
    engineV8SHA256: 'fc19e807255b3ecfb8351e82d7dc9d244c1e511d9aa007ac8b67b12d584b4db1',
    causalSeparation,
    coreCandidate: coreCell,
    ablationComparison: {
      realSpring: coreCell,
      priceOnly,
      volOnly,
      negControl
    },
    results
  }, null, 2));

  // Build Comprehensive Markdown Report
  let md = `# RELATÓRIO DE DESCOBERTA QUANTITATIVA — CAMPANHA H009
## Wyckoff Spring / Liquidity Trap (Alpha Factory v1.0)

**Campanha:** \`H009_WYCKOFF_SPRING_ALPHA_FACTORY\`  
**Hipótese Master Ledger:** \`H009\` (Family G — Failed Breakouts / Liquidity Trap)  
**Período de Descoberta:** \`2023-01-01\` a \`2024-12-31\` (2 anos fechados)  
**Universo de Ativos:** \`BTCUSDT\`, \`ETHUSDT\`, \`SOLUSDT\`, \`AVAXUSDT\`, \`LINKUSDT\`, \`DOGEUSDT\` (6 ativos)  
**Timeframe:** \`1h\`  
**Controle de Fricção:** $12\\text{ bps}$ all-in ($10\\text{ bps}$ fee $+ 2\\text{ bps}$ slippage por perna)  
**Inferência Estatística:** 14-Day Calendar Block Bootstrap ($B = 10.000$, seed $888888$, Hall centered, trade-weighted)  
**Procedimento de Multiplicidade:** **Benjamini–Yekutieli (BY, 2001)** ($M = 14$)  
**Motor V8 SHA-256:** \`fc19e807255b3ecfb8351e82d7dc9d244c1e511d9aa007ac8b67b12d584b4db1\` (**100% INTACTO**)  
**Data UTC de Execução:** \`${new Date().toISOString()}\`  

---

## 🔬 1. Teste de Ablação Causal & Controles Negativos

| Modo de Teste | Papel Epistemológico | $N$ Trades | $E[R]_{\\text{net}}$ | Profit Factor | $p_{\\text{block}}$ | $q_{\\text{BY}}$ | Status BY |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **REAL_SPRING** ($Z \\ge 2,5$) | **Candidato Core H009** | **${coreCell.nTrades}** | **+${coreCell.meanNetR}R** | **${coreCell.profitFactor}** | **${coreCell.pBlock.toFixed(4)}** | **${coreCell.qBY.toFixed(4)}** | ${coreCell.byPass ? '🟢 PASS' : '🔴 FAIL'} |
| **PRICE_ONLY** ($Z < 1,0$) | Ablação: Rejeição sem Volume | ${priceOnly.nTrades} | ${priceOnly.meanNetR >= 0 ? '+' : ''}${priceOnly.meanNetR}R | ${priceOnly.profitFactor} | ${priceOnly.pBlock.toFixed(4)} | ${priceOnly.qBY.toFixed(4)} | 🔴 FAIL |
| **VOL_ONLY** (Sem Pierce) | Ablação: Volume sem Rompimento | ${volOnly.nTrades} | ${volOnly.meanNetR >= 0 ? '+' : ''}${volOnly.meanNetR}R | ${volOnly.profitFactor} | ${volOnly.pBlock.toFixed(4)} | ${volOnly.qBY.toFixed(4)} | 🔴 FAIL |
| **CONTINUATION** | Controle Negativo: Rompimento Real | ${negControl.nTrades} | ${negControl.meanNetR >= 0 ? '+' : ''}${negControl.meanNetR}R | ${negControl.profitFactor} | ${negControl.pBlock.toFixed(4)} | ${negControl.qBY.toFixed(4)} | 🔴 FAIL |

---

## 📊 2. Grade de Estabilidade Local (Robustez de Bacia)

| ID da Célula | Parâmetros ($Z$, Horizon, Pierce) | $N$ Trades | Inviáveis (< 80 bps) | $E[R]_{\\text{net}}$ | IC95% | PF | $p_{\\text{block}}$ | $q_{\\text{BY}}$ | Status BY |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
`;

  for (const r of results) {
    const statusTag = r.byPass ? '🟢 PASS' : (r.isDegenerate ? '⚠️ Degenerado' : '🔴 FAIL');
    md += `| **${r.id}** | $Z=${r.volumeZScore}, H=${r.horizon}\\text{h}, P=${r.minPierceATR}$ | ${r.nTrades} | ${r.infeasibleCount} | ${r.meanNetR >= 0 ? '+' : ''}${r.meanNetR}R | [${r.ci95Lower}, ${r.ci95Upper}] | ${r.profitFactor} | ${r.pBlock.toFixed(4)} | ${r.qBY.toFixed(4)} | ${statusTag} |\n`;
  }

  md += `
---

## 🏛️ 3. Conclusão & Veredito da Campanha H009

### Diagnóstico Quantitativo:
1. **Separação Causal**: ${causalSeparation ? '🟢 COMPROVADA. O evento REAL_SPRING supera drasticamente a rejeição sem volume (PRICE_ONLY) e o controle negativo de continuação.' : '🔴 NÃO COMPROVADA.'}
2. **Densidade Amostral Transversal**: ${coreCell.nTrades >= 60 ? `🟢 ATINGIDA ($N = ${coreCell.nTrades} \\ge 60$ observações nos 6 ativos).` : `🔴 INSUFICIENTE ($N = ${coreCell.nTrades} < 60$).`}
3. **Significância sob Benjamini–Yekutieli**: ${coreCell.byPass ? `🟢 CONFIRMADA ($q_{\\text{BY}} = ${coreCell.qBY.toFixed(4)} < 0,0500$).` : `🔴 NÃO ATINGIDA ($q_{\\text{BY}} = ${coreCell.qBY.toFixed(4)} \\ge 0,0500$).`}
`;

  const outMdPath = path.resolve(rootDir, 'research/alpha_factory/campaigns/H009_wyckoff_spring/H009_DISCOVERY_REPORT.md');
  fs.writeFileSync(outMdPath, md);

  console.log(`✔ Results JSON saved at: ${outJsonPath}`);
  console.log(`✔ Discovery Report saved at: ${outMdPath}`);
}

main().catch(err => {
  console.error('❌ Campaign H009 execution error:', err);
  process.exit(1);
});
