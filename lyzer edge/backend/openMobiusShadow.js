/**
 * OpenMobius V8 Shadow Observer — Phase 4.2 (Live Testnet Shadow)
 * 
 * RULES (INVIOLABLE):
 *   1. V8 CANNOT alter signal.
 *   2. V8 CANNOT alter score.
 *   3. V8 CANNOT alter sizing.
 *   4. V8 CANNOT generate orders.
 *   5. V8 CANNOT emit veto.
 *   6. V8 CANNOT alter TruthKernel state.
 *   7. V8 CANNOT alter streamEngine behavior.
 *   8. OpenMobiusPatternEngine.js (OLD) remains untouched.
 *   9. (NEW) Must emit discrete transitions via StateTracker, NOT continuous arrays.
 * 
 * The ONLY permitted effect:
 *   candles → V8 → StateTracker → shadow transitions → audit log
 */
import { OpenMobiusEngine } from '../../packages/lyzer-shared/src/providers/openmobius/v8_openmobius.js';
import { OpenMobiusStateTracker } from './openMobiusStateTracker.js';
import { performance, PerformanceObserver } from 'perf_hooks';
import v8 from 'v8';

// Ring buffer for latency measurements (no allocation in hot path after init)
const LATENCY_BUFFER_SIZE = 10000;

export class OpenMobiusShadowObserver {
    constructor(symbol, timeframe) {
        this.symbol = symbol;
        this.timeframe = timeframe;
        this.v8 = new OpenMobiusEngine();
        this.stateTracker = new OpenMobiusStateTracker(symbol, timeframe);
        this._candleHistory = [];
        this._maxHistory = 500;

        // Telemetry
        this._v8Latencies = new Float64Array(LATENCY_BUFFER_SIZE);
        this._trackerLatencies = new Float64Array(LATENCY_BUFFER_SIZE);
        this._totalLatencies = new Float64Array(LATENCY_BUFFER_SIZE);
        this._latIdx = 0;
        this._latCount = 0;

        this._eventLoopLags = [];
        this._lastTickTime = performance.now();
        this._initialHeap = process.memoryUsage().heapUsed;

        // GC Telemetry
        this._gcPauses = [];
        this._setupGCObserver();

        // Shadow audit buffer (flushed periodically)
        this._auditBuffer = [];
        this._auditFlushSize = 100;
        this._auditLog = [];

        this._stats = {
            ticks: 0,
            transitionsGenerated: 0,
            fvgFormed: 0,
            fvgMitigated: 0,
            obFormed: 0,
            obMitigated: 0,
            sweepFormed: 0,
            structureEvents: 0
        };
    }

