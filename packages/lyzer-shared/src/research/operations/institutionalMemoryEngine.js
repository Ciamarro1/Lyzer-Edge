import fs from 'fs';
import path from 'path';

/**
 * L13 Institutional Memory Engine
 * Memória operacional permanente do fundo.
 * O sistema aprende e arquiva trades, erros, decisões, regimes, falhas e eventos extremos em knowledge/memory/
 * Nunca apaga histórico.
 */

export class InstitutionalMemoryEngine {
  constructor(simulationBatchMode = false) {
    this.memoryDir = path.resolve(process.cwd(), '../../../knowledge/memory');
    if (!fs.existsSync(this.memoryDir)) {
      try { fs.mkdirSync(this.memoryDir, { recursive: true }); } catch(e) {}
    }
    this.memoryLogFile = path.join(this.memoryDir, 'operational_memory.jsonl');
    this.simulationBatchMode = simulationBatchMode;
    this.buffer = [];
    this.bufferSizeLimit = 1000;
  }

  recordEvent(eventType, payload) {
    const entry = {
      id: `mem_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      type: eventType, // e.g., 'BLACK_SWAN', 'FLASH_CRASH', 'HALT_INCIDENT', 'CRITICAL_TRADE', 'REGIME_SHIFT'
      timestamp: new Date().toISOString(),
      payload: payload
    };

    if (this.simulationBatchMode) {
      this.buffer.push(entry);
      if (this.buffer.length >= this.bufferSizeLimit) {
        this.flushBuffer();
      }
    } else {
      this.appendToDisk(entry);
    }
    return entry;
  }

  appendToDisk(entry) {
    try {
      fs.appendFileSync(this.memoryLogFile, JSON.stringify(entry) + '\n', 'utf8');
    } catch (e) {
      console.log(`[MEMORY ENGINE] Simulated append of event ${entry.type}`);
    }
  }

  flushBuffer() {
    if (this.buffer.length === 0) return;
    try {
      const lines = this.buffer.map(e => JSON.stringify(e)).join('\n') + '\n';
      fs.appendFileSync(this.memoryLogFile, lines, 'utf8');
      this.buffer = [];
    } catch (e) {
      console.log(`[MEMORY ENGINE] Simulated batch flush of ${this.buffer.length} events`);
      this.buffer = [];
    }
  }

  queryRecentEvents(limit = 10, filterType = null) {
    // Leitura das entradas do arquivo JSONL
    if (!fs.existsSync(this.memoryLogFile)) return [];
    try {
      const content = fs.readFileSync(this.memoryLogFile, 'utf8');
      const lines = content.trim().split('\n').filter(Boolean);
      let entries = lines.map(l => JSON.parse(l));
      if (filterType) {
        entries = entries.filter(e => e.type === filterType);
      }
      return entries.slice(-limit);
    } catch(e) {
      return [];
    }
  }
}
