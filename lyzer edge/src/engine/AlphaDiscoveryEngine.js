/**
 * @fileoverview AlphaDiscoveryEngine — Autonomous Multi-Dimensional Pattern Mining
 * & Institutional Trade Audit Certification Engine for Lyzer Edge.
 */

import db from '../db/database.js';
import {
  calcAllStats,
  calcWilsonScoreInterval,
  calcSQN,
  calcExpectancy,
  calcProfitFactor,
  generateTradeAuditCertificate
} from './stats.js';

export class AlphaDiscoveryEngine {
  constructor() {
    this._cache = null;
    this._lastScanTime = 0;
  }

  /**
   * Mine all trades stored in Dexie database and extract dynamic Alpha Clusters & Toxic Signatures.
   * @returns {Promise<Object>} Mined clusters, confidence bounds, and Audit Certificate.
   */
  async mineDatabase() {
    try {
      const trades = await db.trades.where('status').equals('closed').toArray();
      const marketContexts = await db.marketContext.toArray();

      const contextMap = {};
      for (const ctx of marketContexts) {
        if (ctx.tradeId) contextMap[ctx.tradeId] = ctx;
      }

      // Group trades dynamically by (direction x session x marketState)
      const clusterMap = {};

      for (const trade of trades) {
        const ctx = contextMap[trade.id] || {};
        const direction = (trade.direction || 'LONG').toUpperCase();
        const session = ctx.session || 'New York';
        const marketState = ctx.marketState || 'Trending';
        const key = `${direction} | ${session} | ${marketState}`;

        if (!clusterMap[key]) {
          clusterMap[key] = {
            signature: key,
            direction,
            session,
            mktState: marketState,
            trades: []
          };
        }
        clusterMap[key].trades.push(trade);
      }

      const minedClusters = Object.values(clusterMap).map(cluster => {
        const tList = cluster.trades;
        const wins = tList.filter(t => t.result === 'win' || t.pnl > 0);
        const losses = tList.filter(t => t.result === 'loss' || t.pnl < 0);
        const totalPnL = tList.reduce((s, t) => s + (t.pnl || 0), 0);
        const winRate = tList.length > 0 ? (wins.length / tList.length) * 100 : 0;
        const wilson = calcWilsonScoreInterval(tList);
        const pf = calcProfitFactor(tList);
        const expectancy = calcExpectancy(tList);
        const sqn = calcSQN(tList);

        return {
          signature: cluster.signature,
          direction: cluster.direction,
          session: cluster.session,
          mktState: cluster.mktState,
          count: tList.length,
          wins: wins.length,
          losses: losses.length,
          totalPnL: Number(totalPnL.toFixed(2)),
          winRate: Number(winRate.toFixed(1)),
          confidenceInterval: `[${wilson.minWinRate}% - ${wilson.maxWinRate}%]`,
          profitFactor: pf === Infinity ? 99.9 : Number(pf.toFixed(2)),
          expectancy: Number(expectancy.toFixed(2)),
          sqn,
          significance: wilson.significance
        };
      });

      // Filter and rank Top Alpha Clusters and Toxic Signatures
      const alphaClusters = minedClusters
        .filter(c => c.totalPnL > 0 && c.count >= 2)
        .sort((a, b) => b.expectancy - a.expectancy)
        .slice(0, 4);

      const toxicSignatures = minedClusters
        .filter(c => c.totalPnL < 0 && c.count >= 2)
        .sort((a, b) => a.expectancy - b.expectancy)
        .slice(0, 4);

      const overallStats = calcAllStats(trades);
      const certificate = generateTradeAuditCertificate(trades);

      this._cache = {
        totalTradesCount: trades.length,
        overallStats,
        alphaClusters,
        toxicSignatures,
        allClusters: minedClusters,
        certificate,
        scannedAt: new Date().toISOString()
      };

      this._lastScanTime = Date.now();
      return this._cache;
    } catch (err) {
      console.warn('[AlphaDiscoveryEngine] Error mining database, using fallback:', err);
      return this._getFallbackDiscovery();
    }
  }

  _getFallbackDiscovery() {
    return {
      totalTradesCount: 0,
      overallStats: {},
      alphaClusters: [],
      toxicSignatures: [],
      certificate: { certificateId: 'NONE', datasetSize: 0 },
      scannedAt: new Date().toISOString()
    };
  }
}

export const alphaDiscoveryEngine = new AlphaDiscoveryEngine();
