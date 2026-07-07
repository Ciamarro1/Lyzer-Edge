export class TimeframeManager {
    constructor() {
        this.timeframes = ['1m', '5m', '15m', '1h', '4h'];
        this.durations = {
            '1m': 60 * 1000,
            '5m': 5 * 60 * 1000,
            '15m': 15 * 60 * 1000,
            '1h': 60 * 60 * 1000,
            '4h': 4 * 60 * 60 * 1000
        };
        this.limits = {
            '1m': 3000,
            '5m': 500,
            '15m': 500,
            '1h': 500,
            '4h': 500
        };
        this.closed = {
            '1m': [],
            '5m': [],
            '15m': [],
            '1h': [],
            '4h': []
        };
        this.building = {
            '5m': null,
            '15m': null,
            '1h': null,
            '4h': null
        };
        this.unclosed1m = null;
    }

    update(candle) {
        if (!candle) return;
        const time = candle.openTime !== undefined ? candle.openTime : candle.timestamp;
        if (time === undefined || time === null) return;

        if (candle.closed === false) {
            // Unclosed 1m candle
            this.unclosed1m = { ...candle };
            return;
        }

        // It is a closed 1m candle. If we have a stored unclosed candle at the same timestamp, clear it.
        if (this.unclosed1m) {
            const unclosedTime = this.unclosed1m.openTime !== undefined ? this.unclosed1m.openTime : this.unclosed1m.timestamp;
            if (unclosedTime === time) {
                this.unclosed1m = null;
            }
        }

        // Prevent duplicate closed candles at the exact same timestamp
        const last1m = this.closed['1m'][this.closed['1m'].length - 1];
        const last1mTime = last1m ? (last1m.openTime !== undefined ? last1m.openTime : last1m.timestamp) : -1;

        if (time === last1mTime) {
            // Overwrite the duplicate candle
            this.closed['1m'][this.closed['1m'].length - 1] = { ...candle, closed: true };
            this.rebuildHigherTimeframes();
            return;
        } else if (time < last1mTime) {
            // Out of order candle, insert and sort
            this.closed['1m'].push({ ...candle, closed: true });
            this.closed['1m'].sort((a, b) => {
                const ta = a.openTime !== undefined ? a.openTime : a.timestamp;
                const tb = b.openTime !== undefined ? b.openTime : b.timestamp;
                return ta - tb;
            });
            if (this.closed['1m'].length > this.limits['1m']) {
                this.closed['1m'].shift();
            }
            this.rebuildHigherTimeframes();
            return;
        }

        // Standard append
        this.closed['1m'].push({ ...candle, closed: true });
        if (this.closed['1m'].length > this.limits['1m']) {
            this.closed['1m'].shift();
        }

        // Dynamically update higher timeframes
        for (const tf of ['5m', '15m', '1h', '4h']) {
            const duration = this.durations[tf];
            const bucketStart = Math.floor(time / duration) * duration;
            let currentBuilding = this.building[tf];

            if (currentBuilding) {
                if (bucketStart > currentBuilding.bucketStart) {
                    // Close the old building candle and save it
                    currentBuilding.closed = true;
                    const { bucketStart: _, ...savedCandle } = currentBuilding;
                    this.closed[tf].push(savedCandle);
                    if (this.closed[tf].length > this.limits[tf]) {
                        this.closed[tf].shift();
                    }

                    // Start new building candle
                    this.building[tf] = {
                        openTime: bucketStart,
                        timestamp: bucketStart,
                        open: candle.open,
                        high: candle.high,
                        low: candle.low,
                        close: candle.close,
                        volume: candle.volume,
                        closed: false,
                        bucketStart: bucketStart
                    };
                } else if (bucketStart === currentBuilding.bucketStart) {
                    // Update existing building candle
                    currentBuilding.high = Math.max(currentBuilding.high, candle.high);
                    currentBuilding.low = Math.min(currentBuilding.low, candle.low);
                    currentBuilding.close = candle.close;
                    currentBuilding.volume += candle.volume;
                } else {
                    // Out-of-order candle in the past for this TF. Rebuild to be safe.
                    this.rebuildHigherTimeframes();
                    return;
                }
            } else {
                // Start a new building candle
                this.building[tf] = {
                    openTime: bucketStart,
                    timestamp: bucketStart,
                    open: candle.open,
                    high: candle.high,
                    low: candle.low,
                    close: candle.close,
                    volume: candle.volume,
                    closed: false,
                    bucketStart: bucketStart
                };
            }

            // Close the building candle if it is completed by this 1m candle
            if (time >= bucketStart + duration - 60000) {
                const completed = this.building[tf];
                completed.closed = true;
                const { bucketStart: _, ...savedCandle } = completed;
                this.closed[tf].push(savedCandle);
                if (this.closed[tf].length > this.limits[tf]) {
                    this.closed[tf].shift();
                }
                this.building[tf] = null;
            }
        }
    }

    rebuildHigherTimeframes() {
        for (const tf of ['5m', '15m', '1h', '4h']) {
            this.closed[tf] = [];
            this.building[tf] = null;
        }

        for (const candle of this.closed['1m']) {
            const time = candle.openTime !== undefined ? candle.openTime : candle.timestamp;
            for (const tf of ['5m', '15m', '1h', '4h']) {
                const duration = this.durations[tf];
                const bucketStart = Math.floor(time / duration) * duration;
                let currentBuilding = this.building[tf];

                if (currentBuilding) {
                    if (bucketStart > currentBuilding.bucketStart) {
                        currentBuilding.closed = true;
                        const { bucketStart: _, ...savedCandle } = currentBuilding;
                        this.closed[tf].push(savedCandle);
                        if (this.closed[tf].length > this.limits[tf]) {
                            this.closed[tf].shift();
                        }
                        this.building[tf] = {
                            openTime: bucketStart,
                            timestamp: bucketStart,
                            open: candle.open,
                            high: candle.high,
                            low: candle.low,
                            close: candle.close,
                            volume: candle.volume,
                            closed: false,
                            bucketStart: bucketStart
                        };
                    } else {
                        currentBuilding.high = Math.max(currentBuilding.high, candle.high);
                        currentBuilding.low = Math.min(currentBuilding.low, candle.low);
                        currentBuilding.close = candle.close;
                        currentBuilding.volume += candle.volume;
                    }
                } else {
                    this.building[tf] = {
                        openTime: bucketStart,
                        timestamp: bucketStart,
                        open: candle.open,
                        high: candle.high,
                        low: candle.low,
                        close: candle.close,
                        volume: candle.volume,
                        closed: false,
                        bucketStart: bucketStart
                    };
                }

                if (time >= bucketStart + duration - 60000) {
                    const completed = this.building[tf];
                    completed.closed = true;
                    const { bucketStart: _, ...savedCandle } = completed;
                    this.closed[tf].push(savedCandle);
                    if (this.closed[tf].length > this.limits[tf]) {
                        this.closed[tf].shift();
                    }
                    this.building[tf] = null;
                }
            }
        }
    }

    getCandles(timeframe, limit = 500, includeUnclosed = false) {
        const closedList = this.closed[timeframe] || [];

        if (!includeUnclosed) {
            return closedList.slice(-limit);
        }

        let result = [...closedList];

        if (timeframe === '1m') {
            if (this.unclosed1m) {
                result.push({ ...this.unclosed1m, closed: false });
            }
        } else {
            const duration = this.durations[timeframe];
            let currentBuilding = this.building[timeframe];
            let unclosed = null;

            if (this.unclosed1m) {
                const unclosedTime = this.unclosed1m.openTime !== undefined ? this.unclosed1m.openTime : this.unclosed1m.timestamp;
                const unclosedBucketStart = Math.floor(unclosedTime / duration) * duration;

                if (currentBuilding) {
                    if (unclosedBucketStart === currentBuilding.bucketStart) {
                        unclosed = {
                            openTime: currentBuilding.openTime,
                            timestamp: currentBuilding.timestamp,
                            open: currentBuilding.open,
                            high: Math.max(currentBuilding.high, this.unclosed1m.high),
                            low: Math.min(currentBuilding.low, this.unclosed1m.low),
                            close: this.unclosed1m.close,
                            volume: currentBuilding.volume + this.unclosed1m.volume,
                            closed: false
                        };
                    } else if (unclosedBucketStart > currentBuilding.bucketStart) {
                        // The current building candle is actually completed
                        const completedBuilding = {
                            openTime: currentBuilding.openTime,
                            timestamp: currentBuilding.timestamp,
                            open: currentBuilding.open,
                            high: currentBuilding.high,
                            low: currentBuilding.low,
                            close: currentBuilding.close,
                            volume: currentBuilding.volume,
                            closed: true
                        };
                        result.push(completedBuilding);

                        // Start the new unclosed candle
                        unclosed = {
                            openTime: unclosedBucketStart,
                            timestamp: unclosedBucketStart,
                            open: this.unclosed1m.open,
                            high: this.unclosed1m.high,
                            low: this.unclosed1m.low,
                            close: this.unclosed1m.close,
                            volume: this.unclosed1m.volume,
                            closed: false
                        };
                    } else {
                        // Fallback
                        unclosed = {
                            openTime: currentBuilding.openTime,
                            timestamp: currentBuilding.timestamp,
                            open: currentBuilding.open,
                            high: currentBuilding.high,
                            low: currentBuilding.low,
                            close: currentBuilding.close,
                            volume: currentBuilding.volume,
                            closed: false
                        };
                    }
                } else {
                    unclosed = {
                        openTime: unclosedBucketStart,
                        timestamp: unclosedBucketStart,
                        open: this.unclosed1m.open,
                        high: this.unclosed1m.high,
                        low: this.unclosed1m.low,
                        close: this.unclosed1m.close,
                        volume: this.unclosed1m.volume,
                        closed: false
                    };
                }
            } else {
                if (currentBuilding) {
                    unclosed = {
                        openTime: currentBuilding.openTime,
                        timestamp: currentBuilding.timestamp,
                        open: currentBuilding.open,
                        high: currentBuilding.high,
                        low: currentBuilding.low,
                        close: currentBuilding.close,
                        volume: currentBuilding.volume,
                        closed: false
                    };
                }
            }

            if (unclosed) {
                result.push(unclosed);
            }
        }

        return result.slice(-limit);
    }

    getMtfState() {
        return {
            '1m': [...this.closed['1m']],
            '5m': [...this.closed['5m']],
            '15m': [...this.closed['15m']],
            '1h': [...this.closed['1h']],
            '4h': [...this.closed['4h']]
        };
    }
}
