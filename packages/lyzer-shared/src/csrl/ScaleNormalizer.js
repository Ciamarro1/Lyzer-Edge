/**
 * CSRL - Scale Normalizer
 * Aligns raw OHLCV and structure data into a common dimensional space (Float32Array Tensors).
 */
export class ScaleNormalizer {
    constructor() {
        this.dimensions = 5; // O, H, L, C, V
    }

    /**
     * Converts an array of candles into a normalized Flat32 Tensor
     */
    normalize(candles) {
        if (!candles || candles.length === 0) return new Float32Array(0);
        
        const tensor = new Float32Array(candles.length * this.dimensions);
        
        // Find min and max for normalization
        let min = Infinity;
        let max = -Infinity;
        for (const c of candles) {
            const low = c.low !== undefined ? c.low : c.l;
            const high = c.high !== undefined ? c.high : c.h;
            const volume = c.volume !== undefined ? c.volume : c.v;
            
            if (low < min) min = low;
            if (high > max) max = high;
            if (volume < min) min = volume;
            if (volume > max) max = volume;
        }
        
        const range = (max - min) || 1;

        for (let i = 0; i < candles.length; i++) {
            const baseIndex = i * this.dimensions;
            const open = candles[i].open !== undefined ? candles[i].open : candles[i].o;
            const high = candles[i].high !== undefined ? candles[i].high : candles[i].h;
            const low = candles[i].low !== undefined ? candles[i].low : candles[i].l;
            const close = candles[i].close !== undefined ? candles[i].close : candles[i].c;
            const volume = candles[i].volume !== undefined ? candles[i].volume : candles[i].v;
            
            tensor[baseIndex] = (open - min) / range;
            tensor[baseIndex + 1] = (high - min) / range;
            tensor[baseIndex + 2] = (low - min) / range;
            tensor[baseIndex + 3] = (close - min) / range;
            tensor[baseIndex + 4] = (volume - min) / range;
        }
        
        return tensor;
    }

    alignScales(multiScaleData) {
        const aligned = {};
        for (const [interval, candles] of Object.entries(multiScaleData)) {
            aligned[interval] = this.normalize(candles);
        }
        return aligned;
    }
}
