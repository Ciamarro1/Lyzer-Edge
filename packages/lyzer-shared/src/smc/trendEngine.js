export class TrendEngine {
    evaluate(tfManager) {
        if (!tfManager || typeof tfManager.getCandles !== 'function') {
            return { bias: 'NEUTRAL', strength: 0 };
        }

        const h4Candles = tfManager.getCandles('4h', 50, false) || [];
        const h1Candles = tfManager.getCandles('1h', 50, false) || [];

        if (h4Candles.length === 0 || h1Candles.length === 0) {
            return { bias: 'NEUTRAL', strength: 0 };
        }

        if (h4Candles.length < 21 || h1Candles.length < 21) {
            const h4Bias = this.determineSimpleBias(h4Candles);
            const h1Bias = this.determineSimpleBias(h1Candles);
            if (h4Bias === h1Bias && h4Bias !== 'NEUTRAL') {
                return { bias: h4Bias, strength: 50 };
            }
            return { bias: 'NEUTRAL', strength: 0 };
        }

        const h4Result = this.analyzeTrend(h4Candles);
        const h1Result = this.analyzeTrend(h1Candles);

        if (h4Result.bias === h1Result.bias && h4Result.bias !== 'NEUTRAL') {
            // Align: calculate strength as combination of confirmation duration
            // Maximum strength can be 100
            const strength = Math.min(100, Math.round((h4Result.duration * 10) + (h1Result.duration * 5)));
            return {
                bias: h4Result.bias,
                strength
            };
        }

        return {
            bias: 'NEUTRAL',
            strength: 0
        };
    }

    determineSimpleBias(candles) {
        if (candles.length < 2) return 'NEUTRAL';
        const first = candles[0].close;
        const last = candles[candles.length - 1].close;
        if (last > first) return 'BULLISH';
        if (last < first) return 'BEARISH';
        return 'NEUTRAL';
    }

    analyzeTrend(candles) {
        const ema9 = this.calculateEMA(candles, 9);
        const ema21 = this.calculateEMA(candles, 21);

        const N = candles.length;
        const currentBias = this.getBiasAt(N - 1, ema9, ema21);
        
        let duration = 0;
        if (currentBias !== 'NEUTRAL') {
            for (let i = N - 1; i >= 20; i--) {
                if (this.getBiasAt(i, ema9, ema21) === currentBias) {
                    duration++;
                } else {
                    break;
                }
            }
        }

        return { bias: currentBias, duration };
    }

    getBiasAt(index, ema9, ema21) {
        const val9 = ema9[index - 8];
        const val21 = ema21[index - 20];
        if (val9 > val21) return 'BULLISH';
        if (val9 < val21) return 'BEARISH';
        return 'NEUTRAL';
    }

    calculateEMA(candles, period) {
        const k = 2 / (period + 1);
        const ema = [];
        let sum = 0;
        for (let i = 0; i < period; i++) {
            sum += candles[i].close;
        }
        let currentEma = sum / period;
        ema.push(currentEma);
        for (let i = period; i < candles.length; i++) {
            currentEma = candles[i].close * k + currentEma * (1 - k);
            ema.push(currentEma);
        }
        return ema;
    }
}
