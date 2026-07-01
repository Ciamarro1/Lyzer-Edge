/**
 * @fileoverview CRUD operations and query helpers for LyzerEdge database.
 */

import db from './database.js';
import {
  EVENT_TYPES,
  TRADE_STATUS,
  TRADE_RESULT,
} from './database.js';
import { eventBus } from '../lib/eventBus.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** ISO‑date string for today (YYYY-MM-DD). */
const todayISO = () => new Date().toISOString().slice(0, 10);

/** Current ISO timestamp. */
const now = () => new Date().toISOString();

// ─── Trade CRUD ──────────────────────────────────────────────────────────────

/**
 * Create a new trade and an ENTRY_CREATED event atomically.
 * @param {Object} tradeData
 * @returns {Promise<number>} The new trade id.
 */
export async function createTrade(tradeData) {
  const id = await db.transaction('rw', [db.trades, db.tradeEvents], async () => {
    const trade = {
      ...tradeData,
      status: tradeData.status ?? TRADE_STATUS.OPEN,
      entryDate: tradeData.entryDate ?? now(),
      createdAt: now(),
      updatedAt: now(),
    };
    const tradeId = await db.trades.add(trade);

    await db.tradeEvents.add({
      tradeId,
      type: EVENT_TYPES.ENTRY_CREATED,
      timestamp: now(),
      data: { entryPrice: tradeData.entryPrice },
    });

    return tradeId;
  });

  eventBus.emit('trade:created', { id });
  return id;
}

/**
 * Update fields on an existing trade.
 * @param {number} id
 * @param {Object} updates
 * @returns {Promise<void>}
 */
export async function updateTrade(id, updates) {
  const count = await db.trades.update(id, {
    ...updates,
    updatedAt: now(),
  });
  if (count === 0) throw new Error(`Trade ${id} not found`);
  eventBus.emit('trade:updated', { id, updates });
}

/**
 * Close a trade, computing PnL / R:R and updating equity.
 * @param {number} id
 * @param {Object} exitData - { exitPrice, exitDate?, fees? }
 * @returns {Promise<void>}
 */
export async function closeTrade(id, exitData) {
  await db.transaction(
    'rw',
    [db.trades, db.tradeEvents, db.equitySnapshots, db.settings],
    async () => {
      const trade = await db.trades.get(id);
      if (!trade) throw new Error(`Trade ${id} not found`);
      if (trade.status === TRADE_STATUS.CLOSED) {
        throw new Error(`Trade ${id} is already closed`);
      }

      const exitPrice = exitData.exitPrice;
      const fees = exitData.fees ?? 0;
      const positionSize = trade.positionSize ?? 1;

      // PnL calculation (direction-aware)
      const rawPnL =
        trade.direction === 'long'
          ? (exitPrice - trade.entryPrice) * positionSize
          : (trade.entryPrice - exitPrice) * positionSize;
      const pnl = rawPnL - fees;

      // R:R calculation
      const riskPerUnit =
        trade.stopLoss != null
          ? Math.abs(trade.entryPrice - trade.stopLoss)
          : null;
      const rr =
        riskPerUnit && riskPerUnit > 0
          ? parseFloat((pnl / (riskPerUnit * positionSize)).toFixed(2))
          : null;

      // Determine result
      let result;
      if (Math.abs(pnl) < 0.01) {
        result = TRADE_RESULT.BREAKEVEN;
      } else if (pnl > 0) {
        result = TRADE_RESULT.WIN;
      } else {
        result = TRADE_RESULT.LOSS;
      }

      await db.trades.update(id, {
        status: TRADE_STATUS.CLOSED,
        exitPrice,
        exitDate: exitData.exitDate ?? now(),
        pnl,
        rr,
        result,
        fees,
        updatedAt: now(),
      });

      await db.tradeEvents.add({
        tradeId: id,
        type: EVENT_TYPES.CLOSED,
        timestamp: now(),
        data: { exitPrice, pnl, rr, result, fees },
      });

      // Update equity snapshot for today
      const balanceSetting = await db.settings.get('accountBalance');
      const currentBalance = balanceSetting?.value ?? 10000;
      const newBalance = currentBalance + pnl;

      const latestSnapshot = await db.equitySnapshots
        .orderBy('date')
        .reverse()
        .first();
      const peakBalance = Math.max(
        newBalance,
        latestSnapshot?.peakBalance ?? newBalance,
      );
      const drawdown = peakBalance - newBalance;
      const drawdownPct =
        peakBalance > 0
          ? parseFloat(((drawdown / peakBalance) * 100).toFixed(2))
          : 0;

      const today = todayISO();
      await db.equitySnapshots.put({
        date: today,
        balance: newBalance,
        peakBalance,
        drawdown,
        drawdownPct,
      });

      await db.settings.put({ key: 'accountBalance', value: newBalance });
    },
  );

  eventBus.emit('trade:closed', { id });
}

