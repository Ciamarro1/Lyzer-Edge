/**
 * 🏛️ SHADOW WAR ENDURANCE ENGINE — L15 PHASE 4 (FASE 1)
 *
 * Motor institucional de observação contínua e testes de resistência operacional em longo horizonte.
 * Enforça a LEI SUPREMA DO ALPHA FREEZE ABSOLUTO:
 * - O sistema observa, mede, registra e sobrevive sem jamais modificar pesos, heurísticas ou capital.
 * - Proteção com VETO explícito contra tentativas de modificação de Alpha ou envio de ordens reais.
 *
 * Horizontes Suportados: '24h', '7d', '30d', '90d', '180d'.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { DataLineageEngine } from '../operations/dataLineageEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ShadowWarEnduranceSuite {
  /**
   * @param {import('./realityGapMonitor.js').RealityGapMonitor} realityMonitor Sensor de Reality Gap
   * @param {Object} config Configurações institucionais de endurance
   */
  constructor(realityMonitor, config = {}) {
    if (!realityMonitor) {
      throw new Error('ShadowWarEnduranceSuite requer uma instância do RealityGapMonitor.');
    }
    this.realityMonitor = realityMonitor;
    this.shadowEngine = realityMonitor.shadowEngine;
    this.observer = realityMonitor.observer;
    this.lineageEngine = new DataLineageEngine();

    this.enduranceDir = path.resolve(__dirname, '../../../../../knowledge/operations/live_shadow/endurance');
    if (!fs.existsSync(this.enduranceDir)) fs.mkdirSync(this.enduranceDir, { recursive: true });

    this.eventsFile = path.join(this.enduranceDir, 'endurance_events.jsonl');
    this.checkpointsFile = path.join(this.enduranceDir, 'daily_checkpoints.jsonl');

    // Estado operacional e métricas contínuas
    this.resetMetrics();
    this.activeSource = null; // Para enforcement rigoroso de anti-mistura
  }

  resetMetrics() {
    this.metrics = {
      connectivity: {
        uptimePerc: 100.0,
        reconnectCount: 0,
        heartbeatFailures: 0,
        offlineTimeMs: 0
      },
      data: {
        snapshotsReceived: 0,
        invalidSnapshots: 0,
        temporalGapsCount: 0,
        timestampDivergences: 0
      },
      execution: {
        simulatedExecutions: 0,
        rejections: 0,
        totalExecutionQuality: 0,
        totalRealityGapScore: 0,
        avgExecutionQuality: 100.0,
        avgRealityGap: 100.0
      },
      system: {
        initialHeapMb: parseFloat((process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)),
        currentHeapMb: parseFloat((process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)),
        heapGrowthMb: 0.0,
        eventCount: 0,
        ledgerIntegrity: true
      }
    };
  }

  /**
   * ❌ VETO REGIMENTAL 1: PROIBIDO MODIFICAR ALPHA
   */
  modifyAlpha(params) {
    const errorMsg = `🚨 [ENDURANCE VETO] Tentativa ilegal de mutação no Alpha Core durante Shadow War! Violação da Lei Suprema do Alpha Freeze.`;
    this.recordEvent('180d', 'ShadowWarEnduranceSuite', 'VIOLATION_ATTEMPT', 'CRITICAL', 'OBSERVED_REALITY', { method: 'modifyAlpha' });
    throw new Error(errorMsg);
  }

  /**
   * ❌ VETO REGIMENTAL 2: PROIBIDO ATUALIZAR PESOS
   */
  updateWeights(newWeights) {
    const errorMsg = `🚨 [ENDURANCE VETO] Tentativa ilegal de atualização de pesos institucionais! O Shadow War Engine opera estritamente em modo read-only.`;
    this.recordEvent('180d', 'ShadowWarEnduranceSuite', 'VIOLATION_ATTEMPT', 'CRITICAL', 'OBSERVED_REALITY', { method: 'updateWeights' });
    throw new Error(errorMsg);
  }

  /**
   * ❌ VETO REGIMENTAL 3: PROIBIDO ALTERAR ALOCAÇÃO DE CAPITAL
   */
  changeCapitalAllocation(newCap) {
    const errorMsg = `🚨 [ENDURANCE VETO] Tentativa ilegal de remanejamento de capital! O Shadow War Engine opera sem permissões financeiras ativas.`;
    this.recordEvent('180d', 'ShadowWarEnduranceSuite', 'VIOLATION_ATTEMPT', 'CRITICAL', 'OBSERVED_REALITY', { method: 'changeCapitalAllocation' });
    throw new Error(errorMsg);
  }

  /**
   * ❌ VETO REGIMENTAL 4: PROIBIDO EXECUTAR ORDENS REAIS
   */
  executeRealOrder(order) {
    const errorMsg = `🚨 [ENDURANCE VETO] Tentativa ilegal de roteamento de ordem real na microestrutura da exchange! A L15 opera estritamente sob Shadow Execution.`;
    this.recordEvent('180d', 'ShadowWarEnduranceSuite', 'VIOLATION_ATTEMPT', 'CRITICAL', 'OBSERVED_REALITY', { method: 'executeRealOrder' });
    throw new Error(errorMsg);
  }

  /**
   * Grava evento contábil selado no endurance_events.jsonl
   */
  recordEvent(horizon, component, eventType, severity, source, metadata = {}) {
    // Validação Anti-Mistura de realidade
    if (!source || (source !== 'OBSERVED_REALITY' && source !== 'SYNTHETIC_REALITY')) {
      throw new Error(`🚨 [REALITY SOURCE ERROR] Tag de fonte inválida no Endurance Engine: ${source}`);
    }
    if (!this.activeSource) {
      this.activeSource = source;
    } else if (this.activeSource !== source) {
      this.metrics.system.ledgerIntegrity = false;
      throw new Error(`🚨 [EPISTEMIC CONTAMINATION] Tentativa de misturar fontes de realidade no mesmo stream do Shadow War Engine (${this.activeSource} vs ${source}).`);
    }

    const timestamp = Date.now();
    const rawPayload = `${timestamp}:${horizon}:${component}:${eventType}:${severity}:${source}:${JSON.stringify(metadata)}`;
    const lineage_hash = crypto.createHash('sha256').update(rawPayload).digest('hex');

    const eventRecord = {
      _tag: `[SOURCE: ${source}]`,
      timestamp,
      horizon,
      component,
      event_type: eventType,
      severity,
      source,
      lineage_hash,
      metadata
    };

    fs.appendFileSync(this.eventsFile, JSON.stringify(eventRecord) + '\n', 'utf8');
    this.metrics.system.eventCount++;
    return eventRecord;
  }

  /**
   * Emite um checkpoint diário ou de horizonte no daily_checkpoints.jsonl
   */
  emitCheckpoint(horizon, source, status = 'HEALTHY', options = {}) {
    const timestamp = Date.now();
    if (!options.simulateMemoryGrowth) {
      this.updateHeapMetrics();
    }

    const checkpointRecord = {
      _tag: `[SOURCE: ${source}]`,
      timestamp,
      horizon,
      status,
      metrics: JSON.parse(JSON.stringify(this.metrics)),
      lineage_hash: crypto.createHash('sha256').update(`${timestamp}:${horizon}:${status}:${JSON.stringify(this.metrics)}`).digest('hex')
    };

    fs.appendFileSync(this.checkpointsFile, JSON.stringify(checkpointRecord) + '\n', 'utf8');
    return checkpointRecord;
  }

  updateHeapMetrics() {
    const usedMb = parseFloat((process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2));
    this.metrics.system.currentHeapMb = usedMb;
    this.metrics.system.heapGrowthMb = parseFloat((usedMb - this.metrics.system.initialHeapMb).toFixed(2));
  }

  /**
   * Executa um ciclo simulado de endurance para um horizonte temporal institucional.
   * @param {string} horizon '24h', '7d', '30d', '90d', '180d'
   * @param {Object} options Configurações de teste ou injeção
   */
  async runEnduranceCycle(horizon, options = {}) {
    const validHorizons = ['24h', '7d', '30d', '90d', '180d'];
    if (!validHorizons.includes(horizon)) {
      throw new Error(`Horizonte temporal inválido: ${horizon}. Suportados: ${validHorizons.join(', ')}`);
    }

    const source = options.source || 'OBSERVED_REALITY';
    this.recordEvent(horizon, 'ShadowWarEnduranceSuite', 'CYCLE_START', 'INFO', source, { horizon, mode: options.mode || 'LAB_ACCELERATED' });

    const ticksCount = options.ticksCount || (horizon === '24h' ? 24 : horizon === '7d' ? 50 : horizon === '30d' ? 100 : horizon === '90d' ? 200 : 300);

    for (let i = 1; i <= ticksCount; i++) {
      // Simulação de anomalias injetadas via opções
      if (options.simulateDisconnect && i === Math.floor(ticksCount / 2)) {
        this.metrics.connectivity.reconnectCount++;
        this.metrics.connectivity.offlineTimeMs += 5000;
        this.metrics.connectivity.uptimePerc = parseFloat(((1 - (this.metrics.connectivity.offlineTimeMs / 86400000)) * 100).toFixed(4));
        this.recordEvent(horizon, 'WebSocketConnector', 'CONNECTION_LOST', 'WARNING', source, { offlineMs: 5000 });
      }

      if (options.simulateMemoryGrowth && i > 5) {
        this.metrics.system.currentHeapMb += 5.0; // Simula crescimento artificial
        this.metrics.system.heapGrowthMb = parseFloat((this.metrics.system.currentHeapMb - this.metrics.system.initialHeapMb).toFixed(2));
        if (this.metrics.system.heapGrowthMb > 20.0) {
          this.recordEvent(horizon, 'HeapMonitor', 'MEMORY_GROWTH_WARNING', 'WARNING', source, { growthMb: this.metrics.system.heapGrowthMb });
        }
      } else if (!options.simulateMemoryGrowth) {
        this.updateHeapMetrics();
      }

      if (options.simulateCorruptedEvent && i === ticksCount) {
        // Tenta corromper a integridade ou registrar evento anômalo
        this.recordEvent(horizon, 'LedgerAuditor', 'CORRUPTED_EVENT_REJECTED', 'ERROR', source, { reason: 'Checksum mismatch simulated' });
      }

      // Processa snapshot normal
      this.metrics.data.snapshotsReceived++;
      const snap = {
        symbol: 'BTC/USD',
        timestamp: Date.now(),
        realitySource: source,
        provider: 'COINBASE',
        bid: 65000 + (Math.random() * 20 - 10),
        ask: 65005 + (Math.random() * 20 - 10),
        spread: 5.0,
        depth: { bidsVolume: 150.0, asksVolume: 150.0 }
      };
      this.observer.latestSnapshot = snap;

      // Mede o gap microestrutural no RealityGapMonitor
      const gapRes = await this.realityMonitor.evaluateRealityDrift();
      this.metrics.execution.simulatedExecutions++;
      if (gapRes.state === 'RED') {
        this.metrics.execution.rejections++;
      }
      this.metrics.execution.totalExecutionQuality += gapRes.executionQuality;
      this.metrics.execution.totalRealityGapScore += gapRes.realityGapScore;
      this.metrics.execution.avgExecutionQuality = parseFloat((this.metrics.execution.totalExecutionQuality / this.metrics.execution.simulatedExecutions).toFixed(2));
      this.metrics.execution.avgRealityGap = parseFloat((this.metrics.execution.totalRealityGapScore / this.metrics.execution.simulatedExecutions).toFixed(2));

      // Emissão de checkpoints periódicos
      if (i % Math.max(1, Math.floor(ticksCount / 4)) === 0) {
        this.emitCheckpoint(horizon, source, 'RUNNING_CHECKPOINT', options);
      }
    }

    this.recordEvent(horizon, 'ShadowWarEnduranceSuite', 'CYCLE_COMPLETED', 'INFO', source, { totalTicks: ticksCount, finalScore: this.metrics.execution.avgRealityGap });
    const finalCheckpoint = this.emitCheckpoint(horizon, source, 'CYCLE_COMPLETED', options);
    return finalCheckpoint;
  }
}
