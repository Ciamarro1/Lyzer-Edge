/**
 * 🧪 SUITE DE VERIFICAÇÃO ADVERSARIAL FASE 2 — SHADOW EXECUTION ENGINE
 *
 * Valida o comportamento institucional do ShadowExecutionEngine sob os 5 cenários obrigatórios:
 * - Teste 1: Book líquido normal (Execução simulada saudável)
 * - Teste 2: Spread aumentado 10x (Slippage elevado detectado / rejeitado)
 * - Teste 3: Liquidez desaparece (Execução inviável registrada / score 0)
 * - Teste 4: Timestamp inválido (Clock Integrity bloqueia)
 * - Teste 5: Tentativa de envio de ordem real (VETO absoluto e imutável)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { CoinbaseProvider } from './ExchangeDataProvider.js';
import { MarketDataObserver } from './marketDataObserver.js';
import { ShadowExecutionEngine } from './shadowExecutionEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('================================================================================');
console.log('🏛️ LYZER EDGE — L15 FASE 2: SHADOW EXECUTION ENGINE ADVERSARIAL SUITE');
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

async function runFase2Suite() {
  try {
    const provider = new CoinbaseProvider();
    await provider.connect();
    const observer = new MarketDataObserver(provider, { symbol: 'BTC/USD' });
    const engine = new ShadowExecutionEngine(observer, { expectedSlippagePerc: 0.10 });

    // -------------------------------------------------------------------------
    // TESTE 1: BOOK LÍQUIDO NORMAL -> EXECUÇÃO SAUDÁVEL
    // -------------------------------------------------------------------------
    console.log('--- [TESTE 1/5] BOOK LÍQUIDO NORMAL (EXECUÇÃO SAUDÁVEL) ---');
    const normalSnapshot = {
      symbol: 'BTC/USD',
      timestamp: Date.now(),
      realitySource: 'OBSERVED_REALITY',
      provider: 'COINBASE',
      bid: 65000.00,
      ask: 65005.00, // Spread ~0.0076%
      spread: 5.00,
      depth: { bidsVolume: 100.0, asksVolume: 100.0 }
    };
    observer.latestSnapshot = normalSnapshot;

    const intentNormal = {
      timestamp: Date.now(),
      asset: 'BTC/USD',
      side: 'BUY',
      quantity: 1.0, // 1 BTC (~65k BRL)
      theoreticalPrice: 65002.00,
      confidence: 0.85
    };

    const res1 = await engine.simulateHypotheticalExecution(intentNormal);
    assert(res1.simulatedFill.status === 'FILLED_SIMULATED', 'Execução hipotética preenchida com status FILLED_SIMULATED');
    assert(res1.executionQualityScore >= 80, `Execution Quality Score saudável: ${res1.executionQualityScore}/100`);
    assert(res1.realitySource === 'OBSERVED_REALITY', 'Assinatura forense de realidade preservada como [OBSERVED_REALITY]');
    assert(res1.realityGap.priceGap !== undefined && res1.realityGap.slippageDeviationPerc !== undefined, 'Execution Reality Gap calculado com sucesso');

    // -------------------------------------------------------------------------
    // TESTE 2: SPREAD AUMENTADO 10X -> SLIPPAGE ELEVADO DETECTADO / REJEITADO
    // -------------------------------------------------------------------------
    console.log('\n--- [TESTE 2/5] SPREAD AUMENTADO 10X (SLIPPAGE DETECTADO) ---');
    const spreadAbusivoSnapshot = {
      ...normalSnapshot,
      timestamp: Date.now(),
      bid: 62000.00,
      ask: 68000.00, // Spread violento de R$ 6.000 (~9.23%)
      spread: 6000.00
    };
    observer.latestSnapshot = spreadAbusivoSnapshot;

    const res2 = await engine.simulateHypotheticalExecution(intentNormal);
    assert(res2.simulatedFill.status === 'REJECTED_SPREAD', `Execução interceptada e rejeitada devido a spread abusivo: ${res2.simulatedFill.status}`);
    assert(res2.executionQualityScore === 0, `Execution Quality Score reduzido a 0 (Mercado inviável sob spread agressivo)`);

    // -------------------------------------------------------------------------
    // TESTE 3: LIQUIDEZ DESAPARECE -> EXECUÇÃO INVIÁVEL REGISTRADA
    // -------------------------------------------------------------------------
    console.log('\n--- [TESTE 3/5] LIQUIDEZ ZERO (EXECUÇÃO INVIÁVEL) ---');
    const zeroLiqSnapshot = {
      ...normalSnapshot,
      timestamp: Date.now(),
      bid: 65000.00,
      ask: 65005.00,
      spread: 5.00,
      depth: { bidsVolume: 0.0, asksVolume: 0.0 } // 0 BTC disponível
    };
    observer.latestSnapshot = zeroLiqSnapshot;

    const res3 = await engine.simulateHypotheticalExecution(intentNormal);
    assert(res3.simulatedFill.status === 'REJECTED_LIQUIDITY', `Execução interceptada com status REJECTED_LIQUIDITY devido à evaporação de liquidez`);
    assert(res3.executionQualityScore === 0, `Execution Quality Score = 0 sob liquidez zero (Mercado inviável)`);

    // -------------------------------------------------------------------------
    // TESTE 4: TIMESTAMP INVÁLIDO -> CLOCK INTEGRITY BLOQUEIA
    // -------------------------------------------------------------------------
    console.log('\n--- [TESTE 4/5] TIMESTAMP INVÁLIDO / NTP DRIFT (CLOCK INTEGRITY HALT) ---');
    const futureClockSnapshot = {
      ...normalSnapshot,
      timestamp: Date.now() + 5000 // Relógio da exchange adiado no futuro em +5000ms
    };
    observer.latestSnapshot = futureClockSnapshot;

    const res4 = await engine.simulateHypotheticalExecution(intentNormal);
    assert(res4.hypotheticalOrderStatus === 'HALTED_CLOCK' || res4.simulatedFill?.status === 'HALTED_CLOCK', 'Clock Integrity Monitor interceptou timestamp futuro e abortou execução (HALTED_CLOCK)');
    assert(res4.executionQualityScore === 0, 'Score zerado em evento de corte por violação temporal');

    // -------------------------------------------------------------------------
    // TESTE 5: TENTATIVA DE ENVIO DE ORDEM REAL -> VETO ABSOLUTO
    // -------------------------------------------------------------------------
    console.log('\n--- [TESTE 5/5] TENTATIVA DE ENVIO DE ORDEM REAL (VETO REGIMENTAL) ---');
    let vetoTriggered = false;
    let vetoMessage = '';
    try {
      engine.executeRealOrder({ asset: 'BTC/USD', side: 'BUY', quantity: 10 });
    } catch (err) {
      vetoTriggered = true;
      vetoMessage = err.message;
    }
    assert(vetoTriggered, 'O motor disparou exceção de VETO contra tentativa de envio de ordem real');
    assert(vetoMessage.includes('Shadow Execution possui permissão somente observacional'), 'Mensagem de VETO contém a declaração regimental obrigatória de observação');

    // -------------------------------------------------------------------------
    // VERIFICAÇÃO DO LEDGER FORENSE NO DISCO
    // -------------------------------------------------------------------------
    console.log('\n--- [VERIFICAÇÃO FORENSE] EXECUTION FORENSIC LEDGER ---');
    const ledgerDir = engine.ledgerDir;
    const files = fs.readdirSync(ledgerDir);
    assert(files.length > 0, `Arquivos forenses gerados no diretório ${ledgerDir}: ${files.join(', ')}`);
    
    if (files.length > 0) {
      const content = fs.readFileSync(path.join(ledgerDir, files[files.length - 1]), 'utf8');
      assert(content.includes('[SOURCE: OBSERVED_REALITY]'), 'Registro contábil no ledger físico selado com tag regimental [SOURCE: OBSERVED_REALITY]');
    }

    await provider.disconnect();

    console.log('\n================================================================================');
    if (passedTests === totalTests) {
      console.log(`🏆 FASE 2 CONCLUÍDA COM EXCELÊNCIA (${passedTests}/${totalTests} TESTES APROVADOS)`);
      console.log(`🛡️ STATUS: SHADOW EXECUTION ENGINE PRONTO PARA REVISÃO EXECUTIVA`);
      console.log(`⚠️ ATENÇÃO: FASE 3 E SUBSEQUENTES PERMANECEM ESTRICTAMENTE BLOQUEADAS.`);
    } else {
      console.error(`❌ FALHA NA VERIFICAÇÃO DA FASE 2 (${passedTests}/${totalTests}).`);
      process.exit(1);
    }
    console.log('================================================================================\n');

  } catch (err) {
    console.error('❌ Erro fatal na execução dos testes Fase 2:', err);
    process.exit(1);
  }
}

runFase2Suite();