/**
 * Delete a trade and all related records.
 * @param {number} id
 * @returns {Promise<void>}
 */
export async function deleteTrade(id) {
  await db.transaction(
    'rw',
    [db.trades, db.tradeEvents, db.screenshots, db.marketContext, db.tradeTags],
    async () => {
      await db.tradeEvents.where('tradeId').equals(id).delete();
      await db.screenshots.where('tradeId').equals(id).delete();
      await db.marketContext.where('tradeId').equals(id).delete();
      await db.tradeTags.where('tradeId').equals(id).delete();
      await db.trades.delete(id);
    },
  );

  eventBus.emit('trade:deleted', { id });
}

/**
 * Get a single trade with all related data.
 * @param {number} id
 * @returns {Promise<Object|undefined>}
 */
export async function getTrade(id) {
  const trade = await db.trades.get(id);
  if (!trade) return undefined;

  const [events, screenshots, marketContext, tagLinks] = await Promise.all([
    db.tradeEvents.where('tradeId').equals(id).sortBy('timestamp'),
    db.screenshots.where('tradeId').equals(id).sortBy('timestamp'),
    db.marketContext.where('tradeId').equals(id).toArray(),
    db.tradeTags.where('tradeId').equals(id).toArray(),
  ]);

  // Resolve tag names
  const tagIds = tagLinks.map((l) => l.tagId);
  const tags =
    tagIds.length > 0
      ? await db.tags.where('id').anyOf(tagIds).toArray()
      : [];

  return {
    ...trade,
    events,
    screenshots,
    marketContext: marketContext[0] ?? null,
    tags,
  };
}

/**
 * List trades with optional filters.
 * @param {Object} [filters={}]
 * @param {string} [filters.dateFrom]
 * @param {string} [filters.dateTo]
 * @param {string} [filters.symbol]
 * @param {string} [filters.direction]
 * @param {string} [filters.status]
 * @param {string} [filters.result]
 * @param {string} [filters.session]
 * @param {string} [filters.marketState]
 * @returns {Promise<Object[]>}
 */
export async function getAllTrades(filters = {}) {
  let collection;

  // Try to use an index when a compound key applies
  if (filters.symbol && filters.status) {
    collection = db.trades
      .where('[symbol+status]')
      .equals([filters.symbol, filters.status]);
  } else if (filters.direction && filters.status) {
    collection = db.trades
      .where('[direction+status]')
      .equals([filters.direction, filters.status]);
  } else if (filters.status) {
    collection = db.trades.where('status').equals(filters.status);
  } else if (filters.symbol) {
    collection = db.trades.where('symbol').equals(filters.symbol);
  } else {
    collection = db.trades.toCollection();
  }

  let results = await collection.toArray();

  // In-memory filtering for remaining criteria
  if (filters.dateFrom) {
    results = results.filter((t) => t.entryDate >= filters.dateFrom);
  }
  if (filters.dateTo) {
    results = results.filter((t) => t.entryDate <= filters.dateTo);
  }
  if (filters.direction && !(filters.direction && filters.status)) {
    results = results.filter((t) => t.direction === filters.direction);
  }
  if (filters.result) {
    results = results.filter((t) => t.result === filters.result);
  }

  // Session & marketState require a join with marketContext
  if (filters.session || filters.marketState) {
    const tradeIds = results.map((t) => t.id);
    const contexts = await db.marketContext
      .where('tradeId')
      .anyOf(tradeIds)
      .toArray();
    const contextMap = new Map(contexts.map((c) => [c.tradeId, c]));

    results = results.filter((t) => {
      const ctx = contextMap.get(t.id);
      if (!ctx) return false;
      if (filters.session && ctx.session !== filters.session) return false;
      if (filters.marketState && ctx.marketState !== filters.marketState)
        return false;
      return true;
    });
  }

  // Sort newest first
  results.sort((a, b) => (b.entryDate > a.entryDate ? 1 : -1));
  return results;
}

