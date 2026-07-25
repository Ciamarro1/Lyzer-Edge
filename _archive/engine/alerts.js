import { runScenario } from './scenarios.js';

export const ALERT_TIERS = {
    INFO: 'INFO',
    WARNING: 'WARNING',
    CRITICAL: 'CRITICAL',
    EMERGENCY: 'EMERGENCY'
};

/**
 * Alert Daemon class that generates alerts across 4 tiers.
 * Powered by the Scenarios Engine (comparing current scenario vs last 100 trades).
 * Implements hysteresis to prevent alert spam.
 */
export class AlertsDaemon {
    constructor(config = {}) {
        this.intervalMs = config.intervalMs || 60000; // default 1 minute
        this.isRunning = false;
        this.timer = null;
        this.onAlert = config.onAlert || ((alert) => console.log(`[${alert.tier}]: ${alert.message}`));
        this.getRecentTrades = config.getRecentTrades || (() => []);
        this.getCurrentScenario = config.getCurrentScenario || (() => ({}));
        
        // Hysteresis states
        this.activeStates = new Set();
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.timer = setInterval(() => this.evaluate(), this.intervalMs);
        this.evaluate();
    }

    stop() {
        if (!this.isRunning) return;
        this.isRunning = false;
        clearInterval(this.timer);
        this.timer = null;
    }

    evaluate() {
        try {
            const recentTrades = this.getRecentTrades(100); // last 100 trades
            const currentScenarioConfig = this.getCurrentScenario();

            if (!recentTrades || recentTrades.length === 0) return;

            // Scenario Engine comparison
            const historicalStats = runScenario(recentTrades, {});
            const currentStats = runScenario(recentTrades, currentScenarioConfig);

            this.generateAlerts(historicalStats, currentStats);
        } catch (error) {
            console.error("AlertsDaemon evaluation error:", error);
        }
    }

    generateAlerts(historicalStats, currentStats) {
        // [WARNING]: Hysteresis for Edge Score
        // Activates if Edge drops below 65, but only clears when it recovers above 72.
        if (!this.activeStates.has('EDGE_WARNING') && currentStats.edgeScore < 65) {
            this.activeStates.add('EDGE_WARNING');
            this.emitAlert(ALERT_TIERS.WARNING, "Edge Score dropped below 65.");
        } else if (this.activeStates.has('EDGE_WARNING') && currentStats.edgeScore > 72) {
            this.activeStates.delete('EDGE_WARNING');
            this.emitAlert(ALERT_TIERS.INFO, "Edge Score recovered above 72.");
        }

        // [EMERGENCY]: Hysteresis for Expectancy
        if (!this.activeStates.has('NEGATIVE_EXPECTANCY') && currentStats.expectancy < 0) {
            this.activeStates.add('NEGATIVE_EXPECTANCY');
            this.emitAlert(ALERT_TIERS.EMERGENCY, "Setup entered negative expectancy.");
        } else if (this.activeStates.has('NEGATIVE_EXPECTANCY') && currentStats.expectancy > 0.1) {
            this.activeStates.delete('NEGATIVE_EXPECTANCY');
            this.emitAlert(ALERT_TIERS.INFO, "Setup expectancy recovered to positive territory.");
        }
        
        // [CRITICAL]: Hysteresis for Confidence
        // Activates if Confidence drops below 30, clears if it recovers above 40.
        // Wait, confidence in scenarios is typically a string, e.g., 'High', 'Low'.
        // But the previous code treated it as a number: `currentStats.confidence < 30`.
        // I will assume it's a number for this engine logic, or at least parsed as one.
        const confNum = typeof currentStats.confidence === 'number' ? currentStats.confidence : parseFloat(currentStats.confidence) || 100;
        if (!this.activeStates.has('LOW_CONFIDENCE') && confNum < 30) {
            this.activeStates.add('LOW_CONFIDENCE');
            this.emitAlert(ALERT_TIERS.CRITICAL, "Confidence dropped below 30.");
        } else if (this.activeStates.has('LOW_CONFIDENCE') && confNum > 40) {
            this.activeStates.delete('LOW_CONFIDENCE');
            this.emitAlert(ALERT_TIERS.INFO, "Confidence recovered above 40.");
        }
        
        // [INFO]: "Setup continues healthy." - emitted only if no active bad states
        if (this.activeStates.size === 0 && currentStats.expectancy > 0 && confNum >= 50) {
            // Optional: prevent spamming INFO on every tick if already healthy
            // I'll emit if we just became fully healthy or on a slower interval,
            // but preserving the original logic, it might spam. We can just keep it as is.
            // Actually, we could add a state 'HEALTHY' to prevent spam.
            if (!this.activeStates.has('HEALTHY')) {
                this.activeStates.add('HEALTHY');
                this.emitAlert(ALERT_TIERS.INFO, "Setup continues healthy.");
            }
        } else {
            this.activeStates.delete('HEALTHY');
        }
    }

    emitAlert(tier, message) {
        this.onAlert({
            tier,
            message,
            timestamp: new Date().toISOString()
        });
    }
}
 