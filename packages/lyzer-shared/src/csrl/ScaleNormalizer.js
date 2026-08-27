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
        const len = candles ? candles.length : 0;
        if (len === 0) return new Float32Array(0);
        
        const tensor = new Float32Array(len * this.dimensions);
        
        // Find min and max for normalization
        let min = Infinity;
        let max = -Infinity;
        for (let i = 0; i < len; i++) {
            const c = candles[i];
            const low = c.low !== undefined ? c.low : c.l;
            const high = c.high !== undefined ? c.high : c.h;
            const volume = c.volume !== undefined ? c.volume : (c.v || 0);
            
            if (low < min) min = low;
            if (high > max) max = high;
            if (volume < min) min = volume;
            if (volume > max) max = volume;
        }
        
        const range = (max - min) || 1;
        const invRange = 1 / range;

        for (let i = 0; i < len; i++) {
            const c = candles[i];
            const baseIndex = i * this.dimensions;
            const open = c.open !== undefined ? c.open : c.o;
            const high = c.high !== undefined ? c.high : c.h;
            const low = c.low !== undefined ? c.low : c.l;
            const close = c.close !== undefined ? c.close : c.c;
            const volume = c.volume !== undefined ? c.volume : (c.v || 0);
            
            tensor[baseIndex] = (open - min) * invRange;
            tensor[baseIndex + 1] = (high - min) * invRange;
            tensor[baseIndex + 2] = (low - min) * invRange;
            tensor[baseIndex + 3] = (close - min) * invRange;
            tensor[baseIndex + 4] = (volume - min) * invRange;
        }
        
        return tensor;
    }

    alignScales(multiScaleData) {
        const aligned = {};
        const scales = ['1m', '5m', '15m', '1h', '4h', '1d'];
        for (let i = 0; i < scales.length; i++) {
            const scale = scales[i];
            const list = multiScaleData[scale];
            if (list && list.length > 0) {
                aligned[scale] = this.normalize(list);
            }
        }
        return aligned;
    }
}