/**
 * @returns {Promise<Object[]>} Open trades, newest first.
 */
export async function getOpenTrades() {
  return getAllTrades({ status: TRADE_STATUS.OPEN });
}

/**
 * @returns {Promise<Object[]>} Closed trades, newest first.
 */
export async function getClosedTrades() {
  return getAllTrades({ status: TRADE_STATUS.CLOSED });
}

// ─── Trade Events ────────────────────────────────────────────────────────────

/**
 * Add an event to a trade.
 * @param {number} tradeId
 * @param {string} type - One of EVENT_TYPES
 * @param {Object} [data={}]
 * @returns {Promise<number>}
 */
export async function addTradeEvent(tradeId, type, data = {}) {
  const id = await db.tradeEvents.add({
    tradeId,
    type,
    timestamp: now(),
    data,
  });
  eventBus.emit('event:added', { id, tradeId, type });
  return id;
}

/**
 * @param {number} tradeId
 * @returns {Promise<Object[]>} Events sorted by timestamp.
 */
export async function getTradeEvents(tradeId) {
  return db.tradeEvents.where('tradeId').equals(tradeId).sortBy('timestamp');
}

// ─── Screenshots ─────────────────────────────────────────────────────────────

/**
 * Store a screenshot blob for a trade.
 * @param {number} tradeId
 * @param {string} type - 'before_entry' | 'after_entry' | 'at_exit'
 * @param {Blob} blob
 * @param {Object} [metadata={}]
 * @returns {Promise<number>}
 */
export async function addScreenshot(tradeId, type, blob, metadata = {}) {
  const id = await db.screenshots.add({
    tradeId,
    type,
    timestamp: now(),
    blob,
    metadata: {
      symbol: metadata.symbol ?? null,
      timeframe: metadata.timeframe ?? null,
      session: metadata.session ?? null,
      tags: metadata.tags ?? [],
    },
  });
  eventBus.emit('screenshot:added', { id, tradeId, type });
  return id;
}

/**
 * @param {number} tradeId
 * @returns {Promise<Object[]>}
 */
export async function getScreenshots(tradeId) {
  return db.screenshots.where('tradeId').equals(tradeId).sortBy('timestamp');
}

/**
 * Search screenshots by metadata tags or symbol.
 * @param {{ symbol?: string, tags?: string[] }} query
 * @returns {Promise<Object[]>}
 */
export async function searchScreenshots(query) {
  let results = await db.screenshots.toArray();
  if (query.symbol) {
    results = results.filter(
      (s) =>
        s.metadata?.symbol?.toLowerCase() === query.symbol.toLowerCase(),
    );
  }
  if (query.tags?.length) {
    const queryTags = query.tags.map((t) => t.toLowerCase());
    results = results.filter((s) =>
      s.metadata?.tags?.some((t) => queryTags.includes(t.toLowerCase())),
    );
  }
  return results;
}

// ─── Market Context ──────────────────────────────────────────────────────────

/**
 * Set (upsert) market context for a trade.
 * @param {number} tradeId
 * @param {Object} contextData
 * @returns {Promise<number>}
 */
export async function setMarketContext(tradeId, contextData) {
  // Remove existing context for this trade first
  await db.marketContext.where('tradeId').equals(tradeId).delete();

  const id = await db.marketContext.add({
    tradeId,
    marketState: contextData.marketState ?? null,
    session: contextData.session ?? null,
    structure: contextData.structure ?? [],
    notes: contextData.notes ?? '',
    timestamp: now(),
  });
  return id;
}

/**
 * @param {number} tradeId
 * @returns {Promise<Object|null>}
 */
export async function getMarketContext(tradeId) {
  const results = await db.marketContext
    .where('tradeId')
    .equals(tradeId)
    .toArray();
  return results[0] ?? null;
}

// ─── Equity Snapshots ────────────────────────────────────────────────────────

/**
 * Upsert an equity snapshot for a date.
 * @param {string} date - YYYY-MM-DD
 * @param {number} balance
 * @param {number} peakBalance
 * @returns {Promise<void>}
 */
