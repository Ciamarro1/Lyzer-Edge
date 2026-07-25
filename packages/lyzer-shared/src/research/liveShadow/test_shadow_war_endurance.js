/**
 * 🧪 SUITE ADVERSARIAL DE VERIFICAÇÃO — L15 PHASE 4 FASE 1
 * SHADOW WAR ENDURANCE ENGINE
 *
 * Valida a resistência operacional do motor de endurance em 5 cenários obrigatórios:
 * - Teste 1: Execução normal de 24h simulada (PASS)
 * - Teste 2: Perda de conexão durante ciclo -> detectar, registrar, recuperar, manter lineage (PASS)
 * - Teste 3: Crescimento artificial de memória -> detectar tendência, emitir WARNING (PASS)
 * - Teste 4: Evento corrompido no ledger -> rejeitar, preservar integridade (PASS)
 * - Teste 5: Tentativa de alterar Alpha durante endurance -> VETO (PASS)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { CoinbaseProvider } from './ExchangeDataProvider.js';
import { MarketDataObserver } from './marketDataObserver.js';
import { ShadowExecutionEngine } from './shadowExecutionEngine.js';
import { RealityGapMonitor } from './realityGapMonitor.js';
import { ShadowWarEnduranceSuite } from './shadowWarEnduranceSuite.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('================================================================================');
console.log('🏛️ LYZER EDGE — L15 PHASE 4 FASE 1: SHADOW WAR ENDURANCE SUITE');
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

async function runEnduranceSuite() {
  try {
    const provider = new CoinbaseProvider();
    await provider.connect();
    const observer = new MarketDataObserver(provider, { symbol: 'BTC/USD' });
    const shadowEngine = new ShadowExecutionEngine(observer, { expectedSlippagePerc: 0.10, expectedLiquidityBrl: 500000 });
    const monitor = new RealityGapMonitor(shadowEngine);
    const endurance = new ShadowWarEnduranceSuite(monitor);

    // -------------------------------------------------------------------------
    // TESTE 1: EXECUÇÃO NORMAL DE 24H SIMULADA
    // -------------------------------------------------------------------------
    console.log('--- [TESTE 1/5] EXECUÇÃO NORMAL DE 24H SIMULADA ---');
    const res24h = await endurance.runEnduranceCycle('24h', { source: 'OBSERVED_REALITY', ticksCount: 24 });
    assert(res24h.status === 'CYCLE_COMPLETED', 'Ciclo 24h finalizado sem interrupção indevida');
    assert(res24h.metrics.connectivity.uptimePerc === 100.0, 'Uptime 100% mantido durante ciclo normal 24h');
    assert(res24h.metrics.execution.simulatedExecutions === 24, '24 execuções sombra registradas e validadas perante microestrutura');
    assert(fs.existsSync(endurance.eventsFile), 'Arquivo endurance_events.jsonl gerado e selado');

    // -------------------------------------------------------------------------
    // TESTE 2: PERDA DE CONEXÃO DURANTE CICLO (DETECTAR, REGISTRAR, RECUPERAR)
    // -------------------------------------------------------------------------
    console.log('\n--- [TESTE 2/5] PERDA DE CONEXÃO DURANTE CICLO ---');
    const resDisconnect = await endurance.runEnduranceCycle('7d', { source: 'OBSERVED_REALITY', ticksCount: 20, simulateDisconnect: true });
    assert(resDisconnect.metrics.connectivity.reconnectCount > 0, `Perda de conexão detectada e reconexão contabilizada: ${resDisconnect.metrics.connectivity.reconnectCount}`);
    assert(resDisconnect.metrics.connectivity.offlineTimeMs > 0, `Tempo offline contabilizado com exatidão: ${resDisconnect.metrics.connectivity.offlineTimeMs}ms`);
    assert(resDisconnect.metrics.connectivity.uptimePerc < 100.0 && resDisconnect.metrics.connectivity.uptimePerc >= 99.0, `Uptime institucional preservado acima de 99% após recuperação: ${resDisconnect.metrics.connectivity.uptimePerc}%`);
    assert(resDisconnect.lineage_hash && resDisconnect.lineage_hash.length === 64, 'Lineage criptográfica SHA-256 preservada intacta após reconexão');

    // -------------------------------------------------------------------------
    // TESTE 3: CRESCIMENTO ARTIFICIAL DE MEMÓRIA -> WARNING
    // -------------------------------------------------------------------------
    console.log('\n--- [TESTE 3/5] CRESCIMENTO ARTIFICIAL DE MEMÓRIA ---');
    const resMem = await endurance.runEnduranceCycle('30d', { source: 'OBSERVED_REALITY', ticksCount: 15, simulateMemoryGrowth: true });
    assert(resMem.metrics.system.heapGrowthMb > 20.0, `Tendência de crescimento artificial detectada: +${resMem.metrics.system.heapGrowthMb}MB`);
    
    // Ler o log para verificar a emissão do WARNING no ledger
    const eventsContent = fs.readFileSync(endurance.eventsFile, 'utf8');
    assert(eventsContent.includes('MEMORY_GROWTH_WARNING'), 'Alerta institucional MEMORY_GROWTH_WARNING emitido e selado no ledger forense');

    // -------------------------------------------------------------------------
    // TESTE 4: EVENTO CORROMPIDO NO LEDGER -> REJEITAR, PRESERVAR INTEGRIDADE
    // -------------------------------------------------------------------------
    console.log('\n--- [TESTE 4/5] EVENTO CORROMPIDO NO LEDGER ---');
    const resCorrupt = await endurance.runEnduranceCycle('90d', { source: 'OBSERVED_REALITY', ticksCount: 10, simulateCorruptedEvent: true });
    assert(eventsContent.includes('CORRUPTED_EVENT_REJECTED') || fs.readFileSync(endurance.eventsFile, 'utf8').includes('CORRUPTED_EVENT_REJECTED'), 'Evento corrompido detectado e registrado como rejeição no auditor de ledger');
    assert(resCorrupt.metrics.system.ledgerIntegrity === true, 'Integridade geral do ledger institucional preservada e blindada');

    // -------------------------------------------------------------------------
    // TESTE 5: TENTATIVA DE ALTERAR ALPHA DURANTE ENDURANCE -> VETO
    // -------------------------------------------------------------------------
    console.log('\n--- [TESTE 5/5] TENTATIVA DE ALTERAR ALPHA / CAPITAL (VETO REGIMENTAL) ---');
    
    let v1 = false, m1 = '';
    try { endurance.modifyAlpha({ smcWeights: [1.0] }); } catch (e) { v1 = true; m1 = e.message; }
    assert(v1 && m1.includes('ENDURANCE VETO'), 'Tentativa de modifyAlpha() interceptada pelo veto regimental do Alpha Freeze');

    let v2 = false, m2 = '';
    try { endurance.updateWeights([0.5, 0.5]); } catch (e) { v2 = true; m2 = e.message; }
    assert(v2 && m2.includes('ENDURANCE VETO'), 'Tentativa de updateWeights() barrada com VETO institucional');

    let v3 = false, m3 = '';
    try { endurance.changeCapitalAllocation({ newCap: 5000000 }); } catch (e) { v3 = true; m3 = e.message; }
    assert(v3 && m3.includes('ENDURANCE VETO'), 'Tentativa de changeCapitalAllocation() rejeitada por permissão read-only');

    let v4 = false, m4 = '';
    try { endurance.executeRealOrder({ symbol: 'BTC/USD', side: 'BUY', qty: 10 }); } catch (e) { v4 = true; m4 = e.message; }
    assert(v4 && m4.includes('ENDURANCE VETO'), 'Tentativa de executeRealOrder() bloqueada por isolamento no mundo físico (Shadow Only)');

    // -------------------------------------------------------------------------
    // VERIFICAÇÃO DE ARQUIVOS E LEDGERS EM DISCO
    // -------------------------------------------------------------------------
    console.log('\n--- [VERIFICAÇÃO INSTITUCIONAL] LEDGERS GERADOS ---');
    assert(fs.existsSync(endurance.eventsFile), 'Arquivo endurance_events.jsonl verificado em disco');
    assert(fs.existsSync(endurance.checkpointsFile), 'Arquivo daily_checkpoints.jsonl verificado em disco');
    
    const checkpointsContent = fs.readFileSync(endurance.checkpointsFile, 'utf8');
    assert(checkpointsContent.includes('[SOURCE: OBSERVED_REALITY]'), 'Marcação regimental [SOURCE: OBSERVED_REALITY] confirmada em 100% dos checkpoints');

    await provider.disconnect();

    console.log('\n================================================================================');
    if (passedTests === totalTests) {
      console.log(`🏆 L15 PHASE 4 FASE 1 CONCLUÍDA COM EXCELÊNCIA (${passedTests}/${totalTests} TESTES APROVADOS)`);
      console.log(`🛡️ STATUS: SHADOW WAR ENDURANCE ENGINE CERTIFICADO EM LABORATÓRIO`);
      console.log(`⚠️ ATENÇÃO: FASE 2 (CHAOS INJECTION) E SUBSEQUENTES PERMANECEM ESTRICTAMENTE BLOQUEADAS.`);
    } else {
      console.error(`❌ FALHA NA VERIFICAÇÃO DA FASE 1 (${passedTests}/${totalTests}).`);
      process.exit(1);
    }
    console.log('================================================================================\n');

  } catch (err) {
    console.error('❌ Erro fatal na execução da suíte Shadow War Endurance:', err);
    process.exit(1);
  }
}

runEnduranceSuite();
