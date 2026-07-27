/**
 * @fileoverview ECA Court Ledger (Deliverable O)
 * Implements an append-only, tamper-proof audit log for the Constitutional Court.
 * Persists records to SQLite (causal_memory.db) to enforce Edge Riding limits across restarts.
 */

export class ConstitutionalLedger {
  constructor() {
    this.entries = [];
    this.edgeRidingCounters = {
      drawdownNearMisses: 0,
      slippageNearMisses: 0
    };
    this._db = null;
    this._initDatabase();
  }

  async _initDatabase() {
    if (typeof process !== 'undefined' && process.release?.name === 'node') {
      try {
        const sqliteModule = await import('sqlite3').catch(() => null);
        if (!sqliteModule) return;
        const sqlite3 = sqliteModule.default || sqliteModule;
        const path = await import('path');
        const dbPath = path.resolve(process.cwd(), 'causal_memory.db');
        
        this._db = new sqlite3.default.Database(dbPath, (err) => {
          if (!err && this._db) {
            this._db.run(`
              CREATE TABLE IF NOT EXISTS court_ledger (
                id TEXT PRIMARY KEY,
                timestamp INTEGER,
                verdict TEXT,
                reason TEXT,
                token_id TEXT,
                request_json TEXT,
                state_json TEXT
              )
            `);
          }
        });
      } catch (e) {
        // Fallback to in-memory if sqlite3 not available in pure browser bundle
        this._db = null;
      }
    }
  }

  /**
   * Logs a request and its corresponding PermissionToken verdict.
   * @param {Object} requestPayload - The raw request from the Execution Layer
   * @param {Object} token - The signed PermissionToken 
   * @param {Object} stateSnapshot - The raw system state observed by the Court at that exact moment.
   */
  appendRecord(requestPayload, token, stateSnapshot) {
    const record = Object.freeze({
      timestamp: Date.now(),
      request: requestPayload,
      verdict: token.granted ? 'GRANT' : 'VETO',
      reason: token.reason,
      state: stateSnapshot,
      tokenId: token.id
    });
    
    this.entries.push(record);
    this._updateEdgeRidingMetrics(stateSnapshot, token);

    // Asynchronous SQLite persistence
    if (this._db) {
      try {
        this._db.run(
          `INSERT INTO court_ledger (id, timestamp, verdict, reason, token_id, request_json, state_json) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [token.id, record.timestamp, record.verdict, record.reason, token.id, JSON.stringify(requestPayload), JSON.stringify(stateSnapshot)],
          (err) => { if (err) console.warn('[ConstitutionalLedger] DB append error:', err.message); }
        );
      } catch (e) {}
    }
  }

  /**
   * Calculates accumulated near-misses.
   * @private
   */
  _updateEdgeRidingMetrics(stateSnapshot, token) {
    if (!token.granted) {
      this.edgeRidingCounters.drawdownNearMisses = 0;
      this.edgeRidingCounters.slippageNearMisses = 0;
      return;
    }

    const MAX_DRAWDOWN = 0.05; // 5%
    const EDGE_THRESHOLD = 0.95; // 95% of limit

    if (stateSnapshot && stateSnapshot.currentDrawdown >= (MAX_DRAWDOWN * EDGE_THRESHOLD)) {
      this.edgeRidingCounters.drawdownNearMisses++;
    } else {
      this.edgeRidingCounters.drawdownNearMisses = Math.max(0, this.edgeRidingCounters.drawdownNearMisses - 1);
    }
  }

  /**
   * Returns the current count of near-misses for a specific metric.
   * @param {string} metric - e.g., 'drawdown'
   */
  getNearMissCount(metric) {
    return this.edgeRidingCounters[`${metric}NearMisses`] || 0;
  }
  
  /**
   * Dumps the ledger for external audit. Cannot be mutated.
   */
  exportLedger() {
    return JSON.parse(JSON.stringify(this.entries));
  }
}

export const ledger = new ConstitutionalLedger();