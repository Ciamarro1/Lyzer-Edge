export class WyckoffVolumeProfileEngine {
    constructor(config = {}) {
        this.lookback = config.lookback || 20;
        this.volumeThreshold = config.volumeThreshold || 1.5;
        this.pocProximity = config.pocProximity || 0.05; // 5% distance
    }

    reconstruct(mtfCandles) {
        // 1. Determine active candles (prefer .slow, then .intermediate, then .fast)
        const candles = mtfCandles.slow || mtfCandles.intermediate || mtfCandles.fast;
        
        if (!candles || candles.length < this.lookback) {
            return { signal: 'flat', confidence: 0, narrative: 'Not enough data', poc: null };
        }

        const last20 = candles.slice(-this.lookback);
        
        // 2. Calculate POC (Point of Control)
        const poc = this._calculatePOC(last20);
        
        // 3 & 4. Check for Wyckoff Spring and Upthrust
        const current = last20[last20.length - 1];
        const previousCandles = last20.slice(0, -1);
        
        const recentLow = Math.min(...previousCandles.map(c => c.low));
        const recentHigh = Math.max(...previousCandles.map(c => c.high));
        
        const avgVolume = last20.reduce((sum, c) => sum + c.volume, 0) / last20.length;
        
        const highVolume = current.volume > avgVolume * this.volumeThreshold;
        const nearPoc = poc !== null && (Math.abs(current.close - poc) / poc <= this.pocProximity);
        
        // Wyckoff Spring: price dips below a recent swing low, closes above it, high volume, near POC
        const isSpring = current.low < recentLow && current.close > recentLow && highVolume && nearPoc;
        
        // Wyckoff Upthrust: price spikes above a recent swing high, closes below it, high volume, near POC
        const isUpthrust = current.high > recentHigh && current.close < recentHigh && highVolume && nearPoc;
        
        if (isSpring) {
            return {
                signal: 'LONG',
                confidence: 0.85,
                narrative: 'Wyckoff Spring detected: Price dipped below recent swing low and closed above it on high volume near POC.',
                poc
            };
        }
        
        if (isUpthrust) {
            return {
                signal: 'SHORT',
                confidence: 0.85,
                narrative: 'Wyckoff Upthrust detected: Price spiked above recent swing high and closed below it on high volume near POC.',
                poc
            };
        }
        
        return {
            signal: 'flat',
            confidence: 0,
            narrative: 'No Wyckoff schematic detected.',
            poc
        };
    }

    _calculatePOC(candles) {
        let min = Infinity;
        let max = -Infinity;
        for (const c of candles) {
            min = Math.min(min, c.low);
            max = Math.max(max, c.high);
        }
        
        if (min === Infinity || max === -Infinity) return null;
        
        const binSize = Math.max((max - min) / 50, 0.0001); // 50 bins
        const bins = new Map();
        
        for (const c of candles) {
            const startBin = Math.floor(c.low / binSize);
            const endBin = Math.floor(c.high / binSize);
            const binsSpanned = Math.max(endBin - startBin + 1, 1);
            const volPerBin = c.volume / binsSpanned;
            
            for (let b = startBin; b <= endBin; b++) {
                bins.set(b, (bins.get(b) || 0) + volPerBin);
            }
        }
        
        let maxVol = -1;
        let pocBin = -1;
        
        for (const [bin, vol] of bins.entries()) {
            if (vol > maxVol) {
                maxVol = vol;
                pocBin = bin;
            }
        }
        
        return pocBin !== -1 ? (pocBin + 0.5) * binSize : null;
    }
}
