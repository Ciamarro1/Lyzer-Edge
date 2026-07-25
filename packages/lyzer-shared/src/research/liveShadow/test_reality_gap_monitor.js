/**
 * 🧪 SUITE DE VERIFICAÇÃO ADVERSARIAL FASE 3 — REALITY GAP MONITOR
 *
 * Valida o comportamento observacional e o semáforo institucional do RealityGapMonitor sob 5 cenários obrigatórios:
 * - TESTE 1: Mercado saudável (spread normal, liquidez normal, baixa latência) -> GREEN
 * - TESTE 2: Slippage crescente (execução piorando gradualmente) -> YELLOW
 * - TESTE 3: Liquidez desaparecendo (book vazio, impacto extremo) -> ORANGE
 * - TESTE 4: Dados corrompidos (timestamp inválido / NTP drift / fonte inconsistente) -> RED
 * - TESTE 5: Tentativa de controle externo (changeCapitalAllocation / modifyAlpha) -> VETO INSTITUCIONAL
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { CoinbaseProvider } from './ExchangeDataProvider.js';
import { MarketDataObserver } from './marketDataObserver.js';
import { ShadowExecutionEngine } from './shadowExecutionEngine.js';
import { RealityGapMonitor } from './realityGapMonitor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('================================================================================');
console.log('🏛️ LYZER EDGE — L15 FASE 3: REALITY GAP MONITOR ADVERSARIAL SUITE');
console.log('================================================================================\n');

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`✅ [TEST PASSED] ${message}`);
  } else {
    console.error(`❌ [TEST FAILED] ${message}`);
  }
}

async function runFase3Suite() {
  try {
    const provider = new CoinbaseProvider();
    await provider.connect();
    const observer = new MarketDataObserver(provider, { symbol: 'BTC/USD' });
    const shadowEngine = new ShadowExecutionEngine(observer, { expectedSlippagePerc: 0.10, expectedLiquidityBrl: 500000 });
    const monitor = new RealityGapMonitor(shadowEngine);

    // -------------------------------------------------------------------------
    // TESTE 1: MERCADO SAUDÁVEL -> ESPERADO: GREEN (75-99 ou 100)
    // -------------------------------------------------------------------------
    console.log('--- [TESTE 1/5] MERCADO SAUDÁVEL (ESPERADO: GREEN) ---');
    const normalSnapshot = {
      symbol: 'BTC/USD',
      timestamp: Date.now(),
      realitySource: 'OBSERVED_REALITY',
      provider: 'COINBASE',
      bid: 65000.00,
      ask: 65005.00,
      spread: 5.00,
      depth: { bidsVolume: 100.0, asksVolume: 100.0 }
    };
    observer.latestSnapshot = normalSnapshot;

    const res1 = await monitor.evaluateRealityDrift();
    assert(res1.state === 'GREEN', `Semáforo institucional acionado em modo saudável: ${res1.state} (Score: ${res1.realityGapScore}/100)`);
    assert(res1.realityGapScore >= 75, `Reality Gap Score na faixa GREEN (>= 75): ${res1.realityGapScore}`);
    assert(res1.realitySource === 'OBSERVED_REALITY', 'Preservação estrita da tag de realidade [OBSERVED_REALITY]');

    // -------------------------------------------------------------------------
    // TESTE 2: SLIPPAGE CRESCENTE -> ESPERADO: YELLOW (50-74)
    // -------------------------------------------------------------------------
    console.log('\n--- [TESTE 2/5] SLIPPAGE CRESCENTE (ESPERADO: YELLOW) ---');
    // Forçamos um registro de execução com slippage extra moderado (~0.9%) e quality score em 55
    const yellowExecRecord = {
      snapshotId: 'yellow_exec_test',
      timestamp: Date.now(),
      realitySource: 'OBSERVED_REALITY',
      provider: 'COINBASE',
      simulatedFill: { status: 'FILLED_SIMULATED', marketImpact: 3.0 },
      realityGap: { slippageDeviationPerc: 0.90, liquidityGap: 0, latencyCostMs: 80 },
      executionQualityScore: 55
    };

    const res2 = await monitor.evaluateRealityDrift(yellowExecRecord);
    assert(res2.state === 'YELLOW', `Semáforo institucional acionado em modo de alerta: ${res2.state} (Score: ${res2.realityGapScore}/100)`);
    assert(res2.realityGapScore >= 50 && res2.realityGapScore < 75, `Reality Gap Score na faixa YELLOW (50-74): ${res2.realityGapScore}`);

    // -------------------------------------------------------------------------
    // TESTE 3: LIQUIDEZ DESAPARECENDO -> ESPERADO: ORANGE (25-49)
    // -------------------------------------------------------------------------
    console.log('\n--- [TESTE 3/5] LIQUIDEZ DESAPARECENDO / IMPACTO EXTREMO (ESPERADO: ORANGE) ---');
    // Forçamos um registro com desaparecimento severo de liquidez (gap 450k) e impacto 7%
    const orangeExecRecord = {
      snapshotId: 'orange_exec_test',
      timestamp: Date.now(),
      realitySource: 'OBSERVED_REALITY',
      provider: 'COINBASE',
      simulatedFill: { status: 'FILLED_SIMULATED', marketImpact: 7.0 },
      realityGap: { slippageDeviationPerc: 1.10, liquidityGap: 450000, latencyCostMs: 150 },
      executionQualityScore: 35
    };

    const res3 = await monitor.evaluateRealityDrift(orangeExecRecord);
    assert(res3.state === 'ORANGE', `Semáforo institucional acionado em deterioração material: ${res3.state} (Score: ${res3.realityGapScore}/100)`);
    assert(res3.realityGapScore >= 25 && res3.realityGapScore < 50, `Reality Gap Score na faixa ORANGE (25-49): ${res3.realityGapScore}`);

    // -------------------------------------------------------------------------
    // TESTE 4: DADOS CORROMPIDOS / NTP DRIFT -> ESPERADO: RED (0-24)
    // -------------------------------------------------------------------------
    console.log('\n--- [TESTE 4/5] DADOS CORROMPIDOS / NTP DRIFT (ESPERADO: RED) ---');
    const redExecRecord = {
      snapshotId: 'red_exec_test',
      timestamp: Date.now() + 10000, // Relógio violado no futuro (+10s)
      realitySource: 'OBSERVED_REALITY',
      provider: 'COINBASE',
      simulatedFill: { status: 'HALTED_CLOCK', marketImpact: 0 },
      realityGap: { slippageDeviationPerc: 0, liquidityGap: 0, latencyCostMs: 0 },
      executionQualityScore: 0
    };

    const res4 = await monitor.evaluateRealityDrift(redExecRecord);
    assert(res4.state === 'RED', `Semáforo institucional acionado em corte crítico por violação temporal: ${res4.state} (Score: ${res4.realityGapScore}/100)`);
    assert(res4.realityGapScore < 25, `Reality Gap Score na faixa RED (<25): ${res4.realityGapScore}`);

    // -------------------------------------------------------------------------
    // TESTE 5: TENTATIVA DE CONTROLE EXTERNO -> VETO INSTITUCIONAL
    // -------------------------------------------------------------------------
    console.log('\n--- [TESTE 5/5] TENTATIVA DE CONTROLE EXTERNO (VETO INSTITUCIONAL) ---');
    let veto1 = false, msg1 = '';
    try {
      monitor.changeCapitalAllocation({ maxCapital: 1000000 });
    } catch (err) {
      veto1 = true;
      msg1 = err.message;
    }
    assert(veto1, 'Tentativa ilegal de invocar changeCapitalAllocation() interceptada pelo sensor');
    assert(msg1.includes('Reality Gap Monitor possui permissão exclusivamente observacional'), 'Mensagem de VETO de capital confirma permissão estritamente observacional');

    let veto2 = false, msg2 = '';
    try {
      monitor.modifyAlpha({ smcWeights: [0.5, 0.5] });
    } catch (err) {
      veto2 = true;
      msg2 = err.message;
    }
    assert(veto2, 'Tentativa ilegal de invocar modifyAlpha() interceptada e rejeitada');
    assert(msg2.includes('Reality Gap Monitor possui permissão exclusivamente observacional'), 'Mensagem de VETO de Alpha reitera a doutrina de sensor observacional');

    // -------------------------------------------------------------------------
    // VERIFICAÇÃO FORENSE DE ARQUIVOS E RELATÓRIOS
    // -------------------------------------------------------------------------
    console.log('\n--- [VERIFICAÇÃO INSTITUCIONAL] LEDGERS E RELATÓRIOS GERADOS ---');
    const ledgerFiles = fs.readdirSync(monitor.ledgerDir);
    assert(ledgerFiles.length > 0, `Ledger forense de Reality Gap gerado em disco: ${ledgerFiles.join(', ')}`);

    const reportFiles = fs.readdirSync(monitor.reportsDir);
    assert(reportFiles.includes('current_reality_state.md'), 'Relatório current_reality_state.md gerado');
    assert(reportFiles.includes('execution_quality_history.md'), 'Relatório execution_quality_history.md gerado');
    assert(reportFiles.includes('reality_gap_analysis.md'), 'Relatório reality_gap_analysis.md gerado respondendo às 4 perguntas regimentais');

    await provider.disconnect();

    console.log('\n================================================================================');
    if (passedTests === totalTests) {
      console.log(`🏆 FASE 3 CONCLUÍDA COM EXCELÊNCIA (${passedTests}/${totalTests} TESTES APROVADOS)`);
      console.log(`🛡️ STATUS: REALITY GAP MONITOR PRONTO PARA REVISÃO EXECUTIVA`);
      console.log(`⚠️ ATENÇÃO: FASE 4 E SUBSEQUENTES PERMANECEM ESTRICTAMENTE BLOQUEADAS.`);
    } else {
      console.error(`❌ FALHA NA VERIFICAÇÃO DA FASE 3 (${passedTests}/${totalTests}).`);
      process.exit(1);
    }
    console.log('================================================================================\n');

  } catch (err) {
    console.error('❌ Erro fatal na execução dos testes Fase 3:', err);
    process.exit(1);
  }
}

runFase3Suite();
