import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import os from 'os';
import { performance } from 'perf_hooks';
import v8 from 'v8';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

import { OpenMobiusEngine } from '../../../packages/lyzer-shared/src/providers/openmobius/v8_openmobius.js';

async function getMarketData(symbol, requiredCandles) {
    const filePath = path.join(__dirname, '../../.data', `${symbol}_1m_10d.json`);
    try {
        const raw = await fs.readFile(filePath, 'utf8');
        const parsed = JSON.parse(raw);
        let candles = [];
        while (candles.length < requiredCandles) {
            candles = candles.concat(parsed);
        }
        return candles.slice(0, requiredCandles);
    } catch (e) {
        console.error(`Missing data for ${symbol}. Run data fetcher first.`);
        process.exit(1);
    }
}

class ForensicDeduplicator {
    constructor() {
        this.uniqueEvents = { fvg: new Set(), ob: new Set(), sweep: new Set(), displacement: new Set(), structure: new Set() };
        this.lifecycles = {
            fvg: { formed: 0, activeObservations: 0, fullyMitigated: 0 },
            ob: { formed: 0, activeObservations: 0, fullyMitigated: 0 },
            sweep: { formed: 0, activeObservations: 0 },
            displacement: { formed: 0, activeObservations: 0 },
            structure: { formed: 0, activeObservations: 0 }
        };
        this.activeFvgs = new Map();
        this.activeObs = new Map();
    }

    _hashEvent(type, event) {
        if (type === 'fvg') return `fvg_${event.type}_${event.top}_${event.bottom}_${event.formed_at_index}`;
        if (type === 'ob') return `ob_${event.direction}_${event.top}_${event.bottom}_${event.formed_at_index}`;
        if (type === 'sweep') return `sweep_${event.direction}_${event.price}_${event.time}`;
        if (type === 'displacement') return `disp_${event.direction}_${event.magnitude_pct}_${event.candle_index}`;
        if (type === 'structure') return `struct_${event.type}_${event.direction}_${event.price}`;
        return crypto.randomUUID();
    }

    process(v8Result) {
        for (const fvg of (v8Result.imbalance?.fvgs || [])) {
            const id = this._hashEvent('fvg', fvg);
            this.lifecycles.fvg.activeObservations++;
            if (!this.uniqueEvents.fvg.has(id)) {
                this.uniqueEvents.fvg.add(id);
                this.lifecycles.fvg.formed++;
                this.activeFvgs.set(id, fvg);
            }
            if (fvg.mitigation_pct >= 100) {
                if (this.activeFvgs.has(id)) {
                    this.lifecycles.fvg.fullyMitigated++;
                    this.activeFvgs.delete(id);
                }
            }
        }
        for (const ob of (v8Result.orderBlocks || [])) {
            const id = this._hashEvent('ob', ob);
            this.lifecycles.ob.activeObservations++;
            if (!this.uniqueEvents.ob.has(id)) {
                this.uniqueEvents.ob.add(id);
                this.lifecycles.ob.formed++;
                this.activeObs.set(id, ob);
            }
            if (ob.mitigation_pct >= 100) {
                if (this.activeObs.has(id)) {
                    this.lifecycles.ob.fullyMitigated++;
                    this.activeObs.delete(id);
                }
            }
        }
        for (const sweep of (v8Result.liquidity?.sweeps || [])) {
            const id = this._hashEvent('sweep', sweep);
            this.lifecycles.sweep.activeObservations++;
            if (!this.uniqueEvents.sweep.has(id)) {
                this.uniqueEvents.sweep.add(id);
                this.lifecycles.sweep.formed++;
            }
        }
        for (const disp of (v8Result.imbalance?.displacements || [])) {
            const id = this._hashEvent('displacement', disp);
            this.lifecycles.displacement.activeObservations++;
            if (!this.uniqueEvents.displacement.has(id)) {
                this.uniqueEvents.displacement.add(id);
                this.lifecycles.displacement.formed++;
            }
        }
        for (const evt of (v8Result.marketStructure?.events || [])) {
            const id = this._hashEvent('structure', evt);
            this.lifecycles.structure.activeObservations++;
            if (!this.uniqueEvents.structure.has(id)) {
                this.uniqueEvents.structure.add(id);
                this.lifecycles.structure.formed++;
            }
        }
    }

