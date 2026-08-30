/**
 * Tiny Capital Sustained (T2) Engine
 * Models a sustained live trading sample to evaluate structural ERG distribution.
 * Implements K4 REALITY BREAK.
 */
export class TinyCapitalSustainedEngine {
    constructor(approvedErgEnvelope) {
        this.approvedEnvelope = approvedErgEnvelope; // e.g., max P99 limit
        this.trades = [];
        this.killSwitchEvents = [];
    }

    /**
     * Synthetically generates live execution distributions and triggers K4 if envelopes are breached.
     */
    evaluateSustainedSample(sampleSize, regimeDist) {
        let totalErg = 0;
        let k4Triggered = false;

        for (let i = 0; i < sampleSize; i++) {
            if (k4Triggered) break;

            const rand = Math.random();
            let regime = "NORMAL";
            if (rand > regimeDist.normal && rand <= (regimeDist.normal + regimeDist.degraded)) {
                regime = "DEGRADED";
            } else if (rand > (regimeDist.normal + regimeDist.degraded)) {
                regime = "STRESS";
            }

            // Simulate ERG drawing from distribution
            let erg = 0;
            if (regime === "NORMAL") {
                erg = 0.5 + (Math.random() * 1.5); // 0.5 to 2.0 bps
            } else if (regime === "DEGRADED") {
                erg = 2.0 + (Math.random() * 3.0); // 2.0 to 5.0 bps
            } else if (regime === "STRESS") {
                // Stress has heavy tails
                const tail = Math.random();
                if (tail > 0.95) {
                    erg = 15.0 + (Math.random() * 10.0); // 15 to 25 bps (tail)
                } else {
                    erg = 5.0 + (Math.random() * 5.0); // 5 to 10 bps
                }
            }

            const pnl = (18.5 - erg) * (Math.random() > 0.48 ? 1 : -1.1); // Synthetic PnL distribution

            this.trades.push({ id: i, regime, erg, pnl });

            // K4 Reality Break Check (Rolling Window Tail Check)
            if (this.trades.length > 500) {
                const recentWindow = this.trades.slice(-500);
                const sortedErg = recentWindow.map(t => t.erg).sort((a, b) => a - b);
                const p99 = sortedErg[Math.floor(sortedErg.length * 0.99)];
                
                if (p99 > this.approvedEnvelope.maxP99) {
                    this.killSwitchEvents.push({
                        level: "K4 - REALITY BREAK",
                        reason: `Rolling P99 ERG (${p99.toFixed(1)} bps) > Approved Envelope (${this.approvedEnvelope.maxP99} bps)`,
                        action: "BLOCK NEW ORDERS, FREEZE PROVIDER, REQUIRE RESEARCH REVIEW"
                    });
                    k4Triggered = true;
                }
            }
        }
        
        return this.generateMetrics();
    }

    generateMetrics() {
        if (this.trades.length === 0) return null;
        const sortedErg = this.trades.map(t => t.erg).sort((a, b) => a - b);
        
        return {
            totalTrades: this.trades.length,
            regimeCounts: {
                normal: this.trades.filter(t => t.regime === "NORMAL").length,
                degraded: this.trades.filter(t => t.regime === "DEGRADED").length,
                stress: this.trades.filter(t => t.regime === "STRESS").length
            },
            ergStats: {
                p50: sortedErg[Math.floor(sortedErg.length * 0.50)],
                p90: sortedErg[Math.floor(sortedErg.length * 0.90)],
                p95: sortedErg[Math.floor(sortedErg.length * 0.95)],
                p99: sortedErg[Math.floor(sortedErg.length * 0.99)]
            },
            pnlStats: {
                totalPnl: this.trades.reduce((sum, t) => sum + t.pnl, 0),
                winRate: this.trades.filter(t => t.pnl > 0).length / this.trades.length
            }
        };
    }
}
