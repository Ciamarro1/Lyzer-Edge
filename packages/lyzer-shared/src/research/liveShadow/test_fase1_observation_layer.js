/**
 * 🧪 SUITE DE VERIFICAÇÃO FASE 1 — L15 REAL MARKET DATA OBSERVATION LAYER & HARDENING
 *
 * Valida a conformidade integral das 7 Diretrizes de Hardening Executivo na Fase 1:
 * 1. Reality Source Separation (OBSERVED vs SYNTHETIC)
 * 2. Exchange Connector Abstraction (Binance, Coinbase, Simulation)
 * 3. Clock Integrity Layer (Future drift, latency delay, backward gap)
 * 4. Order Book Forensic Storage Schema
 * 5. Alpha Observation Firewall (READ-ONLY garantido, WRITES bloqueados e vetados)
 * 6. Market Data Read-Only Observer (Zero ordens reais)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { BinanceProvider, CoinbaseProvider, SimulationProvider } from './ExchangeDataProvider.js';
import { ClockIntegrityMonitor } from './clockIntegrityMonitor.js';
import { AlphaObservationFirewall } from './alphaObservationFirewall.js';
import { MarketDataObserver } from './marketDataObserver.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('================================================================================');
console.log('🏛️ LYZER EDGE — L15 FASE 1: OBSERVATION LAYER & GOVERNANCE HARDENING SUITE');
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

async function runFase1Suite() {
  try {
    // -------------------------------------------------------------------------
    // TESTE 1: REALITY SOURCE SEPARATION POLICY & EXCHANGE ABSTRACTION
    // -------------------------------------------------------------------------
    console.log('--- [TESTE 1/6] REALITY SOURCE SEPARATION & EXCHANGE ABSTRACTION ---');
    const policyPath = path.resolve(__dirname, '../../../../../knowledge/governance/reality_source_policy.md');
    assert(fs.existsSync(policyPath), 'Política de Separação de Realidade existe no disco em knowledge/governance/');

    const binance = new BinanceProvider();
    const coinbase = new CoinbaseProvider();
    const simLab = new SimulationProvider();

    assert(binance.realitySource === 'OBSERVED_REALITY', 'BinanceProvider classificado com tag regimental [OBSERVED_REALITY]');
    assert(coinbase.realitySource === 'OBSERVED_REALITY', 'CoinbaseProvider classificado com tag regimental [OBSERVED_REALITY]');
    assert(simLab.realitySource === 'SYNTHETIC_REALITY', 'SimulationProvider classificado com tag regimental [SYNTHETIC_REALITY]');

    await binance.connect();
    const binanceSnap = await binance.fetchOrderBookSnapshot('BTC/USDT');
    assert(binanceSnap.source === 'OBSERVED_REALITY' && binanceSnap.bid > 0, 'Snapshot Binance retornou estrutura observável física.');
    await binance.disconnect();

    // -------------------------------------------------------------------------
    // TESTE 2: CLOCK INTEGRITY LAYER (NTP DRIFT & DELAY DETECTION)
    // -------------------------------------------------------------------------
    console.log('\n--- [TESTE 2/6] CLOCK INTEGRITY LAYER (NTP DRIFT & DELAYS) ---');
    const clockMonitor = new ClockIntegrityMonitor({ maxFutureDriftMs: 100, haltDelayedMs: 1000 });

    const now = Date.now();
    const normalRes = clockMonitor.validateTimestamp(now, now + 10);
    assert(normalRes.status === 'GREEN', 'Pacote normal (latência 10ms) aprovado como GREEN');

    // Testar timestamp futuro (Drift excessivo no futuro)
    const futureRes = clockMonitor.validateTimestamp(now + 500, now);
    assert(futureRes.status === 'HALT', 'Pacote no futuro (+500ms drift) interceptado com HALT automático');

    // Testar latência crítica (Atraso excessivo de rede)
    const delayedRes = clockMonitor.validateTimestamp(now - 2000, now);
    assert(delayedRes.status === 'HALT', 'Pacote atrasado (-2000ms delay) interceptado com HALT automático');

    // -------------------------------------------------------------------------
    // TESTE 3: ORDER BOOK FORENSIC STORAGE SCHEMA
    // -------------------------------------------------------------------------
    console.log('\n--- [TESTE 3/6] ORDER BOOK FORENSIC STORAGE SCHEMA ---');
    const schemaPath = path.resolve(__dirname, 'orderbook_snapshot_schema.json');
    assert(fs.existsSync(schemaPath), 'Esquema JSON forense orderbook_snapshot_schema.json existe no disco');
    const schemaContent = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    assert(schemaContent.properties.preDecision && schemaContent.properties.duringExecution && schemaContent.properties.postExecution, 'Esquema contém os 3 tempos forenses regimentais: pré, durante e pós');

    // -------------------------------------------------------------------------
    // TESTE 4: ALPHA OBSERVATION FIREWALL (READ-ONLY GUARANTEED)
    // -------------------------------------------------------------------------
    console.log('\n--- [TESTE 4/6] ALPHA OBSERVATION FIREWALL (ALPHA FREEZE) ---');
    const mockAlphaCore = {
      signalVersion: 'V4_IMCE_SMC',
      weights: [0.3, 0.7],
      evaluateSignal: (price) => ({ signal: 'BUY', confidence: 0.85, price }),
      setParameter: (param, val) => { this.param = val; },
      updateWeights: (w) => { this.weights = w; }
    };

    const protectedAlpha = AlphaObservationFirewall.wrapReadOnly(mockAlphaCore, 'AlphaCore_Mock');

    // Verificação READ
    const readSig = protectedAlpha.evaluateSignal(65000);
    assert(readSig.signal === 'BUY' && protectedAlpha.signalVersion === 'V4_IMCE_SMC', 'Firewall permitiu operação READ-ONLY de avaliação de sinal com sucesso');

    // Verificação WRITE (Tentar burlar e mutar pesos ou chamar método de escrita)
    let blockedWriteMethod = false;
    try {
      protectedAlpha.updateWeights([0.5, 0.5]);
    } catch (e) {
      blockedWriteMethod = e.message.includes('ALPHA FIREWALL VETO');
    }
    assert(blockedWriteMethod, 'Firewall interceptou e VETOU tentativa de invocação de método de escrita updateWeights()');

    let blockedPropertySet = false;
    try {
      protectedAlpha.signalVersion = 'HACKED_VERSION';
    } catch (e) {
      blockedPropertySet = e.message.includes('ALPHA FIREWALL VETO');
    }
    assert(blockedPropertySet && protectedAlpha.signalVersion === 'V4_IMCE_SMC', 'Firewall interceptou e VETOU mutação de propriedade no Alpha Core');

    // -------------------------------------------------------------------------
    // TESTE 5: MARKET DATA OBSERVER CONTINUOUS STREAMING
    // -------------------------------------------------------------------------
    console.log('\n--- [TESTE 5/6] MARKET DATA OBSERVER (READ-ONLY STREAMING) ---');
    const coinbaseProvider = new CoinbaseProvider();
    const observer = new MarketDataObserver(coinbaseProvider, { heartbeatIntervalMs: 200, symbol: 'BTC/USD' });

    let snapshotsReceived = 0;
    observer.on('snapshot', (snap) => {
      snapshotsReceived++;
      console.log(`[Observer Stream] Recebido snapshot #${snapshotsReceived} | Bid: ${snap.bid} | Ask: ${snap.ask} | Latência: ${snap.latencyMs}ms | Source: ${snap.realitySource}`);
    });

    await observer.startObservation();
    await new Promise(r => setTimeout(r, 700)); // Aguardar 3 pulsos de heartbeat
    await observer.stopObservation();

    assert(snapshotsReceived >= 2, `Observer capturou ${snapshotsReceived} snapshots físicos em tempo real sem envio de ordens`);

    // -------------------------------------------------------------------------
    // TESTE 6: COMPROVAÇÃO DE REQUISITOS PARA APROVAÇÃO EXECUTIVA DA FASE 1
    // -------------------------------------------------------------------------
    console.log('\n--- [TESTE 6/6] COMPROVAÇÃO DE PRONTIDÃO PARA APROVAÇÃO EXECUTIVA ---');
    const stats = observer.getObserverStats();
    assert(stats.symbol === 'BTC/USD' && stats.realitySource === 'OBSERVED_REALITY', 'Estatísticas do observatório atestam fonte Observed Reality limpa');
    assert(passedTests === totalTests, `Todas as ${totalTests} verificações fiduciárias e de hardening da Fase 1 foram aprovadas (100%)`);

    console.log('\n================================================================================');
    if (passedTests === totalTests) {
      console.log(`🏆 FASE 1 CONCLUÍDA COM EXCELÊNCIA (${passedTests}/${totalTests} TESTES APROVADOS)`);
      console.log(`🛡️ STATUS: CAMADA DE OBSERVAÇÃO AO VIVO PRONTA PARA AUDITORIA EXECUTIVA`);
      console.log(`⚠️ ATENÇÃO: FASES 2 A 7 PERMANECEM ESTRICTAMENTE BLOQUEADAS AGUARDANDO REVISÃO.`);
    } else {
      console.error(`❌ FALHA NA VERIFICAÇÃO (${passedTests}/${totalTests}). BLOQUEANDO SISTEMA.`);
      process.exit(1);
    }
    console.log('================================================================================\n');

  } catch (err) {
    console.error(`❌ Erro fatal na execução dos testes Fase 1:`, err);
    process.exit(1);
  }
}

runFase1Suite();
