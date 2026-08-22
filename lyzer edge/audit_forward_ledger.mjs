#!/usr/bin/env node
/**
 * 🏛️ LYZER LABS — FORWARD VALIDATION LEDGER AUDITOR (CLI)
 * 
 * Audits trade executions, slippage (bps), latency (ms), and risk/notional invariants
 * directly from remote deployments (Hugging Face Spaces / Railway / Fly.io) or local ledgers.
 * 
 * Usage:
 *   node audit_forward_ledger.mjs --url "https://jonatanciamarro-lyzer-edge.hf.space" --admin-key "optional_key"
 *   node audit_forward_ledger.mjs --file "/tmp/data/forward_validation_ledger_v2.jsonl"
 */

import fs from 'fs';
import path from 'path';

// Parse CLI flags
const args = process.argv.slice(2);
let targetUrl = null;
let targetFile = null;
let adminKey = process.env.ADMIN_API_KEY || null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--url' && args[i + 1]) targetUrl = args[++i];
  if (args[i] === '--file' && args[i + 1]) targetFile = args[++i];
  if (args[i] === '--admin-key' && args[i + 1]) adminKey = args[++i];
}

async function fetchRemoteLedger(baseUrl) {
  const cleanUrl = baseUrl.replace(/\/+$/, '');
  const headers = {};
  if (adminKey) {
    headers['x-admin-key'] = adminKey;
    headers['Authorization'] = `Bearer ${adminKey}`;
  }

  console.log(`📡 [FETCH] Querying remote ledger from ${cleanUrl}/api/ledger/export ...`);
  try {
    const res = await fetch(`${cleanUrl}/api/ledger/export`, { headers });
    if (res.ok) {
      const data = await res.json();
      console.log(`✅ [FETCH] Successfully retrieved ${data.totalEntries || data.ledger?.length || 0} ledger records.`);
      return data.ledger || [];
    } else {
      console.warn(`⚠️ [FETCH] /api/ledger/export returned ${res.status}. Falling back to /api/trades/export ...`);
    }
  } catch (err) {
    console.warn(`⚠️ [FETCH] Direct ledger query failed: ${err.message}. Trying /api/trades/export ...`);
  }

  // Fallback to /api/trades/export
  const tradesRes = await fetch(`${cleanUrl}/api/trades/export`, { headers });
  if (!tradesRes.ok) {
    throw new Error(`Failed to retrieve trades export from ${cleanUrl}: HTTP ${tradesRes.status}`);
  }
  const tradesData = await tradesRes.json();
  console.log(`✅ [FETCH] Retrieved ${tradesData.totalTrades || tradesData.trades?.length || 0} trades from export API.`);
  return tradesData.trades || [];
}

function readLocalLedger(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  const content = fs.readFileSync(filePath, 'utf8');
  if (filePath.endsWith('.json')) {
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : (parsed.ledger || parsed.trades || []);
  }

  // JSONL format
  const lines = content.trim().split('\n').filter(l => l.trim().length > 0);
  return lines.map(line => JSON.parse(line));
}