    getReport() {
        return {
            fvg: { uniqueFormations: this.uniqueEvents.fvg.size, activeObservations: this.lifecycles.fvg.activeObservations, fullyMitigated: this.lifecycles.fvg.fullyMitigated },
            ob: { uniqueFormations: this.uniqueEvents.ob.size, activeObservations: this.lifecycles.ob.activeObservations, fullyMitigated: this.lifecycles.ob.fullyMitigated },
            sweep: { uniqueFormations: this.uniqueEvents.sweep.size, activeObservations: this.lifecycles.sweep.activeObservations },
            displacement: { uniqueFormations: this.uniqueEvents.displacement.size, activeObservations: this.lifecycles.displacement.activeObservations },
            structure: { uniqueFormations: this.uniqueEvents.structure.size, activeObservations: this.lifecycles.structure.activeObservations }
        };
    }
}

async function runForensicAudit() {
    console.log("==================================================0");
    console.log("┶ FASE 4.1b: FORENSIC VALIDATION & BENCHMARK");
    console.log("==================================================");

    const LIMIT = 50000;
    console.log(`[DATA] Loading ${LIMIT} candles for BTCUSDT...`);
    const allCandles = await getMarketData('BTCUSDT', LIMIT);
    
    const engine = new OpenMobiusEngine();
    const dedup = new ForensicDeduplicator();
    
    let window = [];
    let latencies = [];
    let maxHeap = 0;
    let eventLoopLags = [];
    let lastTime = performance.now();
    
    console.log(`[AUDIT] Simulating StreamEngine tick-by-tick over ${LIMIT} candles...`);
    const tStart = performance.now();

    for (let i = 0; i < allCandles.length; i++) {
        window.push(allCandles[i]);
        if (window.length > 500) window.shift();

        const now = performance.now();
        const lag = now - lastTime;
        if (lag > 50) eventLoopLags.push(lag);
        
        if (i % 5000 === 0) {
            const mem = process.memoryUsage();
            if (mem.heapUsed > maxHeap) maxHeap = mem.heapUsed;
        }

        const t0 = performance.now();
        const result = engine.analyze(window);
        const elapsed = performance.now() - t0;
        
        latencies.push(elapsed);
        dedup.process(result);
        
        lastTime = performance.now();
    }
    
    const tEnd = performance.now();
    
    latencies.sort((a, b) => a - b);
    const p50 = latencies[Math.floor(latencies.length * 0.50)];
    const p95 = latencies[Math.floor(latencies.length * 0.95)];
    const p99 = latencies[Math.floor(latencies.length * 0.99)];
    const p999 = latencies[Math.floor(latencies.length * 0.999)];
    const max = latencies[latencies.length - 1];
    const mean = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    
    console.log(`\n[TEST C & D] PERFORMANCE BENCHMARK (${LIMIT} candles)`);
    console.log(`Call Frequency     : 1x por candle fechado (em StreamEngine V1)`);
    console.log(`Total Runtime      : ${((tEnd - tStart) / 1000).toFixed(2)}s`);
    console.log(`Mean Latency       : ${mean.toFixed(3)}ms / call`);
    console.log(`p50 Latency        : ${p50.toFixed(3)}ms`);
    console.log(`p95 Latency        : ${p95.toFixed(3)}ms`);
    console.log(`p99 Latency        : ${p99.toFixed(3)}ms`);
    console.log(`p99.9 Latency      : ${p999.toFixed(3)}ms`);
    console.log(`Max Latency        : ${max.toFixed(3)}ms`);
    console.log(`Event Loop Lag     : ${eventLoopLags.length} spikes > 50ms (Max: ${Math.max(...eventLoopLags, 0).toFixed(2)}ms)`);
    console.log(`Peak Heap Used     : ${(maxHeap / 1024 / 1024).toFixed(2)} MB`);
    {
        console.log(`\n[TEST A & B] FORENSIC EVENT DEDUPLICATION`);
        console.log(JSON.stringify(dedup.getReport(), null, 2));
    }
}

runForensicAudit().catch(console.error);