export async function updateEquitySnapshot(date, balance, peakBalance) {
  const drawdown = peakBalance - balance;
  const drawdownPct =
    peakBalance > 0
      ? parseFloat(((drawdown / peakBalance) * 100).toFixed(2))
      : 0;

  await db.equitySnapshots.put({
    date,
    balance,
    peakBalance,
    drawdown,
    drawdownPct,
  });
}

/**
 * @param {string} [dateFrom]
 * @param {string} [dateTo]
 * @returns {Promise<Object[]>} Snapshots sorted by date ascending.
 */
export async function getEquityCurve(dateFrom, dateTo) {
  let collection = db.equitySnapshots.orderBy('date');
  if (dateFrom) {
    collection = collection.and((s) => s.date >= dateFrom);
  }
  if (dateTo) {
    collection = collection.and((s) => s.date <= dateTo);
  }
  return collection.toArray();
}

/**
 * @returns {Promise<Object|undefined>} Most recent equity snapshot.
 */
export async function getLatestSnapshot() {
  return db.equitySnapshots.orderBy('date').reverse().first();
}

// ─── Edge Score History ──────────────────────────────────────────────────────

/**
 * Persist an edge score result.
 * @param {Object} scoreResult - { date, score, version, components }
 * @returns {Promise<number>}
 */
export async function saveEdgeScore(scoreResult) {
  const id = await db.edgeScoreHistory.add({
    date: scoreResult.date ?? todayISO(),
    score: scoreResult.score,
    version: scoreResult.version ?? 1,
    components: scoreResult.components ?? {},
  });
  eventBus.emit('edgescore:updated', { id, score: scoreResult.score });
  return id;
}

/**
 * @param {string} [dateFrom]
 * @param {string} [dateTo]
 * @returns {Promise<Object[]>} Scores sorted by date ascending.
 */
export async function getEdgeScoreHistory(dateFrom, dateTo) {
  let collection = db.edgeScoreHistory.orderBy('date');
  if (dateFrom) {
    collection = collection.and((s) => s.date >= dateFrom);
  }
  if (dateTo) {
    collection = collection.and((s) => s.date <= dateTo);
  }
  return collection.toArray();
}

/**
 * @param {string} [dateFrom]
 * @param {string} [dateTo]
 * @returns {Promise<Object[]>} Edge snapshots sorted by date ascending.
 */
export async function getEdgeSnapshots(dateFrom, dateTo) {
  let collection = db.edgeSnapshots.orderBy('date');
  if (dateFrom) {
    collection = collection.and((s) => s.date >= dateFrom);
  }
  if (dateTo) {
    collection = collection.and((s) => s.date <= dateTo);
  }
  return collection.toArray();
}

// ─── Settings ────────────────────────────────────────────────────────────────

/**
 * @param {string} key
 * @returns {Promise<*>} The value, or undefined if not set.
 */
export async function getSetting(key) {
  const row = await db.settings.get(key);
  return row?.value;
}

/**
 * @param {string} key
 * @param {*} value
 * @returns {Promise<void>}
 */
export async function setSetting(key, value) {
  await db.settings.put({ key, value });
  eventBus.emit('settings:changed', { key, value });
}

/**
 * @returns {Promise<Record<string, *>>} All settings as a key→value map.
 */
