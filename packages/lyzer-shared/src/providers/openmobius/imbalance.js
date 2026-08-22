export function round(value, decimals) {
    return Number(Math.round(value + 'e' + decimals) + 'e-' + decimals);
}

export function calc_atr(candles, period = 14) {
    if (candles.length < period + 1) {
        return null;
    }
    const trs = [];
    for (let i = 1; i < candles.length; i++) {
        const prev_close = candles[i - 1].close;
        const current = candles[i];
        const tr = Math.max(
            current.high - current.low,
            Math.abs(current.high - prev_close),
            Math.abs(current.low - prev_close)
        );
        trs.push(tr);
    }
    if (trs.length < period) {
        return null;
    }
    const lastTrs = trs.slice(-period);
    const sum = lastTrs.reduce((a, b) => a + b, 0);
    return sum / period;
}

export function _fvg_mitigation_pct(top, bot, fvg_type, candles, formed_at) {
    if (formed_at + 1 >= candles.length) {
        return 0.0;
    }
    const subsequent = candles.slice(formed_at + 1);
    const size = top - bot;
    if (size <= 0) {
        return 0.0;
    }
    if (fvg_type === "bullish_fvg") {
        const min_low = Math.min(...subsequent.map(c => c.low));
        if (min_low >= top) {
            return 0.0;
        }
        if (min_low <= bot) {
            return 100.0;
        }
        return ((top - min_low) / size) * 100.0;
    }
    // bearish
    const max_high = Math.max(...subsequent.map(c => c.high));
    if (max_high <= bot) {
        return 0.0;
    }
    if (max_high >= top) {
        return 100.0;
    }
    return ((max_high - bot) / size) * 100.0;
}

export function find_fvgs(candles, min_size_atr = 0.2) {
    const out = [];
    const n = candles.length;
    if (n < 3) {
        return out;
    }
    const atr = calc_atr(candles) || 0;
    const min_size = atr ? min_size_atr * atr : 0;

    for (let i = 0; i < n - 2; i++) {
        const c0 = candles[i];
        const c2 = candles[i + 2];
        
        // bullish FVG
        if (c0.high < c2.low) {
            const top = c2.low;
            const bot = c0.high;
            if (top - bot < min_size) {
                continue;
            }
            out.push({
                type: "bullish_fvg",
                top: round(top, 4),
                bottom: round(bot, 4),
                formed_at_index: i + 1,
                age_bars: n - 1 - (i + 1),
                size: round(top - bot, 4),
                mitigation_pct: round(_fvg_mitigation_pct(top, bot, "bullish_fvg", candles, i + 1), 1)
            });
        } 
        // bearish FVG
        else if (c0.low > c2.high) {
            const top = c0.low;
            const bot = c2.high;
            if (top - bot < min_size) {
                continue;
            }
            out.push({
                type: "bearish_fvg",
                top: round(top, 4),
                bottom: round(bot, 4),
                formed_at_index: i + 1,
                age_bars: n - 1 - (i + 1),
                size: round(top - bot, 4),
                mitigation_pct: round(_fvg_mitigation_pct(top, bot, "bearish_fvg", candles, i + 1), 1)
            });
        }
    }
    return out;
}

export function find_displacements(candles, atr_mult = 2.0) {
    const atr = calc_atr(candles);
    if (atr === null || atr === undefined || atr === 0) {
        return [];
    }
    const threshold = atr_mult * atr;
    const n = candles.length;
    const out = [];
    for (let i = 0; i < n; i++) {
        const c = candles[i];
        const body = Math.abs(c.close - c.open);
        if (body >= threshold) {
            out.push({
                direction: c.is_bullish ? "bullish" : "bearish",
                magnitude_pct: round(((c.close - c.open) / c.open) * 100, 3),
                magnitude_atr: round(body / atr, 2),
                candle_index: i,
                age_bars: n - 1 - i
            });
        }
    }
    return out;
}

export function find_volume_anomalies(candles, lookback = 20, mult = 2.0) {
    const n = candles.length;
    if (n < lookback + 1) {
        return [];
    }
    const out = [];
    for (let i = lookback; i < n; i++) {
        const recent = candles.slice(i - lookback, i).map(c => c.volume);
        const sum = recent.reduce((a, b) => a + b, 0);
        const avg = recent.length > 0 ? sum / recent.length : 0;
        if (avg === 0) {
            continue;
        }
        const ratio = candles[i].volume / avg;
        if (ratio > mult) {
            out.push({
                candle_index: i,
                age_bars: n - 1 - i,
                volume_ratio: round(ratio, 2),
                direction: candles[i].is_bullish ? "bullish" : "bearish"
            });
        }
    }
    return out;
}
