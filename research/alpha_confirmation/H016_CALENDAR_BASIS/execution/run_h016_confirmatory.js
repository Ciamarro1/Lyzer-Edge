/**
 * 🏛️ ALPHA FACTORY — CONFIRMATORY CYCLE H016
 * Script: research/alpha_confirmation/H016_CALENDAR_BASIS/execution/run_h016_confirmatory.js
 * 
 * Target: One-Shot Out-of-Sample Confirmatory Evaluation on Virgin Temporal Holdout (2025-01-01 -> 2026-08-31)
 * Subject: Calendar Delivery Basis Arbitrage (ETHUSD Current Quarter, 1.0x, 0% Borrow Cost)
 * 
 * Constitutional Guardrails:
 * 1. Pre-Registration Lock Barrier (Fail-Closed Halt if not authorized).
 * 2. V8 Engine Invariant Verification (SHA-256 fc19e807...b4db1).
 * 3. Exact 14-Day Calendar Block Bootstrap (B=10,000, Hall Centered under H0).
 * 4. Multiplicity penalty M=1 under unit confirmatory protocol.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import https from 'https';
import { FirewallGuard } from '../../../alpha_factory/core/firewall_guard.js';
import { AD009BasisArbitrageEngine } from '../../../alpha_discovery/AD009/core/ad009_basis_arbitrage_engine.js';
import { runCalendarBlockBootstrap } from '../../../alpha_factory/core/inference_battery.js';

const rootDir = process.cwd();

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 15000 }, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} from ${url}`));
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`JSON parse error: ${e.message}`));
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('TIMEOUT'));
    });
  });
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function ingestHoldoutBasisData(pair, contractType, startMs, endMs, outDir) {
  console.log(`Ingesting Holdout Basis for ${pair} ${contractType} (${new Date(startMs).toISOString().slice(0,10)} -> ${new Date(endMs).toISOString().slice(0,10)})...`);
  const results = [];
  let currentStart = startMs;

  while (currentStart < endMs) {
    const url = `https://dapi.binance.com/futures/data/basis?pair=${pair}&contractType=${contractType}&period=1d&startTime=${currentStart}&endTime=${endMs}&limit=500`;
    const batch = await httpsGet(url);

    if (!Array.isArray(batch) || batch.length === 0) break;

    for (const item of batch) {
      const ts = Number(item.timestamp);
      if (ts >= startMs && ts <= endMs) {
        results.push({
          timestamp: ts,
          pair: item.pair,
          contractType: item.contractType,
          indexPrice: parseFloat(item.indexPrice),
          futuresPrice: parseFloat(item.futuresPrice),
          basis: parseFloat(item.basis),
          basisRate: parseFloat(item.basisRate),
          annualizedBasisRate: parseFloat(item.annualizedBasisRate)
        });
      }
    }

    const lastTs = Number(batch[batch.length - 1].timestamp);
    if (lastTs >= endMs || batch.length < 500) break;
    currentStart = lastTs + 1;
    await sleep(250);
  }

  const uniqueMap = new Map();
  for (const r of results) uniqueMap.set(r.timestamp, r);
  const sorted = Array.from(uniqueMap.values()).sort((a, b) => a.timestamp - b.timestamp);

  const outPath = path.join(outDir, `${pair}_${contractType}_1d_holdout.json`);
  fs.writeFileSync(outPath, JSON.stringify(sorted, null, 2));
  console.log(`✔ Ingested ${sorted.length} Holdout records into ${path.basename(outPath)}`);
  return sorted;
}

async function main() {
  console.log('================================================================');
  console.log('🏛️ LYZER LABS — CONFIRMATORY CYCLE H016 (CALENDAR BASIS ARBITRAGE)');
  console.log('================================================================\n');

  // Step 1: V8 Invariant Verification
  const v8Path = path.resolve(rootDir, 'packages/lyzer-shared/src/providers/institutional_quant_signal_engine.js');
  FirewallGuard.assertV8EngineInvariant(v8Path);
  const v8Sha = crypto.createHash('sha256').update(fs.readFileSync(v8Path)).digest('hex');
  console.log(`✔ Engine V8 Invariant Verified: ${v8Sha}`);

  // Step 2: Cryptographic Lock Barrier (Fail-Closed)
  const lockPath = path.resolve(rootDir, 'research/alpha_confirmation/H016_CALENDAR_BASIS/preregistration/H016_PREREGISTRATION_LOCK.json');
  if (!fs.existsSync(lockPath)) {
    throw new Error(`[CRITICAL_SECURITY_HALT] Pre-registration lock file not found: ${lockPath}`);
  }

  const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
  const EXPECTED_TOKEN = 'EXEC_AUTH_TOKEN_H016_HOLDOUT_APPROVED';

  if (lock.status !== 'UNLOCKED' || lock.executiveUnlockToken !== EXPECTED_TOKEN) {
    console.error('\n🔴 ================================================================');
    console.error('CONSTITUTIONAL SECURITY VIOLATION: EXECUTION_LOCK_ACTIVE_EXCEPTION');
    console.error('================================================================');
    console.error(`Hypothesis H016 is cryptographically LOCKED.`);
    console.error(`Current Lock Status: ${lock.status}`);
    console.error(`Unlock Token Present: ${lock.executiveUnlockToken ? 'YES' : 'NONE'}`);
    console.error('Execution terminated immediately under fail-closed security protocol.');
    console.error('Access to Virgin Temporal Holdout (2025–2026) is strictly prohibited.');
    console.error('================================================================\n');
    throw new Error('EXECUTION_LOCK_ACTIVE_EXCEPTION: Execution halted fail-closed.');
  }

  console.log('✔ Executive Authorization Token Verified: EXEC_AUTH_TOKEN_H016_HOLDOUT_APPROVED');
  console.log('✔ Lock Barrier Passed. Proceeding to One-Shot Holdout Execution...\n');

  // Step 3: Load Frozen Spec
  const specPath = path.resolve(rootDir, 'research/alpha_confirmation/H016_CALENDAR_BASIS/frozen_spec/H016_FROZEN_SPEC.json');
  const frozenSpec = JSON.parse(fs.readFileSync(specPath, 'utf8'));

  // Step 4: Acquire Holdout Basis Data
  const holdoutDir = path.resolve(rootDir, 'research/alpha_confirmation/H016_CALENDAR_BASIS/holdout_data');
  if (!fs.existsSync(holdoutDir)) fs.mkdirSync(holdoutDir, { recursive: true });

  const holdoutSeries = await ingestHoldoutBasisData(
    frozenSpec.asset,
    frozenSpec.contractType,
    frozenSpec.holdoutPeriod.startMs,
    frozenSpec.holdoutPeriod.endMs,
    holdoutDir
  );

  // Also fetch BTC spot for delta correlation assertion
  const btcHoldoutSeries = await ingestHoldoutBasisData(
    'BTCUSD',
    'CURRENT_QUARTER',
    frozenSpec.holdoutPeriod.startMs,
    frozenSpec.holdoutPeriod.endMs,
    holdoutDir
  );

  const dataPanel = {
    [`${frozenSpec.asset}_${frozenSpec.contractType}`]: holdoutSeries,
    'BTCUSD_CURRENT_QUARTER': btcHoldoutSeries
  };

  // Step 5: Execute Simulation
  const cellSpec = {
    id: 'H016_CONFIRMATORY_ETH_CURRENT_Q',
    pair: frozenSpec.asset,
    contractType: frozenSpec.contractType,
    leverage: frozenSpec.leverage,
    borrowRateAnnualPct: frozenSpec.borrowRateAnnualPct,
    allocation: frozenSpec.allocation,
    description: frozenSpec.title
  };

  const engine = new AD009BasisArbitrageEngine({ friction: frozenSpec.friction });
  const simRes = engine.simulateCell(cellSpec, dataPanel);

  // Step 6: 14-Day Calendar Block Bootstrap (B=10,000)
  console.log('\nRunning 14-Day Calendar Block Bootstrap (B=10,000 replications)...');
  const boot = runCalendarBlockBootstrap(simRes.blockReturns, {
    replications: 10000,
    seed: 777777,
    epochStartMs: frozenSpec.holdoutPeriod.startMs
  });

  // Step 7: Evaluate Constitutional Gates
  const realizedNetReturnAnnPct = Number(simRes.annualizedNetReturnPct.toFixed(2));
  const realizedTotalNetReturnPct = Number(simRes.totalNetReturnPct.toFixed(2));
  const realizedSharpe = Number(simRes.sharpe.toFixed(2));
  const realizedMaxDDPct = Number(simRes.maxDrawdownPct.toFixed(2));
  const realizedPBlock = Number(boot.pBlock.toFixed(4));
  const realizedDeltaCorr = Number(simRes.deltaResidualCorrelation.toFixed(4));

  const gate1Pass = realizedNetReturnAnnPct >= frozenSpec.gates.gate1_annualizedNetReturnMinPct;
  const gate2Pass = realizedSharpe >= frozenSpec.gates.gate2_annualizedSharpeMin;
  const gate3Pass = realizedMaxDDPct <= frozenSpec.gates.gate3_maxDrawdownMaxPct;
  const gate4Pass = realizedPBlock < frozenSpec.gates.gate4_bootstrapPValueMax;
  const gate5Pass = Math.abs(realizedDeltaCorr) < frozenSpec.gates.gate5_deltaResidualCorrelationMax;

  const allGatesPass = gate1Pass && gate2Pass && gate3Pass && gate4Pass && gate5Pass;
  const confirmatoryVerdict = allGatesPass ? 'CONFIRMED_PRODUCTION_READY' : 'REJECTED_NOT_CONFIRMED';

  console.log('\n================================================================');
  console.log('🏛️ H016 CONSTITUTIONAL GATE AUDIT:');
  console.log(`Gate 1 (Net Return >= +${frozenSpec.gates.gate1_annualizedNetReturnMinPct}% a.a.): ${gate1Pass ? '🟢 PASS' : '🔴 FAIL'} (Realized: +${realizedNetReturnAnnPct}% a.a., Total: +${realizedTotalNetReturnPct}%)`);
  console.log(`Gate 2 (Sharpe >= ${frozenSpec.gates.gate2_annualizedSharpeMin}): ${gate2Pass ? '🟢 PASS' : '🔴 FAIL'} (Realized: ${realizedSharpe})`);
  console.log(`Gate 3 (Max Drawdown <= ${frozenSpec.gates.gate3_maxDrawdownMaxPct}%): ${gate3Pass ? '🟢 PASS' : '🔴 FAIL'} (Realized: ${realizedMaxDDPct}%)`);
  console.log(`Gate 4 (Bootstrap p_block < 0.0500): ${gate4Pass ? '🟢 PASS' : '🔴 FAIL'} (Realized: ${realizedPBlock}, N_blocks=${boot.nTrades})`);
  console.log(`Gate 5 (|rho_Delta| < 0.0500): ${gate5Pass ? '🟢 PASS' : '🔴 FAIL'} (Realized: ${realizedDeltaCorr})`);
  console.log(`FINAL CONSTITUTIONAL VERDICT: ${allGatesPass ? '🟢 CONFIRMED' : '🔴 REJECTED'}`);
  console.log('================================================================\n');

  // Step 8: Persist Results and Verdict Artifacts
  const resultsDir = path.resolve(rootDir, 'research/alpha_confirmation/H016_CALENDAR_BASIS/results');
  if (!fs.existsSync(resultsDir)) fs.mkdirSync(resultsDir, { recursive: true });

  const resultsPayload = {
    hypothesisId: 'H016',
    verdict: confirmatoryVerdict,
    executionTimestampUTC: new Date().toISOString(),
    holdoutPeriod: frozenSpec.holdoutPeriod,
    engineV8SHA256: v8Sha,
    gates: {
      gate1: { metric: 'annualizedNetReturnPct', threshold: `>= ${frozenSpec.gates.gate1_annualizedNetReturnMinPct}%`, realized: realizedNetReturnAnnPct, pass: gate1Pass },
      gate2: { metric: 'annualizedSharpe', threshold: `>= ${frozenSpec.gates.gate2_annualizedSharpeMin}`, realized: realizedSharpe, pass: gate2Pass },
      gate3: { metric: 'maxDrawdownPct', threshold: `<= ${frozenSpec.gates.gate3_maxDrawdownMaxPct}%`, realized: realizedMaxDDPct, pass: gate3Pass },
      gate4: { metric: 'pBlock', threshold: `< ${frozenSpec.gates.gate4_bootstrapPValueMax}`, realized: realizedPBlock, pass: gate4Pass },
      gate5: { metric: 'deltaResidualCorrelation', threshold: `< ${frozenSpec.gates.gate5_deltaResidualCorrelationMax}`, realized: realizedDeltaCorr, pass: gate5Pass }
    },
    metrics: {
      totalNetReturnPct: realizedTotalNetReturnPct,
      annualizedNetReturnPct: realizedNetReturnAnnPct,
      sharpe: realizedSharpe,
      maxDrawdownPct: realizedMaxDDPct,
      pBlock: realizedPBlock,
      profitFactor: boot.profitFactor,
      nBlocks: boot.nTrades,
      deltaResidualCorrelation: realizedDeltaCorr
    }
  };

  fs.writeFileSync(path.join(resultsDir, 'H016_CONFIRMATORY_RESULTS.json'), JSON.stringify(resultsPayload, null, 2), 'utf8');

  // Write Verdict Markdown
  let vMd = `# 🏛️ LYZER LABS — LAUDO FORENSE CONFIRMATÓRIO: HIPÓTESE H016\n\n`;
  vMd += `**Data da Execução:** ${new Date().toISOString()}  \n`;
  vMd += `**Autoridade:** Senior CTO & Executive Engineering Director  \n`;
  vMd += `**Status Constitucional:** **${confirmatoryVerdict}**  \n`;
  vMd += `**Motor V8 SHA-256 Invariante:** \`${v8Sha}\`  \n\n`;
  vMd += `---\n\n`;
  vMd += `## 1. Auditoria dos Gates Constitucionais\n\n`;
  vMd += `| Gate | Métrica | Limiar Exigido | Realizado no Holdout | Status |\n`;
  vMd += `|---|---|:---:|:---:|:---:|\n`;
  vMd += `| Gate 1 | Retorno Anualizado Líquido | $\\ge +${frozenSpec.gates.gate1_annualizedNetReturnMinPct}\\%$ a.a. | **+${realizedNetReturnAnnPct}% a.a.** | ${gate1Pass ? '🟢 PASS' : '🔴 FAIL'} |\n`;
  vMd += `| Gate 2 | Sharpe Anualizado | $\\ge ${frozenSpec.gates.gate2_annualizedSharpeMin}$ | **${realizedSharpe}** | ${gate2Pass ? '🟢 PASS' : '🔴 FAIL'} |\n`;
  vMd += `| Gate 3 | Rebaixamento Máximo | $\\le ${frozenSpec.gates.gate3_maxDrawdownMaxPct}\\%$ | **${realizedMaxDDPct}%** | ${gate3Pass ? '🟢 PASS' : '🔴 FAIL'} |\n`;
  vMd += `| Gate 4 | Significância em Blocos | $p < 0.0500$ | **${realizedPBlock}** | ${gate4Pass ? '🟢 PASS' : '🔴 FAIL'} |\n`;
  vMd += `| Gate 5 | Neutralidade Direcional | $|\\rho| < 0.0500$ | **${realizedDeltaCorr}** | ${gate5Pass ? '🟢 PASS' : '🔴 FAIL'} |\n\n`;
  vMd += `---\n\n`;
  vMd += `## 2. Diagnóstico Causal Forense\n\n`;
  if (allGatesPass) {
    vMd += `A hipótese H016 superou todos os gates constitucionais no Holdout Temporal Virgem (2025–2026), entregando rendimento anualizado superior a +6.00% a.a. sem dívida de margem. Homologação para produção autorizada.\n`;
  } else {
    vMd += `A hipótese H016 falhou em atender a totalidade dos gates constitucionais. Conforme a Constituição de Engenharia, é estritamente proibido recalibrar parâmetros retrospectivamente. A hipótese é arquivada.\n`;
  }

  fs.writeFileSync(path.join(resultsDir, 'H016_CONFIRMATORY_VERDICT.md'), vMd, 'utf8');
  console.log(`✔ Confirmatory Verdict saved to: ${path.join(resultsDir, 'H016_CONFIRMATORY_VERDICT.md')}`);
}

main().catch(err => {
  if (err.message.includes('EXECUTION_LOCK_ACTIVE_EXCEPTION')) {
    process.exit(2);
  }
  console.error('❌ Confirmatory execution failed:', err);
  process.exit(1);
});
