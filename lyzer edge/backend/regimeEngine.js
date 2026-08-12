/**
 * 4-Phase Regime Engine
 * Coordinates the Discovery, Confirmation, Expansion, and Exhaustion phases.
 */

export class RegimeEngine {
    evaluate(activePosition, candle, mtfCandles) {
        if (!activePosition || !candle) {
            return { type: 'HOLD' };
        }

        const riskDistance = Math.abs(activePosition.entryPrice - activePosition.initialStopLoss);
        if (riskDistance === 0) {
            return { type: 'HOLD' };
        }

        const isLong = activePosition.direction === 'LONG';
        
        let mfeR = 0;
        let maeR = 0;

        if (isLong) {
            mfeR = Math.max(0, candle.high - activePosition.entryPrice) / riskDistance;
            maeR = Math.max(0, activePosition.entryPrice - candle.low) / riskDistance;
        } else {
            mfeR = Math.max(0, activePosition.entryPrice - candle.low) / riskDistance;
            maeR = Math.max(0, candle.high - activePosition.entryPrice) / riskDistance;
        }

        let regime = 'DISCOVERY';
        
        if (this.checkExhaustion(activePosition, candle, mtfCandles, mfeR)) { 
            regime = 'EXHAUSTION';
        } else if (mfeR >= 1.5) {
            regime = 'EXPANSION';
        } else if (mfeR >= 1.0) {
            regime = 'CONFIRMATION';
        }

        switch (regime) {
            case 'DISCOVERY':
                return this.handleDiscovery(activePosition, candle, mfeR);
            case 'CONFIRMATION':
                return this.handleConfirmation(activePosition, candle, mfeR);
            case 'EXPANSION':
                return this.handleExpansion(activePosition, candle, mtfCandles, mfeR);
            case 'EXHAUSTION':
                return { type: 'EXIT_EXHAUSTION', reason: 'VOLUME_DIVERGENCE' };
            default:
                return { type: 'HOLD' };
        }
    }

    checkExhaustion(pos, candle, mtfCandles, mfeR) {
        if (mfeR >= 1.0) {
            let timeframeCandles = mtfCandles['1m'] || [];
            let recentCandles = timeframeCandles.slice(-5);
            if (recentCandles.length > 0) {
                let totalVolume = recentCandles.reduce((sum, c) => sum + (c.volume || 0), 0);
                let avgVolume = totalVolume / recentCandles.length;
                
                let currentVolume = candle.volume || 0;
                let candleSize = candle.high - candle.low;
                
                let isExtremelySmall = candleSize < (candle.close * 0.001);
                
                if (currentVolume < 0.3 * avgVolume && isExtremelySmall) {
                    return true;
                }
            }
        }
        return false;
    }

    handleDiscovery(pos, candle, mfeR) {
        return { type: 'HOLD', newStopLoss: pos.initialStopLoss };
    }

    handleConfirmation(pos, candle, mfeR) {
        let protectedPrice;
        if (pos.direction === 'LONG') {
            protectedPrice = pos.entryPrice * 1.0005;
            if (pos.stopLoss < protectedPrice) {
                return { type: 'HOLD', newStopLoss: protectedPrice };
            }
        } else if (pos.direction === 'SHORT') {
            protectedPrice = pos.entryPrice * 0.9995;
            if (pos.stopLoss > protectedPrice) {
                return { type: 'HOLD', newStopLoss: protectedPrice };
            }
        }
        return { type: 'HOLD', newStopLoss: pos.stopLoss };
    }

    handleExpansion(pos, candle, mtfCandles, mfeR) {
        let timeframeCandles = mtfCandles['15m'];
        if (!timeframeCandles || timeframeCandles.length < 3) {
            timeframeCandles = mtfCandles['1m'];
        }
    
        if (!timeframeCandles || timeframeCandles.length < 3) {
            return { type: 'HOLD', newStopLoss: pos.stopLoss };
        }
    
        const last3 = timeframeCandles.slice(-3);
        let calculatedSL = pos.stopLoss;
    
        if (pos.direction === 'LONG') {
            const structuralLow = Math.min(...last3.map(c => c.low));
            if (structuralLow > pos.stopLoss) {
                calculatedSL = structuralLow;
            }
        } else if (pos.direction === 'SHORT') {
            const structuralHigh = Math.max(...last3.map(c => c.high));
            if (structuralHigh < pos.stopLoss) {
                calculatedSL = structuralHigh;
            }
        }
    
        return { type: 'HOLD', newStopLoss: calculatedSL };
    }
}
