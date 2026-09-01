/**
 * 🏛️ LYZER EDGE — RAILWAY 48H SOAK FORENSIC AUDIT SCRIPT
 * 
 * Inspects:
 * 1. C:\Users\WDAGUtilityAccount\Downloads\logs.1788248583209.json
 * 2. C:\Users\WDAGUtilityAccount\Downloads\historical_causal_memory.db
 */

import { readFileSync, existsSync } from 'fs';
import sqlite3 from 'sqlite3';
import { resolve } from 'path';

const LOGS_PATH = 'C:\\Users\\WDAGUtilityAccount\\Downloads\\logs.1788248583209.json';
const DB_PATH = 'C:\\Users\\WDAGUtilityAccount\\Downloads\\historical_causal_memory.db';

console.log('='.repeat(95));
console.log('🏛️ LYZER EDGE: 48H RAILWAY SOAK TEST FORENSIC AUDIT (POST-SOAK VERIFICATION)');
console.log('='.repeat(95));

// ----------------------------------------------------------------------------
// 1. AUDIT RAILWAY LOGS
// ----------------------------------------------------------------------------
if (!existsSync(LOGS_PATH)) {
  console.error(`❌ Logs file not found at: ${LOGS_PATH}`);
} else {
  console.log(`\n📂 1. AUDITANDO LOGS DO RAILWAY (${LOGS_PATH})...`);
  const rawLogs = JSON.parse(readFileSync(LOGS_PATH, 'utf8'));
  console.log(`   Total de Entradas de Log no Arquivo: ${rawLogs.length.toLocaleString()}`);

  // Sort by timestamp
  rawLogs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const firstTs = rawLogs[0].timestamp;
  const lastTs = rawLogs[rawLogs.length - 1].timestamp;
  console.log(`   Período dos Logs Ingeridos: ${firstTs} -> ${lastTs}`);

  const categories = {
    errors: [],
    warnings: [],
    dreamCycles: [],
    ingestorKlines: 0,
    wsReconnects: 0,
    tradeAlerts: [],
    orderExecutions: [],
    killSwitches: [],
    telegramLogs: []
  };

  for (const entry of rawLogs) {
    const msg = entry.message || '';
    const ts = entry.timestamp;

    if (entry.severity === 'error' || msg.includes('Error') || msg.includes('FAIL') || msg.includes('crash')) {
      categories.errors.push({ ts, msg });
    }
    if (entry.severity === 'warning' || msg.includes('WARN')) {
      categories.warnings.push({ ts, msg });
    }
    if (msg.includes('Dream Cycle') || msg.includes('Cognitive Reflection') || msg.includes('DREAM')) {
      categories.dreamCycles.push({ ts, msg });
    }
    if (msg.includes('[INGESTOR] Closed kline')) {
      categories.ingestorKlines++;
    }
    if (msg.includes('WebSocket') && (msg.includes('reconnect') || msg.includes('close') || msg.includes('error'))) {
      categories.wsReconnects++;
    }
    if (msg.includes('ORDER') || msg.includes('TRADE') || msg.includes('FILLED') || msg.includes('SIGNAL_TRIGGERED')) {
      categories.orderExecutions.push({ ts, msg });
    }
    if (msg.includes('KILL_SWITCH') || msg.includes('HALT')) {
      categories.killSwitches.push({ ts, msg });
    }
    if (msg.includes('Telegram')) {
      categories.telegramLogs.push({ ts, msg });
    }
  }

  console.log(`\n📊 Resumo dos Logs:`);
  console.log(`   • Candles de 1m Fechados Processados: ${categories.ingestorKlines.toLocaleString()}`);
  console.log(`   • Ciclos Cognitivos de Sonho (Dream Cycles): ${categories.dreamCycles.length}`);
  for (const d of categories.dreamCycles) {
    console.log(`      - [${d.ts}] ${d.msg}`);
  }
  console.log(`   • Reconexões / Erros de WebSocket: ${categories.wsReconnects}`);
  console.log(`   • Sinais / Ordens Executadas: ${categories.orderExecutions.length}`);
  for (const o of categories.orderExecutions) {
    console.log(`      - [${o.ts}] ${o.msg}`);
  }
  console.log(`   • Kill-Switches Disparados: ${categories.killSwitches.length}`);
  console.log(`   • Erros Críticos Registrados: ${categories.errors.length}`);
  for (const e of categories.errors.slice(0, 10)) {
    console.log(`      - [${e.ts}] ${e.msg}`);
  }
  console.log(`   • Avisos (Warnings) Registrados: ${categories.warnings.length}`);
}

// ----------------------------------------------------------------------------
// 2. AUDIT SQLITE DATABASE (historical_causal_memory.db)
// ----------------------------------------------------------------------------
if (!existsSync(DB_PATH)) {
  console.error(`\n❌ DB file not found at: ${DB_PATH}`);
} else {
  console.log(`\n📂 2. AUDITANDO BANCO SQLITE (${DB_PATH})...`);
  
  const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
      console.error('❌ Erro abrindo SQLite DB:', err.message);
      return;
    }
  });

  db.serialize(() => {
    // 1. List Tables
    db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
      if (err) {
        console.error('❌ Erro listando tabelas:', err.message);
        return;
      }
      console.log('   Tabelas Existentes no Banco:', tables.map(t => t.name));

      for (const table of tables) {
        const tableName = table.name;
        db.get(`SELECT count(*) as count FROM ${tableName}`, (err, row) => {
          if (err) {
            console.error(`   ❌ Erro lendo ${tableName}:`, err.message);
            return;
          }
          console.log(`   • Tabela [${tableName}]: ${row.count.toLocaleString()} registros`);
        });
      }

      // 2. Query Events / Causal Intent Table if present
      const tableNames = tables.map(t => t.name);
      
      if (tableNames.includes('causal_events') || tableNames.includes('events')) {
        const tName = tableNames.includes('causal_events') ? 'causal_events' : 'events';
        db.all(`SELECT * FROM ${tName} ORDER BY rowid DESC LIMIT 5`, (err, rows) => {
          if (!err && rows) {
            console.log(`\n   🔍 Últimos 5 Eventos em ${tName}:`);
            console.log(rows);
          }
        });
      }

      if (tableNames.includes('dream_cycles') || tableNames.includes('reflections')) {
        const tName = tableNames.includes('dream_cycles') ? 'dream_cycles' : 'reflections';
        db.all(`SELECT * FROM ${tName} LIMIT 10`, (err, rows) => {
          if (!err && rows) {
            console.log(`\n   🔍 Registros de Dream Cycles em ${tName}:`);
            console.log(rows);
          }
        });
      }

      if (tableNames.includes('orders') || tableNames.includes('intents')) {
        const tName = tableNames.includes('orders') ? 'orders' : 'intents';
        db.all(`SELECT * FROM ${tName} LIMIT 10`, (err, rows) => {
          if (!err && rows) {
            console.log(`\n   🔍 Registros em ${tName}:`);
            console.log(rows);
          }
        });
      }
    });
  });
}
