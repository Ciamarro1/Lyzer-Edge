export class OpenMobiusStateTracker {
    constructor(symbol, timeframe) {
        this.symbol = symbol;
        this.timeframe = timeframe;
        this.activeStates = {
            fvg: new Map(),
            ob: new Map(),
            sweep: new Map(),
            structure: new Map()
        };
    }

    _resolveCandleTime(candleHistory, relativeIndex) {
        if (!candleHistory || relativeIndex === undefined || relativeIndex < 0 || relativeIndex >= candleHistory.length) {
            return Date.now();
        }
        return candleHistory[relativeIndex].time || candleHistory[relativeIndex].timestamp || Date.now();
    }

    _hashFVG(fvg, formationTime) {
        return `FVG_${fvg.type}_${formationTime}_${fvg.top}_${fvg.bottom}`;
    }

    _hashOB(ob, formationTime) {
        return `OB_${ob.direction}_${formationTime}_${ob.top}_${ob.bottom}`;
    }

    _hashSweep(sweep, sweepTime) {
        return `SWEEP_${sweep.type}_${sweepTime}_${sweep.swept_level}`;
    }

    _hashStructure(evt, confirmationTime) {
        return `STRUCT_${evt.type}_${confirmationTime}_${evt.at_price}`;
    }

    process(v8Result, candleHistory, currentTimestamp) {
        const transitions = [];

        // 1. Process FVGs
        const currentFvgs = new Set();
        for (const fvg of (v8Result.imbalance?.fvgs || [])) {
            const formationTime = this._resolveCandleTime(candleHistory, fvg.formed_at_index);
            const id = this._hashFVG(fvg, formationTime);
            currentFvgs.add(id);

            if (!this.activeStates.fvg.has(id)) {
                const state = {
                    id,
                    type: 'FVG',
                    formationTime: formationTime,
                    confirmationTime: formationTime,
                    firstObservationTime: currentTimestamp,
                    lastObservationTime: currentTimestamp,
                    mitigated: false,
                    payload: fvg
                };
                this.activeStates.fvg.set(id, state);
                transitions.push({ event: 'FVG_FORMED', state });
            } else {
                const state = this.activeStates.fvg.get(id);
                state.lastObservationTime = currentTimestamp;
                state.payload = fvg;

                if (fvg.mitigation_pct >= 100 && !state.mitigated) {
                    state.mitigated = true;
                    state.mitigationTime = currentTimestamp;
                    transitions.push({ event: 'FVG_MITIGATED', state });
                }
            }
        }

        for (const [id, state] of this.activeStates.fvg.entries()) {
            if (!currentFvgs.has(id) && !state.mitigated) {
                state.mitigated = true;
                state.mitigationTime = currentTimestamp;
                transitions.push({ event: 'FVG_EXPIRED', state });
                this.activeStates.fvg.delete(id);
            } else if (!currentFvgs.has(id)) {
                this.activeStates.fvg.delete(id);
            }
        }

        // 2. Process OBs
        const currentObs = new Set();
        for (const ob of (v8Result.orderBlocks || [])) {
            const formationTime = this._resolveCandleTime(candleHistory, ob.formed_at_index);
            const id = this._hashOB(ob, formationTime);
            currentObs.add(id);

            if (!this.activeStates.ob.has(id)) {
                const state = {
                    id, type: 'OB', formationTime, confirmationTime: formationTime,
                    firstObservationTime: currentTimestamp, lastObservationTime: currentTimestamp,
                    mitigated: false, payload: ob
                };
                this.activeStates.ob.set(id, state);
                transitions.push({ event: 'OB_FORMED', state });
            } else {
                const state = this.activeStates.ob.get(id);
                state.lastObservationTime = currentTimestamp;
                state.payload = ob;
                if (ob.mitigation_pct >= 100 && !state.mitigated) {
                    state.mitigated = true;
                    state.mitigationTime = currentTimestamp;
                    transitions.push({ event: 'OB_MITIGATED', state });
                }
            }
        }
        for (const [id, state] of this.activeStates.ob.entries()) {
            if (!currentObs.has(id)) this.activeStates.ob.delete(id);
        }

        // 3. Process Sweeps
        const currentSweeps = new Set();
        for (const sweep of (v8Result.liquidity?.sweeps || [])) {
            const sweepTime = this._resolveCandleTime(candleHistory, sweep.sweep_candle_index || (candleHistory.length - 1));
            const id = this._hashSweep(sweep, sweepTime);
            currentSweeps.add(id);

            if (!this.activeStates.sweep.has(id)) {
                const state = {
                    id, type: 'SWEEP', formationTime: sweepTime, confirmationTime: sweepTime,
                    firstObservationTime: currentTimestamp, lastObservationTime: currentTimestamp,
                    payload: sweep
                };
                this.activeStates.sweep.set(id, state);
                transitions.push({ event: 'SWEEP_FORMED', state });
            }
        }
        for (const [id, state] of this.activeStates.sweep.entries()) {
             if (!currentSweeps.has(id)) this.activeStates.sweep.delete(id);
        }

        // 4. Process Structure (BOS/CHoCH)
        const currentStructs = new Set();
        for (const evt of (v8Result.marketStructure?.events || [])) {
            const confirmTime = this._resolveCandleTime(candleHistory, evt.at_index || (candleHistory.length - 1));
            const id = this._hashStructure(evt, confirmTime);
            currentStructs.add(id);

            if (!this.activeStates.structure.has(id)) {
                const state = {
                    id, type: 'STRUCTURE', formationTime: confirmTime, confirmationTime: confirmTime,
                    firstObservationTime: currentTimestamp, lastObservationTime: currentTimestamp,
                    payload: evt
                };
                this.activeStates.structure.set(id, state);
                transitions.push({ event: `STRUCTURE_${evt.type}`, state });
            }
        }
        for (const [id, state] of this.activeStates.structure.entries()) {
             if (!currentStructs.has(id)) this.activeStates.structure.delete(id);
        }

        return transitions;
    }
}
