/**
 * 🕶️ SHADOW EXECUTION ENGINE — L15 FASE 2
 *
 * Responde fiduciaria e puramente à pergunta observacional:
 * "Se o Alpha tivesse enviado esta ordem no mundo real neste instante, qual teria sido o resultado líquido após todas as fricções físicas?"
 *
 * Enforça:
 * - Zero envio de ordens (VETO contra ordens reais).
 * - Zero mutação ou feedback loop no Alpha Core.
 * - Reconciliação de microestrutura via MarketDataObserver.
 * - Cálculo de Execution Reality Gap e Execution Quality Score (0-100).
 * - Gravação forense lacrada em knowledge/operations/live_shadow/execution/ sob tag de realidade.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { generateUUIDv7 } from "../../../../../lyzer edge/src/causal-memory/EventFactory.js";
import { fileURLToPath } from 'url';
import { DataLineageEngine } from '../operations/dataLineageEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ShadowExecutionEngine {
  /**
   * @param {import('./marketDataObserver.js').MarketDataObserver} marketDataObserver Observador read-only da exchange
   * @param {Object} config Configuração do motor
   */
  constructor(marketDataObserver, config = {}) {
    if (!marketDataObserver) {
      throw new Error('ShadowExecutionEngine requer uma instância do MarketDataObserver.');
    }
    this.observer = marketDataObserver;
    this.lineageEngine = new DataLineageEngine();
    this.ledgerDir = path.resolve(__dirname, '../../../../../knowledge/operations/live_shadow/execution');
    
    // Criar diretório forense se não existir
    if (!fs.existsSync(this.ledgerDir)) {
      fs.mkdirSync(this.ledgerDir, { recursive: true });
    }

    this.expectedSlippagePerc = config.expectedSlippagePerc || 0.10; // 0.10% teórico
    this.expectedLiquidityBrl = config.expectedLiquidityBrl || 500000; // 500k BRL de liquidez esperada
    this.hasWriteCredentials = false; // Por definição, zero credenciais de escrita
  }

  /**
   * TENTATIVA ILEGAL DE EXECUÇÃO REAL (Para teste de VETO regimental)
   */
  executeRealOrder(orderIntent) {
    const errorMsg = `🚨 [SHADOW EXECUTION VETO] Tentativa ilegal de envio de ordem real para exchange! Shadow Execution possui permissão somente observacional.`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  /**
   * Reconcilia uma intenção hipotética de negociação contra a microestrutura física observada
   * @param {Object} intent { timestamp, asset, side, quantity, theoreticalPrice, confidence }
   */
  async simulateHypotheticalExecution(intent) {
    if (!intent || !intent.asset || !intent.side || !intent.quantity || !intent.theoreticalPrice) {
      throw new Error('Intenção hipotética inválida. Requer timestamp, asset, side, quantity e theoreticalPrice.');
    }

    // 1. Obter snapshot atualizado da microestrutura do observador read-only
    const snapshot = this.observer.latestSnapshot || await this.observer.dataProvider.fetchOrderBookSnapshot(intent.asset);
    
    // Verificar integridade temporal do snapshot antes da execução sombra
    const now = Date.now();
    const clockCheck = this.observer.clockMonitor.validateTimestamp(snapshot.timestamp, now);
    if (clockCheck.status === 'HALT') {
      console.warn(`🚨 [SHADOW EXECUTION HALT] Execução hipotética abortada devido a erro crítico de relógio: ${clockCheck.incident?.message}`);
      return {
        hypotheticalOrderStatus: 'HALTED_CLOCK',
        executionQualityScore: 0,
        reason: 'CLOCK_INTEGRITY_HALT'
      };
    }

    // 2. Validação da tag regimental de Realidade (Observed vs Synthetic)
    const realitySource = snapshot.realitySource || snapshot.source;
    if (!realitySource || (realitySource !== 'OBSERVED_REALITY' && realitySource !== 'SYNTHETIC_REALITY')) {
      throw new Error(`🚨 [REALITY SOURCE ERROR] Snapshot desprovido de tag regimental de realidade válida (${realitySource}). Mistura epistemológica bloqueada.`);
    }

    // 3. Avaliação da Microestrutura (Preço observável, profundidade e spread)
    const isBuy = intent.side.toUpperCase() === 'BUY';
    const observedPrice = isBuy ? snapshot.ask : snapshot.bid;
    const availableVolume = isBuy ? (snapshot.depth?.asksVolume || 0) : (snapshot.depth?.bidsVolume || 0);
    const availableLiquidityBrl = availableVolume * observedPrice;
    const spreadPerc = ((snapshot.ask - snapshot.bid) / ((snapshot.ask + snapshot.bid) / 2)) * 100;

    // 4. Cálculo de Impacto e Slippage Observado
    let marketImpactPerc = 0;
    let observedSlippagePerc = 0;
    let hypotheticalOrderStatus = 'FILLED_SIMULATED';

    if (availableVolume === 0 || availableLiquidityBrl < (intent.quantity * observedPrice * 0.05)) {
      // Liquidez desapareceu ou extremamente insuficiente
      hypotheticalOrderStatus = 'REJECTED_LIQUIDITY';
      observedSlippagePerc = 100; // Impossível absorver
    } else {
      // Cálculo quadrático simplificado de impacto de mercado quantitativo
      const volumeRatio = (intent.quantity * observedPrice) / (availableLiquidityBrl || 1);
      marketImpactPerc = Math.min(volumeRatio * 0.5, 10.0); // Impacto em %
      const rawSlippage = Math.abs((observedPrice - intent.theoreticalPrice) / intent.theoreticalPrice) * 100;
      observedSlippagePerc = rawSlippage + marketImpactPerc;
    }

    // Rejeitar execução sombra se spread for anormalmente abusivo (> 5%)
    if (spreadPerc > 5.0) {
      hypotheticalOrderStatus = 'REJECTED_SPREAD';
    }

    // 5. Cálculo dos Gaps Institucionais (Execution Reality Gap)
    const priceGap = parseFloat((intent.theoreticalPrice - observedPrice).toFixed(4));
    const liquidityGap = parseFloat((this.expectedLiquidityBrl - availableLiquidityBrl).toFixed(2));
    const latencyCostMs = now - (intent.timestamp || now);
    const slippageDeviationPerc = parseFloat((observedSlippagePerc - this.expectedSlippagePerc).toFixed(3));

    // 6. Cálculo do Execution Quality Score (0 a 100) - Mede realidade física, não controla capital
    let executionQualityScore = 100;
    if (hypotheticalOrderStatus === 'REJECTED_LIQUIDITY' || hypotheticalOrderStatus === 'REJECTED_SPREAD') {
      executionQualityScore = 0; // Mercado inviável
    } else {
      // Penalizar por slippage deviation, spread alto e latência física
      if (slippageDeviationPerc > 0) {
        executionQualityScore -= slippageDeviationPerc * 20;
      }
      if (spreadPerc > 0.5) {
        executionQualityScore -= (spreadPerc - 0.5) * 15;
      }
      if (latencyCostMs > 200) {
        executionQualityScore -= ((latencyCostMs - 200) / 100) * 10;
      }
      executionQualityScore = Math.max(0, Math.min(100, Math.round(executionQualityScore)));
    }

    // 7. Simulação contábil de Entrada, Saída e PnL Bruto Hipotético
    const simulatedEntry = isBuy ? observedPrice * (1 + (marketImpactPerc / 100)) : observedPrice * (1 - (marketImpactPerc / 100));
    // Para efeito de simulação instantânea de qualidade, projetamos saída teórica neutralizada
    const simulatedExit = intent.theoreticalExitPrice || intent.theoreticalPrice;
    const grossPnL = isBuy ? (simulatedExit - simulatedEntry) * intent.quantity : (simulatedEntry - simulatedExit) * intent.quantity;

    // 8. Rastreabilidade Causal & Assinatura Lineage
    const snapshotId = generateUUIDv7();
    const lineageHash = this.lineageEngine.recordMetricLineage(
      `ShadowExec_${intent.asset}_${intent.side}`,
      executionQualityScore.toString(),
      `Snapshot_${snapshotId}`,
      'ShadowExecutionEngine',
      `Reconciliação microestrutural com tag [SOURCE: ${realitySource}]`
    );

    // 9. Montagem do Objeto de Resposta e Gravação no Forensic Ledger
    const executionRecord = {
      snapshotId,
      timestamp: now,
      realitySource,
      provider: snapshot.provider,
      hypotheticalOrder: {
        asset: intent.asset,
        side: intent.side,
        quantity: intent.quantity,
        theoreticalPrice: intent.theoreticalPrice,
        confidence: intent.confidence || 0.8
      },
      simulatedFill: {
        status: hypotheticalOrderStatus,
        simulatedEntry: parseFloat(simulatedEntry.toFixed(4)),
        simulatedExit: parseFloat(simulatedExit.toFixed(4)),
        grossPnL: parseFloat(grossPnL.toFixed(2)),
        estimatedSlippage: parseFloat(observedSlippagePerc.toFixed(4)),
        marketImpact: parseFloat(marketImpactPerc.toFixed(4))
      },
      realityGap: {
        priceGap,
        liquidityGap,
        latencyCostMs,
        slippageDeviationPerc
      },
      executionQualityScore,
      lineageHash
    };

    this.recordInForensicLedger(executionRecord);

    return executionRecord;
  }

  /**
   * Grava o evento forense lacrado em disco em knowledge/operations/live_shadow/execution/
   */
  recordInForensicLedger(record) {
    const filename = `execution_ledger_${new Date().toISOString().slice(0, 10)}.jsonl`;
    const filepath = path.join(this.ledgerDir, filename);
    const line = JSON.stringify({
      _tag: `[SOURCE: ${record.realitySource}]`,
      ...record
    }) + '\n';
    
    fs.appendFileSync(filepath, line, 'utf8');
  }
}
