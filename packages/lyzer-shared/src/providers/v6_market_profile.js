/**
 * V6 Market Profile Engine
 * Generates signals based on Volume Profile and Value Area (VA).
 */

export class MarketProfileEngine {
    constructor(config = {}) {
        this.lookback = config.lookback || 50;
        this.binSize = config.binSize || 0.5;
        this.valueAreaPct = config.valueAreaPct || 0.70;
    }

    reconstruct(mtfCandles) {
        // 1. Determine active candles (prefer .slow, then .intermediate, then .fast)
        const candles = mtfCandles.slow || mtfCandles.intermediate || mtfCandles.fast;
        
        if (!candles || !Array.isArray(candles) || candles.length === 0) {
            return this._emptyResult('No valid candles provided');
        }

        // 2. Iterate through the last 50 candles
        const recentCandles = candles.slice(-this.lookback);
        if (recentCandles.length === 0) {
             return this._emptyResult('Not enough candles for profile calculation');
        }

        // Distribute volume across price bins
        const profile = new Map();
        let totalVolume = 0;

        for (const candle of recentCandles) {
            const { high, low, volume } = candle;
            
            // Handle edge case where high === low
            if (high === low) {
                const bin = this._getBin(low);
                this._addVolumeToBin(profile, bin, volume);
                totalVolume += volume;
                continue;
            }
            
            // Calculate spanning bins
            const minBin = this._getBin(low);
            const maxBin = this._getBin(high);
            
            // Calculate number of bins to distribute volume
            const numBins = Math.round((maxBin - minBin) / this.binSize) + 1;
            const volumePerBin = volume / numBins;

            for (let bin = minBin; bin <= maxBin; bin += this.binSize) {
                const currentBin = Number(bin.toFixed(4)); // Prevent float drift
                this._addVolumeToBin(profile, currentBin, volumePerBin);
            }
            
            totalVolume += volume;
        }

        if (totalVolume === 0) {
             return this._emptyResult('Total volume is zero');
        }

        // 3. Find the Point of Control (POC)
        let poc = 0;
        let maxVolume = -1;
        
        const sortedBins = Array.from(profile.entries()).sort((a, b) => a[0] - b[0]);
        let pocIndex = -1;

        for (let i = 0; i < sortedBins.length; i++) {
            const [price, vol] = sortedBins[i];
            if (vol > maxVolume) {
                maxVolume = vol;
                poc = price;
                pocIndex = i;
            }
        }

        // 4. Calculate the Value Area (VA) - range containing 70% of total volume
        const targetVolume = totalVolume * this.valueAreaPct;
        let vaVolume = maxVolume;
        
        let upperIndex = pocIndex + 1;
        let lowerIndex = pocIndex - 1;
        
        let vah = poc;
        let val = poc;

        // Expand VA up and down to capture 70% of volume
        while (vaVolume < targetVolume && (upperIndex < sortedBins.length || lowerIndex >= 0)) {
            // Volume of adjacent bins
            const upperVol = upperIndex < sortedBins.length ? sortedBins[upperIndex][1] : -1;
            const lowerVol = lowerIndex >= 0 ? sortedBins[lowerIndex][1] : -1;

            if (upperVol >= lowerVol && upperVol !== -1) {
                vaVolume += upperVol;
                vah = sortedBins[upperIndex][0];
                upperIndex++;
            } else if (lowerVol > upperVol && lowerVol !== -1) {
                vaVolume += lowerVol;
                val = sortedBins[lowerIndex][0];
                lowerIndex--;
            } else {
                break;
            }
        }

        // Ensure proper VAH / VAL ordering
        if (vah < val) {
            const temp = vah;
            vah = val;
            val = temp;
        }

        // 5. Signal logic
        const currentPrice = recentCandles[recentCandles.length - 1].close;
        let signal = 'flat';
        let confidence = 0;
        let narrative = `Price (${currentPrice}) is INSIDE Value Area [${val}, ${vah}]. Choppy noise.`;

        if (currentPrice > vah) {
            signal = 'LONG';
            confidence = 0.8;
            narrative = `Price (${currentPrice}) broke ABOVE Value Area High (${vah}).`;
        } else if (currentPrice < val) {
            signal = 'SHORT';
            confidence = 0.8;
            narrative = `Price (${currentPrice}) broke BELOW Value Area Low (${val}).`;
        }

        // 6. Return response payload
        return {
            signal,
            confidence,
            narrative,
            poc,
            vah,
            val
        };
    }

    _getBin(price) {
        return Math.floor(price / this.binSize) * this.binSize;
    }

    _addVolumeToBin(profile, price, vol) {
        const currentVol = profile.get(price) || 0;
        profile.set(price, currentVol + vol);
    }
    
    _emptyResult(reason) {
         return {
             signal: 'flat',
             confidence: 0,
             narrative: reason,
             poc: null,
             vah: null,
             val: null
         };
    }
}
