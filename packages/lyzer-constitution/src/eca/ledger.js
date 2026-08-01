/**
 * @fileoverview ECA Court Ledger (Deliverable O)
 * Implements an append-only, tamper-proof audit log for the Constitutional Court.
 * Persists records to SQLite (causal_memory.db) to enforce Edge Riding limits across restarts.
 */

import { safeClone, safeJsonParse } from '../utils/safeJson.js';

export class ConstitutionalLedger {
  constructor(dbInstance = null) {
    this.entries = [];
    this.edgeRidingCounters = {
      drawdownNearMisses: 0,
      slippageNearMisses: 0
    };
    this._db = dbInstance;
    this._initDatabase();
  }

  async _initDatabase() {
    if (this._db) return;
    if (typeof process !== 'undefined' && process.release?.name === 'node') {
      try {
        const sqliteModule = await import('sqlite3').catch(() => null);
        if (!sqliteModule) return;
        const sqlite3 = sqliteModule.default || sqliteModule;
        const path = await import('path');
        const dbPath = path.resolve(process.cwd(), 'causal_memory.db');
        
        this._db = new sqlite3.Database(dbPath, (err) => {
          if (!err && this._db) {
            this._db.run(`
              CREATE TABLE IF NOT EXISTS court_ledger (
                id TEXT PRIMARY KEY,
                timestamp INTEGER NOT NULL,
                action TEXT,
                verdict TEXT,
                reason TEXT,
                token_id TEXT,
                request_json TEXT,
                payload_json TEXT,
                state_json TEXT,
                granted INTEGER,
                near_miss_type TEXT,
                created_at INTEGER NOT NULL
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
   * @param {string|null} nearMissType - Optional near miss indicator ('drawdown', 'slippage', or null)
   */
  appendRecord(requestPayload, token, stateSnapshot, nearMissType = null) {
    const record = Object.freeze({
      timestamp: Date.now(),
      request: requestPayload,
      verdict: token.granted ? 'GRANT' : 'VETO',
      reason: token.reason,
      state: stateSnapshot,
      tokenId: token.id,
      nearMissType: nearMissType
    });
    
    this.entries.push(record);
    this._updateEdgeRidingMetrics(stateSnapshot, token, nearMissType);

    // Asynchronous SQLite persistence
    if (this._db) {
      try {
        if (typeof this._db.insertCourtLedgerEntry === 'function') {
          this._db.insertCourtLedgerEntry({
            id: token.id,
            timestamp: record.timestamp,
            verdict: record.verdict,
            reason: record.reason,
            tokenId: token.id,
            request: requestPayload,
            state: stateSnapshot,
            granted: token.granted,
            nearMissType: nearMissType
          }).catch(err => console.warn('[ConstitutionalLedger] DB helper append error:', err.message));
        } else {
          const rawDb = this._db.db || this._db;
          if (typeof rawDb.run === 'function') {
            rawDb.run(
              `INSERT INTO court_ledger (id, timestamp, verdict, reason, token_id, request_json, state_json, granted, near_miss_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                token.id,
                record.timestamp,
                record.verdict,
                record.reason,
                token.id,
                JSON.stringify(requestPayload),
                JSON.stringify(stateSnapshot),
                token.granted ? 1 : 0,
                nearMissType,
                record.timestamp
              ],
              (err) => { if (err) console.warn('[ConstitutionalLedger] DB append error:', err.message); }
            );
          }
        }
      } catch (e) {
        console.warn('[ConstitutionalLedger] Persistence exception:', e.message);
      }
    }
  }

  /**
   * Startup hydration routine to populate entries and restore edgeRidingCounters across process restarts.
   * @param {Object|null} dbInstance - Optional DB connection or CausalMemoryDB instance
   * @returns {Promise<boolean>}
   */
  async loadFromDb(dbInstance = null) {
    if (dbInstance) {
      this._db = dbInstance;
    }
    if (!this._db) {
      await this._initDatabase();
    }
    if (!this._db) return false;

    return new Promise((resolve) => {
      const sql = `SELECT * FROM court_ledger ORDER BY timestamp ASC`;
      const processRows = (rows) => {
        this.entries = [];
        this.edgeRidingCounters = {
          drawdownNearMisses: 0,
          slippageNearMisses: 0
        };

        for (const row of rows || []) {
          const requestPayload = row.request_json ? safeJsonParse(row.request_json) : (row.payload_json ? safeJsonParse(row.payload_json) : null);
          const stateSnapshot = row.state_json ? safeJsonParse(row.state_json) : null;
          const granted = row.granted !== undefined ? Boolean(row.granted) : (row.verdict === 'GRANT');
          const token = {
            id: row.token_id || row.id,
            granted,
            reason: row.reason
          };
          const record = Object.freeze({
            id: row.id,
            timestamp: row.timestamp,
            request: requestPayload,
            verdict: row.verdict || (granted ? 'GRANT' : 'VETO'),
            reason: row.reason,
            state: stateSnapshot,
            tokenId: token.id,
            nearMissType: row.near_miss_type
          });

          this.entries.push(record);
          this._updateEdgeRidingMetrics(stateSnapshot, token, row.near_miss_type);
        }
        resolve(true);
      };

      const rawDb = this._db.db || this._db;
      if (rawDb && typeof rawDb.all === 'function') {
        rawDb.all(sql, [], (err, rows) => {
          if (err) {
            console.warn('[ConstitutionalLedger] loadFromDb query error:', err.message);
            resolve(false);
          } else {
            processRows(rows);
          }
        });
      } else {
        resolve(false);
      }
    });
  }

  /**
   * Calculates accumulated near-misses.
   * @private
   */
  _updateEdgeRidingMetrics(stateSnapshot, token, nearMissType = null) {
    if (!token.granted && token.reason !== 'VETO_EDGE_RIDING') {
      this.edgeRidingCounters.drawdownNearMisses = 0;
      this.edgeRidingCounters.slippageNearMisses = 0;
      return;
    }

    const MAX_DRAWDOWN = 0.05; // 5%
    const MAX_SLIPPAGE = 0.005; // 0.5%
    const EDGE_THRESHOLD = 0.95; // 95% of limit

    // Evaluate drawdown near-miss
    if (nearMissType === 'drawdown') {
      this.edgeRidingCounters.drawdownNearMisses++;
    } else if (stateSnapshot && typeof stateSnapshot.currentDrawdown === 'number' && stateSnapshot.currentDrawdown >= (MAX_DRAWDOWN * EDGE_THRESHOLD)) {
      this.edgeRidingCounters.drawdownNearMisses++;
    } else {
      this.edgeRidingCounters.drawdownNearMisses = Math.max(0, this.edgeRidingCounters.drawdownNearMisses - 1);
    }

    // Evaluate slippage near-miss
    if (nearMissType === 'slippage') {
      this.edgeRidingCounters.slippageNearMisses++;
    } else if (stateSnapshot && typeof stateSnapshot.currentSlippage === 'number' && stateSnapshot.currentSlippage >= (MAX_SLIPPAGE * EDGE_THRESHOLD)) {
      this.edgeRidingCounters.slippageNearMisses++;
    } else {
      this.edgeRidingCounters.slippageNearMisses = Math.max(0, this.edgeRidingCounters.slippageNearMisses - 1);
    }
  }

  /**
   * Returns the current count of near-misses for a specific metric.
   * @param {string} metric - e.g., 'drawdown' or 'slippage'
   */
  getNearMissCount(metric) {
    return this.edgeRidingCounters[`${metric}NearMisses`] || 0;
  }
  
  /**
   * Dumps the ledger for external audit. Cannot be mutated.
   */
  exportLedger() {
    return safeClone(this.entries);
  }
}

export const ledger = new ConstitutionalLedger();