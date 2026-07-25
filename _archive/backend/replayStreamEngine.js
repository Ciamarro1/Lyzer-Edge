import fs from 'fs';
import path from 'path';

// Core imports from the main streamEngine
import { TruthKernel } from "../../packages/lyzer-shared/src/engine/kernel.js";
import { court } from "../../packages/lyzer-constitution/src/eca/court.js";
import { LiquidityReconstructionEngine } from "../../packages/lyzer-shared/src/providers/v1_smc_ict.js";
import { StructuralBoundaryEngine } from "../../packages/lyzer-shared/src/providers/v2_snd_snr.js";

import { ScaleNormalizer } from "../../packages/lyzer-shared/src/csrl/ScaleNormalizer.js";
import { CrossScaleTensorGraph } from "../../packages/lyzer-shared/src/csrl/CrossScaleTensorGraph.js";
import { InvariantExtractor } from "../../packages/lyzer-shared/src/csrl/InvariantExtractor.js";
import { DivergenceDetector } from "../../packages/lyzer-shared/src/csrl/DivergenceDetector.js";

const DATA_DIR = path.join(process.cwd(), 'data');
const SYMBOL = 'BTCUSDT';
const TIMEFRAMES = ['1m', '5m', '15m', '1h', '4h', '1d'];

export class ReplayStreamEngine {
    constructor() {
        this.truthKernel = new TruthKernel({ trgThreshold: 0.8 });
        this.v1 = new LiquidityReconstructionEngine();
        this.v2 = new StructuralBoundaryEngine();
        
        this.scaleNormalizer = new ScaleNormalizer();
        this.cstg = new CrossScaleTensorGraph();
        this.invariantExtractor = new InvariantExtractor();
        this.divergenceDetector = new DivergenceDetector();

        this.data = {};
        this.indexes = {};
    }

    loadData() {
        console.log(`[REPLAY] Loading historical data for ${SYMBOL}...`);
        for (const tf of TIMEFRAMES) {
            const filename = path.join(DATA_DIR, `historical_${SYMBOL}_${tf}.json`);
            if (fs.existsSync(filename)) {
                this.data[tf] = JSON.parse(fs.readFileSync(filename, 'utf8'));
                this.indexes[tf] = 0;
                console.log(`[REPLAY] Loaded ${this.data[tf].length} candles for ${tf}`);
            } else {
                console.error(`[ERROR] Missing data file: ${filename}`);
                process.exit(1);
            }
        }
    }

    async run() {
        this.loadData();
        
        console.log(`[REPLAY] Starting temporal decoupled execution...`);
        
        const m1Data = this.data['1m'];
        let lastReportTime = Date.now();
        
        // Open telemetry export stream
        const exportPath = path.join(DATA_DIR, 'csrl_telemetry.csv');
        const exportStream = fs.createWriteStream(exportPath);
        exportStream.write('timestamp,datetime,sds,trg,eef,epistemic_authority,mol_state,mol_doi,mol_scl\n');

        // Loop minute by minute
        for (let i = 0; i < m1Data.length; i++) {
            const currentM1 = m1Data[i];
            const currentMs = currentM1.T; // Use close time to prevent look-ahead
            
            // Advance higher timeframe indices up to current time
            let currentMtfState = {};

            for (const tf of ['1m', '5m', '15m', '1h', '4h', '1d']) {
                const raw = this.getVisibleHistory(tf, currentMs, 100);
                currentMtfState[tf] = raw.map(k => ({
                    open: k.o,
                    high: k.h,
                    low: k.l,
                    close: k.c,
                    volume: k.v,
                    timestamp: k.t
                }));
            }

            // Execute CSRL
            const alignedTensors = {};
            for (const tf of ['1m', '5m', '15m', '1h', '4h', '1d']) {
                alignedTensors[tf] = this.scaleNormalizer.normalize(currentMtfState[tf]);
            }
            const topology = this.cstg.buildTopology(alignedTensors);
            const sds = this.divergenceDetector.detect(topology);
            const trg = sds * 1.2; // Derived structural risk placeholder
            
            // Generate synthetic provider outputs based on historical close
            // This is where real provider logic would run on the historical array
            const mtfPayload = {
                fast: currentMtfState['1m'],
                intermediate: currentMtfState['5m'],
                slow: currentMtfState['15m']
            };
            const v1Signal = this.v1.reconstruct(mtfPayload);
            const v2Signal = this.v2.reconstruct(mtfPayload);

            const micro = {
                liquidityDivergence: Math.abs(currentM1.v / 1000), // proxy
                scaleDivergence: sds,
                invariants: this.invariantExtractor.extract(topology)
            };

            const kernelOutput = this.truthKernel.evaluate({v1: v1Signal, v2: v2Signal}, micro);
            
            // Inject calculated TruthKernel Epistemic Authority thresholds based on our implementation
            if (sds < 0.3) {
                kernelOutput.epistemic_authority = 'OBSERVED';
            } else if (sds <= 0.7) {
                kernelOutput.epistemic_authority = 'INFERRED';
            } else {
                if (trg >= 0.7) {
                    kernelOutput.epistemic_authority = 'VETO';
                    kernelOutput.eef = false;
                    kernelOutput.reason_codes = ['VETO_ONTOLOGICAL_COLLAPSE'];
                } else {
                    kernelOutput.epistemic_authority = 'INFERRED';
                }
            }

            // ECA / Court Validation
            const permissionToken = court.requestPermission('EXECUTE_TRADE', { trg: trg, dvf: sds }, { 
                eef: kernelOutput.eef, 
                reason: kernelOutput.reason_codes ? kernelOutput.reason_codes[0] : 'OK',
                epistemic_authority: kernelOutput.epistemic_authority
            });

            // Log output
            const datetime = new Date(currentMs).toISOString();
            // mol_state is kept inside court internally, we can infer it or we can modify court to return it.
            // court returns { granted, reason }, let's just log what we have
            const isGranted = permissionToken.granted;
            const courtReason = permissionToken.reason;

            exportStream.write(`${currentMs},${datetime},${sds},${trg},${kernelOutput.eef},${kernelOutput.epistemic_authority},${isGranted ? 'ALLOW' : 'REJECT'},${courtReason}\n`);

            if (Date.now() - lastReportTime > 5000) {
                console.log(`[REPLAY] Processed up to ${datetime} (${(i / m1Data.length * 100).toFixed(2)}%)`);
                lastReportTime = Date.now();
            }
        }
        
        exportStream.end();
        console.log(`[REPLAY] Completed temporal execution. Telemetry exported to ${exportPath}`);
    }

    // Helper to get up to N closed candles before currentMs
    getVisibleHistory(tf, currentMs, limit) {
        let arr = this.data[tf];
        let idx = this.indexes[tf];
        
        // Fast forward index to the latest closed candle before currentMs
        while (idx < arr.length && arr[idx].T <= currentMs) {
            idx++;
        }
        this.indexes[tf] = idx; // Update state so we don't scan from 0 next time
        
        // Return the last `limit` candles
        const start = Math.max(0, idx - limit);
        return arr.slice(start, idx);
    }
}

// Ensure the module is directly executable
const engine = new ReplayStreamEngine();
engine.run().catch(console.error);