    _setupGCObserver() {
        try {
            const obs = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                for (const entry of entries) {
                    this._gcPauses.push({
                        type: entry.detail ? entry.detail.kind : entry.name,
                        duration: entry.duration,
                        time: Date.now()
                    });
                }
            });
            obs.observe({ entryTypes: ['gc'] });
        } catch (e) {
            // Some Node environments might not support 'gc' entryTypes directly.
        }
    }

    /**
     * Called from streamEngine AFTER the old OpenMobius has processed.
     */
    observe(candle) {
        // Track event loop lag since last observe
        const now = performance.now();
        const lag = now - this._lastTickTime;
        // In real 1m ticks, lag will include the 60s sleep. We only track lag if called rapidly, 
        // but for 1m ticks, we assume lag > 50ms (excluding the 1m natural gap). 
        // Actually, streamEngine ticks may happen on every trade/websocket event, so we just track > 50ms.
        if (lag > 50 && lag < 2000) { 
            // only count lags that are anomalously slow (not the natural 1s or 60s waits)
            this._eventLoopLags.push(lag);
        }

        const tTotalStart = performance.now();

        // Accumulate candles
        this._candleHistory.push({
            time: candle.openTime || candle.timestamp || Date.now(),
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close,
            volume: candle.volume || 0,
            is_bullish: candle.close >= candle.open
        });
        if (this._candleHistory.length > this._maxHistory) {
            this._candleHistory.shift();
        }

        // 1. V8 Engine (Pure Math)
        const tV8Start = performance.now();
        const v8Result = this.v8.analyze(this._candleHistory);
        const tV8Elapsed = performance.now() - tV8Start;

        // 2. StateTracker (Transitions)
        const tTrackerStart = performance.now();
        const currentTimestamp = candle.openTime || candle.timestamp || Date.now();
        const transitions = this.stateTracker.process(v8Result, this._candleHistory, currentTimestamp);
        const tTrackerElapsed = performance.now() - tTrackerStart;

        const tTotalElapsed = performance.now() - tTotalStart;

        // Record latencies
        const idx = this._latIdx % LATENCY_BUFFER_SIZE;
        this._v8Latencies[idx] = tV8Elapsed;
        this._trackerLatencies[idx] = tTrackerElapsed;
        this._totalLatencies[idx] = tTotalElapsed;
        
        this._latIdx++;
        if (this._latCount < LATENCY_BUFFER_SIZE) this._latCount++;

        // Update stats
        this._stats.ticks++;
        this._stats.transitionsGenerated += transitions.length;
        
        for (const t of transitions) {
            if (t.event === 'FVG_FORMED') this._stats.fvgFormed++;
            if (t.event === 'FVG_MITIGATED') this._stats.fvgMitigated++;
            if (t.event === 'OB_FORMED') this._stats.obFormed++;
            if (t.event === 'OB_MITIGATED') this._stats.obMitigated++;
            if (t.event === 'SWEEP_FORMED') this._stats.sweepFormed++;
            if (t.event.startsWith('STRUCTURE_')) this._stats.structureEvents++;
        }

        // Flush to audit log
        if (transitions.length > 0 || this._stats.ticks % 100 === 0) {
            this._auditBuffer.push({
                timestamp: Date.now(),
                tick: this._stats.ticks,
                transitions: transitions, // The causal transitions!
                latency: {
                    v8Ms: Math.round(tV8Elapsed * 1000) / 1000,
                    trackerMs: Math.round(tTrackerElapsed * 1000) / 1000,
                    totalMs: Math.round(tTotalElapsed * 1000) / 1000
                }
            });

            if (this._auditBuffer.length >= this._auditFlushSize) {
                this._flushAuditBuffer();
            }
        }

        this._lastTickTime = performance.now();
    }

    _flushAuditBuffer() {
        this._auditLog.push(...this._auditBuffer);
        this._auditBuffer = [];
        if (this._auditLog.length > 50000) {
            this._auditLog = this._auditLog.slice(-25000);
        }
    }

    _calcPercentiles(arr, count) {
        if (count === 0) return { p50: 0, p95: 0, p99: 0, p999: 0, max: 0, mean: 0 };
        const sorted = Array.from(arr.subarray(0, count)).sort((a, b) => a - b);
        const n = sorted.length;
        const mean = sorted.reduce((a, b) => a + b, 0) / n;
        return {
            p50: Math.round(sorted[Math.floor(n * 0.50)] * 1000) / 1000,
            p95: Math.round(sorted[Math.floor(n * 0.95)] * 1000) / 1000,
            p99: Math.round(sorted[Math.floor(n * 0.99)] * 1000) / 1000,
            p999: Math.round(sorted[Math.floor(n * 0.999)] * 1000) / 1000,
            max: Math.round(sorted[n - 1] * 1000) / 1000,
            mean: Math.round(mean * 1000) / 1000
        };
    }

    getShadowReport() {
        this._flushAuditBuffer();
        
        const currentHeap = process.memoryUsage().heapUsed;
        const heapGrowthMb = (currentHeap - this._initialHeap) / 1024 / 1024;

        return {
            symbol: this.symbol,
            timeframe: this.timeframe,
            stats: { ...this._stats },
            telemetry: {
                v8Latency: this._calcPercentiles(this._v8Latencies, this._latCount),
                trackerLatency: this._calcPercentiles(this._trackerLatencies, this._latCount),
                totalLatency: this._calcPercentiles(this._totalLatencies, this._latCount),
                eventLoopLags: this._eventLoopLags.length,
                gcPauses: this._gcPauses.length,
                heapGrowthMb: Math.round(heapGrowthMb * 100) / 100,
                currentHeapMb: Math.round(currentHeap / 1024 / 1024 * 100) / 100
            },
            auditLogSize: this._auditLog.length,
            recentTransitions: this._auditLog.slice(-5)
        };
    }
}
