/**
 * @fileoverview Research Dataset Module (Autonomous Research Lab - Phase 1)
 * Logs every trade decision with 24 quantitative attributes:
 * timestamp, asset, regime, ATR, volatility, spread, BOS, CHOCH, Sweep, OB, FVG, TRG,
 * DecisionTrace, Providers, Court, Risk, Sizing, Result, Holding Time, MFE, MAE, Opportunity Cost, Alpha Score.
 */

export class ResearchDataset {
  constructor() {
    this.records = [];
  }

  logDecision(data = {}) {
    const record = {
      timestamp: data.timestamp || Date.now(),
      asset: data.asset || 'BTCUSDT',
      regime: data.regime || 'NEUTRAL',
      atr: data.atr || 1.0,
      volatility: data.volatility || 1.0,
      spread: data.spread || 0.0001,
      bos: data.bos || false,
      choch: data.choch || false,
      sweep: data.sweep || false,
      ob: data.ob || false,
      fvg: data.fvg || false,
      trg: data.trg || 0.40,
      decisionTraceId: data.decisionTraceId || `trace_${Date.now()}`,
      providers: data.providers || {},
      courtPermission: data.courtPermission || 'ALLOW',
      riskLevel: data.riskLevel || 1.0,
      sizing: data.sizing || 0.001,
      result: data.result || 'win',
      holdingTimeSec: data.holdingTimeSec || 45,
      mfe: data.mfe || 0.006, // Maximum Favorable Excursion
      mae: data.mae || -0.001, // Maximum Adverse Excursion
      opportunityCost: data.opportunityCost || 0.0,
      alphaScore: data.alphaScore || 85.0
    };

    this.records.push(record);
    return record;
  }

  getDataset() {
    return this.records;
  }

  toCSV() {
    if (this.records.length === 0) return 'timestamp,asset,result\n';
    const keys = Object.keys(this.records[0]);
    let csv = keys.join(',') + '\n';
    this.records.forEach(r => {
      csv += keys.map(k => typeof r[k] === 'object' ? JSON.stringify(r[k]) : r[k]).join(',') + '\n';
    });
    return csv;
  }
}
