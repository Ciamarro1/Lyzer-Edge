import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

export class ShadowTradingTelemetry {
  constructor(dbPath = 'knowledge/operations/shadow_execution_database.sqlite') {
    // Garante que o diretório exista
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Inicializa o banco de dados com tratamento de timeout para lock de concorrência
    this.db = new Database(dbPath, { timeout: 15000 }); // 15s de busy timeout
    this.db.pragma('journal_mode = WAL'); // Resiliência contra concorrência e crashes
    this.db.pragma('synchronous = NORMAL');
    
    this.initSchema();
  }

  initSchema() {
    // V1 Schema: Shadow Book vs Realidade
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS shadow_trades_v1 (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        asset TEXT NOT NULL,
        detected_regime TEXT,
        signal_type TEXT,
        signal_confidence REAL,
        hypothetical_entry_price REAL,
        real_market_price REAL,
        market_spread REAL,
        expected_slippage REAL,
        realized_slippage REAL,
        governor_decision TEXT,
        veto_reason TEXT,
        hypothetical_pnl REAL,
        max_favorable_excursion REAL,
        max_adverse_excursion REAL
      );
    `);
  }

  logShadowExecution(tradeData) {
    const stmt = this.db.prepare(`
      INSERT INTO shadow_trades_v1 (
        timestamp, asset, detected_regime, signal_type, signal_confidence,
        hypothetical_entry_price, real_market_price, market_spread,
        expected_slippage, realized_slippage, governor_decision, veto_reason,
        hypothetical_pnl, max_favorable_excursion, max_adverse_excursion
      ) VALUES (
        @timestamp, @asset, @detected_regime, @signal_type, @signal_confidence,
        @hypothetical_entry_price, @real_market_price, @market_spread,
        @expected_slippage, @realized_slippage, @governor_decision, @veto_reason,
        @hypothetical_pnl, @max_favorable_excursion, @max_adverse_excursion
      )
    `);

    try {
      stmt.run({
        timestamp: tradeData.timestamp || new Date().toISOString(),
        asset: tradeData.asset || 'BTC/USDT',
        detected_regime: tradeData.detected_regime || 'UNKNOWN',
        signal_type: tradeData.signal_type || 'NONE',
        signal_confidence: tradeData.signal_confidence || 0,
        hypothetical_entry_price: tradeData.hypothetical_entry_price || 0,
        real_market_price: tradeData.real_market_price || 0,
        market_spread: tradeData.market_spread || 0,
        expected_slippage: tradeData.expected_slippage || 0,
        realized_slippage: tradeData.realized_slippage || 0,
        governor_decision: tradeData.governor_decision || 'HALT',
        veto_reason: tradeData.veto_reason || 'N/A',
        hypothetical_pnl: tradeData.hypothetical_pnl || 0,
        max_favorable_excursion: tradeData.max_favorable_excursion || 0,
        max_adverse_excursion: tradeData.max_adverse_excursion || 0
      });
      return true;
    } catch (e) {
      console.error("[SHADOW TELEMETRY ERROR] Falha ao persistir no DB:", e);
      return false;
    }
  }

  getMetrics() {
    // Retorna métricas agregadas da operação sombra para o L8 Dashboard
    const totalTrades = this.db.prepare(`SELECT COUNT(*) as count FROM shadow_trades_v1`).get().count;
    const avgSlippage = this.db.prepare(`SELECT AVG(realized_slippage) as avg FROM shadow_trades_v1 WHERE realized_slippage > 0`).get().avg || 0;
    const vetos = this.db.prepare(`SELECT COUNT(*) as count FROM shadow_trades_v1 WHERE governor_decision = 'VETO'`).get().count;

    return {
      total_shadow_trades: totalTrades,
      average_realized_slippage: avgSlippage,
      total_vetoed_trades: vetos
    };
  }
}
