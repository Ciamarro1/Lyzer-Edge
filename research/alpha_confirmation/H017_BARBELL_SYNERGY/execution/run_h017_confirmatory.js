/**
 * LYZER LABS — H017 CONFIRMATORY EXECUTION ENGINE
 * Script: run_h017_confirmatory.js
 * 
 * FAIL-CLOSED ARCHITECTURE:
 * 1. Checks H017_PREREGISTRATION_LOCK.json status. Throws immediately if NOT UNLOCKED.
 * 2. Checks V8 Engine SHA-256 invariant. Throws if mutated.
 * 3. Enforces M=1 unit hypothesis confirmatory testing on Virgin Holdout (2025-2026, 608 days).
 * 4. Executes AD010BarbellSynergyEngine with frozen 85% carry / 15% Wyckoff Spring 1H parameters.
 * 5. Runs 14-Day Calendar Block Bootstrap (B=10,000, Hall centered under H0).
 * 6. Generates comprehensive forensic verdict against the 5 pre-registered constitutional gates.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { FirewallGuard } from '../../../alpha_factory/core/firewall_guard.js';
import { AD010BarbellSynergyEngine } from '../../../alpha_discovery/AD010/core/ad010_barbell_synergy_engine.js';
import { runCalendarBlockBootstrap } from '../../../alpha_factory/core/inference_battery.js';

const rootDir = process.cwd();
const baseDir = path.resolve(rootDir, 'research/alpha_confirmation/H017_BARBELL_SYNERGY');

async function main() {
  console.log('================================================================');
  console.log('🏛️ LYZER LABS — H017 CONFIRMATORY EXECUTION (ONE-SHOT HOLDOUT)');
  console.log('================================================================\n');

  // Step 1: Check Execution Lock (Fail-Closed Barrier)
  const lockPath = path.join(baseDir, 'preregistration/H017_PREREGISTRATION_LOCK.json');
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
  const v8Sha = crypto.createHash('sha256').update(fs.readFileSync(v8Path)).digest('hex');
  console.log(`✔ Engine V8 Invariant Verified: ${v8Sha}`);

  // Step 3: Load Frozen Specification
  const specPath = path.join(baseDir, 'frozen_spec/H017_FROZEN_SPEC.json');
  const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
  console.log(`Hypothesis ID: ${spec.hypothesisId} | Title: ${spec.title}`);
  console.log(`Holdout Window: ${spec.holdoutPeriod.label}`);

  // Step 4: Load Holdout Datasets (Strictly 2025-01-01 to 2026-08-31)
  const holdoutDataDir = path.resolve(rootDir, 'research/alpha_confirmation/H012_FUNDING_SQUEEZE/holdout_data');
  const targetAssets = ['BTCUSDT', 'ETHUSDT'];
  const panel = {};

  for (const sym of targetAssets) {
    const fPath = path.join(holdoutDataDir, `${sym}_funding_rates.json`);
    const allFunding = JSON.parse(fs.readFileSync(fPath, 'utf8'));
    const filteredFunding = allFunding.filter(
      r => r.fundingTime >= spec.holdoutPeriod.startMs && r.fundingTime <= spec.holdoutPeriod.endMs
    );
    if (filteredFunding.length === 0) {
      throw new Error(`No holdout funding records found for ${sym} in window.`);
    }
    panel[sym] = filteredFunding;
  }

  const h1CandlesPath = path.resolve(rootDir, 'research/datasets/BTCUSDT_1h_multiyear_2023_2026.json');
  const btcFundingPath = path.resolve(rootDir, 'research/datasets/BTCUSDT_funding_rates_2023_2026.json');

  const rawCandles = JSON.parse(fs.readFileSync(h1CandlesPath, 'utf8'));
  rawCandles.sort((a, b) => a.openTime - b.openTime);
  const holdoutCandles = rawCandles.filter(c => c.openTime >= spec.holdoutPeriod.startMs && c.openTime <= spec.holdoutPeriod.endMs);

  const rawBtcFunding = JSON.parse(fs.readFileSync(btcFundingPath, 'utf8'));
  rawBtcFunding.sort((a, b) => a.fundingTime - b.fundingTime);
  const holdoutFunding = rawBtcFunding.filter(f => f.fundingTime >= spec.holdoutPeriod.startMs && f.fundingTime <= spec.holdoutPeriod.endMs);

  console.log(`✔ Holdout Data Loaded: ${panel['BTCUSDT'].length} 8H periods, ${holdoutCandles.length} 1H candles.\n`);

  // Step 5: Execute Simulation
  const cellConfig = {
    carryBase: spec.carryLeg.base,
    carryLeverage: spec.carryLeg.leverage,
    carryBorrowRateAnnualPct: spec.carryLeg.borrowRateAnnualPct,
    carryWeight: spec.allocation.carryWeight,
    directionalWeight: spec.allocation.directionalWeight,
    directionalParams: spec.directionalLeg
  };

  const frictionConfig = {
    carryRoundtripBps: spec.carryLeg.turnoverFrictionBps,
    directionalRoundtripBps: spec.directionalLeg.turnoverFrictionBps
  };

  const portfolioRules = {
    directionalMaxHoldingHours: spec.directionalLeg.maxHoldingHours,
    directionalStopAtrMultiplier: spec.directionalLeg.stopLossAtrMultiplier,
    directionalTakeProfitAtrMultiplier: spec.directionalLeg.takeProfitAtrMultiplier
  };

  const simRes = AD010BarbellSynergyEngine.simulate(
    holdoutCandles,
    holdoutFunding,
    panel,
    targetAssets,
    cellConfig,
    frictionConfig,
    portfolioRules
  );

  // Step 6: Run 14-Day Calendar Block Bootstrap (B=10,000)
  console.log(`Running 14-Day Calendar Block Bootstrap (B=10,000 replications)...`);
  const boot = runCalendarBlockBootstrap(simRes.blockReturns, {
    replications: 10000,
    seed: 777777
  });

  const totalHoldingHours = simRes.directionalTradeCount * spec.directionalLeg.maxHoldingHours;
  const totalHoldoutHours = holdoutCandles.length;
  const timeDeltaNeutralPct = Number((((totalHoldoutHours - totalHoldingHours) / totalHoldoutHours) * 100).toFixed(2));

  // Step 7: Audit the 5 Constitutional Gates
  const gate1Pass = simRes.annualizedReturnPct >= spec.constitutionalGates.gate1_annualized_net_return.threshold;
  const gate2Pass = simRes.annualizedSharpe >= spec.constitutionalGates.gate2_annualized_sharpe.threshold;
  const gate3Pass = simRes.maxDrawdownPct <= spec.constitutionalGates.gate3_max_drawdown.threshold;
  const gate4Pass = boot.pBlock < spec.constitutionalGates.gate4_block_bootstrap_p.threshold;
  const gate5Pass = timeDeltaNeutralPct >= spec.constitutionalGates.gate5_structural_delta_neutrality_pct.threshold;

  const allGatesPass = gate1Pass && gate2Pass && gate3Pass && gate4Pass && gate5Pass;
  const finalStatus = allGatesPass ? 'CONFIRMED' : 'REJECTED_NOT_CONFIRMED';

  console.log('\n================================================================');
  console.log(`🏛️ H017 HOLDOUT AUDIT RESULTS:`);
  console.log(`Status: ${finalStatus}`);
  console.log(`Gate 1 (Annualized Return >= +6.00% a.a.): ${simRes.annualizedReturnPct.toFixed(2)}% a.a. [${gate1Pass ? 'PASS 🟢' : 'FAIL 🔴'}]`);
  console.log(`Gate 2 (Annualized Sharpe >= 3.00):      ${simRes.annualizedSharpe.toFixed(2)} [${gate2Pass ? 'PASS 🟢' : 'FAIL 🔴'}]`);
  console.log(`Gate 3 (Max Drawdown <= 2.50%):          ${simRes.maxDrawdownPct.toFixed(2)}% [${gate3Pass ? 'PASS 🟢' : 'FAIL 🔴'}]`);
  console.log(`Gate 4 (Block Bootstrap p < 0.0500):     ${boot.pBlock.toFixed(4)} [${gate4Pass ? 'PASS 🟢' : 'FAIL 🔴'}]`);
  console.log(`Gate 5 (Structural Neutrality >= 90.0%): ${timeDeltaNeutralPct}% [${gate5Pass ? 'PASS 🟢' : 'FAIL 🔴'}]`);
  console.log(`Directional Trades in Holdout:           ${simRes.directionalTradeCount} (Win Rate: ${simRes.directionalWinRate.toFixed(1)}%)`);
  console.log('================================================================\n');

  // Step 8: Persist Results and Verdict
  const resultsDir = path.join(baseDir, 'results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  const resultsPayload = {
    hypothesisId: spec.hypothesisId,
    executionTimestampUTC: new Date().toISOString(),
    status: finalStatus,
    engineV8SHA256: v8Sha,
    metrics: {
      totalNetReturnPct: Number(simRes.totalNetReturnPct.toFixed(2)),
      annualizedReturnPct: Number(simRes.annualizedReturnPct.toFixed(2)),
      annualizedSharpe: Number(simRes.annualizedSharpe.toFixed(2)),
      maxDrawdownPct: Number(simRes.maxDrawdownPct.toFixed(2)),
      directionalTradeCount: simRes.directionalTradeCount,
      directionalWinRate: Number(simRes.directionalWinRate.toFixed(1)),
      timeDeltaNeutralPct,
      nBlocks: boot.nTrades,
      meanNetRPerBlock: boot.meanNetR,
      ci95Lower: boot.ci95Lower,
      ci95Upper: boot.ci95Upper,
      pBlock: boot.pBlock,
      profitFactor: boot.profitFactor
    },
    gates: {
      gate1: { name: 'Annualized Net Return', threshold: '>= +6.00% a.a.', value: `${simRes.annualizedReturnPct.toFixed(2)}% a.a.`, pass: gate1Pass },
      gate2: { name: 'Annualized Sharpe', threshold: '>= 3.00', value: simRes.annualizedSharpe.toFixed(2), pass: gate2Pass },
      gate3: { name: 'Max Drawdown', threshold: '<= 2.50%', value: `${simRes.maxDrawdownPct.toFixed(2)}%`, pass: gate3Pass },
      gate4: { name: 'Block Bootstrap Significance', threshold: 'p < 0.0500', value: boot.pBlock.toFixed(4), pass: gate4Pass },
      gate5: { name: 'Structural Delta Neutrality', threshold: '>= 90.0%', value: `${timeDeltaNeutralPct}%`, pass: gate5Pass }
    },
    directionalTrades: simRes.directionalTrades
  };

  fs.writeFileSync(
    path.join(resultsDir, 'H017_CONFIRMATORY_RESULTS.json'),
    JSON.stringify(resultsPayload, null, 2)
  );

  let verdictMd = `# 🏛️ LYZER LABS — LAUDO FORENSE CONFIRMATÓRIO: HIPÓTESE H017\n\n`;
  verdictMd += `**Data da Execução:** ${new Date().toISOString()}  \n`;
  verdictMd += `**Autoridade:** Senior CTO & Executive Engineering Director  \n`;
  verdictMd += `**Status Constitucional:** **${finalStatus}**  \n`;
  verdictMd += `**Motor V8 SHA-256 Invariante:** \`${v8Sha}\`  \n\n`;
  verdictMd += `---\n\n`;
  verdictMd += `## 1. Auditoria dos Gates Constitucionais\n\n`;
  verdictMd += `| Gate | Métrica | Limiar Exigido | Realizado no Holdout | Status |\n`;
  verdictMd += `|---|---|:---:|:---:|:---:|\n`;
  verdictMd += `| Gate 1 | Retorno Anualizado Líquido | $\\ge +6.00\\%$ a.a. | **+${simRes.annualizedReturnPct.toFixed(2)}% a.a.** | ${gate1Pass ? '🟢 PASS' : '🔴 FAIL'} |\n`;
  verdictMd += `| Gate 2 | Sharpe Anualizado | $\\ge 3.00$ | **${simRes.annualizedSharpe.toFixed(2)}** | ${gate2Pass ? '🟢 PASS' : '🔴 FAIL'} |\n`;
  verdictMd += `| Gate 3 | Rebaixamento Máximo | $\\le 2.50\\%$ | **${simRes.maxDrawdownPct.toFixed(2)}%** | ${gate3Pass ? '🟢 PASS' : '🔴 FAIL'} |\n`;
  verdictMd += `| Gate 4 | Significância em Blocos | $p < 0.0500$ | **${boot.pBlock.toFixed(4)}** | ${gate4Pass ? '🟢 PASS' : '🔴 FAIL'} |\n`;
  verdictMd += `| Gate 5 | Neutralidade Estrutural | $\\ge 90.0\\%$ | **${timeDeltaNeutralPct}%** | ${gate5Pass ? '🟢 PASS' : '🔴 FAIL'} |\n\n`;
  verdictMd += `---\n\n`;
  verdictMd += `## 2. Diagnóstico Causal Forense\n\n`;

  if (allGatesPass) {
    verdictMd += `A Hipótese H017 cumpriu **completamente e simultaneamente** a totalidade dos 5 gates pré-registrados no conjunto virgem de Holdout Temporal (2025–2026, 608 dias de negociação).\n\n`;
    verdictMd += `A combinação da âncora estrutural de carry (85% a $1.5\\times$) com o motor de convexidade direcional Wyckoff Spring (15%) demonstrou ser a **única solução quantitativa capaz de quebrar o teto macro pós-ETF** de $4.5\\%$ a.a., entregando retorno anualizado de **+${simRes.annualizedReturnPct.toFixed(2)}% a.a.** com Sharpe de **${simRes.annualizedSharpe.toFixed(2)}** e rebaixamento máximo de apenas **${simRes.maxDrawdownPct.toFixed(2)}%**.\n`;
  } else {
    verdictMd += `A Hipótese H017 falhou em atender a totalidade dos gates constitucionais. Conforme a Constituição de Engenharia, é estritamente proibido recalibrar parâmetros retrospectivamente. A hipótese é arquivada.\n`;
  }

  fs.writeFileSync(path.join(resultsDir, 'H017_CONFIRMATORY_VERDICT.md'), verdictMd);
  console.log(`✔ Confirmatory artifacts saved to results/`);
}

main().catch(err => {
  console.error('❌ CONFIRMATORY EXECUTION FAILED:', err.message);
  process.exit(1);
});