export async function getAllSettings() {
  const rows = await db.settings.toArray();
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

// ─── Tags ────────────────────────────────────────────────────────────────────

/**
 * @param {string} name
 * @returns {Promise<number>} Tag id.
 */
export async function createTag(name) {
  return db.tags.add({ name });
}

/**
 * @returns {Promise<Object[]>}
 */
export async function getAllTags() {
  return db.tags.toArray();
}

/**
 * @param {number} tradeId
 * @param {number} tagId
 * @returns {Promise<void>}
 */
export async function addTagToTrade(tradeId, tagId) {
  // Avoid duplicates
  const existing = await db.tradeTags
    .where('[tradeId]')
    .equals(tradeId)
    .and((r) => r.tagId === tagId)
    .first();
  if (!existing) {
    await db.tradeTags.add({ tradeId, tagId });
  }
}

/**
 * @param {number} tradeId
 * @param {number} tagId
 * @returns {Promise<void>}
 */
export async function removeTagFromTrade(tradeId, tagId) {
  await db.tradeTags
    .where('[tradeId]')
    .equals(tradeId)
    .and((r) => r.tagId === tagId)
    .delete();
}

/**
 * Get all trades that have a specific tag.
 * @param {number} tagId
 * @returns {Promise<Object[]>}
 */
export async function getTradesWithTag(tagId) {
  const links = await db.tradeTags.where('tagId').equals(tagId).toArray();
  const tradeIds = links.map((l) => l.tradeId);
  if (tradeIds.length === 0) return [];
  return db.trades.where('id').anyOf(tradeIds).toArray();
}

// ─── Data Export / Import ────────────────────────────────────────────────────

/**
 * Export the entire database as a JSON string.
 * Note: Blob fields in screenshots are converted to base64 for portability.
 * @returns {Promise<string>}
 */
export async function exportAllData() {
  const [
    trades,
    tradeEvents,
    screenshots,
    marketContext,
    equitySnapshots,
    edgeScoreHistory,
    settings,
    alerts,
    tags,
    tradeTags,
  ] = await Promise.all([
    db.trades.toArray(),
    db.tradeEvents.toArray(),
    db.screenshots.toArray(),
    db.marketContext.toArray(),
    db.equitySnapshots.toArray(),
    db.edgeScoreHistory.toArray(),
    db.settings.toArray(),
    db.alerts.toArray(),
    db.tags.toArray(),
    db.tradeTags.toArray(),
  ]);

  // Convert screenshot blobs to base64
  const screenshotsSerialized = await Promise.all(
    screenshots.map(async (s) => {
      if (s.blob instanceof Blob) {
        const buffer = await s.blob.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (const b of bytes) binary += String.fromCharCode(b);
        return {
          ...s,
          blob: null,
          blobBase64: btoa(binary),
          blobType: s.blob.type,
        };
      }
      return s;
    }),
  );

  const data = {
    version: 1,
    exportedAt: now(),
    trades,
    tradeEvents,
    screenshots: screenshotsSerialized,
    marketContext,
    equitySnapshots,
    edgeScoreHistory,
    settings,
    alerts,
    tags,
    tradeTags,
  };

  return JSON.stringify(data, null, 2);
}

/**
 * Import data from a JSON string (clears database first).
 * @param {string} jsonString
 * @returns {Promise<void>}
 */
export async function importData(jsonString) {
  const data = JSON.parse(jsonString);

  await db.transaction(
    'rw',
    [
      db.trades,
      db.tradeEvents,
      db.screenshots,
      db.marketContext,
      db.equitySnapshots,
      db.edgeScoreHistory,
      db.settings,
      db.alerts,
      db.tags,
      db.tradeTags,
    ],
    async () => {
      // Clear all tables
      await Promise.all([
        db.trades.clear(),
        db.tradeEvents.clear(),
        db.screenshots.clear(),
        db.marketContext.clear(),
        db.equitySnapshots.clear(),
        db.edgeScoreHistory.clear(),
        db.settings.clear(),
        db.alerts.clear(),
        db.tags.clear(),
        db.tradeTags.clear(),
      ]);

      // Restore screenshot blobs from base64
      const screenshotsRestored = (data.screenshots ?? []).map((s) => {
        if (s.blobBase64) {
          const binary = atob(s.blobBase64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
          }
          return {
            ...s,
            blob: new Blob([bytes], { type: s.blobType || 'image/png' }),
            blobBase64: undefined,
            blobType: undefined,
          };
        }
        return s;
      });

      // Bulk insert
      if (data.trades?.length) await db.trades.bulkAdd(data.trades);
      if (data.tradeEvents?.length)
        await db.tradeEvents.bulkAdd(data.tradeEvents);
      if (screenshotsRestored.length)
        await db.screenshots.bulkAdd(screenshotsRestored);
      if (data.marketContext?.length)
        await db.marketContext.bulkAdd(data.marketContext);
      if (data.equitySnapshots?.length)
        await db.equitySnapshots.bulkAdd(data.equitySnapshots);
      if (data.edgeScoreHistory?.length)
        await db.edgeScoreHistory.bulkAdd(data.edgeScoreHistory);
      if (data.settings?.length) await db.settings.bulkAdd(data.settings);
      if (data.alerts?.length) await db.alerts.bulkAdd(data.alerts);
      if (data.tags?.length) await db.tags.bulkAdd(data.tags);
      if (data.tradeTags?.length) await db.tradeTags.bulkAdd(data.tradeTags);
    },
  );
}
 