import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REGISTRY_PATH = path.join(__dirname, '../data/trade_memory_registry.json');

// Ensure data directory and registry file exist
export function initializeRegistry() {
    const dataDir = path.join(__dirname, '../data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    if (!fs.existsSync(REGISTRY_PATH)) {
        fs.writeFileSync(REGISTRY_PATH, JSON.stringify([]));
    }
}

/**
 * CIA Mandated Outcome Intelligence Layer (OIL)
 * Every trade must become a learning artifact.
 * 
 * @param {Object} tradeData 
 * {
 *   signal: "LONG" | "SHORT",
 *   confidence: Number,
 *   causal_state: String,
 *   rdm_state: String,
 *   forecast_horizon: Number,
 *   expected_direction: "UP" | "DOWN",
 *   entry_price: Number,
 *   entry_index: Number
 * }
 */
export function recordTradeOutcome(tradeData) {
    try {
        initializeRegistry();
        
        const rawData = fs.readFileSync(REGISTRY_PATH);
        let registry = JSON.parse(rawData);

        const memoryArtifact = {
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            signal: tradeData.signal || 'UNKNOWN',
            confidence: tradeData.confidence || 0,
            causal_state: tradeData.causal_state || 'UNKNOWN',
            rdm_state: tradeData.rdm_state || 'UNKNOWN',
            forecast_horizon: tradeData.forecast_horizon || 12,
            expected_direction: tradeData.expected_direction || 'UNKNOWN',
            entry_price: tradeData.entry_price || 0,
            entry_index: tradeData.entry_index || 0,
            actual_direction: 'PENDING',
            error_type: 'PENDING',
            confidence_error: 0,
            lesson: 'PENDING',
            status: 'PENDING'
        };

        registry.push(memoryArtifact);
        
        // Write back
        fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2));
        console.log(`[OIL] Trade Memory Artifact Registered: ${memoryArtifact.id} (Horizon: ${memoryArtifact.forecast_horizon})`);
        
        return memoryArtifact;
    } catch (err) {
        console.error(`[OIL] Failed to record trade outcome:`, err.message);
    }
}

export function getPendingTrades() {
    try {
        if (!fs.existsSync(REGISTRY_PATH)) return [];
        const rawData = fs.readFileSync(REGISTRY_PATH);
        const registry = JSON.parse(rawData);
        return registry.filter(t => t.status === 'PENDING');
    } catch (err) {
        return [];
    }
}

export function updateTradeResolution(tradeId, resolutionData) {
    try {
        if (!fs.existsSync(REGISTRY_PATH)) return;
        const rawData = fs.readFileSync(REGISTRY_PATH);
        let registry = JSON.parse(rawData);
        
        const idx = registry.findIndex(t => t.id === tradeId);
        if (idx !== -1) {
            registry[idx] = { ...registry[idx], ...resolutionData, status: 'RESOLVED' };
            fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2));
            console.log(`[OIL] Trade ${tradeId} Resolved! Lesson: ${resolutionData.lesson}`);
        }
    } catch (err) {
        console.error(`[OIL] Failed to update resolution:`, err.message);
    }
}
