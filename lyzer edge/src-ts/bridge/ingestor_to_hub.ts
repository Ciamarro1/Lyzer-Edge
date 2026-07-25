import { LiveDataIngestor } from '../../backend/liveDataIngestor.js';

const HUB_URL = "http://127.0.0.1:8080";

async function postInterpretation(payload: any) {
    try {
        const res = await fetch(HUB_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            const err = await res.text();
            console.error(`[BRIDGE] Hub rejected payload: ${res.status} ${err}`);
        } else {
            console.log(`[BRIDGE] Successfully posted interpretation from ${payload.observer.Agent}`);
        }
    } catch (e: any) {
        console.error(`[BRIDGE] Failed to connect to Hub at ${HUB_URL}: ${e.message}`);
    }
}

function startBridge() {
    console.log("[BRIDGE] Starting Binance WSS -> Rust Hub Bridge");
    
    // Using 1m interval for fast testing
    const ingestor = new LiveDataIngestor('BTCUSDT', '1m');

    ingestor.startWebSocket(async (candle: any) => {
        console.log(`\n[BRIDGE] Candle Closed! Price: ${candle.close}`);

        // Generate V1 Hypothesis (Trend Following)
        const isBullish = candle.close > candle.open;
        const v1Payload = {
            observer: { Agent: "Provider-V1-Trend" },
            incentive_profile: { primary_mandate: "Trend Following", constraints: ["Temporal < 50ms"] },
            evidence_references: [`BINANCE-LIVE-BTCUSDT-T${candle.openTime}`],
            interpretation: isBullish ? "Trend is UP: BUY" : "Trend is DOWN: SELL",
            justification: `Empirical observation: Close (${candle.close}) > Open (${candle.open}) indicates momentum.`,
            confidence: 0.85
        };

        // Generate V2 Hypothesis (Mean Reversion)
        const v2Payload = {
            observer: { Agent: "Provider-V2-Reversion" },
            incentive_profile: { primary_mandate: "Mean Reversion", constraints: ["Temporal < 50ms"] },
            evidence_references: [`BINANCE-LIVE-BTCUSDT-T${candle.openTime}`],
            interpretation: isBullish ? "Overbought: SELL" : "Oversold: BUY",
            justification: `Empirical observation: Fast price expansion implies upcoming mean reversion.`,
            confidence: 0.70
        };

        // Post both to trigger Arbitration in Rust Hub
        await postInterpretation(v1Payload);
        // Wait a tiny bit to ensure order
        await new Promise(r => setTimeout(r, 100));
        await postInterpretation(v2Payload);
    });
}

startBridge();
