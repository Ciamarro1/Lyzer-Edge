export class WyckoffVolumeProfileEngine {
    constructor(config = {}) {
        this.lookback = config.lookback || 60; // Reduced from 120 for 1m microscalping
        this.volumeZScore = config.volumeZScore || 2.5; // Replaces static volumeThreshold
        this.pocProximity = config.pocProximity || 0.0005; // Tightened from 0.001 to 0.05%
        this.minPierceATR = config.minPierceATR || 1.0; // New: Minimum pierce distance in ATR
    }

    reconstruct(mtfCandles) {
        // 1. Determine active candles (prefer .slow, then .intermediate, then .fast)
        const candles = mtfCandles.slow || mtfCandles.intermediate || mtfCandles.fast;
        
        if (!candles || candles.length < this.lookback) {
            return { signal: 'flat', confidence: 0, narrative: 'Not enough data', poc: null };
        }

        const lookbackCandles = candles.slice(-this.lookback);
        
        // 2. Calculate POC (Point of Control)
        const poc = this._calculatePOC(lookbackCandles);
        
        // 3 & 4. Check for Wyckoff Spring and Upthrust
        const current = lookbackCandles[lookbackCandles.length - 1];
        const previousCandles = lookbackCandles.slice(0, -1);
        
        const recentLow = Math.min(...previousCandles.map(c => c.low));
        const recentHigh = Math.max(...previousCandles.map(c => c.high));
        
        // Dynamic Volume Threshold (Z-Score)
        const volumes = lookbackCandles.map(c => c.volume);
        const avgVolume = volumes.reduce((sum, v) => sum + v, 0) / volumes.length;
        const volVariance = volumes.reduce((sum, v) => sum + Math.pow(v - avgVolume, 2), 0) / volumes.length;
        const volStdDev = Math.sqrt(volVariance);
        
        const highVolume = current.volume > (avgVolume + this.volumeZScore * volStdDev);
        
        // Local Volatility (Simplified ATR / StdDev of High-Low)
        const ranges = previousCandles.map(c => c.high - c.low);
        const avgRange = ranges.reduce((sum, r) => sum + r, 0) / ranges.length;
        const minPierceDistance = avgRange * this.minPierceATR;

        const nearPoc = poc !== null && (Math.abs(current.close - poc) / poc <= this.pocProximity);
        
        // Wyckoff Spring: Meaningful pierce below recent swing low
        const isSpring = current.low < (recentLow - minPierceDistance) && 
                         current.close > recentLow && 
                         highVolume && nearPoc;
                         
        // Wyckoff Upthrust: Meaningful pierce above recent swing high
        const isUpthrust = current.high > (recentHigh + minPierceDistance) && 
                           current.close < recentHigh && 
                           highVolume && nearPoc;
        
        if (isSpring) {
            return {
                signal: 'LONG',
                confidence: 0.85,
                narrative: `Wyckoff Spring: Pierced support by >${this.minPierceATR} ATR, closed above it on anomalous volume (Z-Score > ${this.volumeZScore}) near POC.`,
                poc
            };
        }
        
        if (isUpthrust) {
            return {
                signal: 'SHORT',
                confidence: 0.85,
                narrative: `Wyckoff Upthrust: Pierced resistance by >${this.minPierceATR} ATR, closed below it on anomalous volume (Z-Score > ${this.volumeZScore}) near POC.`,
                poc
            };
        }
        
        return { signal: 'flat', confidence: 0, narrative: 'No Wyckoff schematic detected.', poc };
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
