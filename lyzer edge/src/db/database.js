import Dexie from 'dexie';

// ── Constants ────────────────────────────────────────────────────────────────

/** @enum {string} Trade event type identifiers */
export const EVENT_TYPES = Object.freeze({
  ENTRY_CREATED: 'ENTRY_CREATED',
  STOP_MOVED: 'STOP_MOVED',
  TP_MOVED: 'TP_MOVED',
  PARTIAL_TAKEN: 'PARTIAL_TAKEN',
  BREAK_EVEN_SET: 'BREAK_EVEN_SET',
  SCALE_IN: 'SCALE_IN',
  SCALE_OUT: 'SCALE_OUT',
  NOTE_ADDED: 'NOTE_ADDED',
  CLOSED: 'CLOSED',
});

/** @enum {string} Market state identifiers */
export const MARKET_STATES = Object.freeze({
  TRENDING: 'trending',
  RANGING: 'ranging',
  EXPANSION: 'expansion',
  COMPRESSION: 'compression',
  HIGH_VOLATILITY: 'high_volatility',
  LOW_VOLATILITY: 'low_volatility',
});

/** @enum {string} Market structure identifiers */
export const STRUCTURES = Object.freeze({
  BOS: 'bos',
  CHOCH: 'choch',
  LIQUIDITY_SWEEP: 'liquidity_sweep',
  FVG: 'fvg',
  ORDER_BLOCK: 'order_block',
  RETEST: 'retest',
  BREAKOUT: 'breakout',
  PULLBACK: 'pullback',
});

/** @enum {string} Trading session identifiers */
export const SESSIONS = Object.freeze({
  ASIA: 'asia',
  LONDON: 'london',
  NEW_YORK: 'new_york',
  LONDON_NY_OVERLAP: 'london_ny_overlap',
});

/** @enum {string} Trade status */
export const TRADE_STATUS = Object.freeze({
  OPEN: 'open',
  CLOSED: 'closed',
});

/** @enum {string} Trade result */
export const TRADE_RESULT = Object.freeze({
  WIN: 'win',
  LOSS: 'loss',
  BREAKEVEN: 'breakeven',
});

// ── Database ─────────────────────────────────────────────────────────────────

const db = new Dexie('LyzerEdgeDB');

db.version(1).stores({
  trades:
    '++id, symbol, asset, market, status, direction, entryDate, exitDate, [symbol+status], [direction+status], [entryDate], [market+status]',

  tradeEvents:
    '++id, tradeId, type, timestamp, [tradeId], [type], [tradeId+type]',

  screenshots:
    '++id, tradeId, type, timestamp, [tradeId]',

  marketContext:
    '++id, tradeId, marketState, session, [tradeId], [marketState], [session]',

  equitySnapshots:
    '++id, &date, balance, drawdown, drawdownPct, peakBalance',

  edgeScoreHistory:
    '++id, date, score, version, [date]',

  simulationCache:
    '++id, timestamp, paramsHash, results',

  settings:
    'key',

  alerts:
    '++id, type, severity, timestamp, read, [read+timestamp]',

  tags:
    '++id, &name',

  tradeTags:
    '++id, tradeId, tagId, [tradeId], [tagId]',

  tradeFeatures:
    '++id, tradeId, featureKey, [tradeId], [featureKey], [tradeId+featureKey]',

  patternSnapshots:
    '++id, type, timestamp, [type], [timestamp]',

  edgeSnapshots:
    '++id, &date, edgeScore, confidence, persistence, behaviorScore, riskOfRuin, totalTrades, rolling30Edge, rolling100Edge, bestPatternId, worstPatternId',
});

// ── Default Settings ─────────────────────────────────────────────────────────

/** @type {Record<string, unknown>} */
const DEFAULT_SETTINGS = {
  accountBalance: 10000,
  currency: 'USD',
  maxRiskPercent: 2,
  maxTradesPerDay: 5,
  timezone: 'UTC',
};

// ── Initialisation ───────────────────────────────────────────────────────────

/**
 * Ensures the database is ready and seeds default settings when the
 * settings table is empty.
 * @returns {Promise<void>}
 */
export async function initDatabase() {
  try {
    await db.open();

    const existingSettingsCount = await db.settings.count();

    if (existingSettingsCount === 0) {
      const settingsRows = Object.entries(DEFAULT_SETTINGS).map(
        ([key, value]) => ({ key, value }),
      );
      await db.settings.bulkAdd(settingsRows);
    }
  } catch (error) {
    console.error('[LyzerEdge] Database initialisation failed:', error);
    throw error;
  }
}

export default db;
 