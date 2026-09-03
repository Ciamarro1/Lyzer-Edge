/**
 * LYZER LABS — H012 CONFIRMATORY EXECUTION ENGINE
 * Script: run_h012_confirmatory.js
 * 
 * FAIL-CLOSED ARCHITECTURE:
 * 1. Checks H012_EXECUTION_LOCK.json status. Throws immediately if NOT UNLOCKED.
 * 2. Checks V8 Engine SHA-256 invariant. Throws if mutated.
 * 3. Enforces M=1 unit hypothesis confirmatory testing on Virgin Holdout (2025-2026).
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { FirewallGuard } from '../../../alpha_factory/core/firewall_guard.js';
import { AD004FundingDetector } from '../../../alpha_discovery/AD004/core/ad004_funding_detector.js';
import { runCalendarBlockBootstrap } from '../../../alpha_factory/core/inference_battery.js';

const rootDir = process.cwd();
const baseDir = path.resolve(rootDir, 'research/alpha_confirmation/H012_FUNDING_SQUEEZE');

async function main() {
  console.log('================================================================');
  console.log('🏛️ LYZER LABS — H012 CONFIRMATORY EXECUTION (ONE-SHOT HOLDOUT)');
  console.log('================================================================\n');

  // Step 1: Check Execution Lock
  const lockPath = path.join(baseDir, 'preregistration/H012_PREREGISTRATION_LOCK.json');
  if (!fs.existsSync(lockPath)) {
    throw new Error(`[CRITICAL] Missing execution lock file: ${lockPath}`);
  }

  const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
  if (lock.status !== 'UNLOCKED' || !lock.executiveUnlockToken) {
    console.error('⛔ EXECUTION BLOCKED: Confirmatory Execution Lock is ACTIVE.');
    console.error('State:', lock.status);
    console.error('Reason: Awaiting explicit Executive Governance Unlock Authorization.');
    throw new Error('EXECUTION_LOCK_ACTIVE_EXCEPTION: Attempted to run confirmatory test without executive unlock.');
  }

  console.log(`✔ Executive Unlock Token Verified: ${lock.executiveUnlockToken}`);

  // Step 2: Invariant Check (V8 Engine)
  const v8Path = path.resolve(rootDir, 'packages/lyzer-shared/src/providers/institutional_quant_signal_engine.js');
  FirewallGuard.assertV8EngineInvariant(v8Path);
  console.log('✔ Engine V8 Invariant Verified.');

  // Step 3: Load Frozen Specification
  const specPath = path.join(baseDir, 'frozen_spec/H012_FROZEN_SPEC.json');
  const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
  console.log(`Hypothesis ID: ${spec.hypothesisId} | Name: ${spec.name}`);
  console.log(`Holdout Window: ${spec.holdoutPopulation.startDateUTC} -> ${spec.holdoutPopulation.endDateUTC}`);

  // Step 4: Load Holdout Datasets
  const holdoutDataDir = path.join(baseDir, 'holdout_data');
  if (!fs.existsSync(holdoutDataDir)) {
    throw new Error(`Holdout data directory missing at: ${holdoutDataDir}`);
  }

  const targetAssets = spec.holdoutPopulation.targetAssets;
  const assetStore = {};

  for (const sym of targetAssets) {
    const cPath = path.join(holdoutDataDir, `${sym}_8h.json`);
    const fPath = path.join(holdoutDataDir, `${sym}_funding_rates.json`);

    const candles = JSON.parse(fs.readFileSync(cPath, 'utf8'));
    const funding = JSON.parse(fs.readFileSync(fPath, 'utf8'));

    const stats = AD004FundingDetector.precomputeStats(candles, funding, spec.parameters.lookbackL);
    assetStore[sym] = { candles, funding, stats };
  }
  console.log(`✔ All ${targetAssets.length} holdout datasets loaded.`);

  // Step 5: Execute Simulation under Frozen Contract
  const feeRate = spec.friction.feeRatePerLeg;
  const slippageRate = spec.friction.slippageRatePerLeg;
  const H = spec.parameters.holdingPeriods;
  const Z_THRESHOLD = spec.parameters.zScoreThreshold; // -2.5

  let pooledTrades = [];
  const perAssetStats = {};

  for (const sym of targetAssets) {
    const { candles, funding, stats } = assetStore[sym];
    const n = candles.length;
    let inPosUntil = -1;
    let assetTrades = [];

    for (let t = spec.parameters.lookbackL; t < n - H - 1; t++) {
      if (t <= inPosUntil) continue;

      const curZ = stats.zScores[t];
      if (curZ <= Z_THRESHOLD) {
        // Trigger: LONG
        const entryPrice = candles[t + 1].open * (1 + slippageRate);
        const exitPrice = candles[t + H].close * (1 - slippageRate);

        const pricePct = (exitPrice - entryPrice) / entryPrice;

        let fundingCashFlow = 0;
        for (let k = 1; k <= H; k++) {
          fundingCashFlow += (-1 * funding[t + k].fundingRate);
        }

        const totalGrossPct = pricePct + fundingCashFlow;
        const totalNetPct = totalGrossPct - (2 * feeRate);

        const rUnitPct = stats.atr21[t] / candles[t].close;
        const netR = totalNetPct / (rUnitPct > 0 ? rUnitPct : 0.02);

        const tradeObj = {
          symbol: sym,
          entryTime: candles[t + 1].timestamp,
          exitTime: candles[t + H].timestamp,
          pricePct,
          fundingCashFlow,
          totalNetPct,
          netR
        };

        assetTrades.push(tradeObj);
        pooledTrades.push(tradeObj);

        inPosUntil = t + H;
      }
    }

    const nAsset = assetTrades.length;
    const meanRAsset = nAsset > 0 ? (assetTrades.reduce((s, t) => s + t.netR, 0) / nAsset) : 0;
    const wins = assetTrades.filter(t => t.netR > 0).length;
    const grossWin = assetTrades.reduce((s, t) => s + (t.netR > 0 ? t.netR : 0), 0);
    const grossLoss = assetTrades.reduce((s, t) => s + (t.netR < 0 ? Math.abs(t.netR) : 0), 0);
    const pfAsset = grossLoss === 0 ? (grossWin > 0 ? 99 : 0) : (grossWin / grossLoss);

    perAssetStats[sym] = {
      nTrades: nAsset,
      meanNetR: Number(meanRAsset.toFixed(3)),
      profitFactor: Number(pfAsset.toFixed(2)),
      winRate: nAsset > 0 ? Number(((wins / nAsset) * 100).toFixed(1)) : 0
    };
  }

  pooledTrades.sort((a, b) => a.exitTime - b.exitTime);

  // Step 6: 14-Day Calendar Block Bootstrap (B=10,000)
  console.log(`Running 10,000 replications Calendar Block Bootstrap on ${pooledTrades.length} trades...`);
  const boot = runCalendarBlockBootstrap(pooledTrades, {
    replications: spec.confirmatoryGates.gate1_statisticalSignificance.bootstrapReplications,
    seed: 888888
  });

  // Evaluate All 5 Confirmatory Gates
  const gate1Pass = boot.pBlock < 0.0500;
  const gate2Pass = boot.nTrades >= 100;
  const gate3Pass = boot.meanNetR >= 0.150;
  const positiveAssetsCount = Object.values(perAssetStats).filter(s => s.meanNetR > 0).length;
  const gate4Pass = positiveAssetsCount >= 4;
  const gate5Pass = boot.mddR <= 15.0;

  const allGatesPass = gate1Pass && gate2Pass && gate3Pass && gate4Pass && gate5Pass;
  const finalVerdict = allGatesPass ? 'CONFIRMED_ALPHA_PRODUCIBLE' : 'REJECTED_NOT_CONFIRMED';

  const resultsSummary = {
    hypothesisId: 'H012',
    name: 'Perpetual Short Squeeze via Funding Dislocation',
    executionDateUTC: new Date().toISOString(),
    holdoutWindow: spec.holdoutPopulation,
    totalEligibleTrades: boot.nTrades,
    meanNetR: boot.meanNetR,
    ci95Lower: boot.ci95Lower,
    ci95Upper: boot.ci95Upper,
    pBlock: boot.pBlock,
    profitFactor: boot.profitFactor,
    maxDrawdownR: boot.mddR,
    perAssetStats,
    gatesAudit: {
      gate1_statisticalSignificance: { required: 'p < 0.0500', realized: boot.pBlock, pass: gate1Pass },
      gate2_minimumSampleSize: { required: 'N >= 100', realized: boot.nTrades, pass: gate2Pass },
      gate3_economicExpectancy: { required: 'E[R] >= +0.150R', realized: boot.meanNetR, pass: gate3Pass },
      gate4_crossAssetBreadth: { required: '>= 4/6 assets', realized: `${positiveAssetsCount}/6`, pass: gate4Pass },
      gate5_maximumDrawdown: { required: 'MDD <= 15.0R', realized: boot.mddR, pass: gate5Pass },
      allGatesPassed: allGatesPass
    },
    finalVerdict
  };

  const resultsJsonPath = path.join(baseDir, 'results/H012_CONFIRMATORY_RESULTS.json');
  fs.writeFileSync(resultsJsonPath, JSON.stringify(resultsSummary, null, 2));

  // Build Verdict Markdown Report
  let md = `# LAUDO DE VEREDITO CONFIRMATÓRIO — HIPÓTESE H012
## Perpetual Short Squeeze via Funding Dislocation (População Holdout Virgem)

**Identificador:** \`H012\`  
**População Testada:** Holdout Temporal Virgem (\`2025-01-01\` a \`2026-08-31\`)  
**Universo:** \`BTCUSDT\`, \`ETHUSDT\`, \`SOLUSDT\`, \`AVAXUSDT\`, \`LINKUSDT\`, \`DOGEUSDT\`  
**Total de Trades Executados:** \`${boot.nTrades}\` trades  
**Retorno Médio Líquido:** \`${boot.meanNetR >= 0 ? '+' : ''}${boot.meanNetR}R\`  
**Profit Factor:** \`${boot.profitFactor}\`  
**P-Value Bootstrap (14d Blocks):** \`${boot.pBlock.toFixed(4)}\`  
**Max Drawdown:** \`${boot.mddR}R\`  
**Veredito Final:** **\`${finalVerdict}\`**  

---

## 🏛️ Auditoria dos Gates Constitucionais

| Gate Constitucional | Métrica Exigida | Valor Realizado | Status |
|---|---|:---:|:---:|
| **Gate 1: Significância Estatística** | $p < 0,0500$ | **${boot.pBlock.toFixed(4)}** | ${gate1Pass ? '🟢 PASS' : '🔴 FAIL'} |
| **Gate 2: Potência Amostral** | $N \ge 100$ | **${boot.nTrades}** | ${gate2Pass ? '🟢 PASS' : '🔴 FAIL'} |
| **Gate 3: Expectativa Econômica** | $E[R] \ge +0,150R$ | **${boot.meanNetR >= 0 ? '+' : ''}${boot.meanNetR}R** | ${gate3Pass ? '🟢 PASS' : '🔴 FAIL'} |
| **Gate 4: Consistência Transversal** | $\ge 4/6$ ativos positivos | **${positiveAssetsCount}/6** | ${gate4Pass ? '🟢 PASS' : '🔴 FAIL'} |
| **Gate 5: Controle de Drawdown** | $\text{MaxDD} \le 15,0R$ | **${boot.mddR}R** | ${gate5Pass ? '🟢 PASS' : '🔴 FAIL'} |

---

## 📊 Decomposição Transversal por Ativo

| Ativo | $N$ Trades | $E[R]_{\\text{net}}$ | Profit Factor | Win Rate |
|---|:---:|:---:|:---:|:---:|
`;

  for (const sym of targetAssets) {
    const s = perAssetStats[sym];
    md += `| **${sym}** | ${s.nTrades} | ${s.meanNetR >= 0 ? '+' : ''}${s.meanNetR}R | ${s.profitFactor} | ${s.winRate}% |\n`;
  }

  md += `
---

## 🏛️ Decisão Institucional
${allGatesPass
  ? '🟢 **HOMOLOGAÇÃO DEFINITIVA:** A hipótese H012 cumpriu todos os gates confirmatórios na população virgem de holdout temporal e está formalmente promovida ao status de **PRODUCED ALPHA**.'
  : '🔴 **REJEIÇÃO CONFIRMATÓRIA:** A hipótese H012 não atendeu simultaneamente a todos os gates pré-registrados na população de holdout. A promoção para produção está permanentemente bloqueada.'}
`;

  const reportPath = path.join(baseDir, 'results/H012_CONFIRMATORY_VERDICT.md');
  fs.writeFileSync(reportPath, md);

  console.log(`\n✔ Results saved at: ${resultsJsonPath}`);
  console.log(`✔ Verdict report saved at: ${reportPath}`);
  console.log(`FINAL VERDICT: ${finalVerdict}`);
}

main().catch(err => {
  console.error('❌ Confirmatory execution failed:', err);
  process.exit(1);
});