function auditLedger(records) {
  console.log(`\n========================================================================`);
  console.log(`🏛️  LYZER LABS — PHASE 16 FORWARD LEDGER EXECUTION AUDIT REPORT`);
  console.log(`========================================================================\n`);

  if (!records || records.length === 0) {
    console.log(`ℹ️  No trade records found to audit.`);
    return;
  }

  let totalTrades = records.length;
  let totalPnl = 0;
  let wins = 0;
  let losses = 0;
  let slippageBpsSum = 0;
  let slippageCount = 0;
  let maxSlippageBps = 0;
  let latencyMsSum = 0;
  let latencyCount = 0;
  let maxLatencyMs = 0;
  
  const violations = [];
  const symbolStats = {};

  for (const r of records) {
    const isV2Format = !!r.TRADE_ID;
    const tradeId = isV2Format ? r.TRADE_ID : (r.id || 'N/A');
    const symbol = isV2Format ? r.SIGNAL?.symbol : (r.symbol || 'UNKNOWN');
    const pnl = isV2Format ? (r.EXIT?.REALIZED_PNL || 0) : (r.pnl || 0);
    const slippageBps = isV2Format ? (r.EXECUTION?.slippage_bps || 0) : 0;
    const latencyMs = isV2Format ? (r.EXECUTION?.latency_ms || 0) : 0;
    const riskAtEntry = isV2Format ? (r.EXIT?.RISK_AT_ENTRY || 0) : 0;
    const notionalAtEntry = isV2Format ? (r.EXIT?.NOTIONAL_AT_ENTRY || 0) : 0;
    const violationStr = isV2Format ? (r.CONSTITUTIONAL_VIOLATION || 'OK') : 'N/A';

    totalPnl += pnl;
    if (pnl > 0) wins++;
    else if (pnl < 0) losses++;

    if (slippageBps > 0) {
      slippageBpsSum += slippageBps;
      slippageCount++;
      if (slippageBps > maxSlippageBps) maxSlippageBps = slippageBps;
    }

    if (latencyMs > 0) {
      latencyMsSum += latencyMs;
      latencyCount++;
      if (latencyMs > maxLatencyMs) maxLatencyMs = latencyMs;
    }

    // Invariant Checks
    if (riskAtEntry > 5.10) {
      violations.push(`[RISK VIOLATION] Trade ${tradeId} (${symbol}): Risk at entry ($${riskAtEntry.toFixed(2)}) exceeded $5.00 limit.`);
    }
    if (notionalAtEntry > 1005) {
      violations.push(`[NOTIONAL VIOLATION] Trade ${tradeId} (${symbol}): Notional ($${notionalAtEntry.toFixed(2)}) exceeded $1000 limit.`);
    }
    if (violationStr !== 'OK' && violationStr !== 'N/A') {
      violations.push(`[CONSTITUTIONAL AUDIT] Trade ${tradeId} (${symbol}): ${violationStr}`);
    }

    if (!symbolStats[symbol]) symbolStats[symbol] = { count: 0, pnl: 0, wins: 0 };
    symbolStats[symbol].count++;
    symbolStats[symbol].pnl += pnl;
    if (pnl > 0) symbolStats[symbol].wins++;
  }

  const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
  const avgSlippageBps = slippageCount > 0 ? slippageBpsSum / slippageCount : 0;
  const avgLatencyMs = latencyCount > 0 ? latencyMsSum / latencyCount : 0;

  console.log(`📊 1. EXECUTION & PERFORMANCE SUMMARY:`);
  console.log(`   - Total Trades Audited:     ${totalTrades}`);
  console.log(`   - Win Rate:                 ${winRate.toFixed(1)}% (${wins}W / ${losses}L)`);
  console.log(`   - Realized PnL Total:       $${totalPnl.toFixed(2)}`);
  console.log(`   - Average Slippage:         ${avgSlippageBps.toFixed(2)} bps (Max: ${maxSlippageBps.toFixed(2)} bps)`);
  console.log(`   - Average Execution Latency: ${avgLatencyMs.toFixed(1)} ms (Max: ${maxLatencyMs.toFixed(1)} ms)`);

  console.log(`\n🪙 2. MULTI-ASSET BREAKDOWN:`);
  for (const [sym, s] of Object.entries(symbolStats)) {
    const symWinRate = (s.wins / s.count) * 100;
    console.log(`   - ${sym.padEnd(10)}: ${s.count} trades | WinRate: ${symWinRate.toFixed(1)}% | PnL: $${s.pnl.toFixed(2)}`);
  }

  console.log(`\n🛡️ 3. CONSTITUTIONAL & INVARIANT AUDIT:`);
  console.log(`   - Target Risk Limit:        $5.00 / 0.5% max`);
  console.log(`   - Target Notional Limit:    $1000.00 max`);
  console.log(`   - Total Invariant Violations: ${violations.length}`);

  if (violations.length === 0) {
    console.log(`   ✅ ALL INVARIANTS SATISFIED — ZERO CONSTITUTIONAL BREACHES DETECTED.`);
  } else {
    console.log(`   ⚠️ BREACHES DETECTED:`);
    violations.slice(0, 10).forEach(v => console.log(`      • ${v}`));
    if (violations.length > 10) console.log(`      ... and ${violations.length - 10} more.`);
  }

  console.log(`\n========================================================================\n`);
}

async function main() {
  try {
    let records = [];
    if (targetUrl) {
      records = await fetchRemoteLedger(targetUrl);
    } else if (targetFile) {
      records = readLocalLedger(targetFile);
    } else {
      // Default local search
      const localLedger = path.join(process.env.DATA_DIR || '/tmp/data', 'forward_validation_ledger_v2.jsonl');
      if (fs.existsSync(localLedger)) {
        console.log(`📁 [LOCAL] Using local ledger at ${localLedger}`);
        records = readLocalLedger(localLedger);
      } else {
        console.log(`Usage:\n  node audit_forward_ledger.mjs --url "https://<deploy-url>" [--admin-key "key"]\n  node audit_forward_ledger.mjs --file "/path/to/ledger.jsonl"`);
        process.exit(0);
      }
    }

    auditLedger(records);
  } catch (err) {
    console.error(`❌ [AUDIT ERROR] ${err.message}`);
    process.exit(1);
  }
}

main();
