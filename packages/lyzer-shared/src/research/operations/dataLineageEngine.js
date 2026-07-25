import fs from 'fs';
import path from 'path';

/**
 * L14 Data Lineage Engine (Regra 3)
 * Garante rastreabilidade fiduciária.
 * Cada métrica institucional deve responder:
 * - De onde veio? (origin)
 * - Quem gerou? (generator)
 * - Quando foi calculada? (timestamp)
 * - Qual transformação sofreu? (transformation)
 */

export class DataLineageEngine {
  constructor() {
    this.lineageDir = path.resolve(process.cwd(), '../../../knowledge/audit/data_lineage');
    if (!fs.existsSync(this.lineageDir)) {
      try { fs.mkdirSync(this.lineageDir, { recursive: true }); } catch(e) {}
    }
    this.lineageLog = path.join(this.lineageDir, 'metric_lineage.jsonl');
  }

  recordMetricLineage(metricName, value, origin, generator, transformation, evidenceRef = null) {
    const entry = {
      metricId: `LIN_${Date.now()}_${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
      metricName,
      value,
      origin,          // ex: "Binance WebSocket BTCUSDT M15 Feed" ou "ShadowFund Blind Ledger"
      generator,       // ex: "BlindAuditLayer v1.0" ou "InstitutionalKPIEngine v1.0"
      timestamp: new Date().toISOString(),
      transformation,  // ex: "Sum(pnl) / PeakNav" ou "StandardDeviation(returns) * sqrt(365)"
      evidenceRef      // ex: "shadow_fund_365d_1784960000.md"
    };

    try {
      fs.appendFileSync(this.lineageLog, JSON.stringify(entry) + '\n', 'utf8');
    } catch(e) {
      console.log(`[DATA LINEAGE] Simulated append for metric ${metricName}`);
    }

    return entry;
  }

  verifyLineageIntegrity(metricId) {
    if (!fs.existsSync(this.lineageLog)) return { valid: false, reason: 'Lineage log missing' };
    try {
      const content = fs.readFileSync(this.lineageLog, 'utf8');
      const lines = content.trim().split('\n').filter(Boolean);
      const entry = lines.map(l => JSON.parse(l)).find(e => e.metricId === metricId || e.metricName === metricId);
      if (!entry) return { valid: false, reason: 'Metric ID/Name not found in lineage log' };
      return { valid: true, lineage: entry };
    } catch(e) {
      return { valid: false, reason: e.message };
    }
  }
}
